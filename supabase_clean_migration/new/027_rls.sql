-- =============================================================================
-- VINSTOUR TRAVEL PORTAL — Clean Migration v2
-- FILE 027: Row Level Security Policies
--
-- ATURAN WAJIB:
--   - SEMUA policy menggunakan public.has_role() atau public.has_any_role()
--   - DILARANG menulis role = 'admin' langsung di policy expression
--   - Public read menggunakan: TO anon, authenticated
-- =============================================================================

-- ===========================================================================
-- PROFILES
-- ===========================================================================
DROP POLICY IF EXISTS "profiles_select_own"   ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own"   ON public.profiles;

CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "profiles_select_admin"
  ON public.profiles FOR SELECT
  USING (public.is_staff(auth.uid()));

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_admin_update"
  ON public.profiles FOR UPDATE
  USING (public.is_admin_or_above(auth.uid()));

-- ===========================================================================
-- USER_ROLES
-- ===========================================================================
DROP POLICY IF EXISTS "user_roles_select" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_manage" ON public.user_roles;

CREATE POLICY "user_roles_select"
  ON public.user_roles FOR SELECT
  USING (
    auth.uid() = user_id
    OR public.has_any_role(auth.uid(), ARRAY['super_admin','owner','it','admin']::public.app_role[])
  );

CREATE POLICY "user_roles_manage"
  ON public.user_roles FOR ALL
  USING (
    public.has_any_role(auth.uid(), ARRAY['super_admin','it']::public.app_role[])
  );

-- ===========================================================================
-- PERMISSIONS_LIST & ROLE_PERMISSIONS
-- ===========================================================================
CREATE POLICY "permissions_list_select"
  ON public.permissions_list FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "permissions_list_manage"
  ON public.permissions_list FOR ALL
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','it']::public.app_role[]));

CREATE POLICY "role_permissions_select"
  ON public.role_permissions FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "role_permissions_manage"
  ON public.role_permissions FOR ALL
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','it']::public.app_role[]));

-- ===========================================================================
-- STAFF_INVITATIONS
-- ===========================================================================
CREATE POLICY "staff_invitations_select"
  ON public.staff_invitations FOR SELECT
  USING (public.is_admin_or_above(auth.uid()));

CREATE POLICY "staff_invitations_manage"
  ON public.staff_invitations FOR ALL
  USING (public.is_admin_or_above(auth.uid()));

-- ===========================================================================
-- BRANCHES
-- ===========================================================================
CREATE POLICY "branches_select"
  ON public.branches FOR SELECT
  USING (auth.role() IN ('authenticated', 'anon'));

CREATE POLICY "branches_manage"
  ON public.branches FOR ALL
  USING (public.is_admin_or_above(auth.uid()));

-- ===========================================================================
-- AGENTS
-- ===========================================================================
CREATE POLICY "agents_select_staff"
  ON public.agents FOR SELECT
  USING (public.is_staff(auth.uid()));

CREATE POLICY "agents_select_own"
  ON public.agents FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "agents_manage"
  ON public.agents FOR ALL
  USING (public.is_admin_or_above(auth.uid()));

-- ===========================================================================
-- EMPLOYEES
-- ===========================================================================
CREATE POLICY "employees_select"
  ON public.employees FOR SELECT
  USING (
    public.is_staff(auth.uid())
    OR user_id = auth.uid()
  );

CREATE POLICY "employees_manage"
  ON public.employees FOR ALL
  USING (
    public.has_any_role(auth.uid(), ARRAY['super_admin','owner','it','admin','branch_manager']::public.app_role[])
  );

-- ===========================================================================
-- CUSTOMERS
-- ===========================================================================
CREATE POLICY "customers_select"
  ON public.customers FOR SELECT
  USING (
    public.is_staff(auth.uid())
    OR user_id = auth.uid()
  );

CREATE POLICY "customers_insert"
  ON public.customers FOR INSERT
  WITH CHECK (
    public.has_any_role(auth.uid(), ARRAY['admin','operator','sales','agent']::public.app_role[])
    OR user_id = auth.uid()
  );

CREATE POLICY "customers_update"
  ON public.customers FOR UPDATE
  USING (
    public.has_any_role(auth.uid(), ARRAY['admin','operator','sales','agent']::public.app_role[])
    OR user_id = auth.uid()
  );

-- ===========================================================================
-- CUSTOMER_ACCOUNTS
-- ===========================================================================
CREATE POLICY "customer_accounts_select_own"
  ON public.customer_accounts FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "customer_accounts_select_staff"
  ON public.customer_accounts FOR SELECT
  USING (public.is_staff(auth.uid()));

CREATE POLICY "customer_accounts_manage_own"
  ON public.customer_accounts FOR UPDATE
  USING (user_id = auth.uid());

-- ===========================================================================
-- AIRLINES, AIRPORTS, HOTELS, VENDORS — Public read, admin write
-- ===========================================================================
CREATE POLICY "airlines_public_read"  ON public.airlines FOR SELECT TO anon, authenticated USING (TRUE);
CREATE POLICY "airlines_manage"       ON public.airlines FOR ALL USING (public.is_admin_or_above(auth.uid()));

CREATE POLICY "airports_public_read"  ON public.airports FOR SELECT TO anon, authenticated USING (TRUE);
CREATE POLICY "airports_manage"       ON public.airports FOR ALL USING (public.is_admin_or_above(auth.uid()));

CREATE POLICY "hotels_public_read"    ON public.hotels FOR SELECT TO anon, authenticated USING (is_active = TRUE);
CREATE POLICY "hotels_manage"         ON public.hotels FOR ALL USING (public.is_admin_or_above(auth.uid()));

CREATE POLICY "hotel_room_cap_read"   ON public.hotel_room_capacities FOR SELECT TO anon, authenticated USING (TRUE);
CREATE POLICY "hotel_room_cap_manage" ON public.hotel_room_capacities FOR ALL USING (public.is_admin_or_above(auth.uid()));

CREATE POLICY "vendors_staff_read"    ON public.vendors FOR SELECT USING (public.is_staff(auth.uid()));
CREATE POLICY "vendors_manage"        ON public.vendors FOR ALL USING (public.is_admin_or_above(auth.uid()));

-- ===========================================================================
-- PACKAGES — Public read (published), admin write
-- ===========================================================================
CREATE POLICY "packages_public_read"
  ON public.packages FOR SELECT
  TO anon, authenticated
  USING (is_published = TRUE AND is_active = TRUE);

CREATE POLICY "packages_staff_read"
  ON public.packages FOR SELECT
  USING (public.is_staff(auth.uid()));

CREATE POLICY "packages_manage"
  ON public.packages FOR ALL
  USING (
    public.has_any_role(auth.uid(), ARRAY['super_admin','owner','it','admin']::public.app_role[])
  );

-- ===========================================================================
-- DEPARTURES — Public read (open), staff write
-- ===========================================================================
CREATE POLICY "departures_public_read"
  ON public.departures FOR SELECT
  TO anon, authenticated
  USING (status IN ('open','full'));

CREATE POLICY "departures_staff_read"
  ON public.departures FOR SELECT
  USING (public.is_staff(auth.uid()));

CREATE POLICY "departures_manage"
  ON public.departures FOR ALL
  USING (
    public.has_any_role(auth.uid(), ARRAY['super_admin','owner','it','admin','operational']::public.app_role[])
  );

-- ===========================================================================
-- BOOKINGS
-- ===========================================================================
CREATE POLICY "bookings_staff_select"
  ON public.bookings FOR SELECT
  USING (
    public.has_any_role(auth.uid(), ARRAY[
      'super_admin','owner','it','admin','branch_manager',
      'finance','operational','operator','sales'
    ]::public.app_role[])
  );

CREATE POLICY "bookings_agent_select"
  ON public.bookings FOR SELECT
  USING (
    public.has_role(auth.uid(), 'agent'::public.app_role)
    AND EXISTS (
      SELECT 1 FROM public.agents a WHERE a.user_id = auth.uid() AND a.id = agent_id
    )
  );

CREATE POLICY "bookings_manage"
  ON public.bookings FOR ALL
  USING (
    public.has_any_role(auth.uid(), ARRAY[
      'super_admin','owner','it','admin','operator','sales'
    ]::public.app_role[])
  );

-- ===========================================================================
-- PAYMENTS
-- ===========================================================================
CREATE POLICY "payments_staff_select"
  ON public.payments FOR SELECT
  USING (
    public.has_any_role(auth.uid(), ARRAY[
      'super_admin','owner','it','admin','finance','operational'
    ]::public.app_role[])
  );

CREATE POLICY "payments_insert"
  ON public.payments FOR INSERT
  WITH CHECK (
    public.is_staff(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.bookings b
        JOIN public.customers c ON c.id = b.customer_id
      WHERE b.id = booking_id AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "payments_manage"
  ON public.payments FOR UPDATE
  USING (
    public.has_any_role(auth.uid(), ARRAY['super_admin','owner','finance','admin']::public.app_role[])
  );

-- ===========================================================================
-- LEADS
-- ===========================================================================
CREATE POLICY "leads_staff_select"
  ON public.leads FOR SELECT
  USING (public.is_staff(auth.uid()));

CREATE POLICY "leads_agent_select"
  ON public.leads FOR SELECT
  USING (
    public.has_role(auth.uid(), 'agent'::public.app_role)
    AND EXISTS (SELECT 1 FROM public.agents a WHERE a.user_id = auth.uid() AND a.id = agent_id)
  );

CREATE POLICY "leads_manage"
  ON public.leads FOR ALL
  USING (
    public.has_any_role(auth.uid(), ARRAY['admin','sales','operator','marketing']::public.app_role[])
  );

-- ===========================================================================
-- AUDIT_LOGS — Only staff can read, no one can update/delete
-- ===========================================================================
CREATE POLICY "audit_logs_select"
  ON public.audit_logs FOR SELECT
  USING (public.is_admin_or_above(auth.uid()));

CREATE POLICY "audit_logs_insert"
  ON public.audit_logs FOR INSERT
  WITH CHECK (TRUE);

-- ===========================================================================
-- WEBSITE CMS — Public read, admin write
-- ===========================================================================
CREATE POLICY "website_settings_public"
  ON public.website_settings FOR SELECT TO anon, authenticated USING (TRUE);
CREATE POLICY "website_settings_manage"
  ON public.website_settings FOR ALL
  USING (public.is_admin_or_above(auth.uid()));

CREATE POLICY "faqs_public_read"
  ON public.faqs FOR SELECT TO anon, authenticated USING (is_published = TRUE);
CREATE POLICY "faqs_manage"
  ON public.faqs FOR ALL USING (public.is_admin_or_above(auth.uid()));

CREATE POLICY "testimonials_public_read"
  ON public.testimonials FOR SELECT TO anon, authenticated USING (is_published = TRUE);
CREATE POLICY "testimonials_manage"
  ON public.testimonials FOR ALL USING (public.is_admin_or_above(auth.uid()));

CREATE POLICY "banners_public_read"
  ON public.banners FOR SELECT TO anon, authenticated USING (is_active = TRUE);
CREATE POLICY "banners_manage"
  ON public.banners FOR ALL USING (public.is_admin_or_above(auth.uid()));

CREATE POLICY "announcements_public_read"
  ON public.announcements FOR SELECT TO anon, authenticated USING (is_active = TRUE);
CREATE POLICY "announcements_manage"
  ON public.announcements FOR ALL USING (public.is_admin_or_above(auth.uid()));

CREATE POLICY "gallery_items_public_read"
  ON public.gallery_items FOR SELECT TO anon, authenticated USING (is_active = TRUE);
CREATE POLICY "gallery_items_manage"
  ON public.gallery_items FOR ALL USING (public.is_admin_or_above(auth.uid()));

CREATE POLICY "faqs_staff_manage"
  ON public.faqs FOR ALL USING (public.is_staff(auth.uid()));

-- ===========================================================================
-- COMPANY_SETTINGS
-- ===========================================================================
CREATE POLICY "company_settings_public_read"
  ON public.company_settings FOR SELECT TO anon, authenticated USING (is_public = TRUE);
CREATE POLICY "company_settings_staff_read"
  ON public.company_settings FOR SELECT USING (public.is_staff(auth.uid()));
CREATE POLICY "company_settings_manage"
  ON public.company_settings FOR ALL
  USING (public.is_admin_or_above(auth.uid()));

-- ===========================================================================
-- NOTIFICATIONS
-- ===========================================================================
CREATE POLICY "notifications_own"
  ON public.notifications FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "notifications_admin_insert"
  ON public.notifications FOR INSERT
  WITH CHECK (public.is_staff(auth.uid()));

-- ===========================================================================
-- FINANCE
-- ===========================================================================
CREATE POLICY "chart_of_accounts_read"
  ON public.chart_of_accounts FOR SELECT
  USING (public.is_staff(auth.uid()));
CREATE POLICY "chart_of_accounts_manage"
  ON public.chart_of_accounts FOR ALL
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','owner','finance','it']::public.app_role[]));

CREATE POLICY "journal_entries_read"
  ON public.journal_entries FOR SELECT
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','owner','finance','admin']::public.app_role[]));
CREATE POLICY "journal_entries_manage"
  ON public.journal_entries FOR ALL
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','owner','finance']::public.app_role[]));

CREATE POLICY "journal_lines_read"
  ON public.journal_lines FOR SELECT
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','owner','finance','admin']::public.app_role[]));

CREATE POLICY "payroll_read"
  ON public.payroll FOR SELECT
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','owner','finance','admin','branch_manager']::public.app_role[]));
CREATE POLICY "payroll_manage"
  ON public.payroll FOR ALL
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','owner','finance']::public.app_role[]));

CREATE POLICY "payroll_slips_read"
  ON public.payroll_slips FOR SELECT
  USING (
    public.has_any_role(auth.uid(), ARRAY['super_admin','owner','finance']::public.app_role[])
    OR EXISTS (
      SELECT 1 FROM public.employees e WHERE e.user_id = auth.uid() AND e.id = employee_id
    )
  );

-- ===========================================================================
-- EQUIPMENT
-- ===========================================================================
CREATE POLICY "equipment_items_staff_read"
  ON public.equipment_items FOR SELECT USING (public.is_staff(auth.uid()));
CREATE POLICY "equipment_items_manage"
  ON public.equipment_items FOR ALL
  USING (public.has_any_role(auth.uid(), ARRAY['admin','equipment','operational']::public.app_role[]));

CREATE POLICY "equipment_dist_read"
  ON public.equipment_distributions FOR SELECT USING (public.is_staff(auth.uid()));
CREATE POLICY "equipment_dist_manage"
  ON public.equipment_distributions FOR ALL
  USING (public.has_any_role(auth.uid(), ARRAY['admin','equipment','operational']::public.app_role[]));

-- ===========================================================================
-- SAVINGS
-- ===========================================================================
CREATE POLICY "savings_plans_staff"
  ON public.savings_plans FOR SELECT USING (public.is_staff(auth.uid()));
CREATE POLICY "savings_plans_own"
  ON public.savings_plans FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.customers c
        JOIN public.customer_accounts ca ON ca.customer_id = c.id
      WHERE c.id = customer_id AND ca.user_id = auth.uid()
    )
  );
CREATE POLICY "savings_plans_manage"
  ON public.savings_plans FOR ALL
  USING (public.has_any_role(auth.uid(), ARRAY['admin','finance','operator']::public.app_role[]));

-- ===========================================================================
-- WHATSAPP CONFIG — Staff only
-- ===========================================================================
CREATE POLICY "whatsapp_config_read"
  ON public.whatsapp_config FOR SELECT USING (public.is_staff(auth.uid()));
CREATE POLICY "whatsapp_config_manage"
  ON public.whatsapp_config FOR ALL
  USING (public.is_admin_or_above(auth.uid()));
