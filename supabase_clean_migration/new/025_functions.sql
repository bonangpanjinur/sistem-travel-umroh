-- =============================================================================
-- VINSTOUR TRAVEL PORTAL — Clean Migration v2
-- FILE 025: Business Logic Functions
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 0a. is_staff() — TRUE jika user punya role selain customer/jamaah
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_staff(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = p_user_id
      AND ur.role NOT IN ('customer', 'jamaah')
      AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
  );
$$;

-- ---------------------------------------------------------------------------
-- 0b. is_admin_or_above() — TRUE jika user punya role super_admin/owner/it/admin
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin_or_above(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = p_user_id
      AND ur.role IN ('super_admin', 'owner', 'it', 'admin')
      AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
  );
$$;

-- ---------------------------------------------------------------------------
-- 1. generate_booking_code() — Generate kode booking unik
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_booking_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prefix  TEXT := 'VT';
  v_date    TEXT := TO_CHAR(NOW(), 'YYYYMM');
  v_seq     INTEGER;
  v_code    TEXT;
BEGIN
  -- Ambil nomor urut bulan ini
  SELECT COALESCE(MAX(
    NULLIF(REGEXP_REPLACE(booking_code, '^VT\d{6}', '', 'g'), '')::INTEGER
  ), 0) + 1
  INTO v_seq
  FROM public.bookings
  WHERE booking_code LIKE v_prefix || v_date || '%';

  v_code := v_prefix || v_date || LPAD(v_seq::TEXT, 4, '0');

  -- Pastikan unik
  WHILE EXISTS (SELECT 1 FROM public.bookings WHERE booking_code = v_code) LOOP
    v_seq := v_seq + 1;
    v_code := v_prefix || v_date || LPAD(v_seq::TEXT, 4, '0');
  END LOOP;

  RETURN v_code;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2. generate_payment_code() — Generate kode payment unik
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_payment_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code TEXT;
  v_seq  INTEGER;
BEGIN
  SELECT COALESCE(MAX(
    NULLIF(REGEXP_REPLACE(payment_code, '^PAY\d{6}', '', 'g'), '')::INTEGER
  ), 0) + 1
  INTO v_seq
  FROM public.payments
  WHERE payment_code LIKE 'PAY' || TO_CHAR(NOW(), 'YYYYMM') || '%';

  v_code := 'PAY' || TO_CHAR(NOW(), 'YYYYMM') || LPAD(v_seq::TEXT, 4, '0');

  WHILE EXISTS (SELECT 1 FROM public.payments WHERE payment_code = v_code) LOOP
    v_seq := v_seq + 1;
    v_code := 'PAY' || TO_CHAR(NOW(), 'YYYYMM') || LPAD(v_seq::TEXT, 4, '0');
  END LOOP;

  RETURN v_code;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. generate_savings_payment_code() — Kode setoran tabungan
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_savings_payment_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code TEXT;
  v_seq  INTEGER;
BEGIN
  SELECT COALESCE(MAX(
    NULLIF(REGEXP_REPLACE(deposit_code, '^SAV\d{6}', '', 'g'), '')::INTEGER
  ), 0) + 1
  INTO v_seq
  FROM public.savings_deposits
  WHERE deposit_code LIKE 'SAV' || TO_CHAR(NOW(), 'YYYYMM') || '%';

  v_code := 'SAV' || TO_CHAR(NOW(), 'YYYYMM') || LPAD(v_seq::TEXT, 4, '0');

  WHILE EXISTS (SELECT 1 FROM public.savings_deposits WHERE deposit_code = v_code) LOOP
    v_seq := v_seq + 1;
    v_code := 'SAV' || TO_CHAR(NOW(), 'YYYYMM') || LPAD(v_seq::TEXT, 4, '0');
  END LOOP;

  RETURN v_code;
END;
$$;

-- ---------------------------------------------------------------------------
-- 4. validate_registration_context(agent_slug, branch_slug)
-- Validasi context registrasi jamaah (dari slug referral)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.validate_registration_context(
  p_agent_slug  TEXT DEFAULT NULL,
  p_branch_slug TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agent  RECORD;
  v_branch RECORD;
  v_result JSONB := '{}'::JSONB;
BEGIN
  IF p_agent_slug IS NOT NULL THEN
    SELECT id, company_name, status
    INTO v_agent
    FROM public.agents
    WHERE slug = p_agent_slug AND status = 'active'
    LIMIT 1;

    IF v_agent IS NULL THEN
      RETURN jsonb_build_object('valid', FALSE, 'error', 'Agen tidak ditemukan atau tidak aktif');
    END IF;

    v_result := v_result || jsonb_build_object(
      'agent_id', v_agent.id,
      'agent_name', v_agent.company_name
    );
  END IF;

  IF p_branch_slug IS NOT NULL THEN
    SELECT id, name, is_active
    INTO v_branch
    FROM public.branches
    WHERE slug = p_branch_slug AND is_active = TRUE
    LIMIT 1;

    IF v_branch IS NULL THEN
      RETURN jsonb_build_object('valid', FALSE, 'error', 'Cabang tidak ditemukan atau tidak aktif');
    END IF;

    v_result := v_result || jsonb_build_object(
      'branch_id', v_branch.id,
      'branch_name', v_branch.name
    );
  END IF;

  RETURN jsonb_build_object('valid', TRUE, 'data', v_result);
END;
$$;

-- ---------------------------------------------------------------------------
-- 5. create_customer_account(user_id, agent_slug, branch_slug)
-- Buat akun portal jamaah setelah registrasi
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_customer_account(
  p_user_id      UUID,
  p_agent_slug   TEXT DEFAULT NULL,
  p_branch_slug  TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agent_id  UUID;
  v_branch_id UUID;
  v_profile   RECORD;
  v_account   UUID;
BEGIN
  -- Lookup agent + branch
  IF p_agent_slug IS NOT NULL THEN
    SELECT id INTO v_agent_id FROM public.agents
    WHERE slug = p_agent_slug AND status = 'active' LIMIT 1;
  END IF;

  IF p_branch_slug IS NOT NULL THEN
    SELECT id INTO v_branch_id FROM public.branches
    WHERE slug = p_branch_slug AND is_active = TRUE LIMIT 1;
  END IF;

  -- Get profile
  SELECT * INTO v_profile FROM public.profiles WHERE id = p_user_id;

  -- Buat atau update customer_accounts
  INSERT INTO public.customer_accounts
    (user_id, referred_by_agent_id, referred_by_branch_id, agent_slug, branch_slug)
  VALUES
    (p_user_id, v_agent_id, v_branch_id, p_agent_slug, p_branch_slug)
  ON CONFLICT (user_id) DO NOTHING
  RETURNING id INTO v_account;

  RETURN jsonb_build_object(
    'success', TRUE,
    'account_id', v_account,
    'agent_id', v_agent_id,
    'branch_id', v_branch_id
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', FALSE, 'error', SQLERRM);
END;
$$;

-- ---------------------------------------------------------------------------
-- 6. convert_savings_to_booking(plan_id, departure_id, room_type)
-- Konversi tabungan jamaah menjadi booking resmi
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.convert_savings_to_booking(
  p_plan_id      UUID,
  p_departure_id UUID,
  p_room_type    TEXT DEFAULT 'quad'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan      RECORD;
  v_departure RECORD;
  v_package   RECORD;
  v_price     NUMERIC;
  v_book_id   UUID;
  v_book_code TEXT;
BEGIN
  -- Load savings plan
  SELECT * INTO v_plan FROM public.savings_plans WHERE id = p_plan_id AND status = 'active';
  IF v_plan IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Tabungan tidak aktif');
  END IF;

  -- Load departure
  SELECT * INTO v_departure FROM public.departures WHERE id = p_departure_id AND status = 'open';
  IF v_departure IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Keberangkatan tidak tersedia');
  END IF;

  -- Get price based on room type
  SELECT CASE p_room_type
    WHEN 'quad'   THEN COALESCE(v_departure.price_quad,   0)
    WHEN 'triple' THEN COALESCE(v_departure.price_triple, 0)
    WHEN 'double' THEN COALESCE(v_departure.price_double, 0)
    WHEN 'single' THEN COALESCE(v_departure.price_single, 0)
    ELSE 0
  END INTO v_price;

  -- Generate kode booking
  v_book_code := public.generate_booking_code();

  -- Buat booking
  INSERT INTO public.bookings
    (booking_code, customer_id, departure_id, agent_id, branch_id,
     room_type, total_pax, total_price, paid_amount, payment_status,
     status, source)
  SELECT
    v_book_code,
    c.id,
    p_departure_id,
    v_plan.agent_id,
    v_plan.branch_id,
    p_room_type,
    1,
    v_price,
    v_plan.saved_amount,
    CASE WHEN v_plan.saved_amount >= v_price THEN 'paid' ELSE 'partial' END,
    'confirmed',
    'portal'
  FROM public.customers c
    JOIN public.customer_accounts ca ON ca.customer_id = c.id
  WHERE ca.user_id = v_plan.customer_id
  RETURNING id INTO v_book_id;

  -- Update savings plan
  UPDATE public.savings_plans
  SET status = 'converted', converted_booking_id = v_book_id, converted_at = NOW()
  WHERE id = p_plan_id;

  RETURN jsonb_build_object(
    'success', TRUE,
    'booking_id', v_book_id,
    'booking_code', v_book_code
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', FALSE, 'error', SQLERRM);
END;
$$;

-- ---------------------------------------------------------------------------
-- 7. recalculate_departure_financial_summary(departure_id)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.recalculate_departure_financial_summary(
  p_departure_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dep RECORD;
  v_revenue_gross      NUMERIC := 0;
  v_revenue_paid       NUMERIC := 0;
  v_revenue_refunded   NUMERIC := 0;
  v_pax_confirmed      INTEGER := 0;
  v_pax_cancelled      INTEGER := 0;
  v_hpp_total          NUMERIC := 0;
  v_expense_total      NUMERIC := 0;
  v_other_revenue      NUMERIC := 0;
BEGIN
  -- Revenue from bookings
  SELECT
    COALESCE(SUM(b.total_price - b.discount_amount) FILTER (WHERE b.status NOT IN ('cancelled')), 0),
    COALESCE(SUM(b.paid_amount) FILTER (WHERE b.status NOT IN ('cancelled')), 0),
    COALESCE(SUM(b.total_pax) FILTER (WHERE b.status NOT IN ('cancelled')), 0),
    COALESCE(SUM(b.total_pax) FILTER (WHERE b.status = 'cancelled'), 0)
  INTO v_revenue_gross, v_revenue_paid, v_pax_confirmed, v_pax_cancelled
  FROM public.bookings b
  WHERE b.departure_id = p_departure_id;

  -- Refunded
  SELECT COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'refunded'), 0)
  INTO v_revenue_refunded
  FROM public.payments p
    JOIN public.bookings b ON b.id = p.booking_id
  WHERE b.departure_id = p_departure_id;

  -- HPP
  SELECT COALESCE(SUM(dci.total_cost_idr), 0)
  INTO v_hpp_total
  FROM public.departure_cost_items dci
  WHERE dci.departure_id = p_departure_id AND dci.is_planned = FALSE;

  -- Expenses
  SELECT COALESCE(SUM(de.amount_idr), 0)
  INTO v_expense_total
  FROM public.departure_expenses de
  WHERE de.departure_id = p_departure_id AND de.status = 'approved';

  -- Other revenues
  SELECT COALESCE(SUM(dor.amount_idr), 0)
  INTO v_other_revenue
  FROM public.departure_other_revenues dor
  WHERE dor.departure_id = p_departure_id;

  SELECT * INTO v_dep FROM public.departures WHERE id = p_departure_id;

  -- Upsert summary
  INSERT INTO public.departure_financial_summary
    (departure_id, quota, pax_confirmed, pax_cancelled,
     revenue_gross, revenue_paid, revenue_outstanding, revenue_refunded,
     hpp_total, expense_total, other_revenue_total, last_calculated_at)
  VALUES
    (p_departure_id, v_dep.quota, v_pax_confirmed, v_pax_cancelled,
     v_revenue_gross, v_revenue_paid, GREATEST(0, v_revenue_gross - v_revenue_paid), v_revenue_refunded,
     v_hpp_total, v_expense_total, v_other_revenue, NOW())
  ON CONFLICT (departure_id) DO UPDATE SET
    quota                = EXCLUDED.quota,
    pax_confirmed        = EXCLUDED.pax_confirmed,
    pax_cancelled        = EXCLUDED.pax_cancelled,
    revenue_gross        = EXCLUDED.revenue_gross,
    revenue_paid         = EXCLUDED.revenue_paid,
    revenue_outstanding  = EXCLUDED.revenue_outstanding,
    revenue_refunded     = EXCLUDED.revenue_refunded,
    hpp_total            = EXCLUDED.hpp_total,
    expense_total        = EXCLUDED.expense_total,
    other_revenue_total  = EXCLUDED.other_revenue_total,
    last_calculated_at   = NOW(),
    updated_at           = NOW();

  RETURN jsonb_build_object('success', TRUE, 'departure_id', p_departure_id);
END;
$$;

-- ---------------------------------------------------------------------------
-- 8. increment_package_view_count(package_id)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.increment_package_view_count(p_package_id UUID)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.packages SET view_count = view_count + 1 WHERE id = p_package_id;
$$;

-- ---------------------------------------------------------------------------
-- 9. list_users_with_emails() — List user dengan email (admin only)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.list_users_with_emails()
RETURNS TABLE (
  id         UUID,
  email      TEXT,
  full_name  TEXT,
  role       public.app_role,
  is_active  BOOLEAN,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin_or_above(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.email,
    p.full_name,
    public.get_user_primary_role(p.id) AS role,
    p.is_active,
    p.created_at
  FROM public.profiles p
  ORDER BY p.created_at DESC;
END;
$$;

-- ---------------------------------------------------------------------------
-- 10. bulk_distribute_equipment(departure_id, item_id)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.bulk_distribute_equipment(
  p_departure_id    UUID,
  p_equipment_id    UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER := 0;
  v_rec   RECORD;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  FOR v_rec IN
    SELECT bp.id AS passenger_id
    FROM public.booking_passengers bp
      JOIN public.bookings b ON b.id = bp.booking_id
    WHERE b.departure_id = p_departure_id
      AND b.status NOT IN ('cancelled')
      AND NOT EXISTS (
        SELECT 1 FROM public.equipment_distributions ed
        WHERE ed.booking_passenger_id = bp.id
          AND ed.equipment_item_id = p_equipment_id
          AND ed.status NOT IN ('returned','lost')
      )
  LOOP
    INSERT INTO public.equipment_distributions
      (equipment_item_id, booking_passenger_id, departure_id,
       distributed_by, status)
    VALUES
      (p_equipment_id, v_rec.passenger_id, p_departure_id,
       auth.uid(), 'distributed');
    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object('success', TRUE, 'distributed_count', v_count);
END;
$$;

-- ---------------------------------------------------------------------------
-- 11. confirm_equipment_receipt(distribution_id)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.confirm_equipment_receipt(p_distribution_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.equipment_distributions
  SET status = 'received', received_at = NOW()
  WHERE id = p_distribution_id AND status = 'distributed';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Distribution not found or already received');
  END IF;

  RETURN jsonb_build_object('success', TRUE);
END;
$$;
