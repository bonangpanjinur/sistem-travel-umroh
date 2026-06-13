
-- ============ PWA install events ============
CREATE TABLE IF NOT EXISTS public.pwa_install_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  platform text,
  user_agent text,
  installed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pwa_install_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone_insert_install_event" ON public.pwa_install_events
  FOR INSERT WITH CHECK (true);
CREATE POLICY "admin_read_install_events" ON public.pwa_install_events
  FOR SELECT USING (public.is_admin(auth.uid()));

-- ============ Baggage policies ============
CREATE TABLE IF NOT EXISTS public.baggage_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  airline_id uuid REFERENCES public.airlines(id) ON DELETE CASCADE,
  cabin_kg numeric NOT NULL DEFAULT 7,
  checked_kg numeric NOT NULL DEFAULT 23,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.baggage_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_baggage" ON public.baggage_policies FOR SELECT USING (true);
CREATE POLICY "admin_manage_baggage" ON public.baggage_policies
  FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ============ Departure surveys ============
CREATE TABLE IF NOT EXISTS public.departure_surveys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  departure_id uuid REFERENCES public.departures(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE CASCADE,
  rating_overall int CHECK (rating_overall BETWEEN 1 AND 5),
  rating_hotel int CHECK (rating_hotel BETWEEN 1 AND 5),
  rating_food int CHECK (rating_food BETWEEN 1 AND 5),
  rating_muthawif int CHECK (rating_muthawif BETWEEN 1 AND 5),
  comment text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.departure_surveys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "customer_submit_survey" ON public.departure_surveys
  FOR INSERT WITH CHECK (customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid()));
CREATE POLICY "customer_read_own_survey" ON public.departure_surveys
  FOR SELECT USING (customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid()) OR public.is_admin(auth.uid()));
CREATE POLICY "admin_manage_survey" ON public.departure_surveys
  FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ============ Loyalty point expiry ============
CREATE TABLE IF NOT EXISTS public.loyalty_point_expiry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES public.customers(id) ON DELETE CASCADE,
  points int NOT NULL,
  expires_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','expired','consumed')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.loyalty_point_expiry ENABLE ROW LEVEL SECURITY;
CREATE POLICY "customer_read_own_expiry" ON public.loyalty_point_expiry
  FOR SELECT USING (customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid()) OR public.is_admin(auth.uid()));
CREATE POLICY "admin_manage_expiry" ON public.loyalty_point_expiry
  FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ============ Booking transfers ============
CREATE TABLE IF NOT EXISTS public.booking_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES public.bookings(id) ON DELETE CASCADE,
  from_branch_id uuid,
  to_branch_id uuid,
  requested_by uuid,
  approved_by uuid,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','cancelled')),
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.booking_transfers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_manage_transfers" ON public.booking_transfers
  FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ============ Auto-upgrade agent membership ============
CREATE OR REPLACE FUNCTION public.tg_auto_upgrade_agent_membership()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_total numeric;
  v_new_tier text;
BEGIN
  IF NEW.status::text <> 'paid' THEN RETURN NEW; END IF;
  SELECT COALESCE(SUM(commission_amount),0) INTO v_total
  FROM agent_commissions
  WHERE agent_id = NEW.agent_id
    AND status::text = 'paid'
    AND created_at >= date_trunc('year', now());
  v_new_tier := CASE
    WHEN v_total >= 100000000 THEN 'platinum'
    WHEN v_total >= 25000000 THEN 'gold'
    WHEN v_total >= 5000000 THEN 'silver'
    ELSE 'bronze'
  END;
  UPDATE agents SET membership_tier = v_new_tier, updated_at = now()
  WHERE id = NEW.agent_id AND COALESCE(membership_tier,'bronze') <> v_new_tier;
  RETURN NEW;
END $$;

-- attach if column exists; harmless if not
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='agents' AND column_name='membership_tier') THEN
    DROP TRIGGER IF EXISTS tr_auto_upgrade_agent_membership ON public.agent_commissions;
    CREATE TRIGGER tr_auto_upgrade_agent_membership
      AFTER INSERT OR UPDATE ON public.agent_commissions
      FOR EACH ROW EXECUTE FUNCTION public.tg_auto_upgrade_agent_membership();
  END IF;
END $$;

-- ============ PWA Settings permission ============
INSERT INTO public.permissions_list (key, label, group_name)
VALUES ('pwa-settings', 'Pengaturan PWA', 'Pengaturan')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.role_permissions (role, permission_key, is_enabled)
SELECT r::app_role, 'pwa-settings', true
FROM unnest(ARRAY['super_admin','owner']::text[]) r
ON CONFLICT (role, permission_key) DO NOTHING;
