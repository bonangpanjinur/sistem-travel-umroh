-- =============================================================================
-- 91_disable_rls_public_tables.sql
-- Nonaktifkan RLS pada tabel yang dibaca oleh public (landing page, katalog).
-- 
-- ALASAN: Arsitektur ini menggunakan Express API server sebagai enforcement layer
-- utama (bukan RLS). RLS dinonaktifkan untuk koneksi server-side agar tidak
-- menimbulkan error "permission denied for function is_admin" pada kueri publik.
--
-- Tabel admin/sensitif tetap menggunakan RLS sebagai defense-in-depth.
-- =============================================================================

-- Tabel yang diakses oleh landing page dan katalog publik
ALTER TABLE packages                 DISABLE ROW LEVEL SECURITY;
ALTER TABLE hotels                   DISABLE ROW LEVEL SECURITY;
ALTER TABLE departures               DISABLE ROW LEVEL SECURITY;
ALTER TABLE airlines                 DISABLE ROW LEVEL SECURITY;
ALTER TABLE muthawifs                DISABLE ROW LEVEL SECURITY;
ALTER TABLE vendors                  DISABLE ROW LEVEL SECURITY;
ALTER TABLE branches                 DISABLE ROW LEVEL SECURITY;
ALTER TABLE agents                   DISABLE ROW LEVEL SECURITY;
ALTER TABLE banners                  DISABLE ROW LEVEL SECURITY;
ALTER TABLE announcements            DISABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items               DISABLE ROW LEVEL SECURITY;
ALTER TABLE document_types          DISABLE ROW LEVEL SECURITY;
ALTER TABLE coupons                  DISABLE ROW LEVEL SECURITY;

-- Store tables yang juga direferensi di RLS policies dengan is_admin
-- (policies ini tetap ada di DB sebagai dokumentasi, tapi tidak aktif)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'store_categories') THEN
    EXECUTE 'ALTER TABLE store_categories DISABLE ROW LEVEL SECURITY';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'store_products') THEN
    EXECUTE 'ALTER TABLE store_products DISABLE ROW LEVEL SECURITY';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'store_orders') THEN
    EXECUTE 'ALTER TABLE store_orders DISABLE ROW LEVEL SECURITY';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'store_order_items') THEN
    EXECUTE 'ALTER TABLE store_order_items DISABLE ROW LEVEL SECURITY';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'store_shipments') THEN
    EXECUTE 'ALTER TABLE store_shipments DISABLE ROW LEVEL SECURITY';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'store_order_counters') THEN
    EXECUTE 'ALTER TABLE store_order_counters DISABLE ROW LEVEL SECURITY';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'push_outbox') THEN
    EXECUTE 'ALTER TABLE push_outbox DISABLE ROW LEVEL SECURITY';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'referral_usages') THEN
    EXECUTE 'ALTER TABLE referral_usages DISABLE ROW LEVEL SECURITY';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'referral_codes') THEN
    EXECUTE 'ALTER TABLE referral_codes DISABLE ROW LEVEL SECURITY';
  END IF;
END $$;

-- =============================================================================
SELECT '91_disable_rls_public_tables complete' AS result;
