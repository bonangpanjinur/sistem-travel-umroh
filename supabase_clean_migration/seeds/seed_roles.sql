-- =============================================================================
-- VINSTOUR TRAVEL PORTAL — Seeds
-- FILE: seed_roles.sql
-- Inserts all permissions and default role-permission mappings.
-- Safe to re-run — uses ON CONFLICT DO NOTHING / DO UPDATE.
-- This is a standalone extract of the role/permission seed from 011_seed_admin.sql
-- for use in isolated role-only resets.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Ensure all permissions exist
-- ---------------------------------------------------------------------------
INSERT INTO public.permissions_list (key, label, group_name, description)
SELECT key, label, group_name, description FROM (VALUES
  ('dashboard',        'Dashboard',               'Overview',            'Halaman utama dashboard'),
  ('analytics',        'Analytics',               'Overview',            'Laporan analitik'),
  ('leads',            'Leads & Prospek',          'Penjualan',           'Manajemen lead calon jamaah'),
  ('bookings',         'Booking',                 'Penjualan',           'Manajemen pemesanan paket'),
  ('packages',         'Paket Umroh & Haji',       'Penjualan',           'Manajemen paket wisata'),
  ('coupons',          'Kupon & Promo',            'Penjualan',           'Kode diskon & promosi'),
  ('announcements',    'Pengumuman',               'Konten & Marketing',  'Pengumuman ke jamaah'),
  ('banners',          'Banner Carousel',          'Konten & Marketing',  'Banner halaman depan'),
  ('whatsapp',         'WhatsApp Blast',           'Konten & Marketing',  'Pengiriman WA massal'),
  ('wa-broadcast',     'WA Broadcast',             'Konten & Marketing',  'Broadcast WA tersegmentasi'),
  ('departures',       'Jadwal Keberangkatan',     'Keberangkatan',       'Manajemen jadwal keberangkatan'),
  ('room-assignments', 'Kamar & Rooming',          'Keberangkatan',       'Penempatan kamar jamaah'),
  ('manasik',          'Manasik',                  'Keberangkatan',       'Jadwal dan materi manasik'),
  ('equipment',        'Perlengkapan',             'Keberangkatan',       'Distribusi perlengkapan jamaah'),
  ('payments',         'Pembayaran',               'Keuangan',            'Verifikasi & rekap pembayaran'),
  ('finance',          'Laporan P&L',              'Keuangan',            'Laporan laba rugi'),
  ('savings',          'Program Tabungan',         'Keuangan',            'Tabungan umroh'),
  ('reports',          'Laporan',                  'Keuangan',            'Laporan keuangan'),
  ('customers',        'Data Jamaah',              'Jamaah & Agen',       'Profil & data jamaah'),
  ('agents',           'Agen',                     'Jamaah & Agen',       'Mitra agen'),
  ('branches',         'Cabang',                   'Jamaah & Agen',       'Manajemen cabang'),
  ('employees',        'Karyawan',                 'HR',                  'Manajemen karyawan'),
  ('payroll',          'Penggajian',               'HR',                  'Slip gaji & penggajian'),
  ('store',            'Toko Online',              'E-Commerce',          'Produk & pesanan toko'),
  ('vendors',          'Vendor',                   'Operasional',         'Data supplier & vendor'),
  ('visa',             'Visa',                     'Operasional',         'Proses pengajuan visa'),
  ('sos',              'SOS Alert',                'Operasional',         'Alert darurat jamaah'),
  ('settings',         'Pengaturan',               'Sistem',              'Konfigurasi sistem'),
  ('users',            'Manajemen Pengguna',       'Sistem',              'Akun & hak akses user'),
  ('audit-logs',       'Audit Log',                'Sistem',              'Riwayat perubahan data')
) AS v(key, label, group_name, description)
ON CONFLICT (key) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. Reset and re-seed role_permissions
--    (truncate existing first for a clean reset — comment out if you want additive)
-- ---------------------------------------------------------------------------
-- TRUNCATE public.role_permissions RESTART IDENTITY CASCADE;

-- super_admin — full access
INSERT INTO public.role_permissions (role, permission_key, can_view, can_create, can_edit, can_delete)
SELECT 'super_admin', key, TRUE, TRUE, TRUE, TRUE
FROM public.permissions_list
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view   = TRUE, can_create = TRUE,
  can_edit   = TRUE, can_delete = TRUE,
  updated_at = NOW();

-- admin — full access except delete on sensitive areas
INSERT INTO public.role_permissions (role, permission_key, can_view, can_create, can_edit, can_delete)
SELECT 'admin', key, TRUE, TRUE, TRUE,
       CASE WHEN key IN ('audit-logs', 'users') THEN FALSE ELSE TRUE END
FROM public.permissions_list
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view   = EXCLUDED.can_view,
  can_create = EXCLUDED.can_create,
  can_edit   = EXCLUDED.can_edit,
  can_delete = EXCLUDED.can_delete,
  updated_at = NOW();

-- finance role
INSERT INTO public.role_permissions (role, permission_key, can_view, can_create, can_edit, can_delete)
VALUES
  ('finance','dashboard',  TRUE,FALSE,FALSE,FALSE),
  ('finance','analytics',  TRUE,FALSE,FALSE,FALSE),
  ('finance','bookings',   TRUE,FALSE,TRUE, FALSE),
  ('finance','payments',   TRUE,TRUE, TRUE, FALSE),
  ('finance','finance',    TRUE,TRUE, TRUE, FALSE),
  ('finance','savings',    TRUE,FALSE,TRUE, FALSE),
  ('finance','reports',    TRUE,TRUE, FALSE,FALSE),
  ('finance','customers',  TRUE,FALSE,FALSE,FALSE),
  ('finance','departures', TRUE,FALSE,FALSE,FALSE),
  ('finance','payroll',    TRUE,TRUE, TRUE, FALSE),
  ('finance','vendors',    TRUE,TRUE, TRUE, FALSE)
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view=EXCLUDED.can_view, can_create=EXCLUDED.can_create,
  can_edit=EXCLUDED.can_edit, can_delete=EXCLUDED.can_delete, updated_at=NOW();

-- marketing role
INSERT INTO public.role_permissions (role, permission_key, can_view, can_create, can_edit, can_delete)
VALUES
  ('marketing','dashboard',     TRUE,FALSE,FALSE,FALSE),
  ('marketing','analytics',     TRUE,FALSE,FALSE,FALSE),
  ('marketing','leads',         TRUE,TRUE, TRUE, TRUE),
  ('marketing','packages',      TRUE,TRUE, TRUE, FALSE),
  ('marketing','coupons',       TRUE,TRUE, TRUE, TRUE),
  ('marketing','announcements', TRUE,TRUE, TRUE, TRUE),
  ('marketing','banners',       TRUE,TRUE, TRUE, TRUE),
  ('marketing','whatsapp',      TRUE,TRUE, FALSE,FALSE),
  ('marketing','wa-broadcast',  TRUE,TRUE, FALSE,FALSE),
  ('marketing','customers',     TRUE,FALSE,FALSE,FALSE),
  ('marketing','departures',    TRUE,FALSE,FALSE,FALSE)
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view=EXCLUDED.can_view, can_create=EXCLUDED.can_create,
  can_edit=EXCLUDED.can_edit, can_delete=EXCLUDED.can_delete, updated_at=NOW();

-- operator role
INSERT INTO public.role_permissions (role, permission_key, can_view, can_create, can_edit, can_delete)
VALUES
  ('operator','dashboard',       TRUE,FALSE,FALSE,FALSE),
  ('operator','bookings',        TRUE,TRUE, TRUE, FALSE),
  ('operator','payments',        TRUE,TRUE, TRUE, FALSE),
  ('operator','customers',       TRUE,TRUE, TRUE, FALSE),
  ('operator','departures',      TRUE,FALSE,TRUE, FALSE),
  ('operator','room-assignments',TRUE,TRUE, TRUE, FALSE),
  ('operator','manasik',         TRUE,TRUE, TRUE, FALSE),
  ('operator','equipment',       TRUE,TRUE, TRUE, FALSE),
  ('operator','visa',            TRUE,TRUE, TRUE, FALSE),
  ('operator','sos',             TRUE,FALSE,TRUE, FALSE),
  ('operator','whatsapp',        TRUE,TRUE, FALSE,FALSE),
  ('operator','packages',        TRUE,FALSE,FALSE,FALSE),
  ('operator','vendors',         TRUE,FALSE,FALSE,FALSE)
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view=EXCLUDED.can_view, can_create=EXCLUDED.can_create,
  can_edit=EXCLUDED.can_edit, can_delete=EXCLUDED.can_delete, updated_at=NOW();

-- branch_manager role
INSERT INTO public.role_permissions (role, permission_key, can_view, can_create, can_edit, can_delete)
VALUES
  ('branch_manager','dashboard',      TRUE,FALSE,FALSE,FALSE),
  ('branch_manager','analytics',      TRUE,FALSE,FALSE,FALSE),
  ('branch_manager','leads',          TRUE,TRUE, TRUE, TRUE),
  ('branch_manager','bookings',       TRUE,TRUE, TRUE, FALSE),
  ('branch_manager','payments',       TRUE,TRUE, TRUE, FALSE),
  ('branch_manager','customers',      TRUE,TRUE, TRUE, FALSE),
  ('branch_manager','departures',     TRUE,TRUE, TRUE, FALSE),
  ('branch_manager','packages',       TRUE,FALSE,FALSE,FALSE),
  ('branch_manager','agents',         TRUE,TRUE, TRUE, FALSE),
  ('branch_manager','employees',      TRUE,TRUE, TRUE, FALSE),
  ('branch_manager','payroll',        TRUE,TRUE, TRUE, FALSE),
  ('branch_manager','finance',        TRUE,FALSE,FALSE,FALSE),
  ('branch_manager','reports',        TRUE,FALSE,FALSE,FALSE),
  ('branch_manager','manasik',        TRUE,TRUE, TRUE, FALSE),
  ('branch_manager','equipment',      TRUE,TRUE, TRUE, FALSE),
  ('branch_manager','visa',           TRUE,TRUE, TRUE, FALSE),
  ('branch_manager','sos',            TRUE,FALSE,TRUE, FALSE),
  ('branch_manager','whatsapp',       TRUE,TRUE, FALSE,FALSE),
  ('branch_manager','settings',       TRUE,TRUE, TRUE, FALSE)
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view=EXCLUDED.can_view, can_create=EXCLUDED.can_create,
  can_edit=EXCLUDED.can_edit, can_delete=EXCLUDED.can_delete, updated_at=NOW();

-- agent role
INSERT INTO public.role_permissions (role, permission_key, can_view, can_create, can_edit, can_delete)
VALUES
  ('agent','dashboard',  TRUE,FALSE,FALSE,FALSE),
  ('agent','bookings',   TRUE,TRUE, FALSE,FALSE),
  ('agent','customers',  TRUE,TRUE, FALSE,FALSE),
  ('agent','packages',   TRUE,FALSE,FALSE,FALSE),
  ('agent','departures', TRUE,FALSE,FALSE,FALSE),
  ('agent','leads',      TRUE,TRUE, TRUE, FALSE)
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view=EXCLUDED.can_view, can_create=EXCLUDED.can_create,
  can_edit=EXCLUDED.can_edit, can_delete=EXCLUDED.can_delete, updated_at=NOW();

-- customer role
INSERT INTO public.role_permissions (role, permission_key, can_view, can_create, can_edit, can_delete)
VALUES
  ('customer','bookings', TRUE,FALSE,FALSE,FALSE),
  ('customer','payments', TRUE,TRUE, FALSE,FALSE),
  ('customer','savings',  TRUE,TRUE, FALSE,FALSE)
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view=EXCLUDED.can_view, can_create=EXCLUDED.can_create,
  can_edit=EXCLUDED.can_edit, can_delete=EXCLUDED.can_delete, updated_at=NOW();

SELECT 'seed_roles: OK' AS result;
