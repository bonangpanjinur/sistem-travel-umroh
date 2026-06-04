
-- ============================================
-- CAB-ADD1: Branch-scoped RLS
-- ============================================
CREATE OR REPLACE FUNCTION public.is_branch_manager_only(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM user_roles WHERE user_id = _user_id AND role = 'branch_manager')
    AND NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = _user_id AND role IN ('super_admin','owner'));
$$;

-- Bookings: restrict branch_manager
DROP POLICY IF EXISTS "Branch managers see only own branch bookings" ON public.bookings;
CREATE POLICY "Branch managers see only own branch bookings"
ON public.bookings FOR SELECT TO authenticated
USING (
  NOT is_branch_manager_only(auth.uid())
  OR branch_id = get_user_branch_id(auth.uid())
  OR customer_id IN (SELECT id FROM customers WHERE branch_id = get_user_branch_id(auth.uid()))
);

-- Customers: restrict branch_manager
DROP POLICY IF EXISTS "Branch managers see only own branch customers" ON public.customers;
CREATE POLICY "Branch managers see only own branch customers"
ON public.customers FOR SELECT TO authenticated
USING (
  NOT is_branch_manager_only(auth.uid())
  OR branch_id = get_user_branch_id(auth.uid())
  OR branch_id IS NULL
);

-- Payments: restrict via booking branch
DROP POLICY IF EXISTS "Branch managers see only own branch payments" ON public.payments;
CREATE POLICY "Branch managers see only own branch payments"
ON public.payments FOR SELECT TO authenticated
USING (
  NOT is_branch_manager_only(auth.uid())
  OR booking_id IN (
    SELECT id FROM bookings
    WHERE branch_id = get_user_branch_id(auth.uid())
       OR customer_id IN (SELECT id FROM customers WHERE branch_id = get_user_branch_id(auth.uid()))
  )
);

-- ============================================
-- CAB-ADD5: Branch Manager Notifications
-- ============================================
CREATE OR REPLACE FUNCTION public.tg_notify_branch_manager_new_booking()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_branch_id uuid;
  v_user_ids uuid[];
  v_customer_name text;
BEGIN
  v_branch_id := COALESCE(NEW.branch_id, (SELECT branch_id FROM customers WHERE id = NEW.customer_id));
  IF v_branch_id IS NULL THEN RETURN NEW; END IF;

  SELECT COALESCE(array_agg(user_id), '{}') INTO v_user_ids
  FROM user_roles WHERE role = 'branch_manager' AND branch_id = v_branch_id;

  IF COALESCE(array_length(v_user_ids,1),0) = 0 THEN RETURN NEW; END IF;

  SELECT full_name INTO v_customer_name FROM customers WHERE id = NEW.customer_id;

  PERFORM enqueue_push(
    v_user_ids,
    'Booking Baru di Cabang Anda',
    'Booking ' || NEW.booking_code || ' dari ' || COALESCE(v_customer_name, 'jamaah') || ' menunggu konfirmasi.',
    'info',
    '/cabang/bookings'
  );
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_branch_mgr_new_booking ON public.bookings;
CREATE TRIGGER trg_notify_branch_mgr_new_booking
AFTER INSERT ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.tg_notify_branch_manager_new_booking();

CREATE OR REPLACE FUNCTION public.tg_notify_branch_manager_payment_pending()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_branch_id uuid;
  v_user_ids uuid[];
BEGIN
  IF NEW.status::text NOT IN ('pending','partial') THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = NEW.status THEN RETURN NEW; END IF;
  IF NEW.proof_url IS NULL THEN RETURN NEW; END IF;

  SELECT COALESCE(b.branch_id, c.branch_id) INTO v_branch_id
  FROM bookings b LEFT JOIN customers c ON c.id = b.customer_id
  WHERE b.id = NEW.booking_id;
  IF v_branch_id IS NULL THEN RETURN NEW; END IF;

  SELECT COALESCE(array_agg(user_id), '{}') INTO v_user_ids
  FROM user_roles WHERE role = 'branch_manager' AND branch_id = v_branch_id;
  IF COALESCE(array_length(v_user_ids,1),0) = 0 THEN RETURN NEW; END IF;

  PERFORM enqueue_push(
    v_user_ids,
    'Pembayaran Menunggu Persetujuan',
    'Pembayaran Rp ' || to_char(NEW.amount, 'FM999,999,999') || ' menunggu verifikasi.',
    'warning',
    '/cabang/approvals'
  );
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_branch_mgr_payment_pending ON public.payments;
CREATE TRIGGER trg_notify_branch_mgr_payment_pending
AFTER INSERT OR UPDATE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.tg_notify_branch_manager_payment_pending();

-- ============================================
-- LOY-FIX2: Tier Benefits
-- ============================================
CREATE TABLE IF NOT EXISTS public.tier_benefits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_level text NOT NULL UNIQUE CHECK (tier_level IN ('silver','gold','platinum')),
  discount_percent numeric(5,2) NOT NULL DEFAULT 0,
  free_upgrades int NOT NULL DEFAULT 0,
  priority_support boolean NOT NULL DEFAULT false,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.tier_benefits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view tier benefits" ON public.tier_benefits;
CREATE POLICY "Anyone can view tier benefits" ON public.tier_benefits FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins manage tier benefits" ON public.tier_benefits;
CREATE POLICY "Admins manage tier benefits" ON public.tier_benefits
FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

INSERT INTO public.tier_benefits (tier_level, discount_percent, free_upgrades, priority_support, description) VALUES
  ('silver', 0, 0, false, 'Tier dasar — tanpa diskon'),
  ('gold', 2.5, 1, true, 'Diskon 2.5% + 1 upgrade kamar gratis + prioritas dukungan'),
  ('platinum', 5.0, 2, true, 'Diskon 5% + 2 upgrade kamar gratis + prioritas dukungan')
ON CONFLICT (tier_level) DO NOTHING;

CREATE OR REPLACE FUNCTION public.apply_tier_discount(_customer_id uuid, _base_amount numeric)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_tier text;
  v_pct numeric := 0;
  v_disc numeric;
BEGIN
  SELECT tier_level INTO v_tier FROM loyalty_points WHERE customer_id = _customer_id;
  IF v_tier IS NULL THEN v_tier := 'silver'; END IF;
  SELECT discount_percent INTO v_pct FROM tier_benefits WHERE tier_level = v_tier;
  v_pct := COALESCE(v_pct, 0);
  v_disc := ROUND(_base_amount * v_pct / 100, 0);
  RETURN jsonb_build_object(
    'tier', v_tier,
    'discount_percent', v_pct,
    'discount_amount', v_disc,
    'final_amount', _base_amount - v_disc
  );
END $$;

-- ============================================
-- KEP-FIX5: Daily Attendance in Holy Land
-- ============================================
CREATE TABLE IF NOT EXISTS public.jamaah_daily_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  departure_id uuid NOT NULL REFERENCES public.departures(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  attendance_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'hadir' CHECK (status IN ('hadir','sakit','izin','hilang')),
  location text,
  notes text,
  photo_url text,
  recorded_by uuid,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(departure_id, customer_id, attendance_date)
);
CREATE INDEX IF NOT EXISTS jdaily_dep_date_idx ON public.jamaah_daily_attendance(departure_id, attendance_date);
ALTER TABLE public.jamaah_daily_attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage daily attendance" ON public.jamaah_daily_attendance;
CREATE POLICY "Admins manage daily attendance" ON public.jamaah_daily_attendance
FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Operational manage daily attendance" ON public.jamaah_daily_attendance;
CREATE POLICY "Operational manage daily attendance" ON public.jamaah_daily_attendance
FOR ALL TO authenticated USING (has_role(auth.uid(), 'operational'::app_role))
WITH CHECK (has_role(auth.uid(), 'operational'::app_role));

DROP POLICY IF EXISTS "Customers see own attendance" ON public.jamaah_daily_attendance;
CREATE POLICY "Customers see own attendance" ON public.jamaah_daily_attendance
FOR SELECT TO authenticated USING (
  customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
);
