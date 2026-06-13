-- ══════════════════════════════════════════════════════════════════════════════
-- VINSTOUR TRAVEL PORTAL — DATABASE VERIFICATION SCRIPT
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Jalankan setelah migrasi selesai untuk memastikan semua struktur sudah benar.
--
-- Cara menjalankan:
--   psql -U postgres -d nama_database -f verify_database.sql
--   ATAU dari psql: \i database/verify_database.sql
--
-- Hasil: Setiap baris menampilkan ✅ PASS atau ❌ FAIL
-- ══════════════════════════════════════════════════════════════════════════════

\set ON_ERROR_STOP off
\timing off

\echo ''
\echo '══════════════════════════════════════════════════════════'
\echo ' VINSTOUR DATABASE VERIFICATION'
\echo '══════════════════════════════════════════════════════════'


-- ─────────────────────────────────────────────────────────────────────────────
-- BAGIAN 1: TABEL — Verifikasi keberadaan semua tabel
-- ─────────────────────────────────────────────────────────────────────────────
\echo ''
\echo '─────────────────────────────────────────────────────────'
\echo 'BAGIAN 1: KEBERADAAN TABEL'
\echo '─────────────────────────────────────────────────────────'

SELECT
  t.table_name AS "Tabel",
  CASE
    WHEN et.table_name IS NOT NULL THEN '✅ ADA'
    ELSE '❌ HILANG'
  END AS "Status",
  t.kelompok AS "Kelompok"
FROM (VALUES
  -- Foundation (fase0)
  ('profiles',                 'Foundation'),
  ('hotels',                   'Foundation'),
  ('vendors',                  'Foundation'),
  ('branches',                 'Foundation'),
  ('agents',                   'Foundation'),
  ('packages',                 'Foundation'),
  ('departures',               'Foundation'),
  ('customers',                'Foundation'),
  ('bookings',                 'Foundation'),
  ('booking_passengers',       'Foundation'),
  ('room_assignments',         'Foundation'),
  ('equipment_distributions',  'Foundation'),
  ('savings_plans',            'Foundation'),
  ('savings_deposits',         'Foundation'),
  ('leads',                    'Foundation'),
  ('notifications',            'Foundation'),
  ('support_tickets',          'Foundation'),
  ('announcements',            'Foundation'),
  ('banners',                  'Foundation'),
  ('coupons',                  'Foundation'),
  ('document_types',           'Foundation'),
  ('menu_items',               'Foundation'),
  ('visa_applications',        'Foundation'),
  ('sos_alerts',               'Foundation'),
  ('muthawifs',                'Foundation'),
  ('employees',                'Foundation'),
  -- v0_missing 001
  ('airlines',                 'v0 Missing 001'),
  ('payments',                 'v0 Missing 001'),
  ('departure_hotels',         'v0 Missing 001'),
  ('loyalty_points',           'v0 Missing 001'),
  ('agent_commissions',        'v0 Missing 001'),
  -- v0_missing 002
  ('customer_documents',       'v0 Missing 002'),
  ('referral_codes',           'v0 Missing 002'),
  ('referral_usages',          'v0 Missing 002'),
  ('ticket_responses',         'v0 Missing 002'),
  ('audit_logs',               'v0 Missing 002'),
  ('user_permissions',         'v0 Missing 002'),
  -- v0_missing 003
  ('package_types',            'v0 Missing 003'),
  ('equipment_items',          'v0 Missing 003'),
  ('theme_presets',            'v0 Missing 003'),
  -- v0_missing 004
  ('bus_assignments',          'v0 Missing 004'),
  ('itineraries',              'v0 Missing 004'),
  ('manifests',                'v0 Missing 004'),
  ('luggage',                  'v0 Missing 004'),
  ('vendor_costs',             'v0 Missing 004'),
  ('jamaah_live_locations',    'v0 Missing 004'),
  ('room_assignment_audit',    'v0 Missing 004'),
  ('savings_payments',         'v0 Missing 004'),
  -- v2 Sprint Phases
  ('equipment',                'v2 Sprint'),
  ('branches_kpi_targets',     'v2 Sprint'),
  ('webhook_configs',          'v2 Sprint'),
  ('push_subscriptions',       'v2 Sprint'),
  ('muthawif_evaluations',     'v2 Sprint'),
  ('booking_line_items',       'v2 Sprint'),
  ('package_cost_items',       'v2 Sprint'),
  ('departure_cost_items',     'v2 Sprint'),
  ('wa_providers',             'v2 Sprint'),
  ('wa_broadcast_campaigns',   'v2 Sprint'),
  -- v3 Numbered Features
  ('hotel_rooms',              'v3 Features'),
  ('mahram_compatibility',     'v3 Features'),
  ('package_type_equipment',   'v3 Features'),
  ('withdrawal_requests',      'v3 Features'),
  ('store_products',           'v3 Features'),
  ('store_orders',             'v3 Features'),
  ('store_order_items',        'v3 Features'),
  ('store_product_reviews',    'v3 Features'),
  -- v4 Patches
  ('savings_schedules',        'v4 Patches'),
  ('invoice_templates',        'v4 Patches'),
  ('web_vitals_metrics',       'v4 Patches')
) AS t(table_name, kelompok)
LEFT JOIN information_schema.tables et
  ON et.table_schema = 'public' AND et.table_name = t.table_name
ORDER BY
  CASE t.kelompok
    WHEN 'Foundation'       THEN 1
    WHEN 'v0 Missing 001'   THEN 2
    WHEN 'v0 Missing 002'   THEN 3
    WHEN 'v0 Missing 003'   THEN 4
    WHEN 'v0 Missing 004'   THEN 5
    WHEN 'v2 Sprint'        THEN 6
    WHEN 'v3 Features'      THEN 7
    WHEN 'v4 Patches'       THEN 8
  END,
  t.table_name;


-- ─────────────────────────────────────────────────────────────────────────────
-- RINGKASAN BAGIAN 1
-- ─────────────────────────────────────────────────────────────────────────────
\echo ''
\echo 'RINGKASAN — Tabel:'

SELECT
  COUNT(*) FILTER (WHERE et.table_name IS NOT NULL)     AS "✅ Ada",
  COUNT(*) FILTER (WHERE et.table_name IS NULL)         AS "❌ Hilang",
  COUNT(*)                                               AS "Total Dicek"
FROM (VALUES
  ('profiles'),('hotels'),('vendors'),('branches'),('agents'),('packages'),
  ('departures'),('customers'),('bookings'),('booking_passengers'),
  ('room_assignments'),('equipment_distributions'),('savings_plans'),
  ('savings_deposits'),('leads'),('notifications'),('support_tickets'),
  ('announcements'),('banners'),('coupons'),('document_types'),('menu_items'),
  ('visa_applications'),('sos_alerts'),('muthawifs'),('employees'),
  ('airlines'),('payments'),('departure_hotels'),('loyalty_points'),
  ('agent_commissions'),('customer_documents'),('referral_codes'),
  ('referral_usages'),('ticket_responses'),('audit_logs'),('user_permissions'),
  ('package_types'),('equipment_items'),('theme_presets'),
  ('bus_assignments'),('itineraries'),('manifests'),('luggage'),('vendor_costs'),
  ('jamaah_live_locations'),('room_assignment_audit'),('savings_payments'),
  ('equipment'),('branches_kpi_targets'),('webhook_configs'),('push_subscriptions'),
  ('muthawif_evaluations'),('booking_line_items'),('package_cost_items'),
  ('departure_cost_items'),('wa_providers'),('wa_broadcast_campaigns'),
  ('hotel_rooms'),('mahram_compatibility'),('package_type_equipment'),
  ('withdrawal_requests'),('store_products'),('store_orders'),('store_order_items'),
  ('store_product_reviews'),('savings_schedules'),('invoice_templates'),
  ('web_vitals_metrics')
) AS t(table_name)
LEFT JOIN information_schema.tables et
  ON et.table_schema = 'public' AND et.table_name = t.table_name;


-- ─────────────────────────────────────────────────────────────────────────────
-- BAGIAN 2: FK CONSTRAINTS — Verifikasi semua FK kritis sudah terpasang
-- ─────────────────────────────────────────────────────────────────────────────
\echo ''
\echo '─────────────────────────────────────────────────────────'
\echo 'BAGIAN 2: FK CONSTRAINTS KRITIS'
\echo '─────────────────────────────────────────────────────────'

SELECT
  expected.tabel_asal        AS "Tabel",
  expected.kolom             AS "Kolom",
  expected.tabel_tujuan      AS "→ Referensi",
  CASE
    WHEN fk.constraint_name IS NOT NULL THEN '✅ TERPASANG'
    ELSE '❌ TIDAK ADA'
  END AS "Status FK",
  COALESCE(fk.constraint_name, '—') AS "Nama Constraint"
FROM (VALUES
  -- Foundation FKs (dikontrol fase0)
  ('agents',              'profile_id',         'profiles'),
  ('agents',              'branch_id',          'branches'),
  ('packages',            'branch_id',          'branches'),
  ('departures',          'package_id',         'packages'),
  ('customers',           'profile_id',         'profiles'),
  ('bookings',            'departure_id',       'departures'),
  ('bookings',            'customer_id',        'customers'),
  ('booking_passengers',  'booking_id',         'bookings'),
  ('savings_plans',       'customer_id',        'customers'),
  -- v0_missing 001 FKs
  ('payments',            'booking_id',         'bookings'),
  ('departure_hotels',    'departure_id',       'departures'),
  ('departure_hotels',    'hotel_id',           'hotels'),
  ('loyalty_points',      'customer_id',        'customers'),
  ('agent_commissions',   'agent_id',           'agents'),
  ('agent_commissions',   'booking_id',         'bookings'),
  -- v0_missing 002 FKs
  ('customer_documents',  'customer_id',        'customers'),
  ('referral_codes',      'agent_id',           'agents'),
  ('referral_usages',     'referral_code_id',   'referral_codes'),
  ('referral_usages',     'booking_id',         'bookings'),
  ('ticket_responses',    'ticket_id',          'support_tickets'),
  -- v0_missing 004 FKs
  ('manifests',           'airline_id',         'airlines'),
  ('bus_assignments',     'departure_id',       'departures'),
  ('itineraries',         'departure_id',       'departures'),
  ('savings_payments',    'savings_plan_id',    'savings_plans'),
  -- KRITIS: FK ini dari file 005, ditambah setelah v4_patches
  ('savings_payments',    'schedule_id',        'savings_schedules'),
  -- v3 Features FKs
  ('package_type_equipment', 'package_type_id', 'package_types'),
  ('package_type_equipment', 'equipment_item_id','equipment_items'),
  -- v2/fase28 FKs
  ('departure_cost_items', 'departure_id',      'departures')
) AS expected(tabel_asal, kolom, tabel_tujuan)
LEFT JOIN (
  SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    tc.constraint_name
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
  JOIN information_schema.constraint_column_usage ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
  WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
) fk
  ON fk.table_name = expected.tabel_asal
  AND fk.column_name = expected.kolom
  AND fk.foreign_table_name = expected.tabel_tujuan
ORDER BY
  CASE WHEN fk.constraint_name IS NULL THEN 0 ELSE 1 END,
  expected.tabel_asal;


-- ─────────────────────────────────────────────────────────────────────────────
-- BAGIAN 3: TRIGGERS — Verifikasi semua trigger updated_at terpasang
-- ─────────────────────────────────────────────────────────────────────────────
\echo ''
\echo '─────────────────────────────────────────────────────────'
\echo 'BAGIAN 3: TRIGGERS updated_at'
\echo '─────────────────────────────────────────────────────────'

SELECT
  expected.trigger_name       AS "Trigger",
  expected.tabel              AS "Tabel",
  CASE
    WHEN pt.tgname IS NOT NULL THEN '✅ AKTIF'
    ELSE '❌ TIDAK ADA'
  END AS "Status"
FROM (VALUES
  -- Foundation triggers
  ('set_profiles_updated_at',           'profiles'),
  ('set_hotels_updated_at',             'hotels'),
  ('set_branches_updated_at',           'branches'),
  ('set_agents_updated_at',             'agents'),
  ('set_packages_updated_at',           'packages'),
  ('set_departures_updated_at',         'departures'),
  ('set_customers_updated_at',          'customers'),
  ('set_bookings_updated_at',           'bookings'),
  ('set_booking_passengers_updated_at', 'booking_passengers'),
  ('set_savings_plans_updated_at',      'savings_plans'),
  -- v0_missing triggers (001)
  ('set_airlines_updated_at',           'airlines'),
  ('set_payments_updated_at',           'payments'),
  ('set_departure_hotels_updated_at',   'departure_hotels'),
  ('set_loyalty_points_updated_at',     'loyalty_points'),
  ('set_agent_commissions_updated_at',  'agent_commissions'),
  -- v0_missing triggers (002)
  ('set_customer_documents_updated_at', 'customer_documents'),
  ('set_referral_codes_updated_at',     'referral_codes'),
  ('set_user_permissions_updated_at',   'user_permissions'),
  -- v0_missing triggers (003)
  ('set_package_types_updated_at',      'package_types'),
  ('set_equipment_items_updated_at',    'equipment_items'),
  ('set_theme_presets_updated_at',      'theme_presets'),
  -- v0_missing triggers (004)
  ('set_bus_assignments_updated_at',    'bus_assignments'),
  ('set_itineraries_updated_at',        'itineraries'),
  ('set_manifests_updated_at',          'manifests'),
  ('set_luggage_updated_at',            'luggage'),
  ('set_vendor_costs_updated_at',       'vendor_costs'),
  ('set_savings_payments_updated_at',   'savings_payments')
) AS expected(trigger_name, tabel)
LEFT JOIN pg_trigger pt
  ON pt.tgname = expected.trigger_name
  AND pt.tgrelid = (
    SELECT oid FROM pg_class
    WHERE relname = expected.tabel AND relnamespace = 'public'::regnamespace
  )
ORDER BY
  CASE WHEN pt.tgname IS NULL THEN 0 ELSE 1 END,
  expected.tabel;


-- ─────────────────────────────────────────────────────────────────────────────
-- BAGIAN 4: KOLOM PENTING — Verifikasi kolom yang ditambah via ALTER TABLE
-- ─────────────────────────────────────────────────────────────────────────────
\echo ''
\echo '─────────────────────────────────────────────────────────'
\echo 'BAGIAN 4: KOLOM KRITIS (ALTER TABLE)'
\echo '─────────────────────────────────────────────────────────'

SELECT
  expected.tabel    AS "Tabel",
  expected.kolom    AS "Kolom",
  CASE
    WHEN c.column_name IS NOT NULL THEN '✅ ADA'
    ELSE '❌ HILANG'
  END AS "Status",
  COALESCE(c.data_type, '—')  AS "Tipe Data",
  expected.sumber   AS "Ditambah Oleh"
FROM (VALUES
  -- fase23: ALTER payments
  ('payments',      'transaction_id',       'fase23 / v0/001'),
  ('payments',      'payment_type',         'fase23 / v0/001'),
  -- v4_patches/20260511053018: ALTER theme_presets
  ('theme_presets', 'mood',                 'v4/20260511053018 / v0/003'),
  ('theme_presets', 'accent_gold',          'v4/20260511053018 / v0/003'),
  ('theme_presets', 'radius_style',         'v4/20260511053018 / v0/003'),
  ('theme_presets', 'density',              'v4/20260511053018 / v0/003'),
  ('theme_presets', 'hero_variant',         'v4/20260511053018 / v0/003'),
  ('theme_presets', 'card_style',           'v4/20260511053018 / v0/003'),
  -- savings_payments: kolom schedule_id (tanpa FK di 004, dengan FK di 005)
  ('savings_payments', 'schedule_id',       'v0/004 + FK v0/005'),
  -- fase29: booking_passengers pricing
  ('booking_passengers', 'base_price',      'fase29'),
  ('booking_passengers', 'final_price',     'fase29'),
  -- v2/fase20: webhook configs url
  ('webhook_configs', 'url',               'fase20'),
  -- store_products
  ('store_products', 'price',              'v3/store_ecommerce'),
  ('store_products', 'stock',             'v3/store_ecommerce'),
  -- savings_schedules (dibuat oleh v4 patch)
  ('savings_schedules', 'savings_plan_id', 'v4/20260513111158'),
  ('savings_schedules', 'due_date',        'v4/20260513111158'),
  ('savings_schedules', 'amount',          'v4/20260513111158')
) AS expected(tabel, kolom, sumber)
LEFT JOIN information_schema.columns c
  ON c.table_schema = 'public'
  AND c.table_name = expected.tabel
  AND c.column_name = expected.kolom
ORDER BY
  CASE WHEN c.column_name IS NULL THEN 0 ELSE 1 END,
  expected.tabel,
  expected.kolom;


-- ─────────────────────────────────────────────────────────────────────────────
-- BAGIAN 5: SEED DATA — Verifikasi data awal terpasang
-- ─────────────────────────────────────────────────────────────────────────────
\echo ''
\echo '─────────────────────────────────────────────────────────'
\echo 'BAGIAN 5: SEED DATA'
\echo '─────────────────────────────────────────────────────────'

DO $$
DECLARE
  v_pkg_types    INT;
  v_equip_items  INT;
  v_themes       INT;
BEGIN
  SELECT COUNT(*) INTO v_pkg_types   FROM package_types;
  SELECT COUNT(*) INTO v_equip_items FROM equipment_items;
  SELECT COUNT(*) INTO v_themes      FROM theme_presets;

  RAISE NOTICE 'package_types  : % baris (ekspektasi: ≥ 4)  %',
    v_pkg_types, CASE WHEN v_pkg_types >= 4 THEN '✅ OK' ELSE '❌ KURANG' END;
  RAISE NOTICE 'equipment_items: % baris (ekspektasi: ≥ 12) %',
    v_equip_items, CASE WHEN v_equip_items >= 12 THEN '✅ OK' ELSE '❌ KURANG' END;
  RAISE NOTICE 'theme_presets  : % baris (ekspektasi: ≥ 7)  %',
    v_themes, CASE WHEN v_themes >= 7 THEN '✅ OK' ELSE '❌ KURANG' END;
END $$;


-- ─────────────────────────────────────────────────────────────────────────────
-- BAGIAN 6: RLS POLICIES — Verifikasi Row Level Security aktif
-- ─────────────────────────────────────────────────────────────────────────────
\echo ''
\echo '─────────────────────────────────────────────────────────'
\echo 'BAGIAN 6: RLS POLICY — Tabel Kritis'
\echo '─────────────────────────────────────────────────────────'

SELECT
  t.table_name                              AS "Tabel",
  CASE WHEN c.relrowsecurity THEN '✅ AKTIF' ELSE '⚠️  NONAKTIF' END AS "RLS",
  COUNT(p.policyname)                       AS "Jumlah Policy"
FROM (VALUES
  ('profiles'), ('bookings'), ('payments'), ('booking_passengers'),
  ('customer_documents'), ('audit_logs'), ('user_permissions'),
  ('referral_codes'), ('savings_plans'), ('savings_payments'),
  ('airlines'), ('loyalty_points'), ('agent_commissions'),
  ('store_products'), ('store_orders')
) AS t(table_name)
LEFT JOIN pg_class c
  ON c.relname = t.table_name
  AND c.relnamespace = 'public'::regnamespace
LEFT JOIN pg_policies p
  ON p.tablename = t.table_name
  AND p.schemaname = 'public'
GROUP BY t.table_name, c.relrowsecurity
ORDER BY
  CASE WHEN c.relrowsecurity THEN 1 ELSE 0 END,
  t.table_name;


-- ─────────────────────────────────────────────────────────────────────────────
-- BAGIAN 7: FUNGSI — Verifikasi fungsi/prosedur kritis ada
-- ─────────────────────────────────────────────────────────────────────────────
\echo ''
\echo '─────────────────────────────────────────────────────────'
\echo 'BAGIAN 7: FUNCTIONS & PROCEDURES'
\echo '─────────────────────────────────────────────────────────'

SELECT
  expected.fn_name    AS "Fungsi",
  expected.keterangan AS "Kegunaan",
  CASE
    WHEN p.proname IS NOT NULL THEN '✅ ADA'
    ELSE '❌ TIDAK ADA'
  END AS "Status"
FROM (VALUES
  ('update_updated_at_column', 'Trigger auto-update kolom updated_at (fase0)'),
  ('handle_new_user',          'Auto-insert ke profiles saat user baru daftar (fase0)'),
  ('is_admin',                 'Cek apakah user adalah admin (v4 patch)')
) AS expected(fn_name, keterangan)
LEFT JOIN pg_proc p
  ON p.proname = expected.fn_name
  AND p.pronamespace = 'public'::regnamespace
ORDER BY expected.fn_name;


-- ─────────────────────────────────────────────────────────────────────────────
-- BAGIAN 8: RINGKASAN AKHIR
-- ─────────────────────────────────────────────────────────────────────────────
\echo ''
\echo '─────────────────────────────────────────────────────────'
\echo 'BAGIAN 8: RINGKASAN AKHIR'
\echo '─────────────────────────────────────────────────────────'

SELECT
  'Total tabel di schema public'                     AS "Metrik",
  COUNT(*)::TEXT                                     AS "Nilai"
FROM information_schema.tables
WHERE table_schema = 'public'

UNION ALL

SELECT
  '22 missing tables — sudah ada',
  COUNT(*)::TEXT
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'payments','airlines','departure_hotels','loyalty_points','agent_commissions',
    'customer_documents','referral_codes','referral_usages','ticket_responses',
    'audit_logs','user_permissions','package_types','equipment_items','theme_presets',
    'bus_assignments','itineraries','manifests','luggage','vendor_costs',
    'jamaah_live_locations','room_assignment_audit','savings_payments'
  )

UNION ALL

SELECT
  'FK savings_payments → savings_schedules',
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name = 'savings_payments'
        AND tc.constraint_type = 'FOREIGN KEY'
        AND kcu.column_name = 'schedule_id'
    ) THEN '✅ TERPASANG'
    ELSE '❌ BELUM ADA'
  END

UNION ALL

SELECT
  'update_updated_at_column() tersedia',
  CASE
    WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column')
    THEN '✅ ADA'
    ELSE '❌ TIDAK ADA'
  END

UNION ALL

SELECT
  'Tabel dengan RLS aktif (dari 15 yang dicek)',
  COUNT(*)::TEXT
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relrowsecurity = TRUE
  AND c.relname IN (
    'profiles','bookings','payments','booking_passengers',
    'customer_documents','audit_logs','user_permissions',
    'referral_codes','savings_plans','savings_payments',
    'airlines','loyalty_points','agent_commissions',
    'store_products','store_orders'
  );

\echo ''
\echo '══════════════════════════════════════════════════════════'
\echo ' VERIFIKASI SELESAI'
\echo ' Semua ❌ menunjukkan item yang perlu diperbaiki.'
\echo ' Lihat MIGRATION_GUIDE.md untuk langkah perbaikan.'
\echo '══════════════════════════════════════════════════════════'
\echo ''
