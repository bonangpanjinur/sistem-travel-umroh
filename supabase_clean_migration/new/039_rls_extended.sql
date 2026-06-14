-- =============================================================================
-- VINSTOUR TRAVEL PORTAL — Clean Migration Chain
-- FILE 039: RLS Policies for Tables 031–037
-- Run AFTER 038. Idempotent — DROP POLICY IF EXISTS before CREATE.
-- All policies use helper functions from 007_functions.sql:
--   public.has_role(uid, role)
--   public.has_any_role(uid, role[])
--   public.can_access_branch(uid, branch_id)
--   public.has_permission(uid, key, action)
-- =============================================================================

-- ===========================================================================
-- 031: CUSTOMERS & TRAVEL EXTENDED
-- ===========================================================================

-- CUSTOMERS --
DROP POLICY IF EXISTS "customers_select" ON public.customers;
CREATE POLICY "customers_select" ON public.customers FOR SELECT
  USING (
    public.has_any_role(auth.uid(), ARRAY['super_admin','admin','finance','operational',
                                          'operator','sales','branch_manager']::TEXT[])
    OR (
      public.has_role(auth.uid(), 'branch_manager'::TEXT)
      AND branch_id = (SELECT ur.branch_id FROM public.user_roles ur WHERE ur.user_id = auth.uid() LIMIT 1)
    )
    OR (
      public.has_role(auth.uid(), 'agent'::TEXT)
      AND agent_id = (SELECT a.id FROM public.agents a WHERE a.user_id = auth.uid() LIMIT 1)
    )
    OR (
      public.has_role(auth.uid(), 'sub_agent'::TEXT)
      AND agent_id = (SELECT a.id FROM public.agents a WHERE a.user_id = auth.uid() LIMIT 1)
    )
    OR user_id = auth.uid()
  );

DROP POLICY IF EXISTS "customers_insert" ON public.customers;
CREATE POLICY "customers_insert" ON public.customers FOR INSERT
  WITH CHECK (
    public.has_any_role(auth.uid(), ARRAY['super_admin','admin','operator','sales','agent','sub_agent']::TEXT[])
  );

DROP POLICY IF EXISTS "customers_update" ON public.customers;
CREATE POLICY "customers_update" ON public.customers FOR UPDATE
  USING (
    public.has_any_role(auth.uid(), ARRAY['super_admin','admin','operator','sales']::TEXT[])
    OR (
      public.has_role(auth.uid(), 'agent'::TEXT)
      AND agent_id = (SELECT a.id FROM public.agents a WHERE a.user_id = auth.uid() LIMIT 1)
    )
    OR user_id = auth.uid()
  );

DROP POLICY IF EXISTS "customers_delete" ON public.customers;
CREATE POLICY "customers_delete" ON public.customers FOR DELETE
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin']::TEXT[]));

-- CUSTOMER_DOCUMENTS --
DROP POLICY IF EXISTS "customer_documents_select" ON public.customer_documents;
CREATE POLICY "customer_documents_select" ON public.customer_documents FOR SELECT
  USING (
    public.has_any_role(auth.uid(), ARRAY['super_admin','admin','operational','operator']::TEXT[])
    OR EXISTS (
      SELECT 1 FROM public.customers c
      WHERE c.id = customer_id AND (c.user_id = auth.uid() OR
        c.agent_id = (SELECT a.id FROM public.agents a WHERE a.user_id = auth.uid() LIMIT 1))
    )
  );

DROP POLICY IF EXISTS "customer_documents_insert" ON public.customer_documents;
CREATE POLICY "customer_documents_insert" ON public.customer_documents FOR INSERT
  WITH CHECK (
    public.has_any_role(auth.uid(), ARRAY['super_admin','admin','operational','operator','agent','sub_agent']::TEXT[])
    OR EXISTS (SELECT 1 FROM public.customers c WHERE c.id = customer_id AND c.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "customer_documents_update" ON public.customer_documents;
CREATE POLICY "customer_documents_update" ON public.customer_documents FOR UPDATE
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','admin','operational','operator']::TEXT[]));

-- CUSTOMER_MAHRAMS --
DROP POLICY IF EXISTS "customer_mahrams_all" ON public.customer_mahrams;
CREATE POLICY "customer_mahrams_all" ON public.customer_mahrams FOR ALL
  USING (
    public.has_any_role(auth.uid(), ARRAY['super_admin','admin','operational','operator']::TEXT[])
    OR EXISTS (SELECT 1 FROM public.customers c WHERE c.id = customer_id AND c.user_id = auth.uid())
  );

-- DEPARTURE_HOTELS --
DROP POLICY IF EXISTS "departure_hotels_select" ON public.departure_hotels;
CREATE POLICY "departure_hotels_select" ON public.departure_hotels FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "departure_hotels_modify" ON public.departure_hotels;
CREATE POLICY "departure_hotels_modify" ON public.departure_hotels FOR ALL
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','admin','operational']::TEXT[]));

-- DEPARTURE_ITINERARIES --
DROP POLICY IF EXISTS "departure_itineraries_select" ON public.departure_itineraries;
CREATE POLICY "departure_itineraries_select" ON public.departure_itineraries FOR SELECT
  USING (auth.uid() IS NOT NULL OR auth.role() = 'anon');

DROP POLICY IF EXISTS "departure_itineraries_modify" ON public.departure_itineraries;
CREATE POLICY "departure_itineraries_modify" ON public.departure_itineraries FOR ALL
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','admin','operational']::TEXT[]));

-- DEPARTURE_CHECKLISTS --
DROP POLICY IF EXISTS "departure_checklists_all" ON public.departure_checklists;
CREATE POLICY "departure_checklists_all" ON public.departure_checklists FOR ALL
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','admin','operational']::TEXT[]));

-- MANIFESTS --
DROP POLICY IF EXISTS "manifests_select" ON public.manifests;
CREATE POLICY "manifests_select" ON public.manifests FOR SELECT
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','admin','operational','operator','finance']::TEXT[]));

DROP POLICY IF EXISTS "manifests_modify" ON public.manifests;
CREATE POLICY "manifests_modify" ON public.manifests FOR ALL
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','admin','operational']::TEXT[]));

-- LUGGAGE --
DROP POLICY IF EXISTS "luggage_all" ON public.luggage;
CREATE POLICY "luggage_all" ON public.luggage FOR ALL
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','admin','operational','operator']::TEXT[]));

-- BUS_PROVIDERS --
DROP POLICY IF EXISTS "bus_providers_select" ON public.bus_providers;
CREATE POLICY "bus_providers_select" ON public.bus_providers FOR SELECT
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','admin','operational','operator']::TEXT[]));

DROP POLICY IF EXISTS "bus_providers_modify" ON public.bus_providers;
CREATE POLICY "bus_providers_modify" ON public.bus_providers FOR ALL
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','admin']::TEXT[]));

-- BUS_ASSIGNMENTS --
DROP POLICY IF EXISTS "bus_assignments_all" ON public.bus_assignments;
CREATE POLICY "bus_assignments_all" ON public.bus_assignments FOR ALL
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','admin','operational']::TEXT[]));

-- BUS_PASSENGERS --
DROP POLICY IF EXISTS "bus_passengers_all" ON public.bus_passengers;
CREATE POLICY "bus_passengers_all" ON public.bus_passengers FOR ALL
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','admin','operational','operator']::TEXT[]));

-- HAJI_REGISTRATIONS --
DROP POLICY IF EXISTS "haji_registrations_select" ON public.haji_registrations;
CREATE POLICY "haji_registrations_select" ON public.haji_registrations FOR SELECT
  USING (
    public.has_any_role(auth.uid(), ARRAY['super_admin','admin','operational','sales','agent']::TEXT[])
    OR EXISTS (SELECT 1 FROM public.customers c WHERE c.id = customer_id AND c.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "haji_registrations_insert" ON public.haji_registrations;
CREATE POLICY "haji_registrations_insert" ON public.haji_registrations FOR INSERT
  WITH CHECK (
    public.has_any_role(auth.uid(), ARRAY['super_admin','admin','operational','operator','sales','agent','sub_agent']::TEXT[])
    OR EXISTS (SELECT 1 FROM public.customers c WHERE c.id = customer_id AND c.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "haji_registrations_update" ON public.haji_registrations;
CREATE POLICY "haji_registrations_update" ON public.haji_registrations FOR UPDATE
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','admin','operational','operator']::TEXT[]));

-- HAJI_WAITING_PROGRESS --
DROP POLICY IF EXISTS "haji_waiting_progress_all" ON public.haji_waiting_progress;
CREATE POLICY "haji_waiting_progress_all" ON public.haji_waiting_progress FOR ALL
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','admin','operational','sales','agent']::TEXT[]));

-- ===========================================================================
-- 032: HR EXTENDED
-- ===========================================================================

-- DEPARTMENTS --
DROP POLICY IF EXISTS "departments_all" ON public.departments;
CREATE POLICY "departments_all" ON public.departments FOR ALL
  USING (
    public.has_any_role(auth.uid(), ARRAY['super_admin','admin']::TEXT[])
    OR (public.has_role(auth.uid(), 'branch_manager'::TEXT) AND public.can_access_branch(auth.uid(), branch_id))
  );

-- ATTENDANCE_RECORDS --
DROP POLICY IF EXISTS "attendance_records_select" ON public.attendance_records;
CREATE POLICY "attendance_records_select" ON public.attendance_records FOR SELECT
  USING (
    public.has_any_role(auth.uid(), ARRAY['super_admin','admin','finance']::TEXT[])
    OR (public.has_role(auth.uid(), 'branch_manager'::TEXT) AND
        employee_id IN (SELECT e.id FROM public.employees e WHERE public.can_access_branch(auth.uid(), e.branch_id)))
    OR employee_id = (SELECT e.id FROM public.employees e WHERE e.user_id = auth.uid() LIMIT 1)
  );

DROP POLICY IF EXISTS "attendance_records_insert" ON public.attendance_records;
CREATE POLICY "attendance_records_insert" ON public.attendance_records FOR INSERT
  WITH CHECK (
    public.has_any_role(auth.uid(), ARRAY['super_admin','admin']::TEXT[])
    OR employee_id = (SELECT e.id FROM public.employees e WHERE e.user_id = auth.uid() LIMIT 1)
  );

DROP POLICY IF EXISTS "attendance_records_update" ON public.attendance_records;
CREATE POLICY "attendance_records_update" ON public.attendance_records FOR UPDATE
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','admin','branch_manager']::TEXT[]));

-- PAYROLL_COMPONENTS --
DROP POLICY IF EXISTS "payroll_components_all" ON public.payroll_components;
CREATE POLICY "payroll_components_all" ON public.payroll_components FOR ALL
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','admin','finance']::TEXT[]));

-- LEAVE_QUOTAS --
DROP POLICY IF EXISTS "leave_quotas_all" ON public.leave_quotas;
CREATE POLICY "leave_quotas_all" ON public.leave_quotas FOR ALL
  USING (
    public.has_any_role(auth.uid(), ARRAY['super_admin','admin','finance']::TEXT[])
    OR employee_id = (SELECT e.id FROM public.employees e WHERE e.user_id = auth.uid() LIMIT 1)
  );

-- EMPLOYEE_CONTRACTS --
DROP POLICY IF EXISTS "employee_contracts_all" ON public.employee_contracts;
CREATE POLICY "employee_contracts_all" ON public.employee_contracts FOR ALL
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','admin']::TEXT[]));

-- WARNING_LETTERS --
DROP POLICY IF EXISTS "warning_letters_all" ON public.warning_letters;
CREATE POLICY "warning_letters_all" ON public.warning_letters FOR ALL
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','admin']::TEXT[]));

-- TRAINING_SESSIONS --
DROP POLICY IF EXISTS "training_sessions_select" ON public.training_sessions;
CREATE POLICY "training_sessions_select" ON public.training_sessions FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "training_sessions_modify" ON public.training_sessions;
CREATE POLICY "training_sessions_modify" ON public.training_sessions FOR ALL
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','admin']::TEXT[]));

-- TRAINING_PARTICIPANTS --
DROP POLICY IF EXISTS "training_participants_all" ON public.training_participants;
CREATE POLICY "training_participants_all" ON public.training_participants FOR ALL
  USING (
    public.has_any_role(auth.uid(), ARRAY['super_admin','admin']::TEXT[])
    OR employee_id = (SELECT e.id FROM public.employees e WHERE e.user_id = auth.uid() LIMIT 1)
  );

-- JOB_OPENINGS --
DROP POLICY IF EXISTS "job_openings_select" ON public.job_openings;
CREATE POLICY "job_openings_select" ON public.job_openings FOR SELECT
  USING (status = 'open' OR public.has_any_role(auth.uid(), ARRAY['super_admin','admin']::TEXT[]));

DROP POLICY IF EXISTS "job_openings_modify" ON public.job_openings;
CREATE POLICY "job_openings_modify" ON public.job_openings FOR ALL
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','admin']::TEXT[]));

-- JOB_APPLICATIONS --
DROP POLICY IF EXISTS "job_applications_all" ON public.job_applications;
CREATE POLICY "job_applications_all" ON public.job_applications FOR ALL
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','admin']::TEXT[]));

-- ===========================================================================
-- 033: EQUIPMENT EXTENDED
-- ===========================================================================

-- EQUIPMENT_CATEGORIES --
DROP POLICY IF EXISTS "equipment_categories_select" ON public.equipment_categories;
CREATE POLICY "equipment_categories_select" ON public.equipment_categories FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "equipment_categories_modify" ON public.equipment_categories;
CREATE POLICY "equipment_categories_modify" ON public.equipment_categories FOR ALL
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','admin','equipment']::TEXT[]));

-- EQUIPMENT_VARIANTS --
DROP POLICY IF EXISTS "equipment_variants_select" ON public.equipment_variants;
CREATE POLICY "equipment_variants_select" ON public.equipment_variants FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "equipment_variants_modify" ON public.equipment_variants;
CREATE POLICY "equipment_variants_modify" ON public.equipment_variants FOR ALL
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','admin','equipment']::TEXT[]));

-- EQUIPMENT_PHOTOS --
DROP POLICY IF EXISTS "equipment_photos_all" ON public.equipment_photos;
CREATE POLICY "equipment_photos_all" ON public.equipment_photos FOR ALL
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','admin','equipment']::TEXT[]));

-- EQUIPMENT_STOCK_HISTORY --
DROP POLICY IF EXISTS "equipment_stock_history_select" ON public.equipment_stock_history;
CREATE POLICY "equipment_stock_history_select" ON public.equipment_stock_history FOR SELECT
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','admin','equipment','operational']::TEXT[]));

DROP POLICY IF EXISTS "equipment_stock_history_insert" ON public.equipment_stock_history;
CREATE POLICY "equipment_stock_history_insert" ON public.equipment_stock_history FOR INSERT
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['super_admin','admin','equipment','operational']::TEXT[]));

-- EQUIPMENT_STOCK_OPNAME --
DROP POLICY IF EXISTS "equipment_stock_opname_all" ON public.equipment_stock_opname;
CREATE POLICY "equipment_stock_opname_all" ON public.equipment_stock_opname FOR ALL
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','admin','equipment']::TEXT[]));

-- EQUIPMENT_OPNAME_ITEMS --
DROP POLICY IF EXISTS "equipment_opname_items_all" ON public.equipment_opname_items;
CREATE POLICY "equipment_opname_items_all" ON public.equipment_opname_items FOR ALL
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','admin','equipment']::TEXT[]));

-- EQUIPMENT_NOTIFICATION_SETTINGS --
DROP POLICY IF EXISTS "equipment_notification_settings_all" ON public.equipment_notification_settings;
CREATE POLICY "equipment_notification_settings_all" ON public.equipment_notification_settings FOR ALL
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','admin','equipment']::TEXT[]));

-- ===========================================================================
-- 034: CRM EXTENDED
-- ===========================================================================

-- CUSTOMER_FAMILY_RELATIONS --
DROP POLICY IF EXISTS "customer_family_relations_all" ON public.customer_family_relations;
CREATE POLICY "customer_family_relations_all" ON public.customer_family_relations FOR ALL
  USING (
    public.has_any_role(auth.uid(), ARRAY['super_admin','admin','operational','operator']::TEXT[])
    OR EXISTS (SELECT 1 FROM public.customers c WHERE c.id = customer_id AND c.user_id = auth.uid())
  );

-- JAMAAH_QR_CODES --
DROP POLICY IF EXISTS "jamaah_qr_codes_select" ON public.jamaah_qr_codes;
CREATE POLICY "jamaah_qr_codes_select" ON public.jamaah_qr_codes FOR SELECT
  USING (
    public.has_any_role(auth.uid(), ARRAY['super_admin','admin','operational','operator']::TEXT[])
    OR EXISTS (SELECT 1 FROM public.customers c WHERE c.id = customer_id AND c.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "jamaah_qr_codes_modify" ON public.jamaah_qr_codes;
CREATE POLICY "jamaah_qr_codes_modify" ON public.jamaah_qr_codes FOR ALL
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','admin','operational']::TEXT[]));

-- JAMAAH_LIVE_LOCATIONS --
DROP POLICY IF EXISTS "jamaah_live_locations_select" ON public.jamaah_live_locations;
CREATE POLICY "jamaah_live_locations_select" ON public.jamaah_live_locations FOR SELECT
  USING (
    public.has_any_role(auth.uid(), ARRAY['super_admin','admin','operational']::TEXT[])
    OR EXISTS (SELECT 1 FROM public.customers c WHERE c.id = customer_id AND c.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "jamaah_live_locations_insert" ON public.jamaah_live_locations;
CREATE POLICY "jamaah_live_locations_insert" ON public.jamaah_live_locations FOR INSERT
  WITH CHECK (
    public.has_any_role(auth.uid(), ARRAY['super_admin','admin','operational']::TEXT[])
    OR EXISTS (SELECT 1 FROM public.customers c WHERE c.id = customer_id AND c.user_id = auth.uid())
  );

-- BOOKING_TRANSFERS --
DROP POLICY IF EXISTS "booking_transfers_select" ON public.booking_transfers;
CREATE POLICY "booking_transfers_select" ON public.booking_transfers FOR SELECT
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','admin','operator','finance']::TEXT[]));

DROP POLICY IF EXISTS "booking_transfers_insert" ON public.booking_transfers;
CREATE POLICY "booking_transfers_insert" ON public.booking_transfers FOR INSERT
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['super_admin','admin']::TEXT[]));

DROP POLICY IF EXISTS "booking_transfers_update" ON public.booking_transfers;
CREATE POLICY "booking_transfers_update" ON public.booking_transfers FOR UPDATE
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','admin']::TEXT[]));

-- AGENT_WALLETS --
DROP POLICY IF EXISTS "agent_wallets_select" ON public.agent_wallets;
CREATE POLICY "agent_wallets_select" ON public.agent_wallets FOR SELECT
  USING (
    public.has_any_role(auth.uid(), ARRAY['super_admin','admin','finance']::TEXT[])
    OR agent_id = (SELECT a.id FROM public.agents a WHERE a.user_id = auth.uid() LIMIT 1)
  );

DROP POLICY IF EXISTS "agent_wallets_modify" ON public.agent_wallets;
CREATE POLICY "agent_wallets_modify" ON public.agent_wallets FOR ALL
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','admin','finance']::TEXT[]));

-- AGENT_WALLET_TRANSACTIONS --
DROP POLICY IF EXISTS "agent_wallet_transactions_select" ON public.agent_wallet_transactions;
CREATE POLICY "agent_wallet_transactions_select" ON public.agent_wallet_transactions FOR SELECT
  USING (
    public.has_any_role(auth.uid(), ARRAY['super_admin','admin','finance']::TEXT[])
    OR agent_id = (SELECT a.id FROM public.agents a WHERE a.user_id = auth.uid() LIMIT 1)
  );

DROP POLICY IF EXISTS "agent_wallet_transactions_insert" ON public.agent_wallet_transactions;
CREATE POLICY "agent_wallet_transactions_insert" ON public.agent_wallet_transactions FOR INSERT
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['super_admin','admin','finance']::TEXT[]));

-- MARKETING_CAMPAIGNS --
DROP POLICY IF EXISTS "marketing_campaigns_all" ON public.marketing_campaigns;
CREATE POLICY "marketing_campaigns_all" ON public.marketing_campaigns FOR ALL
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','admin','marketing']::TEXT[]));

-- MARKETING_MATERIALS --
DROP POLICY IF EXISTS "marketing_materials_select" ON public.marketing_materials;
CREATE POLICY "marketing_materials_select" ON public.marketing_materials FOR SELECT
  USING (is_public = TRUE OR public.has_any_role(auth.uid(), ARRAY['super_admin','admin','marketing','sales','agent','sub_agent']::TEXT[]));

DROP POLICY IF EXISTS "marketing_materials_modify" ON public.marketing_materials;
CREATE POLICY "marketing_materials_modify" ON public.marketing_materials FOR ALL
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','admin','marketing']::TEXT[]));

-- MARKETING_MATERIAL_DOWNLOADS --
DROP POLICY IF EXISTS "marketing_material_downloads_insert" ON public.marketing_material_downloads;
CREATE POLICY "marketing_material_downloads_insert" ON public.marketing_material_downloads FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "marketing_material_downloads_select" ON public.marketing_material_downloads;
CREATE POLICY "marketing_material_downloads_select" ON public.marketing_material_downloads FOR SELECT
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','admin','marketing']::TEXT[]));

-- LOYALTY_TRANSACTIONS --
DROP POLICY IF EXISTS "loyalty_transactions_select" ON public.loyalty_transactions;
CREATE POLICY "loyalty_transactions_select" ON public.loyalty_transactions FOR SELECT
  USING (
    public.has_any_role(auth.uid(), ARRAY['super_admin','admin','marketing','finance']::TEXT[])
    OR EXISTS (SELECT 1 FROM public.customers c WHERE c.id = customer_id AND c.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "loyalty_transactions_insert" ON public.loyalty_transactions;
CREATE POLICY "loyalty_transactions_insert" ON public.loyalty_transactions FOR INSERT
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['super_admin','admin','marketing','finance']::TEXT[]));

-- LOYALTY_REWARDS --
DROP POLICY IF EXISTS "loyalty_rewards_select" ON public.loyalty_rewards;
CREATE POLICY "loyalty_rewards_select" ON public.loyalty_rewards FOR SELECT USING (is_active = TRUE OR public.has_any_role(auth.uid(), ARRAY['super_admin','admin','marketing']::TEXT[]));

DROP POLICY IF EXISTS "loyalty_rewards_modify" ON public.loyalty_rewards;
CREATE POLICY "loyalty_rewards_modify" ON public.loyalty_rewards FOR ALL
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','admin','marketing']::TEXT[]));

-- LOYALTY_POINT_EXPIRY --
DROP POLICY IF EXISTS "loyalty_point_expiry_all" ON public.loyalty_point_expiry;
CREATE POLICY "loyalty_point_expiry_all" ON public.loyalty_point_expiry FOR ALL
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','admin','marketing','finance']::TEXT[]));

-- ===========================================================================
-- 035: CONTENT
-- ===========================================================================

-- BLOG_CATEGORIES, BLOG_TAGS --
DROP POLICY IF EXISTS "blog_categories_select" ON public.blog_categories;
CREATE POLICY "blog_categories_select" ON public.blog_categories FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS "blog_categories_modify" ON public.blog_categories;
CREATE POLICY "blog_categories_modify" ON public.blog_categories FOR ALL
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','admin','marketing']::TEXT[]));

DROP POLICY IF EXISTS "blog_tags_select" ON public.blog_tags;
CREATE POLICY "blog_tags_select" ON public.blog_tags FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS "blog_tags_modify" ON public.blog_tags;
CREATE POLICY "blog_tags_modify" ON public.blog_tags FOR ALL
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','admin','marketing']::TEXT[]));

-- BLOG_POSTS --
DROP POLICY IF EXISTS "blog_posts_select" ON public.blog_posts;
CREATE POLICY "blog_posts_select" ON public.blog_posts FOR SELECT
  USING (is_published = TRUE OR public.has_any_role(auth.uid(), ARRAY['super_admin','admin','marketing']::TEXT[]));
DROP POLICY IF EXISTS "blog_posts_modify" ON public.blog_posts;
CREATE POLICY "blog_posts_modify" ON public.blog_posts FOR ALL
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','admin','marketing']::TEXT[]));

-- BLOG_POST_TAGS --
DROP POLICY IF EXISTS "blog_post_tags_all" ON public.blog_post_tags;
CREATE POLICY "blog_post_tags_all" ON public.blog_post_tags FOR ALL
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','admin','marketing']::TEXT[]));

-- LANDING_PAGES --
DROP POLICY IF EXISTS "landing_pages_select" ON public.landing_pages;
CREATE POLICY "landing_pages_select" ON public.landing_pages FOR SELECT
  USING (is_published = TRUE OR public.has_any_role(auth.uid(), ARRAY['super_admin','admin','marketing']::TEXT[])
    OR created_by = auth.uid());
DROP POLICY IF EXISTS "landing_pages_modify" ON public.landing_pages;
CREATE POLICY "landing_pages_modify" ON public.landing_pages FOR ALL
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','admin','marketing']::TEXT[]) OR created_by = auth.uid());

-- ABOUT_PAGE_CONTENT --
DROP POLICY IF EXISTS "about_page_content_select" ON public.about_page_content;
CREATE POLICY "about_page_content_select" ON public.about_page_content FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS "about_page_content_modify" ON public.about_page_content;
CREATE POLICY "about_page_content_modify" ON public.about_page_content FOR ALL
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','admin','marketing']::TEXT[]));

-- HERO_STATS --
DROP POLICY IF EXISTS "hero_stats_select" ON public.hero_stats;
CREATE POLICY "hero_stats_select" ON public.hero_stats FOR SELECT USING (is_active = TRUE OR public.has_any_role(auth.uid(), ARRAY['super_admin','admin','marketing']::TEXT[]));
DROP POLICY IF EXISTS "hero_stats_modify" ON public.hero_stats;
CREATE POLICY "hero_stats_modify" ON public.hero_stats FOR ALL
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','admin','marketing']::TEXT[]));

-- OFFICE_ASSETS --
DROP POLICY IF EXISTS "office_assets_all" ON public.office_assets;
CREATE POLICY "office_assets_all" ON public.office_assets FOR ALL
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','admin']::TEXT[])
    OR (public.has_role(auth.uid(), 'branch_manager'::TEXT) AND public.can_access_branch(auth.uid(), branch_id)));

-- OFFICE_ASSET_MAINTENANCE --
DROP POLICY IF EXISTS "office_asset_maintenance_all" ON public.office_asset_maintenance;
CREATE POLICY "office_asset_maintenance_all" ON public.office_asset_maintenance FOR ALL
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','admin']::TEXT[]));

-- COMPANY_FEATURES --
DROP POLICY IF EXISTS "company_features_select" ON public.company_features;
CREATE POLICY "company_features_select" ON public.company_features FOR SELECT USING (is_enabled = TRUE OR public.has_any_role(auth.uid(), ARRAY['super_admin','it']::TEXT[]));
DROP POLICY IF EXISTS "company_features_modify" ON public.company_features;
CREATE POLICY "company_features_modify" ON public.company_features FOR ALL
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','it']::TEXT[]));

-- ===========================================================================
-- 036: SYSTEM EXTENDED
-- ===========================================================================

-- USER_PERMISSION_OVERRIDES --
DROP POLICY IF EXISTS "user_permission_overrides_all" ON public.user_permission_overrides;
CREATE POLICY "user_permission_overrides_all" ON public.user_permission_overrides FOR ALL
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','it']::TEXT[]));

-- LOGIN_ATTEMPTS --
DROP POLICY IF EXISTS "login_attempts_select" ON public.login_attempts;
CREATE POLICY "login_attempts_select" ON public.login_attempts FOR SELECT
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','it']::TEXT[]));
DROP POLICY IF EXISTS "login_attempts_insert" ON public.login_attempts;
CREATE POLICY "login_attempts_insert" ON public.login_attempts FOR INSERT WITH CHECK (TRUE);

-- DASHBOARD_ACCESS_CONFIG --
DROP POLICY IF EXISTS "dashboard_access_config_all" ON public.dashboard_access_config;
CREATE POLICY "dashboard_access_config_all" ON public.dashboard_access_config FOR ALL
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','it']::TEXT[]) OR user_id = auth.uid());

-- DASHBOARD_ACCESS_AUDIT_LOG --
DROP POLICY IF EXISTS "dashboard_access_audit_log_all" ON public.dashboard_access_audit_log;
CREATE POLICY "dashboard_access_audit_log_all" ON public.dashboard_access_audit_log FOR ALL
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','it']::TEXT[]));

-- ACCESS_POLICIES --
DROP POLICY IF EXISTS "access_policies_all" ON public.access_policies;
CREATE POLICY "access_policies_all" ON public.access_policies FOR ALL
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','it']::TEXT[]));

-- VIRTUAL_ACCOUNTS --
DROP POLICY IF EXISTS "virtual_accounts_select" ON public.virtual_accounts;
CREATE POLICY "virtual_accounts_select" ON public.virtual_accounts FOR SELECT
  USING (
    public.has_any_role(auth.uid(), ARRAY['super_admin','admin','finance','operator']::TEXT[])
    OR EXISTS (SELECT 1 FROM public.customers c WHERE c.id = customer_id AND c.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "virtual_accounts_modify" ON public.virtual_accounts;
CREATE POLICY "virtual_accounts_modify" ON public.virtual_accounts FOR ALL
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','admin','finance']::TEXT[]));

-- VENDOR_CONTRACTS --
DROP POLICY IF EXISTS "vendor_contracts_all" ON public.vendor_contracts;
CREATE POLICY "vendor_contracts_all" ON public.vendor_contracts FOR ALL
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','admin','finance']::TEXT[]));

-- CANCELLATION_POLICIES --
DROP POLICY IF EXISTS "cancellation_policies_select" ON public.cancellation_policies;
CREATE POLICY "cancellation_policies_select" ON public.cancellation_policies FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS "cancellation_policies_modify" ON public.cancellation_policies;
CREATE POLICY "cancellation_policies_modify" ON public.cancellation_policies FOR ALL
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','admin']::TEXT[]));

-- SUPPORT_TICKETS --
DROP POLICY IF EXISTS "support_tickets_select" ON public.support_tickets;
CREATE POLICY "support_tickets_select" ON public.support_tickets FOR SELECT
  USING (
    public.has_any_role(auth.uid(), ARRAY['super_admin','admin','operator']::TEXT[])
    OR assigned_to = auth.uid()
    OR user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.customers c WHERE c.id = customer_id AND c.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "support_tickets_insert" ON public.support_tickets;
CREATE POLICY "support_tickets_insert" ON public.support_tickets FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "support_tickets_update" ON public.support_tickets;
CREATE POLICY "support_tickets_update" ON public.support_tickets FOR UPDATE
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','admin','operator']::TEXT[]) OR assigned_to = auth.uid());

-- SUPPORT_MESSAGES --
DROP POLICY IF EXISTS "support_messages_select" ON public.support_messages;
CREATE POLICY "support_messages_select" ON public.support_messages FOR SELECT
  USING (
    public.has_any_role(auth.uid(), ARRAY['super_admin','admin','operator']::TEXT[])
    OR (NOT is_internal AND EXISTS (
      SELECT 1 FROM public.support_tickets t WHERE t.id = ticket_id AND (t.user_id = auth.uid() OR
        EXISTS (SELECT 1 FROM public.customers c WHERE c.id = t.customer_id AND c.user_id = auth.uid()))
    ))
  );
DROP POLICY IF EXISTS "support_messages_insert" ON public.support_messages;
CREATE POLICY "support_messages_insert" ON public.support_messages FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ===========================================================================
-- 037: ADVANCED FEATURES
-- ===========================================================================

-- SISKOHAT_REGISTRATIONS --
DROP POLICY IF EXISTS "siskohat_registrations_all" ON public.siskohat_registrations;
CREATE POLICY "siskohat_registrations_all" ON public.siskohat_registrations FOR ALL
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','admin','operational','it']::TEXT[]));

-- SISKOHAT_SYNC_LOGS --
DROP POLICY IF EXISTS "siskohat_sync_logs_all" ON public.siskohat_sync_logs;
CREATE POLICY "siskohat_sync_logs_all" ON public.siskohat_sync_logs FOR ALL
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','admin','it']::TEXT[]));

-- CHATBOT_CONVERSATIONS --
DROP POLICY IF EXISTS "chatbot_conversations_select" ON public.chatbot_conversations;
CREATE POLICY "chatbot_conversations_select" ON public.chatbot_conversations FOR SELECT
  USING (
    public.has_any_role(auth.uid(), ARRAY['super_admin','admin','operator','marketing']::TEXT[])
    OR EXISTS (SELECT 1 FROM public.customers c WHERE c.id = customer_id AND c.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "chatbot_conversations_modify" ON public.chatbot_conversations;
CREATE POLICY "chatbot_conversations_modify" ON public.chatbot_conversations FOR ALL
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','admin','operator','marketing','it']::TEXT[]));

-- CHATBOT_MESSAGES --
DROP POLICY IF EXISTS "chatbot_messages_select" ON public.chatbot_messages;
CREATE POLICY "chatbot_messages_select" ON public.chatbot_messages FOR SELECT
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','admin','operator','marketing']::TEXT[])
    OR EXISTS (SELECT 1 FROM public.chatbot_conversations cc WHERE cc.id = conversation_id
      AND EXISTS (SELECT 1 FROM public.customers c WHERE c.id = cc.customer_id AND c.user_id = auth.uid())));
DROP POLICY IF EXISTS "chatbot_messages_insert" ON public.chatbot_messages;
CREATE POLICY "chatbot_messages_insert" ON public.chatbot_messages FOR INSERT WITH CHECK (TRUE);

-- CASH_TRANSACTIONS --
DROP POLICY IF EXISTS "cash_transactions_select" ON public.cash_transactions;
CREATE POLICY "cash_transactions_select" ON public.cash_transactions FOR SELECT
  USING (
    public.has_any_role(auth.uid(), ARRAY['super_admin','admin','finance']::TEXT[])
    OR (public.has_role(auth.uid(), 'branch_manager'::TEXT) AND public.can_access_branch(auth.uid(), branch_id))
    OR cashier_id = auth.uid()
  );
DROP POLICY IF EXISTS "cash_transactions_insert" ON public.cash_transactions;
CREATE POLICY "cash_transactions_insert" ON public.cash_transactions FOR INSERT
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['super_admin','admin','finance','operator']::TEXT[]));

-- ACTIVITY_LOGS --
DROP POLICY IF EXISTS "activity_logs_select" ON public.activity_logs;
CREATE POLICY "activity_logs_select" ON public.activity_logs FOR SELECT
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','it']::TEXT[]) OR user_id = auth.uid());
DROP POLICY IF EXISTS "activity_logs_insert" ON public.activity_logs;
CREATE POLICY "activity_logs_insert" ON public.activity_logs FOR INSERT WITH CHECK (TRUE);

SELECT '039_rls_extended: OK — All RLS policies applied' AS result;
