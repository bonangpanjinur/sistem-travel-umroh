-- =============================================================================
-- VINSTOUR TRAVEL PORTAL — Clean Migration Chain
-- FILE 038: Complete Permission Seed
--   Menutup gap dari 011_seed_admin.sql yang hanya memiliki 30 permission keys.
--   File ini menambahkan semua permission keys yang dibutuhkan (176+) beserta
--   role_permissions untuk semua 14 role dalam sistem.
-- Run AFTER 037. Idempotent — ON CONFLICT DO NOTHING throughout.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- STEP 1: Insert all missing permission keys (176+ total)
-- Format key: {domain}.{action} sesuai permission_matrix.md
-- ---------------------------------------------------------------------------
INSERT INTO public.permissions_list (key, label, group_name, description) VALUES

  -- == BOOKING ==
  ('bookings.view',           'Lihat Semua Booking',        'Booking',    'Akses ke daftar & detail semua booking'),
  ('bookings.create',         'Buat Booking Baru',          'Booking',    'Membuat booking paket untuk jamaah'),
  ('bookings.edit',           'Edit Data Booking',          'Booking',    'Mengubah data booking yang ada'),
  ('bookings.cancel',         'Batalkan Booking',           'Booking',    'Membatalkan booking yang aktif'),
  ('bookings.confirm',        'Konfirmasi Booking',         'Booking',    'Mengkonfirmasi booking baru'),
  ('bookings.transfer',       'Transfer Booking',           'Booking',    'Pindah booking ke paket/departure lain'),
  ('bookings.export',         'Export Data Booking',        'Booking',    'Unduh laporan booking ke Excel/PDF'),
  ('bookings.history',        'Lihat History Status',       'Booking',    'Riwayat perubahan status booking'),

  -- == PAYMENTS ==
  ('payments.view',           'Lihat Pembayaran',           'Pembayaran', 'Akses ke data pembayaran'),
  ('payments.input',          'Input Bukti Bayar',          'Pembayaran', 'Upload bukti pembayaran'),
  ('payments.verify',         'Verifikasi Pembayaran',      'Pembayaran', 'Menyetujui pembayaran masuk'),
  ('payments.reject',         'Reject Pembayaran',          'Pembayaran', 'Menolak pembayaran tidak valid'),
  ('payments.refund',         'Proses Refund',              'Pembayaran', 'Mengembalikan uang jamaah'),
  ('payments.export',         'Export Laporan Bayar',       'Pembayaran', 'Unduh laporan pembayaran'),

  -- == CUSTOMERS / JAMAAH ==
  ('customers.view',          'Lihat Daftar Jamaah',        'Jamaah',     'Akses ke data jamaah'),
  ('customers.create',        'Tambah Jamaah Baru',         'Jamaah',     'Mendaftarkan jamaah baru'),
  ('customers.edit',          'Edit Data Jamaah',           'Jamaah',     'Mengubah profil & data jamaah'),
  ('customers.upload_docs',   'Upload Dokumen Jamaah',      'Jamaah',     'Upload passport, KTP, dll'),
  ('customers.verify_docs',   'Verifikasi Dokumen',         'Jamaah',     'Menyetujui dokumen jamaah'),
  ('customers.view_location', 'Lihat Lokasi Live',          'Jamaah',     'GPS tracking jamaah real-time'),
  ('customers.portal',        'Akses Portal Jamaah',        'Jamaah',     'Akses khusus portal self-service jamaah'),
  ('customers.delete',        'Hapus Data Jamaah',          'Jamaah',     'Menghapus akun jamaah (soft delete)'),
  ('customers.family',        'Kelola Data Keluarga',       'Jamaah',     'Manajemen relasi keluarga jamaah'),
  ('customers.qr',            'Kelola QR Code Jamaah',      'Jamaah',     'Generate & scan QR code jamaah'),

  -- == PACKAGES ==
  ('packages.view_draft',     'Lihat Paket Draft',          'Paket',      'Akses paket yang belum dipublikasi'),
  ('packages.view_public',    'Lihat Paket Publik',         'Paket',      'Akses paket yang sudah dipublikasi'),
  ('packages.create',         'Buat Paket Baru',            'Paket',      'Membuat paket umroh/haji baru'),
  ('packages.edit',           'Edit Paket',                 'Paket',      'Mengubah detail paket'),
  ('packages.publish',        'Publish Paket',              'Paket',      'Mempublikasikan paket ke website'),
  ('packages.delete',         'Hapus Paket',                'Paket',      'Menghapus paket (soft delete)'),

  -- == DEPARTURES ==
  ('departures.view',         'Lihat Keberangkatan',        'Keberangkatan', 'Akses jadwal keberangkatan'),
  ('departures.create',       'Buat Keberangkatan',         'Keberangkatan', 'Membuat jadwal keberangkatan baru'),
  ('departures.edit',         'Edit Keberangkatan',         'Keberangkatan', 'Mengubah data keberangkatan'),
  ('departures.itinerary',    'Kelola Itinerary',           'Keberangkatan', 'Manajemen program perjalanan'),
  ('departures.checklist',    'Kelola Checklist',           'Keberangkatan', 'Manajemen checklist operasional'),
  ('departures.manifest',     'Kelola Manifest',            'Keberangkatan', 'Manajemen manifest penumpang'),
  ('departures.hotels',       'Kelola Hotel Departure',     'Keberangkatan', 'Alokasi hotel per segment'),
  ('departures.financial',    'Lihat Keuangan Departure',   'Keberangkatan', 'HPP & laporan P&L per departure'),

  -- == FINANCE ==
  ('finance.view_report',     'Lihat Laporan Keuangan',     'Keuangan',   'Akses laporan P&L & balance sheet'),
  ('finance.journal',         'Entry Jurnal Akuntansi',     'Keuangan',   'Input jurnal double-entry'),
  ('finance.approve_journal', 'Approve Jurnal',             'Keuangan',   'Menyetujui posting jurnal'),
  ('finance.view_hpp',        'Lihat HPP & Expense',        'Keuangan',   'Akses data HPP & pengeluaran'),
  ('finance.input_hpp',       'Input HPP & Expense',        'Keuangan',   'Menginput biaya operasional'),
  ('finance.approve_expense', 'Approve Expense',            'Keuangan',   'Menyetujui pengeluaran'),
  ('finance.vendor_invoice',  'Kelola Vendor Invoice',      'Keuangan',   'Manajemen tagihan vendor'),
  ('finance.view_coa',        'Lihat Chart of Accounts',    'Keuangan',   'Akses bagan akun'),
  ('finance.manage_coa',      'Kelola Chart of Accounts',   'Keuangan',   'Tambah & edit bagan akun'),
  ('finance.export',          'Export Laporan Keuangan',    'Keuangan',   'Unduh laporan keuangan'),
  ('finance.departure_summary','Summary P&L Departure',     'Keuangan',   'Ringkasan keuangan per departure'),
  ('finance.cashflow',        'Kelola Arus Kas',            'Keuangan',   'Manajemen cashflow'),

  -- == EMPLOYEES / HR ==
  ('employees.view',          'Lihat Data Karyawan',        'HR',         'Akses ke daftar & profil karyawan'),
  ('employees.create',        'Tambah Karyawan',            'HR',         'Mendaftarkan karyawan baru'),
  ('employees.edit',          'Edit Data Karyawan',         'HR',         'Mengubah profil karyawan'),
  ('employees.contracts',     'Kelola Kontrak Karyawan',    'HR',         'Manajemen kontrak kerja'),
  ('employees.warnings',      'Kelola Surat Peringatan',    'HR',         'Manajemen SP1/SP2/SP3'),
  ('employees.training',      'Kelola Training',            'HR',         'Manajemen sesi pelatihan'),
  ('employees.recruitment',   'Kelola Rekrutmen',           'HR',         'Lowongan & seleksi karyawan'),

  -- == PAYROLL ==
  ('payroll.view_own_slip',   'Lihat Slip Gaji Sendiri',    'Penggajian', 'Karyawan melihat slip gaji miliknya'),
  ('payroll.view_all',        'Lihat Semua Slip Gaji',      'Penggajian', 'Akses slip gaji semua karyawan'),
  ('payroll.process',         'Proses Penggajian',          'Penggajian', 'Memproses gaji bulanan'),
  ('payroll.components',      'Kelola Komponen Gaji',       'Penggajian', 'Tambah/edit komponen gaji kustom'),

  -- == LEAVE / CUTI ==
  ('leave.submit',            'Ajukan Cuti',                'Cuti',       'Mengajukan cuti (untuk diri sendiri)'),
  ('leave.approve',           'Approve Cuti',               'Cuti',       'Menyetujui pengajuan cuti'),
  ('leave.manage_quota',      'Kelola Kuota Cuti',          'Cuti',       'Atur kuota cuti per karyawan'),

  -- == ATTENDANCE ==
  ('attendance.view',         'Lihat Absensi',              'Absensi',    'Akses data absensi karyawan'),
  ('attendance.manage',       'Kelola Absensi',             'Absensi',    'Input & koreksi absensi'),

  -- == PERFORMANCE ==
  ('performance.review',      'Penilaian Kinerja',          'HR',         'Mengisi & melihat penilaian kinerja'),

  -- == AGENTS ==
  ('agents.view',             'Lihat Daftar Agen',          'Agen',       'Akses data agen mitra'),
  ('agents.create',           'Tambah Agen Baru',           'Agen',       'Mendaftarkan agen baru'),
  ('agents.edit',             'Edit Data Agen',             'Agen',       'Mengubah profil agen'),
  ('agents.commission',       'Kelola Komisi Agen',         'Agen',       'Approve & bayar komisi'),
  ('agents.wallet',           'Lihat Wallet Agen',          'Agen',       'Akses saldo dompet agen'),
  ('agents.report',           'Laporan Agen',               'Agen',       'Laporan performa & komisi agen'),

  -- == EQUIPMENT ==
  ('equipment.view',          'Lihat Inventaris',           'Perlengkapan','Akses daftar perlengkapan'),
  ('equipment.create',        'Tambah Perlengkapan',        'Perlengkapan','Mendaftarkan item perlengkapan baru'),
  ('equipment.edit',          'Edit Perlengkapan',          'Perlengkapan','Mengubah data perlengkapan'),
  ('equipment.distribute',    'Distribusi ke Jamaah',       'Perlengkapan','Mendistribusikan perlengkapan'),
  ('equipment.bulk_distribute','Bulk Distribusi',           'Perlengkapan','Distribusi massal sekaligus'),
  ('equipment.stock_opname',  'Stock Opname',               'Perlengkapan','Melakukan penghitungan stok fisik'),
  ('equipment.confirm',       'Konfirmasi Penerimaan',      'Perlengkapan','Konfirmasi jamaah terima perlengkapan'),
  ('equipment.report',        'Laporan Perlengkapan',       'Perlengkapan','Laporan distribusi & stok'),

  -- == MARKETING & CRM ==
  ('marketing.view_lead',     'Lihat Lead',                 'Marketing',  'Akses data prospek jamaah'),
  ('marketing.manage_lead',   'Kelola Lead',                'Marketing',  'CRUD data lead & aktivitas'),
  ('marketing.materials',     'Kelola Materi Marketing',    'Marketing',  'Upload & kelola materi promosi'),
  ('marketing.landing_page',  'Kelola Landing Page',        'Marketing',  'Buat & edit halaman landing'),
  ('marketing.campaign',      'Kelola Kampanye',            'Marketing',  'Manajemen kampanye marketing'),
  ('marketing.coupons',       'Kelola Kupon',               'Marketing',  'Buat & kelola kode diskon'),
  ('marketing.loyalty',       'Kelola Poin Loyalitas',      'Marketing',  'Manajemen program poin jamaah'),

  -- == WHATSAPP ==
  ('whatsapp.send',           'Kirim Pesan WA',             'WhatsApp',   'Kirim pesan WA ke jamaah'),
  ('whatsapp.templates',      'Kelola Template WA',         'WhatsApp',   'Buat & edit template pesan'),
  ('whatsapp.broadcast',      'WA Broadcast',               'WhatsApp',   'Kirim broadcast massal'),
  ('whatsapp.config',         'Konfigurasi WA Gateway',     'WhatsApp',   'Setting provider & API key'),
  ('whatsapp.logs',           'Lihat Log WA',               'WhatsApp',   'Akses riwayat pengiriman WA'),

  -- == CONTENT / CMS ==
  ('cms.settings',            'Pengaturan Website',         'CMS',        'Konfigurasi tampilan website'),
  ('cms.faqs',                'Kelola FAQ',                 'CMS',        'Manajemen FAQ website'),
  ('cms.testimonials',        'Kelola Testimoni',           'CMS',        'Manajemen ulasan jamaah'),
  ('cms.banners',             'Kelola Banner',              'CMS',        'Manajemen banner carousel'),
  ('cms.gallery',             'Kelola Galeri',              'CMS',        'Manajemen galeri foto'),
  ('cms.announcements',       'Kelola Pengumuman',          'CMS',        'Manajemen pengumuman ke jamaah'),
  ('cms.about',               'Kelola Halaman About',       'CMS',        'Edit konten halaman About Us'),
  ('cms.knowledge_base',      'Knowledge Base',             'CMS',        'Akses panduan & dokumentasi internal'),
  ('cms.blog',                'Kelola Blog',                'CMS',        'Manajemen artikel blog'),
  ('cms.landing_pages',       'Kelola Landing Pages',       'CMS',        'Manajemen halaman landing custom'),

  -- == SYSTEM / SETTINGS ==
  ('system.manage_users',     'Kelola Pengguna',            'Sistem',     'Manajemen akun & hak akses user'),
  ('system.assign_roles',     'Assign Role',                'Sistem',     'Menetapkan role ke user'),
  ('system.manage_permissions','Kelola Permission',         'Sistem',     'Manajemen hak akses sistem'),
  ('system.settings',         'Pengaturan Sistem',          'Sistem',     'Konfigurasi global sistem'),
  ('system.feature_flags',    'Feature Flags',              'Sistem',     'Toggle fitur on/off per branch'),
  ('system.audit_logs',       'Lihat Audit Log',            'Sistem',     'Riwayat aktivitas & perubahan data'),
  ('system.dashboard_config', 'Konfigurasi Dashboard',      'Sistem',     'Atur widget dashboard per role'),
  ('system.invite_staff',     'Undang Staf Baru',           'Sistem',     'Kirim undangan onboarding staf'),
  ('system.export',           'Export Sistem',              'Sistem',     'Unduh backup/export data sistem'),

  -- == BUS / TRANSPORT ==
  ('bus.manage_providers',    'Kelola Bus Provider',        'Transportasi','Manajemen perusahaan bus'),
  ('bus.assign_departure',    'Assign Bus ke Departure',    'Transportasi','Alokasi bus untuk keberangkatan'),
  ('bus.passengers',          'Kelola Penumpang Bus',       'Transportasi','Manajemen penugasan jamaah ke bus'),
  ('bus.luggage',             'Kelola Bagasi',              'Transportasi','Manajemen bagasi jamaah'),

  -- == HAJI ==
  ('haji.register',           'Daftar Haji',                'Haji',       'Mendaftarkan jamaah untuk haji'),
  ('haji.edit',               'Edit Data Haji',             'Haji',       'Mengubah data pendaftaran haji'),
  ('haji.monitor',            'Monitor Antrian Haji',       'Haji',       'Pantau status & nomor antrian'),
  ('haji.export',             'Export Data Haji',           'Haji',       'Unduh laporan data haji'),

  -- == STORE / E-COMMERCE ==
  ('store.view',              'Lihat Toko Online',          'E-Commerce', 'Akses data toko & produk'),
  ('store.manage_products',   'Kelola Produk Toko',         'E-Commerce', 'Tambah & edit produk'),
  ('store.manage_orders',     'Kelola Pesanan',             'E-Commerce', 'Manajemen order toko'),
  ('store.manage_shipments',  'Kelola Pengiriman',          'E-Commerce', 'Manajemen pengiriman produk'),

  -- == VENDOR ==
  ('vendor.view',             'Lihat Vendor',               'Vendor',     'Akses data vendor & supplier'),
  ('vendor.create',           'Tambah Vendor',              'Vendor',     'Mendaftarkan vendor baru'),
  ('vendor.edit',             'Edit Vendor',                'Vendor',     'Mengubah data vendor'),
  ('vendor.contracts',        'Kelola Kontrak Vendor',      'Vendor',     'Manajemen kontrak vendor'),

  -- == SAVINGS / TABUNGAN ==
  ('savings.view',            'Lihat Program Tabungan',     'Tabungan',   'Akses data tabungan umroh'),
  ('savings.manage',          'Kelola Program Tabungan',    'Tabungan',   'Manajemen program & transaksi tabungan'),

  -- == VISA ==
  ('visa.view',               'Lihat Status Visa',          'Visa',       'Akses data pengajuan visa'),
  ('visa.process',            'Proses Visa',                'Visa',       'Update status & dokumen visa'),

  -- == SOS ==
  ('sos.view',                'Lihat SOS Alert',            'SOS',        'Akses alert darurat jamaah'),
  ('sos.respond',             'Respons SOS',                'SOS',        'Menangani & menutup SOS alert'),

  -- == REPORTS ==
  ('reports.view',            'Lihat Laporan',              'Laporan',    'Akses semua laporan'),
  ('reports.export',          'Export Laporan',             'Laporan',    'Unduh laporan ke Excel/PDF'),
  ('reports.schedule',        'Jadwalkan Laporan',          'Laporan',    'Konfigurasi laporan otomatis terjadwal'),

  -- == SISKOHAT ==
  ('siskohat.view',           'Lihat Data SISKOHAT',        'SISKOHAT',   'Akses data dari SISKOHAT Kemenag'),
  ('siskohat.sync',           'Sinkronisasi SISKOHAT',      'SISKOHAT',   'Sync data haji dengan SISKOHAT'),

  -- == CHATBOT ==
  ('chatbot.view',            'Lihat Percakapan Chatbot',   'Chatbot',    'Akses riwayat percakapan chatbot'),
  ('chatbot.configure',       'Konfigurasi Chatbot',        'Chatbot',    'Atur keyword & respons otomatis'),
  ('chatbot.handover',        'Alih Tangan ke Agen',        'Chatbot',    'Ambil alih percakapan chatbot'),

  -- == SUPPORT ==
  ('support.view',            'Lihat Tiket Support',        'Support',    'Akses daftar tiket dukungan'),
  ('support.manage',          'Kelola Tiket Support',       'Support',    'Assign & selesaikan tiket'),
  ('support.reply',           'Balas Tiket',                'Support',    'Membalas pesan tiket'),

  -- == ASSETS ==
  ('assets.view',             'Lihat Aset Kantor',          'Aset',       'Akses inventaris aset kantor'),
  ('assets.manage',           'Kelola Aset Kantor',         'Aset',       'CRUD aset & log maintenance'),

  -- == ANALYTICS ==
  ('analytics.view',          'Lihat Analytics',            'Analytics',  'Akses dashboard analitik & statistik'),
  ('analytics.export',        'Export Analytics',           'Analytics',  'Unduh data analitik'),

  -- == BRANCHES ==
  ('branches.view',           'Lihat Cabang',               'Cabang',     'Akses data cabang'),
  ('branches.manage',         'Kelola Cabang',              'Cabang',     'Tambah & edit cabang')

ON CONFLICT (key) DO NOTHING;

-- ---------------------------------------------------------------------------
-- STEP 2: Role Permissions — owner role
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  INSERT INTO public.role_permissions (role, permission_key, can_view, can_create, can_edit, can_delete)
  SELECT 'owner', key, TRUE, TRUE, TRUE,
    CASE WHEN key IN ('system.manage_users','system.assign_roles','system.manage_permissions',
                      'system.feature_flags','system.dashboard_config') THEN FALSE ELSE TRUE END
  FROM public.permissions_list
  ON CONFLICT (role, permission_key) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'SKIP owner permissions: %', SQLERRM;
END;
$$;

-- ---------------------------------------------------------------------------
-- STEP 3: Role Permissions — it (IT Admin)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  INSERT INTO public.role_permissions (role, permission_key, can_view, can_create, can_edit, can_delete) VALUES
    ('it', 'dashboard',             TRUE, FALSE, FALSE, FALSE),
    ('it', 'analytics.view',        TRUE, FALSE, FALSE, FALSE),
    ('it', 'system.manage_users',   TRUE, TRUE,  TRUE,  TRUE),
    ('it', 'system.assign_roles',   TRUE, TRUE,  TRUE,  FALSE),
    ('it', 'system.manage_permissions', TRUE, TRUE, TRUE, FALSE),
    ('it', 'system.settings',       TRUE, TRUE,  TRUE,  FALSE),
    ('it', 'system.feature_flags',  TRUE, TRUE,  TRUE,  FALSE),
    ('it', 'system.audit_logs',     TRUE, FALSE, FALSE, FALSE),
    ('it', 'system.dashboard_config', TRUE, TRUE, TRUE, FALSE),
    ('it', 'system.invite_staff',   TRUE, TRUE,  FALSE, FALSE),
    ('it', 'system.export',         TRUE, FALSE, FALSE, FALSE),
    ('it', 'whatsapp.config',       TRUE, TRUE,  TRUE,  FALSE),
    ('it', 'cms.settings',          TRUE, TRUE,  TRUE,  FALSE),
    ('it', 'cms.knowledge_base',    TRUE, TRUE,  TRUE,  FALSE),
    ('it', 'chatbot.configure',     TRUE, TRUE,  TRUE,  FALSE),
    ('it', 'siskohat.view',         TRUE, FALSE, FALSE, FALSE),
    ('it', 'siskohat.sync',         TRUE, TRUE,  FALSE, FALSE),
    ('it', 'reports.view',          TRUE, FALSE, FALSE, FALSE),
    ('it', 'reports.export',        TRUE, FALSE, FALSE, FALSE),
    ('it', 'branches.view',         TRUE, FALSE, FALSE, FALSE)
  ON CONFLICT (role, permission_key) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'SKIP it permissions: %', SQLERRM;
END;
$$;

-- ---------------------------------------------------------------------------
-- STEP 4: Role Permissions — operational (Tim Operasional)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  INSERT INTO public.role_permissions (role, permission_key, can_view, can_create, can_edit, can_delete) VALUES
    ('operational', 'dashboard',             TRUE,  FALSE, FALSE, FALSE),
    ('operational', 'departures.view',       TRUE,  TRUE,  TRUE,  FALSE),
    ('operational', 'departures.create',     TRUE,  TRUE,  FALSE, FALSE),
    ('operational', 'departures.edit',       TRUE,  FALSE, TRUE,  FALSE),
    ('operational', 'departures.itinerary',  TRUE,  TRUE,  TRUE,  FALSE),
    ('operational', 'departures.checklist',  TRUE,  TRUE,  TRUE,  FALSE),
    ('operational', 'departures.manifest',   TRUE,  TRUE,  TRUE,  FALSE),
    ('operational', 'departures.hotels',     TRUE,  TRUE,  TRUE,  FALSE),
    ('operational', 'customers.view',        TRUE,  FALSE, FALSE, FALSE),
    ('operational', 'customers.upload_docs', TRUE,  TRUE,  FALSE, FALSE),
    ('operational', 'customers.verify_docs', TRUE,  FALSE, TRUE,  FALSE),
    ('operational', 'customers.view_location', TRUE, FALSE, FALSE, FALSE),
    ('operational', 'bookings.view',         TRUE,  FALSE, FALSE, FALSE),
    ('operational', 'bookings.history',      TRUE,  FALSE, FALSE, FALSE),
    ('operational', 'room-assignments',      TRUE,  TRUE,  TRUE,  FALSE),
    ('operational', 'manasik',               TRUE,  TRUE,  TRUE,  FALSE),
    ('operational', 'equipment.view',        TRUE,  FALSE, FALSE, FALSE),
    ('operational', 'equipment.distribute',  TRUE,  TRUE,  TRUE,  FALSE),
    ('operational', 'equipment.confirm',     TRUE,  FALSE, TRUE,  FALSE),
    ('operational', 'equipment.report',      TRUE,  FALSE, FALSE, FALSE),
    ('operational', 'bus.assign_departure',  TRUE,  TRUE,  TRUE,  FALSE),
    ('operational', 'bus.passengers',        TRUE,  TRUE,  TRUE,  FALSE),
    ('operational', 'bus.luggage',           TRUE,  TRUE,  TRUE,  FALSE),
    ('operational', 'visa.view',             TRUE,  FALSE, FALSE, FALSE),
    ('operational', 'visa.process',          TRUE,  FALSE, TRUE,  FALSE),
    ('operational', 'haji.monitor',          TRUE,  FALSE, FALSE, FALSE),
    ('operational', 'sos.view',              TRUE,  FALSE, FALSE, FALSE),
    ('operational', 'sos.respond',           TRUE,  FALSE, TRUE,  FALSE),
    ('operational', 'ibadah_progress',       TRUE,  TRUE,  TRUE,  FALSE),
    ('operational', 'finance.view_hpp',      TRUE,  FALSE, FALSE, FALSE),
    ('operational', 'finance.input_hpp',     TRUE,  TRUE,  TRUE,  FALSE),
    ('operational', 'finance.departure_summary', TRUE, FALSE, FALSE, FALSE),
    ('operational', 'reports.view',          TRUE,  FALSE, FALSE, FALSE),
    ('operational', 'siskohat.view',         TRUE,  FALSE, FALSE, FALSE)
  ON CONFLICT (role, permission_key) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'SKIP operational permissions: %', SQLERRM;
END;
$$;

-- ---------------------------------------------------------------------------
-- STEP 5: Role Permissions — sales
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  INSERT INTO public.role_permissions (role, permission_key, can_view, can_create, can_edit, can_delete) VALUES
    ('sales', 'dashboard',             TRUE,  FALSE, FALSE, FALSE),
    ('sales', 'analytics.view',        TRUE,  FALSE, FALSE, FALSE),
    ('sales', 'bookings.view',         TRUE,  TRUE,  FALSE, FALSE),
    ('sales', 'bookings.create',       TRUE,  TRUE,  FALSE, FALSE),
    ('sales', 'bookings.confirm',      TRUE,  FALSE, TRUE,  FALSE),
    ('sales', 'bookings.export',       TRUE,  FALSE, FALSE, FALSE),
    ('sales', 'bookings.history',      TRUE,  FALSE, FALSE, FALSE),
    ('sales', 'payments.view',         TRUE,  FALSE, FALSE, FALSE),
    ('sales', 'payments.input',        TRUE,  TRUE,  FALSE, FALSE),
    ('sales', 'customers.view',        TRUE,  TRUE,  TRUE,  FALSE),
    ('sales', 'customers.create',      TRUE,  TRUE,  FALSE, FALSE),
    ('sales', 'customers.edit',        TRUE,  FALSE, TRUE,  FALSE),
    ('sales', 'marketing.view_lead',   TRUE,  TRUE,  TRUE,  TRUE),
    ('sales', 'marketing.manage_lead', TRUE,  TRUE,  TRUE,  TRUE),
    ('sales', 'marketing.coupons',     TRUE,  FALSE, FALSE, FALSE),
    ('sales', 'packages.view_public',  TRUE,  FALSE, FALSE, FALSE),
    ('sales', 'departures.view',       TRUE,  FALSE, FALSE, FALSE),
    ('sales', 'agents.view',           TRUE,  TRUE,  TRUE,  FALSE),
    ('sales', 'agents.commission',     TRUE,  FALSE, FALSE, FALSE),
    ('sales', 'agents.report',         TRUE,  FALSE, FALSE, FALSE),
    ('sales', 'haji.register',         TRUE,  TRUE,  FALSE, FALSE),
    ('sales', 'haji.monitor',          TRUE,  FALSE, FALSE, FALSE),
    ('sales', 'haji.export',           FALSE, FALSE, FALSE, FALSE),
    ('sales', 'reports.view',          TRUE,  FALSE, FALSE, FALSE),
    ('sales', 'reports.export',        TRUE,  FALSE, FALSE, FALSE),
    ('sales', 'savings.view',          TRUE,  FALSE, FALSE, FALSE),
    ('sales', 'savings.manage',        TRUE,  TRUE,  TRUE,  FALSE)
  ON CONFLICT (role, permission_key) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'SKIP sales permissions: %', SQLERRM;
END;
$$;

-- ---------------------------------------------------------------------------
-- STEP 6: Role Permissions — equipment (Tim Perlengkapan)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  INSERT INTO public.role_permissions (role, permission_key, can_view, can_create, can_edit, can_delete) VALUES
    ('equipment', 'dashboard',                  TRUE,  FALSE, FALSE, FALSE),
    ('equipment', 'equipment.view',             TRUE,  FALSE, FALSE, FALSE),
    ('equipment', 'equipment.create',           TRUE,  TRUE,  FALSE, FALSE),
    ('equipment', 'equipment.edit',             TRUE,  FALSE, TRUE,  FALSE),
    ('equipment', 'equipment.distribute',       TRUE,  TRUE,  TRUE,  FALSE),
    ('equipment', 'equipment.bulk_distribute',  TRUE,  TRUE,  FALSE, FALSE),
    ('equipment', 'equipment.stock_opname',     TRUE,  TRUE,  TRUE,  FALSE),
    ('equipment', 'equipment.confirm',          TRUE,  FALSE, TRUE,  FALSE),
    ('equipment', 'equipment.report',           TRUE,  FALSE, FALSE, FALSE),
    ('equipment', 'customers.view',             TRUE,  FALSE, FALSE, FALSE),
    ('equipment', 'departures.view',            TRUE,  FALSE, FALSE, FALSE),
    ('equipment', 'payroll.view_own_slip',      TRUE,  FALSE, FALSE, FALSE),
    ('equipment', 'leave.submit',               TRUE,  TRUE,  FALSE, FALSE),
    ('equipment', 'attendance.view',            TRUE,  FALSE, FALSE, FALSE),
    ('equipment', 'attendance.manage',          FALSE, FALSE, FALSE, FALSE)
  ON CONFLICT (role, permission_key) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'SKIP equipment permissions: %', SQLERRM;
END;
$$;

-- ---------------------------------------------------------------------------
-- STEP 7: Role Permissions — sub_agent
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  INSERT INTO public.role_permissions (role, permission_key, can_view, can_create, can_edit, can_delete) VALUES
    ('sub_agent', 'dashboard',            TRUE,  FALSE, FALSE, FALSE),
    ('sub_agent', 'bookings.view',        TRUE,  TRUE,  FALSE, FALSE),
    ('sub_agent', 'bookings.create',      TRUE,  TRUE,  FALSE, FALSE),
    ('sub_agent', 'bookings.history',     TRUE,  FALSE, FALSE, FALSE),
    ('sub_agent', 'payments.view',        TRUE,  FALSE, FALSE, FALSE),
    ('sub_agent', 'payments.input',       TRUE,  TRUE,  FALSE, FALSE),
    ('sub_agent', 'customers.view',       TRUE,  TRUE,  TRUE,  FALSE),
    ('sub_agent', 'customers.create',     TRUE,  TRUE,  FALSE, FALSE),
    ('sub_agent', 'customers.edit',       TRUE,  FALSE, TRUE,  FALSE),
    ('sub_agent', 'customers.upload_docs',TRUE,  TRUE,  FALSE, FALSE),
    ('sub_agent', 'packages.view_public', TRUE,  FALSE, FALSE, FALSE),
    ('sub_agent', 'departures.view',      TRUE,  FALSE, FALSE, FALSE),
    ('sub_agent', 'agents.view',          TRUE,  FALSE, FALSE, FALSE),
    ('sub_agent', 'agents.commission',    TRUE,  FALSE, FALSE, FALSE),
    ('sub_agent', 'haji.register',        TRUE,  TRUE,  FALSE, FALSE),
    ('sub_agent', 'savings.view',         TRUE,  FALSE, FALSE, FALSE),
    ('sub_agent', 'savings.manage',       TRUE,  TRUE,  FALSE, FALSE)
  ON CONFLICT (role, permission_key) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'SKIP sub_agent permissions: %', SQLERRM;
END;
$$;

-- ---------------------------------------------------------------------------
-- STEP 8: Role Permissions — jamaah (Portal Jamaah)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  INSERT INTO public.role_permissions (role, permission_key, can_view, can_create, can_edit, can_delete) VALUES
    ('jamaah', 'customers.portal',       TRUE,  FALSE, FALSE, FALSE),
    ('jamaah', 'customers.edit',         FALSE, FALSE, TRUE,  FALSE),
    ('jamaah', 'customers.upload_docs',  TRUE,  TRUE,  FALSE, FALSE),
    ('jamaah', 'bookings.view',          TRUE,  FALSE, FALSE, FALSE),
    ('jamaah', 'bookings.history',       TRUE,  FALSE, FALSE, FALSE),
    ('jamaah', 'payments.view',          TRUE,  FALSE, FALSE, FALSE),
    ('jamaah', 'payments.input',         TRUE,  TRUE,  FALSE, FALSE),
    ('jamaah', 'departures.view',        TRUE,  FALSE, FALSE, FALSE),
    ('jamaah', 'equipment.confirm',      TRUE,  FALSE, TRUE,  FALSE),
    ('jamaah', 'haji.register',          TRUE,  TRUE,  FALSE, FALSE),
    ('jamaah', 'haji.monitor',           TRUE,  FALSE, FALSE, FALSE),
    ('jamaah', 'savings.view',           TRUE,  FALSE, FALSE, FALSE),
    ('jamaah', 'savings.manage',         TRUE,  TRUE,  FALSE, FALSE),
    ('jamaah', 'marketing.loyalty',      TRUE,  FALSE, FALSE, FALSE),
    ('jamaah', 'packages.view_public',   TRUE,  FALSE, FALSE, FALSE),
    ('jamaah', 'support.reply',          TRUE,  TRUE,  FALSE, FALSE),
    ('jamaah', 'support.view',           TRUE,  FALSE, FALSE, FALSE)
  ON CONFLICT (role, permission_key) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'SKIP jamaah permissions: %', SQLERRM;
END;
$$;

-- ---------------------------------------------------------------------------
-- STEP 9: Extend existing roles with new permission keys
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  new_key TEXT;
BEGIN
  -- super_admin & admin: auto-assign ALL permissions (including new ones)
  INSERT INTO public.role_permissions (role, permission_key, can_view, can_create, can_edit, can_delete)
  SELECT 'super_admin', key, TRUE, TRUE, TRUE, TRUE
  FROM public.permissions_list
  ON CONFLICT (role, permission_key) DO NOTHING;

  INSERT INTO public.role_permissions (role, permission_key, can_view, can_create, can_edit, can_delete)
  SELECT 'admin', key, TRUE, TRUE, TRUE,
    CASE WHEN key IN ('audit-logs','system.manage_users','system.assign_roles',
                      'system.manage_permissions') THEN FALSE ELSE TRUE END
  FROM public.permissions_list
  ON CONFLICT (role, permission_key) DO NOTHING;

  -- branch_manager: extend with new permissions
  INSERT INTO public.role_permissions (role, permission_key, can_view, can_create, can_edit, can_delete) VALUES
    ('branch_manager', 'employees.view',          TRUE,  TRUE,  TRUE,  FALSE),
    ('branch_manager', 'employees.edit',          TRUE,  FALSE, TRUE,  FALSE),
    ('branch_manager', 'attendance.view',         TRUE,  FALSE, FALSE, FALSE),
    ('branch_manager', 'attendance.manage',       TRUE,  FALSE, TRUE,  FALSE),
    ('branch_manager', 'leave.approve',           TRUE,  FALSE, TRUE,  FALSE),
    ('branch_manager', 'performance.review',      TRUE,  TRUE,  TRUE,  FALSE),
    ('branch_manager', 'equipment.view',          TRUE,  FALSE, FALSE, FALSE),
    ('branch_manager', 'equipment.report',        TRUE,  FALSE, FALSE, FALSE),
    ('branch_manager', 'bus.assign_departure',    TRUE,  FALSE, FALSE, FALSE),
    ('branch_manager', 'haji.monitor',            TRUE,  FALSE, FALSE, FALSE),
    ('branch_manager', 'haji.export',             TRUE,  FALSE, FALSE, FALSE),
    ('branch_manager', 'reports.view',            TRUE,  FALSE, FALSE, FALSE),
    ('branch_manager', 'reports.export',          TRUE,  FALSE, FALSE, FALSE),
    ('branch_manager', 'support.view',            TRUE,  FALSE, FALSE, FALSE),
    ('branch_manager', 'support.manage',          TRUE,  FALSE, TRUE,  FALSE),
    ('branch_manager', 'analytics.view',          TRUE,  FALSE, FALSE, FALSE),
    ('branch_manager', 'cms.knowledge_base',      TRUE,  FALSE, FALSE, FALSE),
    ('branch_manager', 'finance.view_report',     TRUE,  FALSE, FALSE, FALSE),
    ('branch_manager', 'finance.departure_summary',TRUE, FALSE, FALSE, FALSE)
  ON CONFLICT (role, permission_key) DO NOTHING;

  -- finance: extend with new permission keys
  INSERT INTO public.role_permissions (role, permission_key, can_view, can_create, can_edit, can_delete) VALUES
    ('finance', 'finance.view_report',      TRUE,  FALSE, FALSE, FALSE),
    ('finance', 'finance.journal',          TRUE,  TRUE,  TRUE,  FALSE),
    ('finance', 'finance.approve_journal',  TRUE,  FALSE, TRUE,  FALSE),
    ('finance', 'finance.view_hpp',         TRUE,  FALSE, FALSE, FALSE),
    ('finance', 'finance.input_hpp',        TRUE,  TRUE,  TRUE,  FALSE),
    ('finance', 'finance.approve_expense',  TRUE,  FALSE, TRUE,  FALSE),
    ('finance', 'finance.vendor_invoice',   TRUE,  TRUE,  TRUE,  FALSE),
    ('finance', 'finance.view_coa',         TRUE,  FALSE, FALSE, FALSE),
    ('finance', 'finance.manage_coa',       TRUE,  TRUE,  TRUE,  FALSE),
    ('finance', 'finance.export',           TRUE,  FALSE, FALSE, FALSE),
    ('finance', 'finance.departure_summary',TRUE,  FALSE, FALSE, FALSE),
    ('finance', 'finance.cashflow',         TRUE,  TRUE,  TRUE,  FALSE),
    ('finance', 'analytics.view',           TRUE,  FALSE, FALSE, FALSE),
    ('finance', 'reports.view',             TRUE,  TRUE,  FALSE, FALSE),
    ('finance', 'reports.export',           TRUE,  FALSE, FALSE, FALSE),
    ('finance', 'reports.schedule',         TRUE,  TRUE,  TRUE,  FALSE),
    ('finance', 'vendor.view',              TRUE,  FALSE, FALSE, FALSE),
    ('finance', 'vendor.contracts',         TRUE,  FALSE, FALSE, FALSE)
  ON CONFLICT (role, permission_key) DO NOTHING;

  -- marketing: extend with new permission keys
  INSERT INTO public.role_permissions (role, permission_key, can_view, can_create, can_edit, can_delete) VALUES
    ('marketing', 'marketing.view_lead',    TRUE,  TRUE,  TRUE,  TRUE),
    ('marketing', 'marketing.manage_lead',  TRUE,  TRUE,  TRUE,  TRUE),
    ('marketing', 'marketing.materials',    TRUE,  TRUE,  TRUE,  TRUE),
    ('marketing', 'marketing.landing_page', TRUE,  TRUE,  TRUE,  FALSE),
    ('marketing', 'marketing.campaign',     TRUE,  TRUE,  TRUE,  FALSE),
    ('marketing', 'marketing.coupons',      TRUE,  TRUE,  TRUE,  TRUE),
    ('marketing', 'marketing.loyalty',      TRUE,  TRUE,  TRUE,  FALSE),
    ('marketing', 'cms.settings',           TRUE,  FALSE, TRUE,  FALSE),
    ('marketing', 'cms.faqs',              TRUE,  TRUE,  TRUE,  TRUE),
    ('marketing', 'cms.testimonials',       TRUE,  TRUE,  TRUE,  TRUE),
    ('marketing', 'cms.banners',            TRUE,  TRUE,  TRUE,  TRUE),
    ('marketing', 'cms.gallery',            TRUE,  TRUE,  TRUE,  TRUE),
    ('marketing', 'cms.announcements',      TRUE,  TRUE,  TRUE,  TRUE),
    ('marketing', 'cms.about',              TRUE,  TRUE,  TRUE,  FALSE),
    ('marketing', 'cms.blog',              TRUE,  TRUE,  TRUE,  FALSE),
    ('marketing', 'cms.landing_pages',      TRUE,  TRUE,  TRUE,  FALSE),
    ('marketing', 'whatsapp.send',          TRUE,  TRUE,  FALSE, FALSE),
    ('marketing', 'whatsapp.templates',     TRUE,  TRUE,  TRUE,  FALSE),
    ('marketing', 'whatsapp.broadcast',     TRUE,  TRUE,  FALSE, FALSE),
    ('marketing', 'whatsapp.logs',          TRUE,  FALSE, FALSE, FALSE),
    ('marketing', 'analytics.view',         TRUE,  FALSE, FALSE, FALSE),
    ('marketing', 'reports.view',           TRUE,  FALSE, FALSE, FALSE)
  ON CONFLICT (role, permission_key) DO NOTHING;

  -- operator: extend with new permission keys
  INSERT INTO public.role_permissions (role, permission_key, can_view, can_create, can_edit, can_delete) VALUES
    ('operator', 'bookings.view',           TRUE,  TRUE,  TRUE,  FALSE),
    ('operator', 'bookings.create',         TRUE,  TRUE,  FALSE, FALSE),
    ('operator', 'bookings.edit',           TRUE,  FALSE, TRUE,  FALSE),
    ('operator', 'bookings.confirm',        TRUE,  FALSE, TRUE,  FALSE),
    ('operator', 'bookings.history',        TRUE,  FALSE, FALSE, FALSE),
    ('operator', 'bookings.export',         FALSE, FALSE, FALSE, FALSE),
    ('operator', 'payments.view',           TRUE,  TRUE,  TRUE,  FALSE),
    ('operator', 'payments.input',          TRUE,  TRUE,  FALSE, FALSE),
    ('operator', 'payments.verify',         TRUE,  FALSE, TRUE,  FALSE),
    ('operator', 'customers.view',          TRUE,  TRUE,  TRUE,  FALSE),
    ('operator', 'customers.create',        TRUE,  TRUE,  FALSE, FALSE),
    ('operator', 'customers.edit',          TRUE,  FALSE, TRUE,  FALSE),
    ('operator', 'customers.upload_docs',   TRUE,  TRUE,  FALSE, FALSE),
    ('operator', 'customers.verify_docs',   TRUE,  FALSE, TRUE,  FALSE),
    ('operator', 'haji.register',           TRUE,  TRUE,  TRUE,  FALSE),
    ('operator', 'haji.edit',               TRUE,  FALSE, TRUE,  FALSE),
    ('operator', 'bus.passengers',          TRUE,  TRUE,  TRUE,  FALSE),
    ('operator', 'bus.luggage',             TRUE,  TRUE,  TRUE,  FALSE),
    ('operator', 'support.view',            TRUE,  FALSE, FALSE, FALSE),
    ('operator', 'support.reply',           TRUE,  TRUE,  FALSE, FALSE),
    ('operator', 'whatsapp.send',           TRUE,  TRUE,  FALSE, FALSE),
    ('operator', 'visa.view',               TRUE,  FALSE, FALSE, FALSE),
    ('operator', 'visa.process',            TRUE,  FALSE, TRUE,  FALSE),
    ('operator', 'savings.view',            TRUE,  FALSE, FALSE, FALSE),
    ('operator', 'savings.manage',          TRUE,  TRUE,  TRUE,  FALSE)
  ON CONFLICT (role, permission_key) DO NOTHING;

  -- agent: extend with new permission keys
  INSERT INTO public.role_permissions (role, permission_key, can_view, can_create, can_edit, can_delete) VALUES
    ('agent', 'bookings.view',              TRUE,  TRUE,  FALSE, FALSE),
    ('agent', 'bookings.create',            TRUE,  TRUE,  FALSE, FALSE),
    ('agent', 'bookings.history',           TRUE,  FALSE, FALSE, FALSE),
    ('agent', 'bookings.export',            TRUE,  FALSE, FALSE, FALSE),
    ('agent', 'payments.view',              TRUE,  FALSE, FALSE, FALSE),
    ('agent', 'payments.input',             TRUE,  TRUE,  FALSE, FALSE),
    ('agent', 'customers.view',             TRUE,  TRUE,  FALSE, FALSE),
    ('agent', 'customers.create',           TRUE,  TRUE,  FALSE, FALSE),
    ('agent', 'customers.edit',             TRUE,  FALSE, TRUE,  FALSE),
    ('agent', 'customers.upload_docs',      TRUE,  TRUE,  FALSE, FALSE),
    ('agent', 'packages.view_public',       TRUE,  FALSE, FALSE, FALSE),
    ('agent', 'departures.view',            TRUE,  FALSE, FALSE, FALSE),
    ('agent', 'agents.view',                TRUE,  FALSE, FALSE, FALSE),
    ('agent', 'agents.commission',          TRUE,  FALSE, FALSE, FALSE),
    ('agent', 'agents.wallet',              TRUE,  FALSE, FALSE, FALSE),
    ('agent', 'haji.register',              TRUE,  TRUE,  FALSE, FALSE),
    ('agent', 'haji.monitor',               TRUE,  FALSE, FALSE, FALSE),
    ('agent', 'savings.view',               TRUE,  FALSE, FALSE, FALSE),
    ('agent', 'savings.manage',             TRUE,  TRUE,  FALSE, FALSE),
    ('agent', 'marketing.materials',        TRUE,  FALSE, FALSE, FALSE),
    ('agent', 'cms.knowledge_base',         TRUE,  FALSE, FALSE, FALSE),
    ('agent', 'support.view',               TRUE,  FALSE, FALSE, FALSE),
    ('agent', 'support.reply',              TRUE,  TRUE,  FALSE, FALSE)
  ON CONFLICT (role, permission_key) DO NOTHING;

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'SKIP extended role permissions: %', SQLERRM;
END;
$$;

-- ---------------------------------------------------------------------------
-- STEP 10: Default branches seed
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='branches'
  ) THEN
    INSERT INTO public.branches (name, code, slug, city, is_active) VALUES
      ('Kantor Pusat', 'HQ', 'kantor-pusat', 'Jakarta', TRUE),
      ('Cabang Surabaya', 'SBY', 'cabang-surabaya', 'Surabaya', TRUE),
      ('Cabang Bandung',  'BDG', 'cabang-bandung',  'Bandung',  TRUE),
      ('Cabang Medan',    'MDN', 'cabang-medan',    'Medan',    TRUE)
    ON CONFLICT (code) DO NOTHING;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'SKIP branches seed: %', SQLERRM;
END;
$$;

-- ---------------------------------------------------------------------------
-- STEP 11: Default notification templates seed
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='notification_templates'
  ) THEN
    INSERT INTO public.notification_templates (code, name, channel, title, body, variables, trigger_event, is_active)
    VALUES
      ('BOOKING_CREATED',    'Booking Baru Dibuat',     'in_app', 'Booking Baru', 'Booking {{booking_code}} untuk {{customer_name}} berhasil dibuat.', ARRAY['booking_code','customer_name'], 'booking.created', TRUE),
      ('BOOKING_CONFIRMED',  'Booking Dikonfirmasi',    'in_app', 'Booking Dikonfirmasi', 'Booking {{booking_code}} Anda telah dikonfirmasi.', ARRAY['booking_code'], 'booking.confirmed', TRUE),
      ('PAYMENT_RECEIVED',   'Pembayaran Diterima',     'in_app', 'Pembayaran Diterima', 'Pembayaran sebesar {{amount}} untuk booking {{booking_code}} diterima.', ARRAY['amount','booking_code'], 'payment.received', TRUE),
      ('PAYMENT_VERIFIED',   'Pembayaran Diverifikasi', 'push',   'Pembayaran Verified', 'Pembayaran {{amount}} Anda telah diverifikasi. Terima kasih!', ARRAY['amount'], 'payment.verified', TRUE),
      ('DEPARTURE_REMINDER', 'Reminder Keberangkatan',  'push',   'Keberangkatan Mendekat', 'Keberangkatan Anda {{departure_date}} sudah {{days_remaining}} hari lagi.', ARRAY['departure_date','days_remaining'], 'departure.reminder', TRUE),
      ('VISA_APPROVED',      'Visa Disetujui',          'in_app', 'Visa Approved', 'Visa umroh Anda telah disetujui! Mohon cek detail di aplikasi.', ARRAY[], 'visa.approved', TRUE),
      ('SOS_ALERT',          'SOS Alert Jamaah',        'push',   '🆘 SOS Alert', 'Jamaah {{customer_name}} mengirimkan SOS dari {{location}}.', ARRAY['customer_name','location'], 'sos.created', TRUE),
      ('EQUIPMENT_READY',    'Perlengkapan Siap',       'push',   'Perlengkapan Siap', 'Perlengkapan Anda sudah siap untuk diambil di {{location}}.', ARRAY['location'], 'equipment.ready', TRUE)
    ON CONFLICT (code) DO NOTHING;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'SKIP notification_templates seed: %', SQLERRM;
END;
$$;

SELECT '038_seed_permissions_complete: OK — ' ||
  (SELECT COUNT(*) FROM public.permissions_list)::TEXT || ' total permission keys seeded'
  AS result;
