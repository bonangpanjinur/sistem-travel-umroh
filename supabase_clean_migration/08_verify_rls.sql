-- =============================================================================
-- FILE 08: VERIFIKASI RLS & KEBIJAKAN KEAMANAN
-- Vinstour Travel Portal — Post-Migration Safety Check
--
-- Jalankan file ini SETELAH file 07 berhasil.
-- Semua hasil di-output sebagai tabel; baris dengan status '❌ FAIL' perlu
-- ditangani sebelum aplikasi digunakan di produksi.
-- =============================================================================

-- =============================================================================
-- BAGIAN 1: TABEL YANG DIHARAPKAN ADA (75 tabel)
-- Deteksi tabel yang gagal dibuat karena error sebelumnya
-- =============================================================================
SELECT '=== BAGIAN 1: Keberadaan Tabel ===' AS section;

WITH expected(tbl) AS (
  VALUES
    -- File 02
    ('profiles'),('user_roles'),('role_permissions'),('permissions_list'),
    ('airlines'),('hotels'),('vendors'),('branches'),
    ('agents'),('muthawifs'),('employees'),
    ('packages'),('departures'),('document_types'),('menu_items'),
    -- File 03
    ('customers'),('customer_documents'),('customer_mahrams'),
    ('bookings'),('booking_passengers'),('booking_status_history'),
    ('booking_document_logs'),('booking_line_items'),
    ('room_assignments'),('equipment_distributions'),
    ('savings_plans'),('savings_deposits'),('leads'),
    ('payment_deadline_reminders'),('invoice_templates'),
    -- File 04
    ('customer_accounts'),('customer_notifications'),('booking_feedback'),
    ('email_templates'),('email_logs'),('notifications'),('support_tickets'),
    ('announcements'),('banners'),('coupons'),
    ('visa_applications'),('sos_alerts'),
    ('whatsapp_config'),('whatsapp_templates'),('whatsapp_logs'),
    ('wa_broadcast_campaigns'),('wa_broadcast_logs'),('wa_feature_roadmap'),
    ('app_settings'),('virtual_accounts'),('agent_monthly_targets'),
    ('jamaah_doa_sessions'),('jamaah_jurnal'),
    ('jamaah_ibadah_targets'),('jamaah_ibadah_logs'),('jamaah_badges'),
    ('approval_requests'),('approval_actions'),('notification_templates'),
    -- File 05
    ('payroll_records'),('leave_requests'),('leave_quotas'),('performance_reviews'),
    ('marketing_campaigns'),('sales_targets'),
    ('training_modules'),('training_quizzes'),('agent_training_progress'),
    ('vendor_contracts'),('departure_budgets'),('media_gallery'),
    ('baggage_reference_items'),('approval_configs'),('agent_override_commissions'),
    ('membership_plans'),('agent_memberships'),('branch_memberships'),('branch_commissions'),
    ('company_settings'),('bank_accounts'),('website_settings'),
    ('contact_page_content'),('siskohat_sync_logs'),
    ('departure_cost_items'),('departure_expenses'),
    ('departure_other_revenues'),('departure_financial_summary'),
    -- File 06
    ('store_categories'),('store_products'),('store_orders'),
    ('store_order_items'),('store_shipments'),('store_product_reviews')
),
actual AS (
  SELECT table_name FROM information_schema.tables
  WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
)
SELECT
  e.tbl                                          AS table_name,
  CASE WHEN a.table_name IS NOT NULL
       THEN '✅ EXISTS'
       ELSE '❌ MISSING'
  END                                            AS status
FROM expected e
LEFT JOIN actual a ON a.table_name = e.tbl
ORDER BY
  CASE WHEN a.table_name IS NULL THEN 0 ELSE 1 END,
  e.tbl;


-- =============================================================================
-- BAGIAN 2: STATUS RLS PER TABEL
-- Tabel tanpa RLS bersifat PUBLIK — siapapun bisa baca/tulis data
-- =============================================================================
SELECT '=== BAGIAN 2: Status RLS per Tabel ===' AS section;

SELECT
  c.relname                                              AS table_name,
  CASE WHEN c.relrowsecurity THEN '✅ RLS ON' ELSE '❌ RLS OFF — BAHAYA!' END AS rls_status,
  COUNT(p.polname)                                       AS policy_count,
  CASE
    WHEN NOT c.relrowsecurity          THEN '❌ FAIL — aktifkan RLS'
    WHEN COUNT(p.polname) = 0         THEN '⚠️  WARN — RLS aktif tapi 0 policy (semua akses ditolak)'
    ELSE '✅ OK'
  END                                                    AS verdict
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN pg_policy p ON p.polrelid = c.oid
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
GROUP BY c.relname, c.relrowsecurity
ORDER BY
  CASE WHEN NOT c.relrowsecurity THEN 0
       WHEN COUNT(p.polname) = 0 THEN 1
       ELSE 2
  END,
  c.relname;


-- =============================================================================
-- BAGIAN 3: DETAIL SEMUA POLICY YANG ADA
-- Daftar lengkap nama policy, tabel, command, dan roles yang diizinkan
-- =============================================================================
SELECT '=== BAGIAN 3: Detail Policy ===' AS section;

SELECT
  n.nspname                              AS schema_name,
  c.relname                              AS table_name,
  p.polname                              AS policy_name,
  CASE p.polcmd
    WHEN 'r' THEN 'SELECT'
    WHEN 'a' THEN 'INSERT'
    WHEN 'w' THEN 'UPDATE'
    WHEN 'd' THEN 'DELETE'
    WHEN '*' THEN 'ALL'
    ELSE p.polcmd::TEXT
  END                                    AS command,
  CASE p.polpermissive
    WHEN TRUE THEN 'PERMISSIVE'
    ELSE 'RESTRICTIVE'
  END                                    AS policy_type,
  COALESCE(
    array_to_string(
      ARRAY(SELECT r.rolname
            FROM pg_roles r
            WHERE r.oid = ANY(p.polroles)),
      ', '
    ),
    '(public)'
  )                                      AS applied_to_roles
FROM pg_policy p
JOIN pg_class c  ON c.oid = p.polrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
ORDER BY c.relname, p.polname;


-- =============================================================================
-- BAGIAN 4: CEK POLICY KRITIS PER TABEL UTAMA
-- Policy yang wajib ada untuk keamanan minimal
-- =============================================================================
SELECT '=== BAGIAN 4: Policy Kritis ===' AS section;

WITH critical(tbl, pol) AS (
  VALUES
    -- profiles
    ('profiles', 'profiles_own'),
    ('profiles', 'staff_read_profiles'),
    ('profiles', 'admin_read_profiles_for_status'),
    -- user_roles
    ('user_roles', 'user_roles_admin_manage'),
    ('user_roles', 'user_roles_read_own'),
    -- bookings
    ('bookings',  'bookings_own'),
    ('bookings',  'bookings_admin_manage'),
    -- customers
    ('customers', 'customers_own'),
    ('customers', 'customers_admin_manage'),
    -- payments (inside bookings — via booking policies)
    -- savings
    ('savings_plans',    'savings_plans_admin_manage'),
    ('savings_plans',    'savings_plans_own'),
    ('savings_deposits', 'savings_deposits_admin_manage'),
    -- store
    ('store_products',   'store_products_public_read'),
    ('store_orders',     'store_orders_own'),
    -- finance
    ('departure_financial_summary', 'staff_read_departure_financial_summary'),
    -- HR
    ('payroll_records',  'payroll_staff_manage'),
    -- RLS enabled-but-no-policy guard
    ('role_permissions', 'role_permissions_admin_manage'),
    ('permissions_list', 'permissions_list_staff_read'),
    ('branches',         'branches_admin_manage'),
    ('branches',         'branches_public_read'),
    ('agents',           'agents_admin_manage'),
    ('agents',           'agents_public_read'),
    ('employees',        'employees_admin_manage'),
    ('packages',         'packages_admin_manage'),
    ('packages',         'packages_public_read'),
    ('departures',       'departures_admin_manage'),
    ('departures',       'departures_public_read'),
    ('leads',            'leads_staff_manage'),
    ('leads',            'leads_agent_own_manage'),
    ('announcements',    'announcements_admin_manage'),
    ('announcements',    'announcements_public_read'),
    ('visa_applications','visa_admin_manage'),
    ('visa_applications','visa_own_read')
),
existing_policies AS (
  SELECT c.relname AS tbl, p.polname AS pol
  FROM pg_policy p
  JOIN pg_class c ON c.oid = p.polrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
)
SELECT
  cr.tbl                                   AS table_name,
  cr.pol                                   AS expected_policy,
  CASE WHEN ep.pol IS NOT NULL
       THEN '✅ EXISTS'
       ELSE '❌ MISSING'
  END                                      AS status
FROM critical cr
LEFT JOIN existing_policies ep
       ON ep.tbl = cr.tbl AND ep.pol = cr.pol
ORDER BY
  CASE WHEN ep.pol IS NULL THEN 0 ELSE 1 END,
  cr.tbl, cr.pol;


-- =============================================================================
-- BAGIAN 5: TABEL TANPA POLICY SAMA SEKALI (saat RLS aktif)
-- RLS aktif + 0 policy = tidak ada yang bisa mengakses tabel tersebut
-- =============================================================================
SELECT '=== BAGIAN 5: Tabel RLS Aktif Tapi Nol Policy (Potensi Lockout) ===' AS section;

SELECT
  c.relname AS table_name,
  '⚠️  RLS ON — 0 policies — semua akses ditolak' AS warning
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relrowsecurity = TRUE
  AND NOT EXISTS (
    SELECT 1 FROM pg_policy p WHERE p.polrelid = c.oid
  )
ORDER BY c.relname;


-- =============================================================================
-- BAGIAN 6: TABEL PUBLIK (RLS MATI)
-- Data bisa dibaca/ditulis siapapun termasuk anon — harus diperbaiki
-- =============================================================================
SELECT '=== BAGIAN 6: Tabel Tanpa RLS (Data Publik) ===' AS section;

SELECT
  c.relname AS table_name,
  '❌ RLS OFF — aktifkan dengan: ALTER TABLE ' || c.relname || ' ENABLE ROW LEVEL SECURITY;' AS action_required
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relrowsecurity = FALSE
ORDER BY c.relname;


-- =============================================================================
-- BAGIAN 7: CEK FUNGSI RPC YANG WAJIB ADA
-- =============================================================================
SELECT '=== BAGIAN 7: Fungsi RPC ===' AS section;

WITH expected_fn(fn) AS (
  VALUES
    ('handle_new_user'),
    ('update_updated_at_column'),
    ('slugify_text'),
    ('get_user_role'),
    ('get_user_permissions'),
    ('get_user_branch_id'),
    ('get_booking_summary'),
    ('confirm_booking_payment'),
    ('get_dashboard_stats'),
    ('create_booking_with_passengers'),
    ('get_agent_portal_stats'),
    ('auto_schedule_payment_reminders'),
    ('recalculate_departure_financial_summary'),
    ('set_agent_slug'),
    ('set_branch_slug'),
    ('increment_website_view'),
    ('convert_savings_to_booking')
)
SELECT
  ef.fn                                    AS function_name,
  CASE WHEN p.proname IS NOT NULL
       THEN '✅ EXISTS'
       ELSE '❌ MISSING'
  END                                      AS status
FROM expected_fn ef
LEFT JOIN pg_proc p
       ON p.proname = ef.fn
      AND p.pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
ORDER BY
  CASE WHEN p.proname IS NULL THEN 0 ELSE 1 END,
  ef.fn;


-- =============================================================================
-- BAGIAN 8: RINGKASAN AKHIR — PASS / FAIL
-- =============================================================================
SELECT '=== BAGIAN 8: Ringkasan Akhir ===' AS section;

WITH
tbl_count AS (
  SELECT COUNT(*) AS n
  FROM information_schema.tables
  WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
),
rls_off AS (
  SELECT COUNT(*) AS n
  FROM pg_class c
  JOIN pg_namespace ns ON ns.oid = c.relnamespace
  WHERE ns.nspname = 'public' AND c.relkind = 'r' AND NOT c.relrowsecurity
),
zero_policy AS (
  SELECT COUNT(*) AS n
  FROM pg_class c
  JOIN pg_namespace ns ON ns.oid = c.relnamespace
  WHERE ns.nspname = 'public'
    AND c.relkind = 'r'
    AND c.relrowsecurity
    AND NOT EXISTS (SELECT 1 FROM pg_policy p WHERE p.polrelid = c.oid)
),
policy_count AS (
  SELECT COUNT(*) AS n
  FROM pg_policy p
  JOIN pg_class c ON c.oid = p.polrelid
  JOIN pg_namespace ns ON ns.oid = c.relnamespace
  WHERE ns.nspname = 'public'
),
missing_tables AS (
  SELECT COUNT(*) AS n FROM (
    WITH expected(tbl) AS (
      VALUES
        ('profiles'),('user_roles'),('role_permissions'),('permissions_list'),
        ('airlines'),('hotels'),('vendors'),('branches'),
        ('agents'),('muthawifs'),('employees'),
        ('packages'),('departures'),('document_types'),('menu_items'),
        ('customers'),('customer_documents'),('customer_mahrams'),
        ('bookings'),('booking_passengers'),('booking_status_history'),
        ('booking_document_logs'),('booking_line_items'),
        ('room_assignments'),('equipment_distributions'),
        ('savings_plans'),('savings_deposits'),('leads'),
        ('payment_deadline_reminders'),('invoice_templates'),
        ('customer_accounts'),('customer_notifications'),('booking_feedback'),
        ('email_templates'),('email_logs'),('notifications'),('support_tickets'),
        ('announcements'),('banners'),('coupons'),
        ('visa_applications'),('sos_alerts'),
        ('whatsapp_config'),('whatsapp_templates'),('whatsapp_logs'),
        ('wa_broadcast_campaigns'),('wa_broadcast_logs'),('wa_feature_roadmap'),
        ('app_settings'),('virtual_accounts'),('agent_monthly_targets'),
        ('jamaah_doa_sessions'),('jamaah_jurnal'),
        ('jamaah_ibadah_targets'),('jamaah_ibadah_logs'),('jamaah_badges'),
        ('approval_requests'),('approval_actions'),('notification_templates'),
        ('payroll_records'),('leave_requests'),('leave_quotas'),('performance_reviews'),
        ('marketing_campaigns'),('sales_targets'),
        ('training_modules'),('training_quizzes'),('agent_training_progress'),
        ('vendor_contracts'),('departure_budgets'),('media_gallery'),
        ('baggage_reference_items'),('approval_configs'),('agent_override_commissions'),
        ('membership_plans'),('agent_memberships'),('branch_memberships'),('branch_commissions'),
        ('company_settings'),('bank_accounts'),('website_settings'),
        ('contact_page_content'),('siskohat_sync_logs'),
        ('departure_cost_items'),('departure_expenses'),
        ('departure_other_revenues'),('departure_financial_summary'),
        ('store_categories'),('store_products'),('store_orders'),
        ('store_order_items'),('store_shipments'),('store_product_reviews')
    )
    SELECT e.tbl
    FROM expected e
    LEFT JOIN information_schema.tables t
           ON t.table_name = e.tbl AND t.table_schema = 'public'
    WHERE t.table_name IS NULL
  ) sub
)
SELECT
  (SELECT n FROM tbl_count)      AS tables_total,
  (SELECT n FROM missing_tables) AS tables_missing,
  (SELECT n FROM rls_off)        AS tables_rls_disabled,
  (SELECT n FROM zero_policy)    AS tables_rls_no_policy,
  (SELECT n FROM policy_count)   AS total_policies,
  CASE
    WHEN (SELECT n FROM missing_tables) > 0 THEN
      '❌ FAIL — ' || (SELECT n FROM missing_tables) || ' tabel tidak ditemukan. Jalankan ulang file yang gagal.'
    WHEN (SELECT n FROM rls_off) > 0 THEN
      '⚠️  WARN — ' || (SELECT n FROM rls_off) || ' tabel tanpa RLS (data publik). Lihat Bagian 6.'
    WHEN (SELECT n FROM zero_policy) > 0 THEN
      '⚠️  WARN — ' || (SELECT n FROM zero_policy) || ' tabel RLS aktif tanpa policy (akses ditolak total). Lihat Bagian 5.'
    ELSE
      '✅ PASS — Semua tabel ada, RLS aktif, policies terdaftar. Migrasi berhasil!'
  END AS overall_verdict;

-- =============================================================================
-- SELESAI — File 08: Verifikasi RLS & Keamanan
-- =============================================================================
SELECT 'File 08 — RLS Verification: selesai. Periksa baris FAIL/WARN di atas.' AS result;
