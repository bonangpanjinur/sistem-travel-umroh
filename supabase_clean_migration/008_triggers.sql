-- =============================================================================
-- VINSTOUR TRAVEL PORTAL — Clean Migration Chain
-- FILE 008: Triggers
-- Run AFTER 007. All DROP IF EXISTS + CREATE — idempotent.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Helper: attach update_updated_at trigger to a table
-- Used as a macro below.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- PROFILES
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ---------------------------------------------------------------------------
-- USER_ROLES / ROLE_PERMISSIONS
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_role_permissions_updated_at ON public.role_permissions;
CREATE TRIGGER trg_role_permissions_updated_at
  BEFORE UPDATE ON public.role_permissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ---------------------------------------------------------------------------
-- NOTIFICATION_TEMPLATES
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_notif_templates_updated_at ON public.notification_templates;
CREATE TRIGGER trg_notif_templates_updated_at
  BEFORE UPDATE ON public.notification_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ---------------------------------------------------------------------------
-- PUSH_SUBSCRIPTIONS
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_push_subs_updated_at ON public.push_subscriptions;
CREATE TRIGGER trg_push_subs_updated_at
  BEFORE UPDATE ON public.push_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ---------------------------------------------------------------------------
-- USER_2FA_SETTINGS
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_2fa_settings_updated_at ON public.user_2fa_settings;
CREATE TRIGGER trg_2fa_settings_updated_at
  BEFORE UPDATE ON public.user_2fa_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ---------------------------------------------------------------------------
-- MENU_ITEMS
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_menu_items_updated_at ON public.menu_items;
CREATE TRIGGER trg_menu_items_updated_at
  BEFORE UPDATE ON public.menu_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ---------------------------------------------------------------------------
-- BRANCHES — updated_at + slug auto-generation
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_branches_updated_at ON public.branches;
CREATE TRIGGER trg_branches_updated_at
  BEFORE UPDATE ON public.branches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE OR REPLACE FUNCTION public.set_branch_slug()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  base_slug  TEXT;
  final_slug TEXT;
  counter    INTEGER := 1;
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    base_slug  := public.slugify_text(COALESCE(NEW.name, NEW.code, NEW.id::TEXT));
    final_slug := base_slug;
    WHILE EXISTS (SELECT 1 FROM public.branches WHERE slug = final_slug AND id != NEW.id) LOOP
      final_slug := base_slug || '-' || counter;
      counter    := counter + 1;
    END LOOP;
    NEW.slug := final_slug;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_branch_slug ON public.branches;
CREATE TRIGGER trg_branch_slug
  BEFORE INSERT OR UPDATE ON public.branches
  FOR EACH ROW EXECUTE FUNCTION public.set_branch_slug();

-- ---------------------------------------------------------------------------
-- AGENTS — updated_at + slug auto-generation
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_agents_updated_at ON public.agents;
CREATE TRIGGER trg_agents_updated_at
  BEFORE UPDATE ON public.agents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE OR REPLACE FUNCTION public.set_agent_slug()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  base_slug  TEXT;
  final_slug TEXT;
  counter    INTEGER := 1;
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    base_slug  := public.slugify_text(
                    COALESCE(NEW.company_name, NEW.agent_code, NEW.id::TEXT));
    final_slug := base_slug;
    WHILE EXISTS (SELECT 1 FROM public.agents WHERE slug = final_slug AND id != NEW.id) LOOP
      final_slug := base_slug || '-' || counter;
      counter    := counter + 1;
    END LOOP;
    NEW.slug := final_slug;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_agent_slug ON public.agents;
CREATE TRIGGER trg_agent_slug
  BEFORE INSERT OR UPDATE ON public.agents
  FOR EACH ROW EXECUTE FUNCTION public.set_agent_slug();

-- ---------------------------------------------------------------------------
-- MUTHAWIFS
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_muthawifs_updated_at ON public.muthawifs;
CREATE TRIGGER trg_muthawifs_updated_at
  BEFORE UPDATE ON public.muthawifs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ---------------------------------------------------------------------------
-- EMPLOYEES
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_employees_updated_at ON public.employees;
CREATE TRIGGER trg_employees_updated_at
  BEFORE UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ---------------------------------------------------------------------------
-- WEBSITE_SETTINGS
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_website_settings_updated_at ON public.website_settings;
CREATE TRIGGER trg_website_settings_updated_at
  BEFORE UPDATE ON public.website_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ---------------------------------------------------------------------------
-- PACKAGES — updated_at + slug auto-generation
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_packages_updated_at ON public.packages;
CREATE TRIGGER trg_packages_updated_at
  BEFORE UPDATE ON public.packages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE OR REPLACE FUNCTION public.set_package_slug()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  base_slug  TEXT;
  final_slug TEXT;
  counter    INTEGER := 1;
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    base_slug  := public.slugify_text(COALESCE(NEW.name, NEW.code, NEW.id::TEXT));
    final_slug := base_slug;
    WHILE EXISTS (SELECT 1 FROM public.packages WHERE slug = final_slug AND id != NEW.id) LOOP
      final_slug := base_slug || '-' || counter;
      counter    := counter + 1;
    END LOOP;
    NEW.slug := final_slug;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_package_slug ON public.packages;
CREATE TRIGGER trg_package_slug
  BEFORE INSERT OR UPDATE ON public.packages
  FOR EACH ROW EXECUTE FUNCTION public.set_package_slug();

-- ---------------------------------------------------------------------------
-- DEPARTURES
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_departures_updated_at ON public.departures;
CREATE TRIGGER trg_departures_updated_at
  BEFORE UPDATE ON public.departures
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ---------------------------------------------------------------------------
-- CUSTOMERS
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_customers_updated_at ON public.customers;
CREATE TRIGGER trg_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ---------------------------------------------------------------------------
-- CUSTOMER_ACCOUNTS
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_customer_accounts_updated_at ON public.customer_accounts;
CREATE TRIGGER trg_customer_accounts_updated_at
  BEFORE UPDATE ON public.customer_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ---------------------------------------------------------------------------
-- BOOKINGS — updated_at trigger
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_bookings_updated_at ON public.bookings;
CREATE TRIGGER trg_bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- BOOKINGS — auto-generate booking_code if not supplied
CREATE OR REPLACE FUNCTION public.set_booking_code()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.booking_code IS NULL OR NEW.booking_code = '' THEN
    NEW.booking_code := public.generate_booking_code();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_booking_code ON public.bookings;
CREATE TRIGGER trg_booking_code
  BEFORE INSERT ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.set_booking_code();

-- ---------------------------------------------------------------------------
-- PAYMENTS — update booking paid_amount and payment_status on verify
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_payments_updated_at ON public.payments;
CREATE TRIGGER trg_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE OR REPLACE FUNCTION public.sync_booking_payment_status()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_total_paid    NUMERIC;
  v_booking_price NUMERIC;
  v_new_status    TEXT;
BEGIN
  IF (TG_OP = 'UPDATE' AND NEW.status = 'verified' AND OLD.status != 'verified')
     OR (TG_OP = 'INSERT' AND NEW.status = 'verified')
  THEN
    SELECT
      COALESCE(SUM(amount), 0),
      COALESCE(MAX(total_price), 0)
    INTO v_total_paid, v_booking_price
    FROM (
      SELECT p2.amount FROM public.payments p2
      WHERE p2.booking_id = NEW.booking_id AND p2.status = 'verified'
    ) sub
    CROSS JOIN (
      SELECT total_price FROM public.bookings WHERE id = NEW.booking_id
    ) b;

    v_new_status := CASE
      WHEN v_total_paid <= 0                THEN 'unpaid'
      WHEN v_total_paid >= v_booking_price  THEN 'paid'
      ELSE 'partial'
    END;

    UPDATE public.bookings
    SET paid_amount    = v_total_paid,
        payment_status = v_new_status,
        updated_at     = NOW()
    WHERE id = NEW.booking_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_booking_payment ON public.payments;
CREATE TRIGGER trg_sync_booking_payment
  AFTER INSERT OR UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.sync_booking_payment_status();

-- ---------------------------------------------------------------------------
-- SAVINGS_DEPOSITS — update savings_plans.current_amount on verify
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_savings_deposits_updated_at ON public.savings_deposits;
CREATE TRIGGER trg_savings_deposits_updated_at
  BEFORE UPDATE ON public.savings_deposits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE OR REPLACE FUNCTION public.sync_savings_plan_amount()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_total NUMERIC;
BEGIN
  IF (TG_OP = 'UPDATE' AND NEW.status = 'verified' AND OLD.status != 'verified')
     OR (TG_OP = 'INSERT' AND NEW.status = 'verified')
  THEN
    SELECT COALESCE(SUM(amount), 0) INTO v_total
    FROM public.savings_deposits
    WHERE plan_id = NEW.plan_id AND status = 'verified';

    UPDATE public.savings_plans
    SET current_amount = v_total,
        updated_at     = NOW()
    WHERE id = NEW.plan_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_savings_amount ON public.savings_deposits;
CREATE TRIGGER trg_sync_savings_amount
  AFTER INSERT OR UPDATE ON public.savings_deposits
  FOR EACH ROW EXECUTE FUNCTION public.sync_savings_plan_amount();

-- ---------------------------------------------------------------------------
-- STORE_ORDERS — auto-generate order_number
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_store_orders_updated_at ON public.store_orders;
CREATE TRIGGER trg_store_orders_updated_at
  BEFORE UPDATE ON public.store_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE OR REPLACE FUNCTION public.set_store_order_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    NEW.order_number := public.generate_store_order_number();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_store_order_number ON public.store_orders;
CREATE TRIGGER trg_store_order_number
  BEFORE INSERT ON public.store_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_store_order_number();

-- ---------------------------------------------------------------------------
-- Remaining updated_at triggers (batch)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  tbl TEXT;
  tbl_list TEXT[] := ARRAY[
    'leads', 'coupons', 'bank_accounts', 'visa_applications',
    'announcements', 'banners', 'manasik_sessions', 'room_assignments',
    'equipment_items', 'equipment_distributions', 'sos_alerts',
    'approval_requests', 'booking_passengers', 'booking_seat_locks',
    'savings_plans', 'savings_schedules', 'waiting_list',
    'payment_deadline_reminders', 'membership_plans',
    'chart_of_accounts', 'journal_entries', 'vendor_invoices',
    'commissions', 'payroll', 'payroll_slips', 'leave_requests',
    'performance_reviews', 'company_settings', 'withdrawal_requests',
    'departure_cost_items', 'departure_expenses', 'departure_other_revenues',
    'departure_financial_summary', 'cashflow_entries', 'scheduled_reports',
    'store_categories', 'store_products', 'store_product_variants',
    'store_shipments', 'store_product_reviews',
    'whatsapp_config', 'wa_templates', 'wa_broadcast_campaigns',
    'customer_documents', 'invoice_templates', 'faqs', 'testimonials',
    'gallery_items', 'package_groups', 'package_labels',
    'agent_commission_tiers', 'airlines', 'hotels', 'vendors',
    'package_hpp_templates', 'departure_multi_hotels'
  ];
BEGIN
  FOREACH tbl IN ARRAY tbl_list LOOP
    EXECUTE FORMAT('DROP TRIGGER IF EXISTS trg_%s_updated_at ON public.%I', tbl, tbl);
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name   = tbl
        AND column_name  = 'updated_at'
    ) THEN
      EXECUTE FORMAT(
        'CREATE TRIGGER trg_%s_updated_at
           BEFORE UPDATE ON public.%I
           FOR EACH ROW EXECUTE FUNCTION public.update_updated_at()',
        tbl, tbl
      );
    END IF;
  END LOOP;
END;
$$;

-- ---------------------------------------------------------------------------
-- PROFILES — sync email from auth.users on INSERT
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_profile_from_auth()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  )
  ON CONFLICT (id) DO UPDATE SET
    email      = COALESCE(EXCLUDED.email, profiles.email),
    updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auth_user_profile ON auth.users;
CREATE TRIGGER trg_auth_user_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.sync_profile_from_auth();

SELECT '008_triggers: OK' AS result;
