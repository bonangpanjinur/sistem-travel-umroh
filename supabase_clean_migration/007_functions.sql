-- =============================================================================
-- VINSTOUR TRAVEL PORTAL — Clean Migration Chain
-- FILE 007: Stored Functions & RPCs
-- Run AFTER 006. All CREATE OR REPLACE — idempotent.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. GENERATE_BOOKING_CODE — Unique booking code VT-YYYYMMDD-NNNNN
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_booking_code()
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE v_code TEXT;
BEGIN
  LOOP
    v_code := 'VT-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' ||
              LPAD(FLOOR(RANDOM() * 99999 + 1)::TEXT, 5, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.bookings WHERE booking_code = v_code);
  END LOOP;
  RETURN v_code;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2. GENERATE_STORE_ORDER_NUMBER — Unique store order number TK-YYYYMMDD-NNNNN
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_store_order_number()
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE v_number TEXT;
BEGIN
  LOOP
    v_number := 'TK-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' ||
                LPAD(FLOOR(RANDOM() * 99999 + 1)::TEXT, 5, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.store_orders WHERE order_number = v_number);
  END LOOP;
  RETURN v_number;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. HOLD_DEPARTURE_SEATS — Decrement available seats (with row lock)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.hold_departure_seats(p_departure_id UUID, p_seats INTEGER)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_available INTEGER;
BEGIN
  SELECT available_seats INTO v_available
  FROM public.departures WHERE id = p_departure_id FOR UPDATE;

  IF v_available IS NULL OR v_available < p_seats THEN RETURN FALSE; END IF;

  UPDATE public.departures
  SET available_seats = available_seats - p_seats,
      status = CASE
        WHEN available_seats - p_seats <= 0 THEN 'full'
        ELSE status
      END
  WHERE id = p_departure_id;

  RETURN TRUE;
END;
$$;

-- ---------------------------------------------------------------------------
-- 4. RELEASE_DEPARTURE_SEATS — Return seats when booking is cancelled
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.release_departure_seats(p_departure_id UUID, p_seats INTEGER)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.departures
  SET available_seats = LEAST(quota, available_seats + p_seats),
      status = CASE WHEN status = 'full' THEN 'open' ELSE status END
  WHERE id = p_departure_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- 5. DELETE_DEPARTURE_SAFELY — Delete departure only if no active bookings
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.delete_departure_safely(p_departure_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.bookings
  WHERE departure_id = p_departure_id
    AND status NOT IN ('cancelled');

  IF v_count > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Tidak dapat menghapus: terdapat ' || v_count || ' booking aktif'
    );
  END IF;

  DELETE FROM public.departures WHERE id = p_departure_id;
  RETURN jsonb_build_object('success', true, 'message', 'Keberangkatan berhasil dihapus');
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_departure_safely(UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- 6. CONVERT_SAVINGS_TO_BOOKING — Convert savings plan into a booking
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.convert_savings_to_booking(
  p_plan_id      UUID,
  p_departure_id UUID,
  p_room_type    TEXT DEFAULT 'quad'
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_plan         public.savings_plans;
  v_booking_code TEXT;
  v_booking_id   UUID;
BEGIN
  SELECT * INTO v_plan FROM public.savings_plans WHERE id = p_plan_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Tabungan tidak ditemukan');
  END IF;

  v_booking_code := public.generate_booking_code();

  INSERT INTO public.bookings (
    customer_id, departure_id, booking_code, status,
    total_price, paid_amount, payment_status, room_type
  ) VALUES (
    v_plan.customer_id, p_departure_id, v_booking_code, 'pending',
    0, v_plan.current_amount, 'partial', p_room_type
  ) RETURNING id INTO v_booking_id;

  UPDATE public.savings_plans SET status = 'completed' WHERE id = p_plan_id;

  RETURN jsonb_build_object(
    'success',      true,
    'booking_id',   v_booking_id,
    'booking_code', v_booking_code
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.convert_savings_to_booking(UUID, UUID, TEXT) TO authenticated;

-- ---------------------------------------------------------------------------
-- 7. CREATE_CUSTOMER_ACCOUNT — Upsert customer portal account
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_customer_account(
  p_user_id     UUID,
  p_agent_id    UUID  DEFAULT NULL,
  p_branch_id   UUID  DEFAULT NULL,
  p_agent_slug  TEXT  DEFAULT NULL,
  p_branch_slug TEXT  DEFAULT NULL
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_account_id UUID;
BEGIN
  INSERT INTO public.customer_accounts (
    user_id, referred_by_agent_id, referred_by_branch_id, agent_slug, branch_slug
  ) VALUES (
    p_user_id, p_agent_id, p_branch_id, p_agent_slug, p_branch_slug
  )
  ON CONFLICT (user_id) DO UPDATE SET
    referred_by_agent_id  = COALESCE(customer_accounts.referred_by_agent_id,  EXCLUDED.referred_by_agent_id),
    referred_by_branch_id = COALESCE(customer_accounts.referred_by_branch_id, EXCLUDED.referred_by_branch_id),
    agent_slug            = COALESCE(customer_accounts.agent_slug,  EXCLUDED.agent_slug),
    branch_slug           = COALESCE(customer_accounts.branch_slug, EXCLUDED.branch_slug),
    updated_at            = NOW()
  RETURNING id INTO v_account_id;
  RETURN v_account_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_customer_account(UUID,UUID,UUID,TEXT,TEXT) TO authenticated;

-- ---------------------------------------------------------------------------
-- 8. INCREMENT_WEBSITE_VIEW — Increment view counter for agent/branch site
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.increment_website_view(
  p_agent_id  UUID DEFAULT NULL,
  p_branch_id UUID DEFAULT NULL
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF p_agent_id IS NOT NULL THEN
    UPDATE public.website_settings
    SET view_count = COALESCE(view_count, 0) + 1
    WHERE agent_id = p_agent_id;
  ELSIF p_branch_id IS NOT NULL THEN
    UPDATE public.website_settings
    SET view_count = COALESCE(view_count, 0) + 1
    WHERE branch_id = p_branch_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_website_view(UUID, UUID) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 9. GET_PUBLIC_BOOKING_DETAILS — Public booking status (no auth required)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_public_booking_details(p_booking_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_result       JSONB;
  v_booking      RECORD;
  v_customer     RECORD;
  v_departure    RECORD;
  v_package      RECORD;
  v_phone_masked TEXT;
  v_remaining    NUMERIC;
  v_total_pax    INTEGER;
BEGIN
  SELECT b.id, b.booking_code, b.status AS booking_status, b.payment_status,
         b.total_price, b.paid_amount, b.room_type, b.created_at,
         b.customer_id, b.departure_id
  INTO v_booking
  FROM public.bookings b WHERE b.id = p_booking_id LIMIT 1;

  IF NOT FOUND THEN RETURN NULL; END IF;

  v_remaining := GREATEST(0, COALESCE(v_booking.total_price, 0) - COALESCE(v_booking.paid_amount, 0));

  SELECT c.full_name, c.phone INTO v_customer
  FROM public.customers c WHERE c.id = v_booking.customer_id LIMIT 1;

  IF v_customer.phone IS NOT NULL AND length(v_customer.phone) >= 4 THEN
    v_phone_masked := repeat('*', GREATEST(0, length(v_customer.phone) - 4))
                      || right(v_customer.phone, 4);
  ELSE
    v_phone_masked := v_customer.phone;
  END IF;

  SELECT COUNT(*)::INTEGER INTO v_total_pax
  FROM public.booking_passengers bp WHERE bp.booking_id = p_booking_id;
  IF v_total_pax IS NULL OR v_total_pax = 0 THEN v_total_pax := 1; END IF;

  IF v_booking.departure_id IS NOT NULL THEN
    SELECT d.departure_date, d.return_date, d.package_id INTO v_departure
    FROM public.departures d WHERE d.id = v_booking.departure_id LIMIT 1;
    IF FOUND AND v_departure.package_id IS NOT NULL THEN
      SELECT p.name, p.code INTO v_package
      FROM public.packages p WHERE p.id = v_departure.package_id LIMIT 1;
    END IF;
  END IF;

  v_result := jsonb_build_object(
    'id',               v_booking.id,
    'booking_code',     v_booking.booking_code,
    'booking_status',   v_booking.booking_status,
    'payment_status',   CASE v_booking.payment_status
                          WHEN 'unpaid'  THEN 'pending'
                          WHEN 'partial' THEN 'partial'
                          WHEN 'paid'    THEN 'paid'
                          ELSE v_booking.payment_status
                        END,
    'total_price',      COALESCE(v_booking.total_price, 0),
    'paid_amount',      COALESCE(v_booking.paid_amount, 0),
    'remaining_amount', v_remaining,
    'currency',         'IDR',
    'room_type',        COALESCE(v_booking.room_type, 'quad'),
    'total_pax',        v_total_pax,
    'created_at',       v_booking.created_at,
    'customer', CASE WHEN v_customer IS NOT NULL THEN
                  jsonb_build_object(
                    'full_name',    COALESCE(v_customer.full_name, '—'),
                    'phone_masked', v_phone_masked
                  ) ELSE NULL END,
    'departure', CASE WHEN v_departure IS NOT NULL THEN
                  jsonb_build_object(
                    'departure_date', v_departure.departure_date,
                    'return_date',    v_departure.return_date,
                    'package', CASE WHEN v_package IS NOT NULL THEN
                                 jsonb_build_object(
                                   'name', COALESCE(v_package.name, '—'),
                                   'code', COALESCE(v_package.code, '—')
                                 ) ELSE NULL END
                  ) ELSE NULL END
  );

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_booking_details(UUID) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 10. GET_WA_CONFIG_SAFE — Return WA config without exposing api_key
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_wa_config_safe()
RETURNS TABLE (
  id              UUID,
  provider        TEXT,
  display_name    TEXT,
  sender_number   TEXT,
  is_active       BOOLEAN,
  provider_config JSONB,
  api_key_set     BOOLEAN,
  api_key_hint    TEXT,
  last_tested_at  TIMESTAMPTZ,
  last_test_ok    BOOLEAN,
  updated_by      UUID,
  updated_at      TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
    SELECT
      wc.id,
      wc.provider,
      wc.display_name,
      wc.sender_number,
      wc.is_active,
      wc.provider_config - 'api_token' - 'token' - 'api_key'
                         - 'access_token' - 'auth_header' - 'webhook_secret'
                                                                   AS provider_config,
      (wc.api_key IS NOT NULL AND wc.api_key <> '')                AS api_key_set,
      CASE
        WHEN wc.api_key IS NULL OR wc.api_key = '' THEN NULL
        ELSE '••••' || RIGHT(wc.api_key, 4)
      END                                                           AS api_key_hint,
      wc.last_tested_at,
      wc.last_test_ok,
      wc.updated_by,
      wc.updated_at
    FROM public.whatsapp_config wc;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_wa_config_safe() TO authenticated;

-- ---------------------------------------------------------------------------
-- 11. PREVIEW_AUTO_SCHEDULE_REMINDERS — Dry-run payment reminder scheduler
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.preview_auto_schedule_reminders(
  p_days_before INTEGER[] DEFAULT ARRAY[7, 3]
)
RETURNS TABLE (
  days_before      INTEGER,
  booking_id       UUID,
  booking_code     TEXT,
  full_name        TEXT,
  phone            TEXT,
  payment_deadline DATE,
  remaining_amount NUMERIC,
  already_exists   BOOLEAN
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_day INTEGER;
BEGIN
  FOREACH v_day IN ARRAY p_days_before LOOP
    RETURN QUERY
      SELECT
        v_day                    AS days_before,
        b.id                     AS booking_id,
        b.booking_code           AS booking_code,
        c.full_name              AS full_name,
        c.phone                  AS phone,
        b.payment_deadline       AS payment_deadline,
        b.remaining_amount       AS remaining_amount,
        EXISTS (
          SELECT 1 FROM public.payment_deadline_reminders pdr
          WHERE pdr.booking_id = b.id
            AND pdr.days_before = v_day
            AND pdr.status IN ('pending','sent')
        )                        AS already_exists
      FROM public.bookings b
      JOIN public.customers c ON c.id = b.customer_id
      WHERE b.payment_status IN ('unpaid','partial')
        AND b.status NOT IN ('cancelled','completed')
        AND b.payment_deadline IS NOT NULL
        AND b.payment_deadline >= CURRENT_DATE
        AND b.payment_deadline <= CURRENT_DATE + (v_day || ' days')::INTERVAL
        AND c.phone IS NOT NULL
      ORDER BY b.payment_deadline ASC;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.preview_auto_schedule_reminders(INTEGER[]) TO authenticated;

-- ---------------------------------------------------------------------------
-- 12. AUTO_SCHEDULE_PAYMENT_REMINDERS — Create pending reminder rows
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.auto_schedule_payment_reminders(
  p_days_before INTEGER[] DEFAULT ARRAY[7, 3]
)
RETURNS TABLE (created_count INTEGER, skipped_count INTEGER)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_day      INTEGER;
  v_created  INTEGER := 0;
  v_skipped  INTEGER := 0;
  v_row      RECORD;
  v_inserted INTEGER;
BEGIN
  FOREACH v_day IN ARRAY p_days_before LOOP
    FOR v_row IN
      SELECT b.id AS booking_id, b.booking_code, b.payment_deadline,
             b.remaining_amount, c.phone, c.full_name
      FROM public.bookings b
      JOIN public.customers c ON c.id = b.customer_id
      WHERE b.payment_status IN ('unpaid','partial')
        AND b.status NOT IN ('cancelled','completed')
        AND b.payment_deadline IS NOT NULL
        AND b.payment_deadline >= CURRENT_DATE
        AND b.payment_deadline <= CURRENT_DATE + (v_day || ' days')::INTERVAL
        AND c.phone IS NOT NULL
    LOOP
      INSERT INTO public.payment_deadline_reminders (
        booking_id, booking_code, phone, full_name,
        payment_deadline, remaining_amount, days_before, status
      ) VALUES (
        v_row.booking_id, v_row.booking_code, v_row.phone, v_row.full_name,
        v_row.payment_deadline, v_row.remaining_amount, v_day, 'pending'
      )
      ON CONFLICT (booking_id, days_before) DO UPDATE
        SET remaining_amount = EXCLUDED.remaining_amount,
            phone            = EXCLUDED.phone,
            full_name        = EXCLUDED.full_name,
            payment_deadline = EXCLUDED.payment_deadline,
            status           = CASE
                                 WHEN payment_deadline_reminders.status = 'cancelled'
                                 THEN 'pending'
                                 ELSE payment_deadline_reminders.status
                               END,
            updated_at       = NOW()
        WHERE payment_deadline_reminders.status = 'cancelled';

      GET DIAGNOSTICS v_inserted = ROW_COUNT;
      IF v_inserted > 0 THEN v_created := v_created + 1;
      ELSE v_skipped := v_skipped + 1;
      END IF;
    END LOOP;
  END LOOP;

  RETURN QUERY SELECT v_created, v_skipped;
END;
$$;

GRANT EXECUTE ON FUNCTION public.auto_schedule_payment_reminders(INTEGER[]) TO authenticated;

-- ---------------------------------------------------------------------------
-- 13. RECALCULATE_DEPARTURE_FINANCIAL_SUMMARY — Rebuild P&L snapshot
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.recalculate_departure_financial_summary(p_departure_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_quota         INTEGER;
  v_pax_confirmed INTEGER;
  v_pax_cancelled INTEGER;
  v_rev_gross     NUMERIC;
  v_rev_paid      NUMERIC;
  v_rev_refunded  NUMERIC;
  v_hpp           NUMERIC;
  v_expense       NUMERIC;
  v_other_rev     NUMERIC;
BEGIN
  SELECT COALESCE(quota, 0) INTO v_quota
  FROM public.departures WHERE id = p_departure_id;

  SELECT
    COALESCE(SUM(CASE WHEN status IN ('confirmed','completed') THEN total_pax   ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN status = 'cancelled'               THEN total_pax   ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN status IN ('confirmed','completed') THEN total_price ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN status IN ('confirmed','completed') THEN paid_amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN payment_status = 'refunded'        THEN paid_amount ELSE 0 END), 0)
  INTO v_pax_confirmed, v_pax_cancelled, v_rev_gross, v_rev_paid, v_rev_refunded
  FROM public.bookings WHERE departure_id = p_departure_id;

  SELECT COALESCE(SUM(total_cost_idr), 0) INTO v_hpp
  FROM public.departure_cost_items WHERE departure_id = p_departure_id;

  SELECT COALESCE(SUM(amount_idr), 0) INTO v_expense
  FROM public.departure_expenses WHERE departure_id = p_departure_id;

  SELECT COALESCE(SUM(amount_idr), 0) INTO v_other_rev
  FROM public.departure_other_revenues WHERE departure_id = p_departure_id;

  INSERT INTO public.departure_financial_summary (
    departure_id, quota, pax_confirmed, pax_cancelled,
    revenue_gross, revenue_paid, revenue_outstanding, revenue_refunded,
    hpp_total, expense_total, other_revenue_total,
    last_calculated_at, updated_at
  ) VALUES (
    p_departure_id, v_quota, v_pax_confirmed, v_pax_cancelled,
    v_rev_gross, v_rev_paid, v_rev_gross - v_rev_paid, v_rev_refunded,
    v_hpp, v_expense, v_other_rev, NOW(), NOW()
  )
  ON CONFLICT (departure_id) DO UPDATE SET
    quota               = EXCLUDED.quota,
    pax_confirmed       = EXCLUDED.pax_confirmed,
    pax_cancelled       = EXCLUDED.pax_cancelled,
    revenue_gross       = EXCLUDED.revenue_gross,
    revenue_paid        = EXCLUDED.revenue_paid,
    revenue_outstanding = EXCLUDED.revenue_outstanding,
    revenue_refunded    = EXCLUDED.revenue_refunded,
    hpp_total           = EXCLUDED.hpp_total,
    expense_total       = EXCLUDED.expense_total,
    other_revenue_total = EXCLUDED.other_revenue_total,
    last_calculated_at  = NOW(),
    updated_at          = NOW();
END;
$$;

GRANT EXECUTE ON FUNCTION public.recalculate_departure_financial_summary(UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- 14. GET_DASHBOARD_STATS — Summary stats for admin dashboard
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_dashboard_stats(
  p_branch_id UUID DEFAULT NULL,
  p_from_date DATE DEFAULT DATE_TRUNC('month', CURRENT_DATE)::DATE,
  p_to_date   DATE DEFAULT CURRENT_DATE
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'bookings_total',       COUNT(*)                                             FILTER (WHERE b.created_at::DATE BETWEEN p_from_date AND p_to_date),
    'bookings_confirmed',   COUNT(*) FILTER (WHERE b.status = 'confirmed'        AND b.created_at::DATE BETWEEN p_from_date AND p_to_date),
    'bookings_pending',     COUNT(*) FILTER (WHERE b.status = 'pending'          AND b.created_at::DATE BETWEEN p_from_date AND p_to_date),
    'bookings_cancelled',   COUNT(*) FILTER (WHERE b.status = 'cancelled'        AND b.created_at::DATE BETWEEN p_from_date AND p_to_date),
    'revenue_total',        COALESCE(SUM(b.paid_amount) FILTER (WHERE b.created_at::DATE BETWEEN p_from_date AND p_to_date), 0),
    'revenue_outstanding',  COALESCE(SUM(b.remaining_amount) FILTER (WHERE b.payment_status NOT IN ('paid','refunded') AND b.status NOT IN ('cancelled')), 0),
    'customers_total',      (SELECT COUNT(*) FROM public.customers),
    'departures_upcoming',  (SELECT COUNT(*) FROM public.departures WHERE departure_date >= CURRENT_DATE AND status IN ('open','full'))
  )
  INTO v_result
  FROM public.bookings b
  WHERE (p_branch_id IS NULL OR b.branch_id = p_branch_id);

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_dashboard_stats(UUID, DATE, DATE) TO authenticated;

-- ---------------------------------------------------------------------------
-- 15. PURGE_EXPIRED_SEAT_LOCKS — Clean up expired seat holds
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.purge_expired_seat_locks()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_count INTEGER;
BEGIN
  DELETE FROM public.booking_seat_locks
  WHERE expires_at < NOW();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.purge_expired_seat_locks() TO service_role;

-- Grant remaining utility functions
GRANT EXECUTE ON FUNCTION public.slugify_text(TEXT)               TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.update_updated_at()              TO authenticated, service_role;

SELECT '007_functions: OK' AS result;
