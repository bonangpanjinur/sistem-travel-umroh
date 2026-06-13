-- =============================================================================
-- VINSTOUR TRAVEL PORTAL — Clean Migration Chain
-- FILE 009: Row Level Security Policies
-- Run AFTER 008. DROP POLICY IF EXISTS + wrapped CREATE POLICY — idempotent.
--
-- Setiap CREATE POLICY dibungkus DO block individual.
-- Jika kolom/tabel belum ada (tabel dari migrasi lama), policy di-skip
-- dengan NOTICE bukan ERROR.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- PROFILES
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "profiles_select_own"   ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own"   ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_all"    ON public.profiles;

DO $$ BEGIN
  CREATE POLICY "profiles_select_own" ON public.profiles
    FOR SELECT TO authenticated USING (id = auth.uid());
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP profiles_select_own: %', SQLERRM; END; $$;

DO $$ BEGIN
  CREATE POLICY "profiles_update_own" ON public.profiles
    FOR UPDATE TO authenticated
    USING (id = auth.uid()) WITH CHECK (id = auth.uid());
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP profiles_update_own: %', SQLERRM; END; $$;

DO $$ BEGIN
  CREATE POLICY "profiles_admin_all" ON public.profiles
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin')));
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP profiles_admin_all: %', SQLERRM; END; $$;

-- ---------------------------------------------------------------------------
-- USER_ROLES
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "user_roles_select"  ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_admin"   ON public.user_roles;

DO $$ BEGIN
  CREATE POLICY "user_roles_select" ON public.user_roles
    FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin')
    ));
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP user_roles_select: %', SQLERRM; END; $$;

DO $$ BEGIN
  CREATE POLICY "user_roles_admin" ON public.user_roles
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin')));
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP user_roles_admin: %', SQLERRM; END; $$;

-- ---------------------------------------------------------------------------
-- PERMISSIONS_LIST
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "permissions_list_select" ON public.permissions_list;
DROP POLICY IF EXISTS "permissions_list_admin"  ON public.permissions_list;

DO $$ BEGIN
  CREATE POLICY "permissions_list_select" ON public.permissions_list
    FOR SELECT TO authenticated, anon USING (TRUE);
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP permissions_list_select: %', SQLERRM; END; $$;

DO $$ BEGIN
  CREATE POLICY "permissions_list_admin" ON public.permissions_list
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin')));
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP permissions_list_admin: %', SQLERRM; END; $$;

-- ---------------------------------------------------------------------------
-- ROLE_PERMISSIONS
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "role_permissions_select" ON public.role_permissions;
DROP POLICY IF EXISTS "role_permissions_admin"  ON public.role_permissions;

DO $$ BEGIN
  CREATE POLICY "role_permissions_select" ON public.role_permissions
    FOR SELECT TO authenticated USING (TRUE);
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP role_permissions_select: %', SQLERRM; END; $$;

DO $$ BEGIN
  CREATE POLICY "role_permissions_admin" ON public.role_permissions
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'super_admin'));
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP role_permissions_admin: %', SQLERRM; END; $$;

-- ---------------------------------------------------------------------------
-- STAFF_INVITATIONS
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "staff_invitations_admin" ON public.staff_invitations;

DO $$ BEGIN
  CREATE POLICY "staff_invitations_admin" ON public.staff_invitations
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin')));
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP staff_invitations_admin: %', SQLERRM; END; $$;

-- ---------------------------------------------------------------------------
-- MENU_ITEMS
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "menu_items_select" ON public.menu_items;
DROP POLICY IF EXISTS "menu_items_admin"  ON public.menu_items;

DO $$ BEGIN
  CREATE POLICY "menu_items_select" ON public.menu_items
    FOR SELECT TO authenticated, anon USING (is_active = TRUE);
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP menu_items_select: %', SQLERRM; END; $$;

DO $$ BEGIN
  CREATE POLICY "menu_items_admin" ON public.menu_items
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin')));
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP menu_items_admin: %', SQLERRM; END; $$;

-- ---------------------------------------------------------------------------
-- AUDIT_LOGS
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "audit_logs_admin_read" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_insert"     ON public.audit_logs;

DO $$ BEGIN
  CREATE POLICY "audit_logs_admin_read" ON public.audit_logs
    FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin')));
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP audit_logs_admin_read: %', SQLERRM; END; $$;

DO $$ BEGIN
  CREATE POLICY "audit_logs_insert" ON public.audit_logs
    FOR INSERT TO authenticated WITH CHECK (TRUE);
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP audit_logs_insert: %', SQLERRM; END; $$;

-- ---------------------------------------------------------------------------
-- NOTIFICATIONS
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "notifications_own" ON public.notifications;

DO $$ BEGIN
  CREATE POLICY "notifications_own" ON public.notifications
    FOR ALL TO authenticated
    USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP notifications_own: %', SQLERRM; END; $$;

-- ---------------------------------------------------------------------------
-- NOTIFICATION_TEMPLATES
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "notif_templates_select" ON public.notification_templates;
DROP POLICY IF EXISTS "notif_templates_admin"  ON public.notification_templates;

DO $$ BEGIN
  CREATE POLICY "notif_templates_select" ON public.notification_templates
    FOR SELECT TO authenticated USING (TRUE);
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP notif_templates_select: %', SQLERRM; END; $$;

DO $$ BEGIN
  CREATE POLICY "notif_templates_admin" ON public.notification_templates
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin')));
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP notif_templates_admin: %', SQLERRM; END; $$;

-- ---------------------------------------------------------------------------
-- OTP_CODES
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "otp_codes_own" ON public.otp_codes;

DO $$ BEGIN
  CREATE POLICY "otp_codes_own" ON public.otp_codes
    FOR ALL TO authenticated USING (user_id = auth.uid());
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP otp_codes_own: %', SQLERRM; END; $$;

-- ---------------------------------------------------------------------------
-- USER_2FA_SETTINGS
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "2fa_settings_own" ON public.user_2fa_settings;

DO $$ BEGIN
  CREATE POLICY "2fa_settings_own" ON public.user_2fa_settings
    FOR ALL TO authenticated
    USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP 2fa_settings_own: %', SQLERRM; END; $$;

-- ---------------------------------------------------------------------------
-- PUSH_SUBSCRIPTIONS
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "push_subscriptions_own" ON public.push_subscriptions;

DO $$ BEGIN
  CREATE POLICY "push_subscriptions_own" ON public.push_subscriptions
    FOR ALL TO authenticated
    USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP push_subscriptions_own: %', SQLERRM; END; $$;

-- ---------------------------------------------------------------------------
-- PUSH_OUTBOX
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "push_outbox_own"   ON public.push_outbox;
DROP POLICY IF EXISTS "push_outbox_admin" ON public.push_outbox;

DO $$ BEGIN
  CREATE POLICY "push_outbox_own" ON public.push_outbox
    FOR SELECT TO authenticated USING (user_id = auth.uid());
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP push_outbox_own: %', SQLERRM; END; $$;

DO $$ BEGIN
  CREATE POLICY "push_outbox_admin" ON public.push_outbox
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin')));
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP push_outbox_admin: %', SQLERRM; END; $$;

-- ---------------------------------------------------------------------------
-- EMAIL_LOGS
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "email_logs_admin" ON public.email_logs;

DO $$ BEGIN
  CREATE POLICY "email_logs_admin" ON public.email_logs
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin')));
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP email_logs_admin: %', SQLERRM; END; $$;

-- ---------------------------------------------------------------------------
-- RBAC_AUDIT_TRAIL
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "rbac_audit_super_admin" ON public.rbac_audit_trail;

DO $$ BEGIN
  CREATE POLICY "rbac_audit_super_admin" ON public.rbac_audit_trail
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'super_admin'));
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP rbac_audit_super_admin: %', SQLERRM; END; $$;

-- ---------------------------------------------------------------------------
-- BRANCHES
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "branches_select"  ON public.branches;
DROP POLICY IF EXISTS "branches_modify"  ON public.branches;

DO $$ BEGIN
  CREATE POLICY "branches_select" ON public.branches
    FOR SELECT TO authenticated, anon USING (is_active = TRUE);
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP branches_select: %', SQLERRM; END; $$;

DO $$ BEGIN
  CREATE POLICY "branches_modify" ON public.branches
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin','branch_manager')));
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP branches_modify: %', SQLERRM; END; $$;

-- ---------------------------------------------------------------------------
-- AGENTS
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "agents_select"    ON public.agents;
DROP POLICY IF EXISTS "agents_own"       ON public.agents;
DROP POLICY IF EXISTS "agents_admin"     ON public.agents;

DO $$ BEGIN
  CREATE POLICY "agents_select" ON public.agents
    FOR SELECT TO authenticated, anon USING (status = 'active');
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP agents_select: %', SQLERRM; END; $$;

DO $$ BEGIN
  CREATE POLICY "agents_own" ON public.agents
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP agents_own: %', SQLERRM; END; $$;

DO $$ BEGIN
  CREATE POLICY "agents_admin" ON public.agents
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin')));
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP agents_admin: %', SQLERRM; END; $$;

-- ---------------------------------------------------------------------------
-- MUTHAWIFS
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "muthawifs_staff"   ON public.muthawifs;

DO $$ BEGIN
  CREATE POLICY "muthawifs_staff" ON public.muthawifs
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin','operator','branch_manager')));
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP muthawifs_staff: %', SQLERRM; END; $$;

-- ---------------------------------------------------------------------------
-- EMPLOYEES
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "employees_own"    ON public.employees;
DROP POLICY IF EXISTS "employees_hr"     ON public.employees;

DO $$ BEGIN
  CREATE POLICY "employees_own" ON public.employees
    FOR SELECT TO authenticated USING (user_id = auth.uid());
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP employees_own: %', SQLERRM; END; $$;

DO $$ BEGIN
  CREATE POLICY "employees_hr" ON public.employees
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin','branch_manager')));
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP employees_hr: %', SQLERRM; END; $$;

-- ---------------------------------------------------------------------------
-- WEBSITE_SETTINGS
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "website_settings_public"  ON public.website_settings;
DROP POLICY IF EXISTS "website_settings_modify"  ON public.website_settings;

DO $$ BEGIN
  CREATE POLICY "website_settings_public" ON public.website_settings
    FOR SELECT TO authenticated, anon USING (TRUE);
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP website_settings_public: %', SQLERRM; END; $$;

DO $$ BEGIN
  CREATE POLICY "website_settings_modify" ON public.website_settings
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin','branch_manager','agent')));
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP website_settings_modify: %', SQLERRM; END; $$;

-- ---------------------------------------------------------------------------
-- MEMBERSHIP_PLANS
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "membership_plans_select" ON public.membership_plans;
DROP POLICY IF EXISTS "membership_plans_admin"  ON public.membership_plans;

DO $$ BEGIN
  CREATE POLICY "membership_plans_select" ON public.membership_plans
    FOR SELECT TO authenticated, anon USING (is_active = TRUE);
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP membership_plans_select: %', SQLERRM; END; $$;

DO $$ BEGIN
  CREATE POLICY "membership_plans_admin" ON public.membership_plans
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'super_admin'));
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP membership_plans_admin: %', SQLERRM; END; $$;

-- ---------------------------------------------------------------------------
-- AIRLINES / HOTELS / AIRPORTS
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "airlines_public"   ON public.airlines;
DROP POLICY IF EXISTS "airlines_admin"    ON public.airlines;
DROP POLICY IF EXISTS "hotels_public"     ON public.hotels;
DROP POLICY IF EXISTS "hotels_admin"      ON public.hotels;
DROP POLICY IF EXISTS "airports_public"   ON public.airports;

DO $$ BEGIN CREATE POLICY "airlines_public" ON public.airlines FOR SELECT TO authenticated, anon USING (TRUE); EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP airlines_public: %', SQLERRM; END; $$;
DO $$ BEGIN CREATE POLICY "airlines_admin"  ON public.airlines FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin'))); EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP airlines_admin: %', SQLERRM; END; $$;
DO $$ BEGIN CREATE POLICY "hotels_public"   ON public.hotels   FOR SELECT TO authenticated, anon USING (TRUE); EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP hotels_public: %', SQLERRM; END; $$;
DO $$ BEGIN CREATE POLICY "hotels_admin"    ON public.hotels   FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin'))); EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP hotels_admin: %', SQLERRM; END; $$;
DO $$ BEGIN CREATE POLICY "airports_public" ON public.airports FOR SELECT TO authenticated, anon USING (TRUE); EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP airports_public: %', SQLERRM; END; $$;

-- ---------------------------------------------------------------------------
-- VENDORS
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "vendors_staff"   ON public.vendors;

DO $$ BEGIN
  CREATE POLICY "vendors_staff" ON public.vendors
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin','finance','operator')));
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP vendors_staff: %', SQLERRM; END; $$;

-- ---------------------------------------------------------------------------
-- PACKAGES
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "packages_public"  ON public.packages;
DROP POLICY IF EXISTS "packages_modify"  ON public.packages;

DO $$ BEGIN
  CREATE POLICY "packages_public" ON public.packages
    FOR SELECT TO authenticated, anon USING (is_published = TRUE);
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP packages_public: %', SQLERRM; END; $$;

DO $$ BEGIN
  CREATE POLICY "packages_modify" ON public.packages
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin','marketing','operator')));
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP packages_modify: %', SQLERRM; END; $$;

-- ---------------------------------------------------------------------------
-- DEPARTURES
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "departures_public"   ON public.departures;
DROP POLICY IF EXISTS "departures_staff"    ON public.departures;

DO $$ BEGIN
  CREATE POLICY "departures_public" ON public.departures
    FOR SELECT TO anon USING (status IN ('open','full','closed'));
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP departures_public: %', SQLERRM; END; $$;

DO $$ BEGIN
  CREATE POLICY "departures_staff" ON public.departures
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin','operator','branch_manager','finance')));
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP departures_staff: %', SQLERRM; END; $$;

-- ---------------------------------------------------------------------------
-- CUSTOMERS
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "customers_own"    ON public.customers;
DROP POLICY IF EXISTS "customers_staff"  ON public.customers;

DO $$ BEGIN
  CREATE POLICY "customers_own" ON public.customers
    FOR SELECT TO authenticated USING (user_id = auth.uid());
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP customers_own: %', SQLERRM; END; $$;

DO $$ BEGIN
  CREATE POLICY "customers_staff" ON public.customers
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin','operator','branch_manager','finance','marketing')));
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP customers_staff: %', SQLERRM; END; $$;

-- ---------------------------------------------------------------------------
-- CUSTOMER_ACCOUNTS
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "customer_accounts_own"   ON public.customer_accounts;
DROP POLICY IF EXISTS "customer_accounts_admin" ON public.customer_accounts;

DO $$ BEGIN
  CREATE POLICY "customer_accounts_own" ON public.customer_accounts
    FOR ALL TO authenticated
    USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP customer_accounts_own: %', SQLERRM; END; $$;

DO $$ BEGIN
  CREATE POLICY "customer_accounts_admin" ON public.customer_accounts
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin')));
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP customer_accounts_admin: %', SQLERRM; END; $$;

-- ---------------------------------------------------------------------------
-- CUSTOMER_DOCUMENTS
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "cust_docs_own"    ON public.customer_documents;
DROP POLICY IF EXISTS "cust_docs_staff"  ON public.customer_documents;

DO $$ BEGIN
  CREATE POLICY "cust_docs_own" ON public.customer_documents
    FOR SELECT TO authenticated
    USING (customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid()));
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP cust_docs_own: %', SQLERRM; END; $$;

DO $$ BEGIN
  CREATE POLICY "cust_docs_staff" ON public.customer_documents
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin','operator','branch_manager')));
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP cust_docs_staff: %', SQLERRM; END; $$;

-- ---------------------------------------------------------------------------
-- LEADS
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "leads_staff"  ON public.leads;

DO $$ BEGIN
  CREATE POLICY "leads_staff" ON public.leads
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin','marketing','operator','branch_manager')));
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP leads_staff: %', SQLERRM; END; $$;

-- ---------------------------------------------------------------------------
-- COUPONS
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "coupons_public"  ON public.coupons;
DROP POLICY IF EXISTS "coupons_admin"   ON public.coupons;

DO $$ BEGIN
  CREATE POLICY "coupons_public" ON public.coupons
    FOR SELECT TO authenticated, anon USING (is_active = TRUE);
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP coupons_public: %', SQLERRM; END; $$;

DO $$ BEGIN
  CREATE POLICY "coupons_admin" ON public.coupons
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin','marketing')));
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP coupons_admin: %', SQLERRM; END; $$;

-- ---------------------------------------------------------------------------
-- BOOKINGS
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "bookings_own"    ON public.bookings;
DROP POLICY IF EXISTS "bookings_staff"  ON public.bookings;

DO $$ BEGIN
  CREATE POLICY "bookings_own" ON public.bookings
    FOR SELECT TO authenticated
    USING (customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid()));
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP bookings_own: %', SQLERRM; END; $$;

DO $$ BEGIN
  CREATE POLICY "bookings_staff" ON public.bookings
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin','operator','branch_manager','finance')));
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP bookings_staff: %', SQLERRM; END; $$;

-- ---------------------------------------------------------------------------
-- BOOKING_PASSENGERS
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "booking_pax_staff"  ON public.booking_passengers;

DO $$ BEGIN
  CREATE POLICY "booking_pax_staff" ON public.booking_passengers
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin','operator','branch_manager','finance')));
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP booking_pax_staff: %', SQLERRM; END; $$;

-- ---------------------------------------------------------------------------
-- PAYMENTS
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "payments_own"    ON public.payments;
DROP POLICY IF EXISTS "payments_staff"  ON public.payments;

DO $$ BEGIN
  CREATE POLICY "payments_own" ON public.payments
    FOR SELECT TO authenticated
    USING (booking_id IN (
      SELECT id FROM public.bookings
      WHERE customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid())
    ));
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP payments_own: %', SQLERRM; END; $$;

DO $$ BEGIN
  CREATE POLICY "payments_staff" ON public.payments
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin','finance','operator','branch_manager')));
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP payments_staff: %', SQLERRM; END; $$;

-- ---------------------------------------------------------------------------
-- SAVINGS_PLANS / DEPOSITS / SCHEDULES
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "savings_plans_own"     ON public.savings_plans;
DROP POLICY IF EXISTS "savings_plans_staff"   ON public.savings_plans;
DROP POLICY IF EXISTS "savings_deposits_own"  ON public.savings_deposits;
DROP POLICY IF EXISTS "savings_schedules_own" ON public.savings_schedules;

DO $$ BEGIN
  CREATE POLICY "savings_plans_own" ON public.savings_plans
    FOR SELECT TO authenticated
    USING (customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid()));
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP savings_plans_own: %', SQLERRM; END; $$;

DO $$ BEGIN
  CREATE POLICY "savings_plans_staff" ON public.savings_plans
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin','finance','operator')));
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP savings_plans_staff: %', SQLERRM; END; $$;

DO $$ BEGIN
  CREATE POLICY "savings_deposits_own" ON public.savings_deposits
    FOR SELECT TO authenticated
    USING (plan_id IN (
      SELECT id FROM public.savings_plans
      WHERE customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid())
    ));
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP savings_deposits_own: %', SQLERRM; END; $$;

DO $$ BEGIN
  CREATE POLICY "savings_schedules_own" ON public.savings_schedules
    FOR SELECT TO authenticated
    USING (plan_id IN (
      SELECT id FROM public.savings_plans
      WHERE customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid())
    ));
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP savings_schedules_own: %', SQLERRM; END; $$;

-- ---------------------------------------------------------------------------
-- ANNOUNCEMENTS / BANNERS
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "announcements_public"  ON public.announcements;
DROP POLICY IF EXISTS "announcements_staff"   ON public.announcements;
DROP POLICY IF EXISTS "banners_public"        ON public.banners;
DROP POLICY IF EXISTS "banners_staff"         ON public.banners;

DO $$ BEGIN
  CREATE POLICY "announcements_public" ON public.announcements
    FOR SELECT TO authenticated, anon USING (is_published = TRUE);
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP announcements_public: %', SQLERRM; END; $$;

DO $$ BEGIN
  CREATE POLICY "announcements_staff" ON public.announcements
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin','operator','marketing')));
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP announcements_staff: %', SQLERRM; END; $$;

DO $$ BEGIN
  CREATE POLICY "banners_public" ON public.banners
    FOR SELECT TO authenticated, anon USING (is_active = TRUE);
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP banners_public: %', SQLERRM; END; $$;

DO $$ BEGIN
  CREATE POLICY "banners_staff" ON public.banners
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin','marketing')));
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP banners_staff: %', SQLERRM; END; $$;

-- ---------------------------------------------------------------------------
-- VISA_APPLICATIONS
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "visa_own"    ON public.visa_applications;
DROP POLICY IF EXISTS "visa_staff"  ON public.visa_applications;

DO $$ BEGIN
  CREATE POLICY "visa_own" ON public.visa_applications
    FOR SELECT TO authenticated
    USING (customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid()));
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP visa_own: %', SQLERRM; END; $$;

DO $$ BEGIN
  CREATE POLICY "visa_staff" ON public.visa_applications
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin','operator','branch_manager')));
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP visa_staff: %', SQLERRM; END; $$;

-- ---------------------------------------------------------------------------
-- MANASIK_SESSIONS
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "manasik_select"  ON public.manasik_sessions;
DROP POLICY IF EXISTS "manasik_staff"   ON public.manasik_sessions;

DO $$ BEGIN
  CREATE POLICY "manasik_select" ON public.manasik_sessions
    FOR SELECT TO authenticated, anon USING (status NOT IN ('cancelled'));
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP manasik_select: %', SQLERRM; END; $$;

DO $$ BEGIN
  CREATE POLICY "manasik_staff" ON public.manasik_sessions
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin','operator','branch_manager')));
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP manasik_staff: %', SQLERRM; END; $$;

-- ---------------------------------------------------------------------------
-- SOS_ALERTS
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "sos_own"    ON public.sos_alerts;
DROP POLICY IF EXISTS "sos_staff"  ON public.sos_alerts;

DO $$ BEGIN
  CREATE POLICY "sos_own" ON public.sos_alerts
    FOR INSERT TO authenticated
    WITH CHECK (customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid()));
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP sos_own: %', SQLERRM; END; $$;

DO $$ BEGIN
  CREATE POLICY "sos_staff" ON public.sos_alerts
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin','operator','branch_manager')));
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP sos_staff: %', SQLERRM; END; $$;

-- ---------------------------------------------------------------------------
-- APPROVAL_REQUESTS / CONFIGS
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "approval_configs_staff"   ON public.approval_configs;
DROP POLICY IF EXISTS "approval_requests_staff"  ON public.approval_requests;

DO $$ BEGIN
  CREATE POLICY "approval_configs_staff" ON public.approval_configs
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin')));
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP approval_configs_staff: %', SQLERRM; END; $$;

DO $$ BEGIN
  CREATE POLICY "approval_requests_staff" ON public.approval_requests
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin','finance','branch_manager','operator')));
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP approval_requests_staff: %', SQLERRM; END; $$;

-- ---------------------------------------------------------------------------
-- FINANCE TABLES
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "coa_select"           ON public.chart_of_accounts;
DROP POLICY IF EXISTS "coa_finance"          ON public.chart_of_accounts;
DROP POLICY IF EXISTS "journal_finance"      ON public.journal_entries;
DROP POLICY IF EXISTS "vendor_inv_finance"   ON public.vendor_invoices;
DROP POLICY IF EXISTS "commissions_finance"  ON public.commissions;
DROP POLICY IF EXISTS "payroll_finance"      ON public.payroll;
DROP POLICY IF EXISTS "company_settings_sel" ON public.company_settings;
DROP POLICY IF EXISTS "company_settings_adm" ON public.company_settings;

DO $$ BEGIN CREATE POLICY "coa_select"  ON public.chart_of_accounts FOR SELECT TO authenticated USING (TRUE); EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP coa_select: %', SQLERRM; END; $$;
DO $$ BEGIN CREATE POLICY "coa_finance" ON public.chart_of_accounts FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin','finance'))); EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP coa_finance: %', SQLERRM; END; $$;
DO $$ BEGIN CREATE POLICY "journal_finance"     ON public.journal_entries  FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin','finance'))); EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP journal_finance: %', SQLERRM; END; $$;
DO $$ BEGIN CREATE POLICY "vendor_inv_finance"  ON public.vendor_invoices  FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin','finance','operator'))); EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP vendor_inv_finance: %', SQLERRM; END; $$;
DO $$ BEGIN CREATE POLICY "commissions_finance" ON public.commissions       FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin','finance'))); EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP commissions_finance: %', SQLERRM; END; $$;
DO $$ BEGIN CREATE POLICY "payroll_finance"     ON public.payroll           FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin','finance'))); EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP payroll_finance: %', SQLERRM; END; $$;

DO $$ BEGIN
  CREATE POLICY "company_settings_sel" ON public.company_settings
    FOR SELECT TO authenticated, anon USING (is_public = TRUE);
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP company_settings_sel: %', SQLERRM; END; $$;

DO $$ BEGIN
  CREATE POLICY "company_settings_adm" ON public.company_settings
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin')));
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP company_settings_adm: %', SQLERRM; END; $$;

-- ---------------------------------------------------------------------------
-- DEPARTURE FINANCIALS
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "dep_financials_finance"  ON public.departure_financial_summary;
DROP POLICY IF EXISTS "dep_cost_finance"        ON public.departure_cost_items;
DROP POLICY IF EXISTS "dep_expense_finance"     ON public.departure_expenses;
DROP POLICY IF EXISTS "dep_otherrev_finance"    ON public.departure_other_revenues;

DO $$ BEGIN CREATE POLICY "dep_financials_finance" ON public.departure_financial_summary FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin','finance','operator'))); EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP dep_financials_finance: %', SQLERRM; END; $$;
DO $$ BEGIN CREATE POLICY "dep_cost_finance"       ON public.departure_cost_items        FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin','finance','operator'))); EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP dep_cost_finance: %', SQLERRM; END; $$;
DO $$ BEGIN CREATE POLICY "dep_expense_finance"    ON public.departure_expenses           FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin','finance','operator'))); EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP dep_expense_finance: %', SQLERRM; END; $$;
DO $$ BEGIN CREATE POLICY "dep_otherrev_finance"   ON public.departure_other_revenues     FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin','finance','operator'))); EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP dep_otherrev_finance: %', SQLERRM; END; $$;

-- ---------------------------------------------------------------------------
-- STORE (E-Commerce)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "store_products_public"  ON public.store_products;
DROP POLICY IF EXISTS "store_products_admin"   ON public.store_products;
DROP POLICY IF EXISTS "store_orders_own"       ON public.store_orders;
DROP POLICY IF EXISTS "store_orders_admin"     ON public.store_orders;

DO $$ BEGIN CREATE POLICY "store_products_public" ON public.store_products FOR SELECT TO authenticated, anon USING (is_published = TRUE); EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP store_products_public: %', SQLERRM; END; $$;
DO $$ BEGIN CREATE POLICY "store_products_admin"  ON public.store_products FOR ALL    TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin','operator'))); EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP store_products_admin: %', SQLERRM; END; $$;
DO $$ BEGIN CREATE POLICY "store_orders_own"   ON public.store_orders FOR SELECT TO authenticated USING (customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid())); EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP store_orders_own: %', SQLERRM; END; $$;
DO $$ BEGIN CREATE POLICY "store_orders_admin" ON public.store_orders FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin','operator','finance'))); EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP store_orders_admin: %', SQLERRM; END; $$;

-- ---------------------------------------------------------------------------
-- WA_SEND_LOGS / BROADCAST
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "wa_logs_staff"       ON public.wa_send_logs;
DROP POLICY IF EXISTS "wa_broadcast_staff"  ON public.wa_broadcast_campaigns;

DO $$ BEGIN CREATE POLICY "wa_logs_staff"      ON public.wa_send_logs           FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin','marketing','operator'))); EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP wa_logs_staff: %', SQLERRM; END; $$;
DO $$ BEGIN CREATE POLICY "wa_broadcast_staff" ON public.wa_broadcast_campaigns FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin','marketing'))); EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP wa_broadcast_staff: %', SQLERRM; END; $$;

-- ---------------------------------------------------------------------------
-- WHATSAPP_CONFIG
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "wa_config_admin"  ON public.whatsapp_config;

DO $$ BEGIN
  CREATE POLICY "wa_config_admin" ON public.whatsapp_config
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin')));
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP wa_config_admin: %', SQLERRM; END; $$;

-- ---------------------------------------------------------------------------
-- Public website content
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "faqs_public"          ON public.faqs;
DROP POLICY IF EXISTS "testimonials_public"  ON public.testimonials;
DROP POLICY IF EXISTS "gallery_public"       ON public.gallery_items;
DROP POLICY IF EXISTS "contact_page_public"  ON public.contact_page_content;
DROP POLICY IF EXISTS "contact_msgs_insert"  ON public.contact_messages;
DROP POLICY IF EXISTS "contact_msgs_admin"   ON public.contact_messages;
DROP POLICY IF EXISTS "bank_accounts_select" ON public.bank_accounts;

DO $$ BEGIN CREATE POLICY "faqs_public"         ON public.faqs                FOR SELECT TO authenticated, anon USING (is_published = TRUE); EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP faqs_public: %', SQLERRM; END; $$;
DO $$ BEGIN CREATE POLICY "testimonials_public" ON public.testimonials        FOR SELECT TO authenticated, anon USING (is_published = TRUE); EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP testimonials_public: %', SQLERRM; END; $$;
DO $$ BEGIN CREATE POLICY "gallery_public"      ON public.gallery_items       FOR SELECT TO authenticated, anon USING (is_published = TRUE); EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP gallery_public: %', SQLERRM; END; $$;
DO $$ BEGIN CREATE POLICY "contact_page_public" ON public.contact_page_content FOR SELECT TO authenticated, anon USING (TRUE); EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP contact_page_public: %', SQLERRM; END; $$;
DO $$ BEGIN CREATE POLICY "contact_msgs_insert" ON public.contact_messages FOR INSERT TO authenticated, anon WITH CHECK (TRUE); EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP contact_msgs_insert: %', SQLERRM; END; $$;
DO $$ BEGIN CREATE POLICY "contact_msgs_admin"  ON public.contact_messages FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin','marketing'))); EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP contact_msgs_admin: %', SQLERRM; END; $$;
DO $$ BEGIN CREATE POLICY "bank_accounts_select" ON public.bank_accounts FOR SELECT TO authenticated, anon USING (is_active = TRUE); EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP bank_accounts_select: %', SQLERRM; END; $$;

SELECT '009_rls_policies: OK' AS result;
