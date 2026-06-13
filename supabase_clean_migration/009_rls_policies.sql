-- =============================================================================
-- VINSTOUR TRAVEL PORTAL — Clean Migration Chain
-- FILE 009: Row Level Security Policies
-- Run AFTER 008. All CREATE POLICY uses IF NOT EXISTS equivalent via
-- DROP POLICY IF EXISTS + CREATE POLICY — idempotent.
--
-- Strategy:
--   anon       → read-only on public-facing tables
--   authenticated → read/write on their own data + role-gated
--   service_role  → bypasses RLS (BYPASSRLS role)
-- =============================================================================

-- ============================================================
-- Macro helper: drops and recreates a policy safely
-- ============================================================

-- ---------------------------------------------------------------------------
-- PROFILES
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "profiles_select_own"   ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own"   ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_all"    ON public.profiles;

CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_admin_all" ON public.profiles
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('super_admin', 'admin')
    )
  );

-- ---------------------------------------------------------------------------
-- USER_ROLES
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "user_roles_select"  ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_admin"   ON public.user_roles;

CREATE POLICY "user_roles_select" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin')
  ));

CREATE POLICY "user_roles_admin" ON public.user_roles
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin')
    )
  );

-- ---------------------------------------------------------------------------
-- PERMISSIONS_LIST
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "permissions_list_select" ON public.permissions_list;
DROP POLICY IF EXISTS "permissions_list_admin"  ON public.permissions_list;

CREATE POLICY "permissions_list_select" ON public.permissions_list
  FOR SELECT TO authenticated, anon
  USING (TRUE);

CREATE POLICY "permissions_list_admin" ON public.permissions_list
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin')
    )
  );

-- ---------------------------------------------------------------------------
-- ROLE_PERMISSIONS
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "role_permissions_select" ON public.role_permissions;
DROP POLICY IF EXISTS "role_permissions_admin"  ON public.role_permissions;

CREATE POLICY "role_permissions_select" ON public.role_permissions
  FOR SELECT TO authenticated
  USING (TRUE);

CREATE POLICY "role_permissions_admin" ON public.role_permissions
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'super_admin'
    )
  );

-- ---------------------------------------------------------------------------
-- STAFF_INVITATIONS
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "staff_invitations_admin" ON public.staff_invitations;

CREATE POLICY "staff_invitations_admin" ON public.staff_invitations
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin')
    )
  );

-- ---------------------------------------------------------------------------
-- MENU_ITEMS
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "menu_items_select" ON public.menu_items;
DROP POLICY IF EXISTS "menu_items_admin"  ON public.menu_items;

CREATE POLICY "menu_items_select" ON public.menu_items
  FOR SELECT TO authenticated, anon
  USING (is_active = TRUE);

CREATE POLICY "menu_items_admin" ON public.menu_items
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin')
    )
  );

-- ---------------------------------------------------------------------------
-- AUDIT_LOGS — read-only for admins
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "audit_logs_admin_read" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_insert"     ON public.audit_logs;

CREATE POLICY "audit_logs_admin_read" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin')
    )
  );

CREATE POLICY "audit_logs_insert" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (TRUE);

-- ---------------------------------------------------------------------------
-- NOTIFICATIONS
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "notifications_own" ON public.notifications;

CREATE POLICY "notifications_own" ON public.notifications
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- NOTIFICATION_TEMPLATES
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "notif_templates_select" ON public.notification_templates;
DROP POLICY IF EXISTS "notif_templates_admin"  ON public.notification_templates;

CREATE POLICY "notif_templates_select" ON public.notification_templates
  FOR SELECT TO authenticated
  USING (TRUE);

CREATE POLICY "notif_templates_admin" ON public.notification_templates
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin')
    )
  );

-- ---------------------------------------------------------------------------
-- OTP_CODES
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "otp_codes_own" ON public.otp_codes;

CREATE POLICY "otp_codes_own" ON public.otp_codes
  FOR ALL TO authenticated
  USING (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- USER_2FA_SETTINGS
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "2fa_settings_own" ON public.user_2fa_settings;

CREATE POLICY "2fa_settings_own" ON public.user_2fa_settings
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- PUSH_SUBSCRIPTIONS
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "push_subscriptions_own" ON public.push_subscriptions;

CREATE POLICY "push_subscriptions_own" ON public.push_subscriptions
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- PUSH_OUTBOX
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "push_outbox_own"   ON public.push_outbox;
DROP POLICY IF EXISTS "push_outbox_admin" ON public.push_outbox;

CREATE POLICY "push_outbox_own" ON public.push_outbox
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "push_outbox_admin" ON public.push_outbox
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin')
    )
  );

-- ---------------------------------------------------------------------------
-- EMAIL_LOGS
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "email_logs_admin" ON public.email_logs;

CREATE POLICY "email_logs_admin" ON public.email_logs
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin')
    )
  );

-- ---------------------------------------------------------------------------
-- RBAC_AUDIT_TRAIL
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "rbac_audit_super_admin" ON public.rbac_audit_trail;

CREATE POLICY "rbac_audit_super_admin" ON public.rbac_audit_trail
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'super_admin'
    )
  );

-- ---------------------------------------------------------------------------
-- BRANCHES
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "branches_select"  ON public.branches;
DROP POLICY IF EXISTS "branches_modify"  ON public.branches;

CREATE POLICY "branches_select" ON public.branches
  FOR SELECT TO authenticated, anon
  USING (is_active = TRUE);

CREATE POLICY "branches_modify" ON public.branches
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin','branch_manager')
    )
  );

-- ---------------------------------------------------------------------------
-- AGENTS
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "agents_select"    ON public.agents;
DROP POLICY IF EXISTS "agents_own"       ON public.agents;
DROP POLICY IF EXISTS "agents_admin"     ON public.agents;

CREATE POLICY "agents_select" ON public.agents
  FOR SELECT TO authenticated, anon
  USING (status = 'active');

CREATE POLICY "agents_own" ON public.agents
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "agents_admin" ON public.agents
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin')
    )
  );

-- ---------------------------------------------------------------------------
-- MUTHAWIFS
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "muthawifs_staff"   ON public.muthawifs;

CREATE POLICY "muthawifs_staff" ON public.muthawifs
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('super_admin','admin','operator','branch_manager')
    )
  );

-- ---------------------------------------------------------------------------
-- EMPLOYEES
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "employees_own"    ON public.employees;
DROP POLICY IF EXISTS "employees_hr"     ON public.employees;

CREATE POLICY "employees_own" ON public.employees
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "employees_hr" ON public.employees
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('super_admin','admin','branch_manager')
    )
  );

-- ---------------------------------------------------------------------------
-- WEBSITE_SETTINGS — public read
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "website_settings_public"  ON public.website_settings;
DROP POLICY IF EXISTS "website_settings_modify"  ON public.website_settings;

CREATE POLICY "website_settings_public" ON public.website_settings
  FOR SELECT TO authenticated, anon
  USING (TRUE);

CREATE POLICY "website_settings_modify" ON public.website_settings
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('super_admin','admin','branch_manager','agent')
    )
  );

-- ---------------------------------------------------------------------------
-- MEMBERSHIP_PLANS — public read
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "membership_plans_select" ON public.membership_plans;
DROP POLICY IF EXISTS "membership_plans_admin"  ON public.membership_plans;

CREATE POLICY "membership_plans_select" ON public.membership_plans
  FOR SELECT TO authenticated, anon
  USING (is_active = TRUE);

CREATE POLICY "membership_plans_admin" ON public.membership_plans
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'super_admin'
    )
  );

-- ---------------------------------------------------------------------------
-- AIRLINES / HOTELS / AIRPORTS — public read
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "airlines_public"   ON public.airlines;
DROP POLICY IF EXISTS "airlines_admin"    ON public.airlines;
DROP POLICY IF EXISTS "hotels_public"     ON public.hotels;
DROP POLICY IF EXISTS "hotels_admin"      ON public.hotels;
DROP POLICY IF EXISTS "airports_public"   ON public.airports;

CREATE POLICY "airlines_public" ON public.airlines FOR SELECT TO authenticated, anon USING (TRUE);
CREATE POLICY "airlines_admin"  ON public.airlines FOR ALL   TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin')));

CREATE POLICY "hotels_public"   ON public.hotels   FOR SELECT TO authenticated, anon USING (TRUE);
CREATE POLICY "hotels_admin"    ON public.hotels   FOR ALL   TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin')));

CREATE POLICY "airports_public" ON public.airports FOR SELECT TO authenticated, anon USING (TRUE);

-- ---------------------------------------------------------------------------
-- VENDORS
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "vendors_staff"   ON public.vendors;

CREATE POLICY "vendors_staff" ON public.vendors
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('super_admin','admin','finance','operator')
    )
  );

-- ---------------------------------------------------------------------------
-- PACKAGES — public read of published
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "packages_public"  ON public.packages;
DROP POLICY IF EXISTS "packages_modify"  ON public.packages;

CREATE POLICY "packages_public" ON public.packages
  FOR SELECT TO authenticated, anon
  USING (is_published = TRUE);

CREATE POLICY "packages_modify" ON public.packages
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('super_admin','admin','marketing','operator')
    )
  );

-- ---------------------------------------------------------------------------
-- DEPARTURES — open/full visible to anon; staff see all
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "departures_public"   ON public.departures;
DROP POLICY IF EXISTS "departures_staff"    ON public.departures;

CREATE POLICY "departures_public" ON public.departures
  FOR SELECT TO anon
  USING (status IN ('open','full','closed'));

CREATE POLICY "departures_staff" ON public.departures
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('super_admin','admin','operator','branch_manager','finance')
    )
  );

-- ---------------------------------------------------------------------------
-- CUSTOMERS
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "customers_own"    ON public.customers;
DROP POLICY IF EXISTS "customers_staff"  ON public.customers;

CREATE POLICY "customers_own" ON public.customers
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "customers_staff" ON public.customers
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('super_admin','admin','operator','branch_manager','finance','marketing')
    )
  );

-- ---------------------------------------------------------------------------
-- CUSTOMER_ACCOUNTS
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "customer_accounts_own"   ON public.customer_accounts;
DROP POLICY IF EXISTS "customer_accounts_admin" ON public.customer_accounts;

CREATE POLICY "customer_accounts_own" ON public.customer_accounts
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "customer_accounts_admin" ON public.customer_accounts
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin')
    )
  );

-- ---------------------------------------------------------------------------
-- CUSTOMER_DOCUMENTS
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "cust_docs_own"    ON public.customer_documents;
DROP POLICY IF EXISTS "cust_docs_staff"  ON public.customer_documents;

CREATE POLICY "cust_docs_own" ON public.customer_documents
  FOR SELECT TO authenticated
  USING (
    customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid())
  );

CREATE POLICY "cust_docs_staff" ON public.customer_documents
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('super_admin','admin','operator','branch_manager')
    )
  );

-- ---------------------------------------------------------------------------
-- LEADS
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "leads_staff"  ON public.leads;

CREATE POLICY "leads_staff" ON public.leads
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('super_admin','admin','marketing','operator','branch_manager')
    )
  );

-- ---------------------------------------------------------------------------
-- COUPONS — public read active coupons
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "coupons_public"  ON public.coupons;
DROP POLICY IF EXISTS "coupons_admin"   ON public.coupons;

CREATE POLICY "coupons_public" ON public.coupons
  FOR SELECT TO authenticated, anon
  USING (is_active = TRUE);

CREATE POLICY "coupons_admin" ON public.coupons
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('super_admin','admin','marketing')
    )
  );

-- ---------------------------------------------------------------------------
-- BOOKINGS
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "bookings_own"    ON public.bookings;
DROP POLICY IF EXISTS "bookings_staff"  ON public.bookings;

CREATE POLICY "bookings_own" ON public.bookings
  FOR SELECT TO authenticated
  USING (
    customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid())
  );

CREATE POLICY "bookings_staff" ON public.bookings
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('super_admin','admin','operator','branch_manager','finance')
    )
  );

-- ---------------------------------------------------------------------------
-- BOOKING_PASSENGERS
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "booking_pax_staff"  ON public.booking_passengers;

CREATE POLICY "booking_pax_staff" ON public.booking_passengers
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('super_admin','admin','operator','branch_manager','finance')
    )
  );

-- ---------------------------------------------------------------------------
-- PAYMENTS
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "payments_own"    ON public.payments;
DROP POLICY IF EXISTS "payments_staff"  ON public.payments;

CREATE POLICY "payments_own" ON public.payments
  FOR SELECT TO authenticated
  USING (
    booking_id IN (
      SELECT id FROM public.bookings
      WHERE customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "payments_staff" ON public.payments
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('super_admin','admin','finance','operator','branch_manager')
    )
  );

-- ---------------------------------------------------------------------------
-- SAVINGS_PLANS / DEPOSITS / SCHEDULES
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "savings_plans_own"    ON public.savings_plans;
DROP POLICY IF EXISTS "savings_plans_staff"  ON public.savings_plans;
DROP POLICY IF EXISTS "savings_deposits_own" ON public.savings_deposits;
DROP POLICY IF EXISTS "savings_schedules_own" ON public.savings_schedules;

CREATE POLICY "savings_plans_own" ON public.savings_plans
  FOR SELECT TO authenticated
  USING (customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid()));

CREATE POLICY "savings_plans_staff" ON public.savings_plans
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('super_admin','admin','finance','operator')
    )
  );

CREATE POLICY "savings_deposits_own" ON public.savings_deposits
  FOR SELECT TO authenticated
  USING (
    plan_id IN (
      SELECT id FROM public.savings_plans
      WHERE customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "savings_schedules_own" ON public.savings_schedules
  FOR SELECT TO authenticated
  USING (
    plan_id IN (
      SELECT id FROM public.savings_plans
      WHERE customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- ANNOUNCEMENTS / BANNERS — public read published
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "announcements_public"  ON public.announcements;
DROP POLICY IF EXISTS "announcements_staff"   ON public.announcements;
DROP POLICY IF EXISTS "banners_public"        ON public.banners;
DROP POLICY IF EXISTS "banners_staff"         ON public.banners;

CREATE POLICY "announcements_public" ON public.announcements
  FOR SELECT TO authenticated, anon
  USING (is_published = TRUE);

CREATE POLICY "announcements_staff" ON public.announcements
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('super_admin','admin','operator','marketing')
    )
  );

CREATE POLICY "banners_public" ON public.banners
  FOR SELECT TO authenticated, anon
  USING (is_active = TRUE);

CREATE POLICY "banners_staff" ON public.banners
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('super_admin','admin','marketing')
    )
  );

-- ---------------------------------------------------------------------------
-- VISA_APPLICATIONS
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "visa_own"    ON public.visa_applications;
DROP POLICY IF EXISTS "visa_staff"  ON public.visa_applications;

CREATE POLICY "visa_own" ON public.visa_applications
  FOR SELECT TO authenticated
  USING (
    customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid())
  );

CREATE POLICY "visa_staff" ON public.visa_applications
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('super_admin','admin','operator','branch_manager')
    )
  );

-- ---------------------------------------------------------------------------
-- MANASIK_SESSIONS
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "manasik_select"  ON public.manasik_sessions;
DROP POLICY IF EXISTS "manasik_staff"   ON public.manasik_sessions;

CREATE POLICY "manasik_select" ON public.manasik_sessions
  FOR SELECT TO authenticated, anon
  USING (status NOT IN ('cancelled'));

CREATE POLICY "manasik_staff" ON public.manasik_sessions
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('super_admin','admin','operator','branch_manager')
    )
  );

-- ---------------------------------------------------------------------------
-- SOS_ALERTS
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "sos_own"    ON public.sos_alerts;
DROP POLICY IF EXISTS "sos_staff"  ON public.sos_alerts;

CREATE POLICY "sos_own" ON public.sos_alerts
  FOR INSERT TO authenticated
  WITH CHECK (
    customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid())
  );

CREATE POLICY "sos_staff" ON public.sos_alerts
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('super_admin','admin','operator','branch_manager')
    )
  );

-- ---------------------------------------------------------------------------
-- APPROVAL_REQUESTS / CONFIGS
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "approval_configs_staff"   ON public.approval_configs;
DROP POLICY IF EXISTS "approval_requests_staff"  ON public.approval_requests;

CREATE POLICY "approval_configs_staff" ON public.approval_configs
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin')
    )
  );

CREATE POLICY "approval_requests_staff" ON public.approval_requests
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('super_admin','admin','finance','branch_manager','operator')
    )
  );

-- ---------------------------------------------------------------------------
-- FINANCE TABLES — finance role access
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "coa_select"           ON public.chart_of_accounts;
DROP POLICY IF EXISTS "coa_finance"          ON public.chart_of_accounts;
DROP POLICY IF EXISTS "journal_finance"      ON public.journal_entries;
DROP POLICY IF EXISTS "vendor_inv_finance"   ON public.vendor_invoices;
DROP POLICY IF EXISTS "commissions_finance"  ON public.commissions;
DROP POLICY IF EXISTS "payroll_finance"      ON public.payroll;
DROP POLICY IF EXISTS "company_settings_sel" ON public.company_settings;
DROP POLICY IF EXISTS "company_settings_adm" ON public.company_settings;

CREATE POLICY "coa_select" ON public.chart_of_accounts
  FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "coa_finance" ON public.chart_of_accounts
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin','finance')
    )
  );

CREATE POLICY "journal_finance" ON public.journal_entries
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin','finance')
    )
  );

CREATE POLICY "vendor_inv_finance" ON public.vendor_invoices
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin','finance','operator')
    )
  );

CREATE POLICY "commissions_finance" ON public.commissions
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin','finance')
    )
  );

CREATE POLICY "payroll_finance" ON public.payroll
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin','finance')
    )
  );

CREATE POLICY "company_settings_sel" ON public.company_settings
  FOR SELECT TO authenticated, anon
  USING (is_public = TRUE);

CREATE POLICY "company_settings_adm" ON public.company_settings
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin')
    )
  );

-- ---------------------------------------------------------------------------
-- DEPARTURE FINANCIALS
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "dep_financials_finance"  ON public.departure_financial_summary;
DROP POLICY IF EXISTS "dep_cost_finance"        ON public.departure_cost_items;
DROP POLICY IF EXISTS "dep_expense_finance"     ON public.departure_expenses;
DROP POLICY IF EXISTS "dep_otherrev_finance"    ON public.departure_other_revenues;

CREATE POLICY "dep_financials_finance" ON public.departure_financial_summary
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin','finance','operator')));

CREATE POLICY "dep_cost_finance" ON public.departure_cost_items
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin','finance','operator')));

CREATE POLICY "dep_expense_finance" ON public.departure_expenses
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin','finance','operator')));

CREATE POLICY "dep_otherrev_finance" ON public.departure_other_revenues
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin','finance','operator')));

-- ---------------------------------------------------------------------------
-- STORE (E-Commerce) — public read published products
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "store_products_public"  ON public.store_products;
DROP POLICY IF EXISTS "store_products_admin"   ON public.store_products;
DROP POLICY IF EXISTS "store_orders_own"       ON public.store_orders;
DROP POLICY IF EXISTS "store_orders_admin"     ON public.store_orders;

CREATE POLICY "store_products_public" ON public.store_products
  FOR SELECT TO authenticated, anon
  USING (is_published = TRUE);

CREATE POLICY "store_products_admin" ON public.store_products
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin','operator')));

CREATE POLICY "store_orders_own" ON public.store_orders
  FOR SELECT TO authenticated
  USING (customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid()));

CREATE POLICY "store_orders_admin" ON public.store_orders
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin','operator','finance')));

-- ---------------------------------------------------------------------------
-- WA_SEND_LOGS / BROADCAST
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "wa_logs_staff"       ON public.wa_send_logs;
DROP POLICY IF EXISTS "wa_broadcast_staff"  ON public.wa_broadcast_campaigns;

CREATE POLICY "wa_logs_staff" ON public.wa_send_logs
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin','marketing','operator')));

CREATE POLICY "wa_broadcast_staff" ON public.wa_broadcast_campaigns
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin','marketing')));

-- ---------------------------------------------------------------------------
-- WHATSAPP_CONFIG — super admin only
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "wa_config_admin"  ON public.whatsapp_config;

CREATE POLICY "wa_config_admin" ON public.whatsapp_config
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin')));

-- ---------------------------------------------------------------------------
-- Public website content — anon + authenticated read
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "faqs_public"          ON public.faqs;
DROP POLICY IF EXISTS "testimonials_public"  ON public.testimonials;
DROP POLICY IF EXISTS "gallery_public"       ON public.gallery_items;
DROP POLICY IF EXISTS "contact_page_public"  ON public.contact_page_content;
DROP POLICY IF EXISTS "contact_msgs_insert"  ON public.contact_messages;
DROP POLICY IF EXISTS "contact_msgs_admin"   ON public.contact_messages;
DROP POLICY IF EXISTS "bank_accounts_select" ON public.bank_accounts;

CREATE POLICY "faqs_public"         ON public.faqs           FOR SELECT TO authenticated, anon USING (is_published = TRUE);
CREATE POLICY "testimonials_public" ON public.testimonials   FOR SELECT TO authenticated, anon USING (is_published = TRUE);
CREATE POLICY "gallery_public"      ON public.gallery_items  FOR SELECT TO authenticated, anon USING (is_published = TRUE);
CREATE POLICY "contact_page_public" ON public.contact_page_content FOR SELECT TO authenticated, anon USING (TRUE);
CREATE POLICY "contact_msgs_insert" ON public.contact_messages FOR INSERT TO authenticated, anon WITH CHECK (TRUE);
CREATE POLICY "contact_msgs_admin"  ON public.contact_messages FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin','marketing')));
CREATE POLICY "bank_accounts_select" ON public.bank_accounts FOR SELECT TO authenticated, anon USING (is_active = TRUE);

SELECT '009_rls_policies: OK' AS result;
