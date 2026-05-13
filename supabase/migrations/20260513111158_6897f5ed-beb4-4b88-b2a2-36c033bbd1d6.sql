-- TAB-FIX2: Locked price untuk lindungi customer dari kenaikan harga paket
ALTER TABLE public.savings_plans
  ADD COLUMN IF NOT EXISTS locked_price numeric(15,2),
  ADD COLUMN IF NOT EXISTS price_lock_date timestamptz DEFAULT now();

-- Backfill locked_price dari target_amount untuk plan yang sudah ada
UPDATE public.savings_plans SET locked_price = target_amount WHERE locked_price IS NULL;

-- TAB-FIX3: Tabel jadwal cicilan otomatis
CREATE TABLE IF NOT EXISTS public.savings_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  savings_plan_id uuid NOT NULL REFERENCES public.savings_plans(id) ON DELETE CASCADE,
  installment_number integer NOT NULL,
  due_date date NOT NULL,
  amount numeric(15,2) NOT NULL,
  paid_amount numeric(15,2) DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','partial','paid','overdue')),
  paid_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (savings_plan_id, installment_number)
);

CREATE INDEX IF NOT EXISTS idx_savings_schedules_plan ON public.savings_schedules(savings_plan_id);
CREATE INDEX IF NOT EXISTS idx_savings_schedules_due ON public.savings_schedules(due_date) WHERE status IN ('pending','partial','overdue');

ALTER TABLE public.savings_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can view own savings schedules"
  ON public.savings_schedules FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.savings_plans sp
    JOIN public.customers c ON c.id = sp.customer_id
    WHERE sp.id = savings_schedules.savings_plan_id AND c.user_id = auth.uid()
  ));

CREATE POLICY "Admins can manage savings schedules"
  ON public.savings_schedules FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Customers can insert own savings schedules"
  ON public.savings_schedules FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.savings_plans sp
    JOIN public.customers c ON c.id = sp.customer_id
    WHERE sp.id = savings_schedules.savings_plan_id AND c.user_id = auth.uid()
  ));

CREATE TRIGGER update_savings_schedules_updated_at
  BEFORE UPDATE ON public.savings_schedules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Generator otomatis jadwal cicilan saat savings_plan dibuat
CREATE OR REPLACE FUNCTION public.generate_savings_schedule()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  i integer;
  v_due date;
BEGIN
  IF NEW.tenor_months IS NULL OR NEW.tenor_months <= 0 THEN
    RETURN NEW;
  END IF;
  IF EXISTS (SELECT 1 FROM public.savings_schedules WHERE savings_plan_id = NEW.id) THEN
    RETURN NEW;
  END IF;
  FOR i IN 1..NEW.tenor_months LOOP
    v_due := (COALESCE(NEW.start_date, CURRENT_DATE) + (i || ' months')::interval)::date;
    INSERT INTO public.savings_schedules (savings_plan_id, installment_number, due_date, amount)
    VALUES (NEW.id, i, v_due, NEW.monthly_amount);
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_generate_savings_schedule ON public.savings_plans;
CREATE TRIGGER tr_generate_savings_schedule
  AFTER INSERT ON public.savings_plans
  FOR EACH ROW EXECUTE FUNCTION public.generate_savings_schedule();

-- Auto-update jadwal saat savings_payment tercatat
CREATE OR REPLACE FUNCTION public.apply_payment_to_schedule()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_remaining numeric;
  v_plan_id uuid;
  r record;
BEGIN
  IF NEW.status::text NOT IN ('paid','verified','approved') THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;
  v_plan_id := NEW.savings_plan_id;
  v_remaining := NEW.amount;
  FOR r IN SELECT id, amount, paid_amount FROM public.savings_schedules
           WHERE savings_plan_id = v_plan_id AND status IN ('pending','partial','overdue')
           ORDER BY installment_number ASC LOOP
    EXIT WHEN v_remaining <= 0;
    DECLARE
      v_due numeric := r.amount - COALESCE(r.paid_amount,0);
      v_apply numeric := LEAST(v_remaining, v_due);
      v_new_paid numeric := COALESCE(r.paid_amount,0) + v_apply;
      v_status text := CASE WHEN v_new_paid >= r.amount THEN 'paid' ELSE 'partial' END;
    BEGIN
      UPDATE public.savings_schedules
      SET paid_amount = v_new_paid, status = v_status, paid_at = CASE WHEN v_status='paid' THEN now() ELSE paid_at END
      WHERE id = r.id;
      v_remaining := v_remaining - v_apply;
    END;
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_apply_payment_to_schedule ON public.savings_payments;
CREATE TRIGGER tr_apply_payment_to_schedule
  AFTER INSERT OR UPDATE ON public.savings_payments
  FOR EACH ROW EXECUTE FUNCTION public.apply_payment_to_schedule();

-- TAB-FIX1: RPC konversi tabungan → booking
CREATE OR REPLACE FUNCTION public.convert_savings_to_booking(
  _savings_plan_id uuid,
  _departure_id uuid,
  _room_type text DEFAULT 'quad'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan record;
  v_departure record;
  v_pkg record;
  v_booking_id uuid;
  v_booking_code text;
  v_room_price numeric;
  v_user_id uuid;
BEGIN
  SELECT sp.*, c.user_id, c.full_name INTO v_plan
  FROM public.savings_plans sp
  JOIN public.customers c ON c.id = sp.customer_id
  WHERE sp.id = _savings_plan_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tabungan tidak ditemukan';
  END IF;
  IF v_plan.status::text = 'converted' THEN
    RAISE EXCEPTION 'Tabungan sudah dikonversi ke booking';
  END IF;
  IF v_plan.user_id IS DISTINCT FROM auth.uid() AND NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Tidak diizinkan';
  END IF;

  SELECT d.*, p.code AS package_code INTO v_departure
  FROM public.departures d
  JOIN public.packages p ON p.id = d.package_id
  WHERE d.id = _departure_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Keberangkatan tidak ditemukan'; END IF;

  v_room_price := CASE _room_type
    WHEN 'triple' THEN v_departure.price_triple
    WHEN 'double' THEN v_departure.price_double
    WHEN 'single' THEN v_departure.price_single
    ELSE v_departure.price_quad
  END;

  v_booking_code := public.generate_booking_code(v_departure.package_code, v_departure.departure_date);

  INSERT INTO public.bookings (
    booking_code, departure_id, customer_id, room_type,
    total_pax, adult_count, base_price, total_price, paid_amount,
    notes
  ) VALUES (
    v_booking_code, _departure_id, v_plan.customer_id, _room_type,
    1, 1, v_room_price, v_room_price, COALESCE(v_plan.paid_amount, 0),
    'Konversi otomatis dari tabungan #' || _savings_plan_id::text
  ) RETURNING id INTO v_booking_id;

  INSERT INTO public.booking_passengers (booking_id, customer_id, is_main_passenger, passenger_type, room_preference)
  VALUES (v_booking_id, v_plan.customer_id, true, 'adult', _room_type);

  UPDATE public.savings_plans
  SET status = 'converted', converted_booking_id = v_booking_id, updated_at = now()
  WHERE id = _savings_plan_id;

  RETURN v_booking_id;
END;
$$;