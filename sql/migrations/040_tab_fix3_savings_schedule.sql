-- =============================================================================
-- TAB-FIX3: Jadwal Cicilan Otomatis — generate savings_schedule saat registrasi
-- Jamaah langsung dapat jadwal setoran bulanan yang terstruktur saat mendaftar
-- =============================================================================

-- Helper trigger function (idempotent)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

-- ── 1. Tambah kolom yang dibutuhkan ke savings_plans ─────────────────────────
ALTER TABLE savings_plans
  ADD COLUMN IF NOT EXISTS monthly_amount    NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tenor_months      INTEGER DEFAULT 12,
  ADD COLUMN IF NOT EXISTS paid_amount       NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dp_amount         NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dp_status         TEXT DEFAULT NULL
                             CHECK (dp_status IN ('pending','verified','rejected') OR dp_status IS NULL),
  ADD COLUMN IF NOT EXISTS package_id        UUID REFERENCES packages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS locked_price      NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS price_lock_date   TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS start_date        DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS converted_booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL;

-- Update status CHECK to include dp_paid dan converted
DO $$
BEGIN
  ALTER TABLE savings_plans DROP CONSTRAINT IF EXISTS savings_plans_status_check;
  ALTER TABLE savings_plans
    ADD CONSTRAINT savings_plans_status_check
    CHECK (status IN ('active','completed','cancelled','converted','dp_paid'));
EXCEPTION WHEN others THEN
  NULL; -- ignore if constraint doesn't exist or already correct
END $$;

-- Backfill locked_price dari target_amount untuk plan lama
UPDATE savings_plans SET locked_price = target_amount WHERE locked_price IS NULL;

-- Backfill start_date untuk plan lama
UPDATE savings_plans SET start_date = created_at::date WHERE start_date IS NULL;


-- ── 2. Tabel jadwal cicilan otomatis ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS savings_schedules (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  savings_plan_id     UUID NOT NULL REFERENCES savings_plans(id) ON DELETE CASCADE,
  installment_number  INTEGER NOT NULL,
  due_date            DATE NOT NULL,
  amount              NUMERIC(15,2) NOT NULL,
  paid_amount         NUMERIC(15,2) DEFAULT 0,
  status              TEXT NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending','partial','paid','overdue')),
  paid_at             TIMESTAMPTZ,
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (savings_plan_id, installment_number)
);

CREATE INDEX IF NOT EXISTS idx_savings_schedules_plan
  ON savings_schedules(savings_plan_id);
CREATE INDEX IF NOT EXISTS idx_savings_schedules_due
  ON savings_schedules(due_date)
  WHERE status IN ('pending','partial','overdue');

-- RLS
ALTER TABLE savings_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customer_view_own_schedules" ON savings_schedules;
CREATE POLICY "customer_view_own_schedules" ON savings_schedules
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM savings_plans sp
      JOIN customers c ON c.id = sp.customer_id
      WHERE sp.id = savings_schedules.savings_plan_id
        AND c.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "admin_manage_savings_schedules" ON savings_schedules;
CREATE POLICY "admin_manage_savings_schedules" ON savings_schedules
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner','admin','finance','branch_manager')
    )
  );

DROP POLICY IF EXISTS "customer_insert_own_schedules" ON savings_schedules;
CREATE POLICY "customer_insert_own_schedules" ON savings_schedules
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM savings_plans sp
      JOIN customers c ON c.id = sp.customer_id
      WHERE sp.id = savings_schedules.savings_plan_id
        AND c.user_id = auth.uid()
    )
  );

-- Auto-update updated_at
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_savings_schedules_updated_at'
    AND tgrelid = 'savings_schedules'::regclass) THEN
    CREATE TRIGGER update_savings_schedules_updated_at
      BEFORE UPDATE ON savings_schedules
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


-- ── 3. Fungsi generator jadwal cicilan ───────────────────────────────────────
-- Dipanggil otomatis via trigger setiap kali savings_plan baru dibuat
CREATE OR REPLACE FUNCTION generate_savings_schedule()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  i        INTEGER;
  v_due    DATE;
  v_base   DATE;
BEGIN
  -- Guard: tenor harus valid
  IF NEW.tenor_months IS NULL OR NEW.tenor_months <= 0 THEN
    RETURN NEW;
  END IF;
  -- Guard: monthly_amount harus valid
  IF NEW.monthly_amount IS NULL OR NEW.monthly_amount <= 0 THEN
    RETURN NEW;
  END IF;
  -- Idempoten: jangan generate ulang jika sudah ada
  IF EXISTS (SELECT 1 FROM savings_schedules WHERE savings_plan_id = NEW.id) THEN
    RETURN NEW;
  END IF;

  -- Titik mulai: gunakan start_date jika ada, fallback ke CURRENT_DATE
  v_base := COALESCE(NEW.start_date, CURRENT_DATE);

  -- Generate baris jadwal per cicilan
  FOR i IN 1..NEW.tenor_months LOOP
    v_due := (v_base + (i || ' months')::interval)::date;
    INSERT INTO savings_schedules (savings_plan_id, installment_number, due_date, amount)
    VALUES (NEW.id, i, v_due, NEW.monthly_amount);
  END LOOP;

  RETURN NEW;
END;
$$;

-- Pasang trigger pada INSERT ke savings_plans
DROP TRIGGER IF EXISTS tr_generate_savings_schedule ON savings_plans;
CREATE TRIGGER tr_generate_savings_schedule
  AFTER INSERT ON savings_plans
  FOR EACH ROW EXECUTE FUNCTION generate_savings_schedule();


-- ── 4. Fungsi alokasi pembayaran ke jadwal cicilan ────────────────────────────
-- Dipanggil otomatis saat savings_payment di-INSERT atau di-UPDATE ke verified
CREATE OR REPLACE FUNCTION apply_payment_to_schedule()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_remaining NUMERIC;
  v_plan_id   UUID;
  r           RECORD;
  v_due       NUMERIC;
  v_apply     NUMERIC;
  v_new_paid  NUMERIC;
  v_status    TEXT;
BEGIN
  -- Hanya proses jika status pembayaran approved/verified/paid
  IF NEW.status::text NOT IN ('paid','verified','approved') THEN
    RETURN NEW;
  END IF;
  -- Idempoten: jangan proses ulang jika status tidak berubah (UPDATE)
  IF TG_OP = 'UPDATE' AND OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  v_plan_id   := NEW.savings_plan_id;
  v_remaining := NEW.amount;

  -- Distribusikan ke cicilan terlama yang masih belum lunas
  FOR r IN
    SELECT id, amount, paid_amount
    FROM savings_schedules
    WHERE savings_plan_id = v_plan_id
      AND status IN ('pending','partial','overdue')
    ORDER BY installment_number ASC
  LOOP
    EXIT WHEN v_remaining <= 0;

    v_due      := r.amount - COALESCE(r.paid_amount, 0);
    v_apply    := LEAST(v_remaining, v_due);
    v_new_paid := COALESCE(r.paid_amount, 0) + v_apply;
    v_status   := CASE WHEN v_new_paid >= r.amount THEN 'paid' ELSE 'partial' END;

    UPDATE savings_schedules
    SET
      paid_amount = v_new_paid,
      status      = v_status,
      paid_at     = CASE WHEN v_status = 'paid' THEN NOW() ELSE paid_at END,
      updated_at  = NOW()
    WHERE id = r.id;

    v_remaining := v_remaining - v_apply;
  END LOOP;

  -- Update paid_amount di savings_plans
  UPDATE savings_plans
  SET
    paid_amount = COALESCE(paid_amount, 0) + NEW.amount,
    status      = CASE
                    WHEN (COALESCE(paid_amount, 0) + NEW.amount) >= target_amount THEN 'completed'
                    ELSE status
                  END,
    updated_at  = NOW()
  WHERE id = v_plan_id;

  RETURN NEW;
END;
$$;

-- Pasang trigger pada savings_payments
DROP TRIGGER IF EXISTS tr_apply_payment_to_schedule ON savings_payments;
CREATE TRIGGER tr_apply_payment_to_schedule
  AFTER INSERT OR UPDATE ON savings_payments
  FOR EACH ROW EXECUTE FUNCTION apply_payment_to_schedule();


-- ── 5. Backfill jadwal untuk savings_plans lama yang belum punya jadwal ──────
DO $$
DECLARE
  p        RECORD;
  i        INTEGER;
  v_due    DATE;
  v_base   DATE;
BEGIN
  FOR p IN
    SELECT id, tenor_months, monthly_amount, start_date, created_at
    FROM savings_plans
    WHERE tenor_months > 0
      AND monthly_amount > 0
      AND NOT EXISTS (SELECT 1 FROM savings_schedules WHERE savings_plan_id = savings_plans.id)
  LOOP
    v_base := COALESCE(p.start_date, p.created_at::date, CURRENT_DATE);
    FOR i IN 1..p.tenor_months LOOP
      v_due := (v_base + (i || ' months')::interval)::date;
      INSERT INTO savings_schedules (savings_plan_id, installment_number, due_date, amount)
      VALUES (p.id, i, v_due, p.monthly_amount)
      ON CONFLICT (savings_plan_id, installment_number) DO NOTHING;
    END LOOP;
  END LOOP;
END $$;


-- ── 6. RPC: convert_savings_to_booking ───────────────────────────────────────
CREATE OR REPLACE FUNCTION convert_savings_to_booking(
  _savings_plan_id UUID,
  _departure_id    UUID,
  _room_type       TEXT DEFAULT 'quad'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan         RECORD;
  v_departure    RECORD;
  v_booking_id   UUID;
  v_booking_code TEXT;
  v_room_price   NUMERIC;
BEGIN
  SELECT sp.*, c.user_id, c.full_name INTO v_plan
  FROM savings_plans sp
  JOIN customers c ON c.id = sp.customer_id
  WHERE sp.id = _savings_plan_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tabungan tidak ditemukan';
  END IF;
  IF v_plan.status::text = 'converted' THEN
    RAISE EXCEPTION 'Tabungan sudah dikonversi ke booking';
  END IF;
  IF v_plan.user_id IS DISTINCT FROM auth.uid()
     AND NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin','owner','admin')) THEN
    RAISE EXCEPTION 'Tidak diizinkan';
  END IF;

  SELECT d.*, p.code AS package_code INTO v_departure
  FROM departures d
  JOIN packages p ON p.id = d.package_id
  WHERE d.id = _departure_id;

  IF NOT FOUND THEN RAISE EXCEPTION 'Keberangkatan tidak ditemukan'; END IF;

  v_room_price := CASE _room_type
    WHEN 'triple' THEN v_departure.price_triple
    WHEN 'double' THEN v_departure.price_double
    WHEN 'single' THEN v_departure.price_single
    ELSE v_departure.price_quad
  END;

  v_booking_code := generate_booking_code(v_departure.package_code, v_departure.departure_date);

  INSERT INTO bookings (
    booking_code, departure_id, customer_id, room_type,
    total_pax, adult_count, base_price, total_price, paid_amount,
    notes
  ) VALUES (
    v_booking_code, _departure_id, v_plan.customer_id, _room_type,
    1, 1, v_room_price, v_room_price, COALESCE(v_plan.paid_amount, 0),
    'Konversi otomatis dari tabungan #' || _savings_plan_id::text
  ) RETURNING id INTO v_booking_id;

  INSERT INTO booking_passengers (booking_id, customer_id, is_main_passenger, passenger_type, room_preference)
  VALUES (v_booking_id, v_plan.customer_id, true, 'adult', _room_type);

  UPDATE savings_plans
  SET status = 'converted', converted_booking_id = v_booking_id, updated_at = NOW()
  WHERE id = _savings_plan_id;

  RETURN v_booking_id;
END;
$$;


-- =============================================================================
SELECT 'TAB-FIX3 migration completed — savings_schedules table + auto-generate trigger created' AS result;
-- =============================================================================
