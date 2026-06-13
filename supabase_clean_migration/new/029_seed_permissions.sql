-- =============================================================================
-- VINSTOUR TRAVEL PORTAL — Clean Migration v2
-- FILE 029: Seed Data — Permissions & Role Permissions
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. PERMISSIONS_LIST seed — Master daftar semua permission
-- ---------------------------------------------------------------------------
INSERT INTO public.permissions_list (key, label, group_name, description)
VALUES
  -- Booking
  ('bookings.view',        'Lihat Booking',         'booking',    'Akses daftar dan detail booking'),
  ('bookings.create',      'Buat Booking',          'booking',    'Membuat booking baru'),
  ('bookings.edit',        'Edit Booking',          'booking',    'Mengubah data booking'),
  ('bookings.cancel',      'Batalkan Booking',      'booking',    'Membatalkan booking'),
  ('bookings.export',      'Export Booking',        'booking',    'Export data booking ke CSV/Excel'),
  -- Payments
  ('payments.view',        'Lihat Pembayaran',      'payment',    'Akses data pembayaran'),
  ('payments.verify',      'Verifikasi Pembayaran', 'payment',    'Konfirmasi/reject pembayaran'),
  ('payments.refund',      'Proses Refund',         'payment',    'Memproses pengembalian dana'),
  ('payments.export',      'Export Pembayaran',     'payment',    'Export laporan pembayaran'),
  -- Customers
  ('customers.view',       'Lihat Jamaah',          'customer',   'Akses data jamaah'),
  ('customers.create',     'Tambah Jamaah',         'customer',   'Mendaftarkan jamaah baru'),
  ('customers.edit',       'Edit Jamaah',           'customer',   'Mengubah data jamaah'),
  ('customers.delete',     'Hapus Jamaah',          'customer',   'Menghapus data jamaah'),
  -- Packages
  ('packages.view',        'Lihat Paket',           'package',    'Akses data paket perjalanan'),
  ('packages.create',      'Buat Paket',            'package',    'Membuat paket baru'),
  ('packages.edit',        'Edit Paket',            'package',    'Mengubah data paket'),
  ('packages.publish',     'Publish Paket',         'package',    'Mempublish/unpublish paket'),
  ('packages.delete',      'Hapus Paket',           'package',    'Menghapus paket'),
  -- Departures
  ('departures.view',      'Lihat Keberangkatan',   'departure',  'Akses data keberangkatan'),
  ('departures.create',    'Buat Keberangkatan',    'departure',  'Membuat jadwal keberangkatan'),
  ('departures.edit',      'Edit Keberangkatan',    'departure',  'Mengubah jadwal keberangkatan'),
  ('departures.manage',    'Kelola Keberangkatan',  'departure',  'Operasional keberangkatan'),
  -- Finance
  ('finance.view',         'Lihat Keuangan',        'finance',    'Akses laporan keuangan'),
  ('finance.journal',      'Entry Jurnal',          'finance',    'Membuat jurnal akuntansi'),
  ('finance.approve',      'Approve Keuangan',      'finance',    'Menyetujui transaksi keuangan'),
  ('finance.export',       'Export Keuangan',       'finance',    'Export laporan keuangan'),
  ('payroll.view',         'Lihat Payroll',         'finance',    'Akses data penggajian'),
  ('payroll.manage',       'Kelola Payroll',        'finance',    'Memproses penggajian'),
  -- Agents
  ('agents.view',          'Lihat Agen',            'agent',      'Akses data agen'),
  ('agents.create',        'Tambah Agen',           'agent',      'Mendaftarkan agen baru'),
  ('agents.edit',          'Edit Agen',             'agent',      'Mengubah data agen'),
  ('agents.commission',    'Kelola Komisi',         'agent',      'Menyetujui dan membayar komisi'),
  -- Employees & HR
  ('employees.view',       'Lihat Karyawan',        'hr',         'Akses data karyawan'),
  ('employees.create',     'Tambah Karyawan',       'hr',         'Mendaftarkan karyawan baru'),
  ('employees.edit',       'Edit Karyawan',         'hr',         'Mengubah data karyawan'),
  ('leave.approve',        'Approve Cuti',          'hr',         'Menyetujui pengajuan cuti'),
  -- Equipment
  ('equipment.view',       'Lihat Perlengkapan',    'equipment',  'Akses data perlengkapan'),
  ('equipment.manage',     'Kelola Perlengkapan',   'equipment',  'Distribusi dan manajemen perlengkapan'),
  ('equipment.distribute', 'Distribusi Perlengkapan','equipment', 'Mendistribusikan perlengkapan ke jamaah'),
  -- Marketing
  ('leads.view',           'Lihat Lead',            'marketing',  'Akses data prospek'),
  ('leads.manage',         'Kelola Lead',           'marketing',  'Update status dan assign lead'),
  ('marketing.campaigns',  'Kampanye Marketing',    'marketing',  'Membuat dan mengelola kampanye'),
  -- CMS
  ('cms.view',             'Lihat CMS',             'cms',        'Akses konten website'),
  ('cms.edit',             'Edit CMS',              'cms',        'Mengubah konten website'),
  ('cms.publish',          'Publish Konten',        'cms',        'Mempublish konten website'),
  -- System
  ('users.view',           'Lihat User',            'system',     'Akses daftar user sistem'),
  ('users.manage',         'Kelola User',           'system',     'Membuat dan mengubah user'),
  ('roles.manage',         'Kelola Role',           'system',     'Assign role ke user'),
  ('permissions.manage',   'Kelola Permission',     'system',     'Mengubah konfigurasi permission'),
  ('settings.view',        'Lihat Pengaturan',      'system',     'Akses halaman pengaturan'),
  ('settings.edit',        'Edit Pengaturan',       'system',     'Mengubah konfigurasi sistem'),
  ('audit.view',           'Lihat Audit Log',       'system',     'Akses log aktivitas sistem'),
  -- Reports
  ('reports.view',         'Lihat Laporan',         'report',     'Akses semua laporan'),
  ('reports.export',       'Export Laporan',        'report',     'Export laporan ke file'),
  ('reports.financial',    'Laporan Keuangan',      'report',     'Akses laporan keuangan detail'),
  -- Branches
  ('branches.view',        'Lihat Cabang',          'branch',     'Akses data cabang'),
  ('branches.manage',      'Kelola Cabang',         'branch',     'Membuat dan mengubah cabang')
ON CONFLICT (key) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. ROLE_PERMISSIONS seed
-- Super Admin = semua permission dengan semua aksi
-- ---------------------------------------------------------------------------

-- SUPER ADMIN — Full access
INSERT INTO public.role_permissions (role, permission_key, can_view, can_create, can_edit, can_delete)
SELECT 'super_admin'::public.app_role, key, TRUE, TRUE, TRUE, TRUE
FROM public.permissions_list
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view=TRUE, can_create=TRUE, can_edit=TRUE, can_delete=TRUE;

-- OWNER — Full access, sama dengan super_admin untuk operasional
INSERT INTO public.role_permissions (role, permission_key, can_view, can_create, can_edit, can_delete)
SELECT 'owner'::public.app_role, key, TRUE, TRUE, TRUE, TRUE
FROM public.permissions_list
WHERE key NOT IN ('roles.manage','permissions.manage','settings.edit')
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view=EXCLUDED.can_view, can_create=EXCLUDED.can_create,
  can_edit=EXCLUDED.can_edit, can_delete=EXCLUDED.can_delete;

-- IT — System management focus
INSERT INTO public.role_permissions (role, permission_key, can_view, can_create, can_edit, can_delete)
VALUES
  ('it', 'users.view',         TRUE,  TRUE,  TRUE,  FALSE),
  ('it', 'users.manage',       TRUE,  TRUE,  TRUE,  TRUE),
  ('it', 'roles.manage',       TRUE,  TRUE,  TRUE,  TRUE),
  ('it', 'permissions.manage', TRUE,  TRUE,  TRUE,  TRUE),
  ('it', 'settings.view',      TRUE,  FALSE, FALSE, FALSE),
  ('it', 'settings.edit',      TRUE,  TRUE,  TRUE,  FALSE),
  ('it', 'audit.view',         TRUE,  FALSE, FALSE, FALSE),
  ('it', 'cms.view',           TRUE,  FALSE, FALSE, FALSE),
  ('it', 'cms.edit',           TRUE,  TRUE,  TRUE,  TRUE),
  ('it', 'branches.view',      TRUE,  FALSE, FALSE, FALSE),
  ('it', 'branches.manage',    TRUE,  TRUE,  TRUE,  FALSE)
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view=EXCLUDED.can_view, can_create=EXCLUDED.can_create,
  can_edit=EXCLUDED.can_edit, can_delete=EXCLUDED.can_delete;

-- ADMIN — Operasional harian
INSERT INTO public.role_permissions (role, permission_key, can_view, can_create, can_edit, can_delete)
VALUES
  ('admin', 'bookings.view',    TRUE,  TRUE,  TRUE,  FALSE),
  ('admin', 'bookings.create',  TRUE,  TRUE,  FALSE, FALSE),
  ('admin', 'bookings.edit',    TRUE,  FALSE, TRUE,  FALSE),
  ('admin', 'bookings.cancel',  TRUE,  FALSE, TRUE,  FALSE),
  ('admin', 'bookings.export',  TRUE,  FALSE, FALSE, FALSE),
  ('admin', 'payments.view',    TRUE,  FALSE, FALSE, FALSE),
  ('admin', 'payments.verify',  TRUE,  FALSE, TRUE,  FALSE),
  ('admin', 'customers.view',   TRUE,  TRUE,  TRUE,  FALSE),
  ('admin', 'customers.create', TRUE,  TRUE,  FALSE, FALSE),
  ('admin', 'customers.edit',   TRUE,  FALSE, TRUE,  FALSE),
  ('admin', 'packages.view',    TRUE,  TRUE,  TRUE,  FALSE),
  ('admin', 'packages.create',  TRUE,  TRUE,  FALSE, FALSE),
  ('admin', 'packages.edit',    TRUE,  FALSE, TRUE,  FALSE),
  ('admin', 'departures.view',  TRUE,  TRUE,  TRUE,  FALSE),
  ('admin', 'departures.create',TRUE,  TRUE,  FALSE, FALSE),
  ('admin', 'departures.edit',  TRUE,  FALSE, TRUE,  FALSE),
  ('admin', 'agents.view',      TRUE,  FALSE, FALSE, FALSE),
  ('admin', 'leads.view',       TRUE,  TRUE,  TRUE,  FALSE),
  ('admin', 'employees.view',   TRUE,  FALSE, FALSE, FALSE),
  ('admin', 'equipment.view',   TRUE,  FALSE, FALSE, FALSE),
  ('admin', 'cms.view',         TRUE,  TRUE,  TRUE,  FALSE),
  ('admin', 'cms.edit',         TRUE,  FALSE, TRUE,  FALSE),
  ('admin', 'reports.view',     TRUE,  FALSE, FALSE, FALSE),
  ('admin', 'reports.export',   TRUE,  FALSE, FALSE, FALSE),
  ('admin', 'settings.view',    TRUE,  FALSE, FALSE, FALSE),
  ('admin', 'branches.view',    TRUE,  FALSE, FALSE, FALSE),
  ('admin', 'audit.view',       TRUE,  FALSE, FALSE, FALSE)
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view=EXCLUDED.can_view, can_create=EXCLUDED.can_create,
  can_edit=EXCLUDED.can_edit, can_delete=EXCLUDED.can_delete;

-- FINANCE — Keuangan
INSERT INTO public.role_permissions (role, permission_key, can_view, can_create, can_edit, can_delete)
VALUES
  ('finance', 'bookings.view',     TRUE,  FALSE, FALSE, FALSE),
  ('finance', 'bookings.export',   TRUE,  FALSE, FALSE, FALSE),
  ('finance', 'payments.view',     TRUE,  TRUE,  TRUE,  FALSE),
  ('finance', 'payments.verify',   TRUE,  FALSE, TRUE,  FALSE),
  ('finance', 'payments.refund',   TRUE,  FALSE, TRUE,  FALSE),
  ('finance', 'payments.export',   TRUE,  FALSE, FALSE, FALSE),
  ('finance', 'finance.view',      TRUE,  FALSE, FALSE, FALSE),
  ('finance', 'finance.journal',   TRUE,  TRUE,  TRUE,  FALSE),
  ('finance', 'finance.approve',   TRUE,  FALSE, TRUE,  FALSE),
  ('finance', 'finance.export',    TRUE,  FALSE, FALSE, FALSE),
  ('finance', 'payroll.view',      TRUE,  FALSE, FALSE, FALSE),
  ('finance', 'payroll.manage',    TRUE,  TRUE,  TRUE,  FALSE),
  ('finance', 'agents.commission', TRUE,  FALSE, TRUE,  FALSE),
  ('finance', 'reports.view',      TRUE,  FALSE, FALSE, FALSE),
  ('finance', 'reports.export',    TRUE,  FALSE, FALSE, FALSE),
  ('finance', 'reports.financial', TRUE,  FALSE, FALSE, FALSE)
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view=EXCLUDED.can_view, can_create=EXCLUDED.can_create,
  can_edit=EXCLUDED.can_edit, can_delete=EXCLUDED.can_delete;

-- OPERATIONAL — Tim operasional keberangkatan
INSERT INTO public.role_permissions (role, permission_key, can_view, can_create, can_edit, can_delete)
VALUES
  ('operational', 'bookings.view',       TRUE,  FALSE, FALSE, FALSE),
  ('operational', 'customers.view',      TRUE,  FALSE, FALSE, FALSE),
  ('operational', 'departures.view',     TRUE,  TRUE,  TRUE,  FALSE),
  ('operational', 'departures.manage',   TRUE,  FALSE, TRUE,  FALSE),
  ('operational', 'equipment.view',      TRUE,  FALSE, FALSE, FALSE),
  ('operational', 'equipment.manage',    TRUE,  TRUE,  TRUE,  FALSE),
  ('operational', 'equipment.distribute',TRUE,  FALSE, TRUE,  FALSE),
  ('operational', 'reports.view',        TRUE,  FALSE, FALSE, FALSE)
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view=EXCLUDED.can_view, can_create=EXCLUDED.can_create,
  can_edit=EXCLUDED.can_edit, can_delete=EXCLUDED.can_delete;

-- OPERATOR — Data entry booking
INSERT INTO public.role_permissions (role, permission_key, can_view, can_create, can_edit, can_delete)
VALUES
  ('operator', 'bookings.view',   TRUE,  TRUE,  TRUE,  FALSE),
  ('operator', 'bookings.create', TRUE,  TRUE,  FALSE, FALSE),
  ('operator', 'bookings.edit',   TRUE,  FALSE, TRUE,  FALSE),
  ('operator', 'payments.view',   TRUE,  TRUE,  FALSE, FALSE),
  ('operator', 'customers.view',  TRUE,  TRUE,  TRUE,  FALSE),
  ('operator', 'customers.create',TRUE,  TRUE,  FALSE, FALSE),
  ('operator', 'packages.view',   TRUE,  FALSE, FALSE, FALSE),
  ('operator', 'departures.view', TRUE,  FALSE, FALSE, FALSE),
  ('operator', 'leads.view',      TRUE,  TRUE,  TRUE,  FALSE)
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view=EXCLUDED.can_view, can_create=EXCLUDED.can_create,
  can_edit=EXCLUDED.can_edit, can_delete=EXCLUDED.can_delete;

-- SALES — Tim penjualan
INSERT INTO public.role_permissions (role, permission_key, can_view, can_create, can_edit, can_delete)
VALUES
  ('sales', 'bookings.view',   TRUE,  TRUE,  FALSE, FALSE),
  ('sales', 'bookings.create', TRUE,  TRUE,  FALSE, FALSE),
  ('sales', 'customers.view',  TRUE,  TRUE,  TRUE,  FALSE),
  ('sales', 'customers.create',TRUE,  TRUE,  FALSE, FALSE),
  ('sales', 'packages.view',   TRUE,  FALSE, FALSE, FALSE),
  ('sales', 'departures.view', TRUE,  FALSE, FALSE, FALSE),
  ('sales', 'leads.view',      TRUE,  TRUE,  TRUE,  FALSE),
  ('sales', 'leads.manage',    TRUE,  TRUE,  TRUE,  FALSE),
  ('sales', 'agents.view',     TRUE,  FALSE, FALSE, FALSE),
  ('sales', 'reports.view',    TRUE,  FALSE, FALSE, FALSE)
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view=EXCLUDED.can_view, can_create=EXCLUDED.can_create,
  can_edit=EXCLUDED.can_edit, can_delete=EXCLUDED.can_delete;

-- MARKETING
INSERT INTO public.role_permissions (role, permission_key, can_view, can_create, can_edit, can_delete)
VALUES
  ('marketing', 'packages.view',        TRUE,  FALSE, FALSE, FALSE),
  ('marketing', 'packages.edit',        TRUE,  FALSE, TRUE,  FALSE),
  ('marketing', 'packages.publish',     TRUE,  FALSE, TRUE,  FALSE),
  ('marketing', 'leads.view',           TRUE,  FALSE, FALSE, FALSE),
  ('marketing', 'leads.manage',         TRUE,  TRUE,  TRUE,  FALSE),
  ('marketing', 'marketing.campaigns',  TRUE,  TRUE,  TRUE,  TRUE),
  ('marketing', 'cms.view',             TRUE,  FALSE, FALSE, FALSE),
  ('marketing', 'cms.edit',             TRUE,  TRUE,  TRUE,  FALSE),
  ('marketing', 'cms.publish',          TRUE,  FALSE, TRUE,  FALSE),
  ('marketing', 'reports.view',         TRUE,  FALSE, FALSE, FALSE)
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view=EXCLUDED.can_view, can_create=EXCLUDED.can_create,
  can_edit=EXCLUDED.can_edit, can_delete=EXCLUDED.can_delete;

-- EQUIPMENT
INSERT INTO public.role_permissions (role, permission_key, can_view, can_create, can_edit, can_delete)
VALUES
  ('equipment', 'equipment.view',       TRUE,  TRUE,  TRUE,  FALSE),
  ('equipment', 'equipment.manage',     TRUE,  TRUE,  TRUE,  FALSE),
  ('equipment', 'equipment.distribute', TRUE,  TRUE,  TRUE,  FALSE),
  ('equipment', 'bookings.view',        TRUE,  FALSE, FALSE, FALSE),
  ('equipment', 'departures.view',      TRUE,  FALSE, FALSE, FALSE)
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view=EXCLUDED.can_view, can_create=EXCLUDED.can_create,
  can_edit=EXCLUDED.can_edit, can_delete=EXCLUDED.can_delete;

-- BRANCH_MANAGER
INSERT INTO public.role_permissions (role, permission_key, can_view, can_create, can_edit, can_delete)
VALUES
  ('branch_manager', 'bookings.view',   TRUE,  FALSE, FALSE, FALSE),
  ('branch_manager', 'bookings.export', TRUE,  FALSE, FALSE, FALSE),
  ('branch_manager', 'customers.view',  TRUE,  FALSE, FALSE, FALSE),
  ('branch_manager', 'employees.view',  TRUE,  TRUE,  TRUE,  FALSE),
  ('branch_manager', 'payroll.view',    TRUE,  FALSE, FALSE, FALSE),
  ('branch_manager', 'leave.approve',   TRUE,  FALSE, TRUE,  FALSE),
  ('branch_manager', 'agents.view',     TRUE,  FALSE, FALSE, FALSE),
  ('branch_manager', 'reports.view',    TRUE,  FALSE, FALSE, FALSE),
  ('branch_manager', 'reports.export',  TRUE,  FALSE, FALSE, FALSE),
  ('branch_manager', 'branches.view',   TRUE,  FALSE, FALSE, FALSE)
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view=EXCLUDED.can_view, can_create=EXCLUDED.can_create,
  can_edit=EXCLUDED.can_edit, can_delete=EXCLUDED.can_delete;

-- AGENT — Akses terbatas ke booking dan data sendiri
INSERT INTO public.role_permissions (role, permission_key, can_view, can_create, can_edit, can_delete)
VALUES
  ('agent', 'bookings.view',   TRUE,  TRUE,  FALSE, FALSE),
  ('agent', 'bookings.create', TRUE,  TRUE,  FALSE, FALSE),
  ('agent', 'customers.view',  TRUE,  TRUE,  TRUE,  FALSE),
  ('agent', 'customers.create',TRUE,  TRUE,  FALSE, FALSE),
  ('agent', 'packages.view',   TRUE,  FALSE, FALSE, FALSE),
  ('agent', 'departures.view', TRUE,  FALSE, FALSE, FALSE),
  ('agent', 'leads.view',      TRUE,  TRUE,  TRUE,  FALSE)
ON CONFLICT (role, permission_key) DO UPDATE SET
  can_view=EXCLUDED.can_view, can_create=EXCLUDED.can_create,
  can_edit=EXCLUDED.can_edit, can_delete=EXCLUDED.can_delete;
