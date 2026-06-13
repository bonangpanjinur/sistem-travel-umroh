-- =============================================================================
-- VINSTOUR TRAVEL PORTAL — Clean Migration v2
-- FILE 026: Triggers
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Helper: set_updated_at() — Auto-update timestamp
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

-- Daftar tabel yang membutuhkan auto-updated_at trigger
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'profiles','branches','agents','muthawifs','employees',
    'membership_plans','agent_commission_tiers','agent_wallets','agent_commissions',
    'customers','customer_accounts','customer_documents',
    'airlines','hotels','vendors','packages','package_hpp_templates',
    'package_labels','package_groups',
    'departures','departure_waiting_list','departure_financial_summary',
    'departure_cost_items','departure_expenses','departure_other_revenues',
    'bookings','booking_passengers','booking_line_items',
    'booking_access_tokens','booking_installment_schedules',
    'payments','savings_plans','savings_deposits','coupons',
    'bank_accounts','withdrawal_requests','invoice_templates',
    'chart_of_accounts','journal_entries','vendor_invoices','commissions',
    'cashflow_entries','scheduled_reports','payroll','payroll_slips',
    'leave_requests','performance_reviews',
    'equipment_items','equipment_distributions',
    'leads','referral_codes','contact_messages','sos_alerts',
    'notifications','notification_templates','email_templates',
    'announcements','banners','whatsapp_config','wa_templates',
    'wa_broadcast_campaigns',
    'website_settings','faqs','testimonials','gallery_items','menu_items',
    'company_settings','user_2fa_settings','user_permission_overrides',
    'permissions_list','role_permissions',
    'approval_configs','approval_requests',
    'visa_applications','manasik_sessions','room_assignments'
  ] LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS trg_set_updated_at ON public.%I;
      CREATE TRIGGER trg_set_updated_at
        BEFORE UPDATE ON public.%I
        FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
    ', t, t);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 1. handle_new_user() — Auto-create profile saat user Supabase baru
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    TRUE
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_handle_new_user ON auth.users;
CREATE TRIGGER trg_handle_new_user
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 2. sync_booking_paid_amount() — Sync paid_amount ke bookings saat payment berubah
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_booking_paid_amount()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking_id UUID;
  v_paid       NUMERIC;
  v_total      NUMERIC;
  v_discount   NUMERIC;
  v_status     TEXT;
BEGIN
  v_booking_id := COALESCE(NEW.booking_id, OLD.booking_id);

  SELECT
    COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'verified'), 0),
    b.total_price,
    b.discount_amount
  INTO v_paid, v_total, v_discount
  FROM public.bookings b
    LEFT JOIN public.payments p ON p.booking_id = b.id
  WHERE b.id = v_booking_id
  GROUP BY b.total_price, b.discount_amount;

  v_status := CASE
    WHEN v_paid <= 0                            THEN 'unpaid'
    WHEN v_paid >= (v_total - v_discount)       THEN 'paid'
    WHEN v_paid > (v_total - v_discount)        THEN 'overpaid'
    ELSE 'partial'
  END;

  UPDATE public.bookings
  SET paid_amount    = v_paid,
      payment_status = v_status,
      updated_at     = NOW()
  WHERE id = v_booking_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_booking_paid ON public.payments;
CREATE TRIGGER trg_sync_booking_paid
  AFTER INSERT OR UPDATE OF status, amount ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.sync_booking_paid_amount();

-- ---------------------------------------------------------------------------
-- 3. sync_departure_seats() — Update available_seats saat booking berubah
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_departure_available_seats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_departure_id UUID;
  v_sold         INTEGER;
BEGIN
  v_departure_id := COALESCE(NEW.departure_id, OLD.departure_id);

  IF v_departure_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT COALESCE(SUM(total_pax), 0)
  INTO v_sold
  FROM public.bookings
  WHERE departure_id = v_departure_id
    AND status NOT IN ('cancelled');

  UPDATE public.departures
  SET available_seats = GREATEST(0, quota - v_sold),
      status = CASE
        WHEN GREATEST(0, quota - v_sold) = 0 AND status = 'open' THEN 'full'
        WHEN GREATEST(0, quota - v_sold) > 0 AND status = 'full' THEN 'open'
        ELSE status
      END,
      updated_at = NOW()
  WHERE id = v_departure_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_departure_seats ON public.bookings;
CREATE TRIGGER trg_sync_departure_seats
  AFTER INSERT OR UPDATE OF status, total_pax, departure_id
    OR DELETE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.sync_departure_available_seats();

-- ---------------------------------------------------------------------------
-- 4. init_agent_wallet() — Buat wallet agen otomatis saat agen baru
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.init_agent_wallet()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.agent_wallets (agent_id)
  VALUES (NEW.id)
  ON CONFLICT (agent_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_init_agent_wallet ON public.agents;
CREATE TRIGGER trg_init_agent_wallet
  AFTER INSERT ON public.agents
  FOR EACH ROW EXECUTE FUNCTION public.init_agent_wallet();

-- ---------------------------------------------------------------------------
-- 5. update_agent_wallet_on_commission() — Kredit wallet saat komisi approved
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_agent_wallet_on_commission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet_id UUID;
BEGIN
  IF NEW.status = 'paid' AND OLD.status != 'paid' AND NEW.paid_to_wallet = TRUE THEN
    SELECT id INTO v_wallet_id FROM public.agent_wallets WHERE agent_id = NEW.agent_id;

    IF v_wallet_id IS NOT NULL THEN
      UPDATE public.agent_wallets
      SET balance        = balance + NEW.amount,
          total_earned   = total_earned + NEW.amount,
          updated_at     = NOW()
      WHERE id = v_wallet_id;

      INSERT INTO public.agent_wallet_transactions
        (wallet_id, type, amount, description, reference_type, reference_id, balance_after)
      SELECT
        v_wallet_id,
        'credit',
        NEW.amount,
        'Komisi booking #' || COALESCE((SELECT booking_code FROM public.bookings WHERE id = NEW.booking_id), 'N/A'),
        'commission',
        NEW.id,
        balance
      FROM public.agent_wallets WHERE id = v_wallet_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_wallet_on_commission ON public.agent_commissions;
CREATE TRIGGER trg_wallet_on_commission
  AFTER UPDATE OF status ON public.agent_commissions
  FOR EACH ROW EXECUTE FUNCTION public.update_agent_wallet_on_commission();

-- ---------------------------------------------------------------------------
-- 6. validate_journal_balance() — Validasi debit = kredit sebelum posting
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.validate_journal_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_debit  NUMERIC;
  v_credit NUMERIC;
BEGIN
  IF NEW.status = 'posted' AND OLD.status = 'draft' THEN
    SELECT
      COALESCE(SUM(debit), 0),
      COALESCE(SUM(credit), 0)
    INTO v_debit, v_credit
    FROM public.journal_lines
    WHERE journal_id = NEW.id;

    IF ABS(v_debit - v_credit) > 0.01 THEN
      RAISE EXCEPTION 'Journal entry tidak balanced: debit=% credit=%', v_debit, v_credit;
    END IF;

    -- Update totals
    NEW.total_debit  := v_debit;
    NEW.total_credit := v_credit;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_journal ON public.journal_entries;
CREATE TRIGGER trg_validate_journal
  BEFORE UPDATE OF status ON public.journal_entries
  FOR EACH ROW EXECUTE FUNCTION public.validate_journal_balance();
