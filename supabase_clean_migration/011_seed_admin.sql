-- =============================================================================
-- VINSTOUR TRAVEL PORTAL — Clean Migration Chain
-- FILE 011: Seed Data — Permissions, Master Data & Default Config
-- Run LAST (after 010). All INSERT … ON CONFLICT DO NOTHING — idempotent.
-- Schema source: 002_tables_core, 003_tables_users, 004_tables_travel,
--                005_tables_finance (run these first).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. PERMISSIONS_LIST — Daftar izin sistem
-- ---------------------------------------------------------------------------
INSERT INTO public.permissions_list (key, label, group_name, description) VALUES
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
ON CONFLICT (key) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. ROLE_PERMISSIONS — Default permissions for each role
-- Schema (002_tables_core): role, permission_key, can_view, can_create,
--   can_edit, can_delete. UNIQUE (role, permission_key).
-- Wrapped in DO block as safety net in case schema varies.
-- ---------------------------------------------------------------------------
DO $$
BEGIN

  -- super_admin gets ALL permissions
  INSERT INTO public.role_permissions (role, permission_key, can_view, can_create, can_edit, can_delete)
  SELECT 'super_admin', key, TRUE, TRUE, TRUE, TRUE
  FROM public.permissions_list
  ON CONFLICT (role, permission_key) DO NOTHING;

  -- admin gets everything except audit-logs delete and super-admin areas
  INSERT INTO public.role_permissions (role, permission_key, can_view, can_create, can_edit, can_delete)
  SELECT 'admin', key, TRUE, TRUE, TRUE,
    CASE WHEN key IN ('audit-logs','users') THEN FALSE ELSE TRUE END
  FROM public.permissions_list
  ON CONFLICT (role, permission_key) DO NOTHING;

  -- finance role
  INSERT INTO public.role_permissions (role, permission_key, can_view, can_create, can_edit, can_delete) VALUES
    ('finance', 'dashboard',   TRUE, FALSE, FALSE, FALSE),
    ('finance', 'analytics',   TRUE, FALSE, FALSE, FALSE),
    ('finance', 'bookings',    TRUE, FALSE, TRUE,  FALSE),
    ('finance', 'payments',    TRUE, TRUE,  TRUE,  FALSE),
    ('finance', 'finance',     TRUE, TRUE,  TRUE,  FALSE),
    ('finance', 'savings',     TRUE, FALSE, TRUE,  FALSE),
    ('finance', 'reports',     TRUE, TRUE,  FALSE, FALSE),
    ('finance', 'customers',   TRUE, FALSE, FALSE, FALSE),
    ('finance', 'departures',  TRUE, FALSE, FALSE, FALSE),
    ('finance', 'payroll',     TRUE, TRUE,  TRUE,  FALSE),
    ('finance', 'vendors',     TRUE, TRUE,  TRUE,  FALSE)
  ON CONFLICT (role, permission_key) DO NOTHING;

  -- marketing role
  INSERT INTO public.role_permissions (role, permission_key, can_view, can_create, can_edit, can_delete) VALUES
    ('marketing', 'dashboard',      TRUE, FALSE, FALSE, FALSE),
    ('marketing', 'analytics',      TRUE, FALSE, FALSE, FALSE),
    ('marketing', 'leads',          TRUE, TRUE,  TRUE,  TRUE),
    ('marketing', 'packages',       TRUE, TRUE,  TRUE,  FALSE),
    ('marketing', 'coupons',        TRUE, TRUE,  TRUE,  TRUE),
    ('marketing', 'announcements',  TRUE, TRUE,  TRUE,  TRUE),
    ('marketing', 'banners',        TRUE, TRUE,  TRUE,  TRUE),
    ('marketing', 'whatsapp',       TRUE, TRUE,  FALSE, FALSE),
    ('marketing', 'wa-broadcast',   TRUE, TRUE,  FALSE, FALSE),
    ('marketing', 'customers',      TRUE, FALSE, FALSE, FALSE),
    ('marketing', 'departures',     TRUE, FALSE, FALSE, FALSE)
  ON CONFLICT (role, permission_key) DO NOTHING;

  -- operator role
  INSERT INTO public.role_permissions (role, permission_key, can_view, can_create, can_edit, can_delete) VALUES
    ('operator', 'dashboard',        TRUE, FALSE, FALSE, FALSE),
    ('operator', 'bookings',         TRUE, TRUE,  TRUE,  FALSE),
    ('operator', 'payments',         TRUE, TRUE,  TRUE,  FALSE),
    ('operator', 'customers',        TRUE, TRUE,  TRUE,  FALSE),
    ('operator', 'departures',       TRUE, FALSE, TRUE,  FALSE),
    ('operator', 'room-assignments', TRUE, TRUE,  TRUE,  FALSE),
    ('operator', 'manasik',          TRUE, TRUE,  TRUE,  FALSE),
    ('operator', 'equipment',        TRUE, TRUE,  TRUE,  FALSE),
    ('operator', 'visa',             TRUE, TRUE,  TRUE,  FALSE),
    ('operator', 'sos',              TRUE, FALSE, TRUE,  FALSE),
    ('operator', 'whatsapp',         TRUE, TRUE,  FALSE, FALSE),
    ('operator', 'packages',         TRUE, FALSE, FALSE, FALSE),
    ('operator', 'vendors',          TRUE, FALSE, FALSE, FALSE)
  ON CONFLICT (role, permission_key) DO NOTHING;

  -- branch_manager role
  INSERT INTO public.role_permissions (role, permission_key, can_view, can_create, can_edit, can_delete) VALUES
    ('branch_manager', 'dashboard',        TRUE, FALSE, FALSE, FALSE),
    ('branch_manager', 'analytics',        TRUE, FALSE, FALSE, FALSE),
    ('branch_manager', 'leads',            TRUE, TRUE,  TRUE,  TRUE),
    ('branch_manager', 'bookings',         TRUE, TRUE,  TRUE,  FALSE),
    ('branch_manager', 'payments',         TRUE, TRUE,  TRUE,  FALSE),
    ('branch_manager', 'customers',        TRUE, TRUE,  TRUE,  FALSE),
    ('branch_manager', 'departures',       TRUE, TRUE,  TRUE,  FALSE),
    ('branch_manager', 'packages',         TRUE, FALSE, FALSE, FALSE),
    ('branch_manager', 'agents',           TRUE, TRUE,  TRUE,  FALSE),
    ('branch_manager', 'employees',        TRUE, TRUE,  TRUE,  FALSE),
    ('branch_manager', 'payroll',          TRUE, TRUE,  TRUE,  FALSE),
    ('branch_manager', 'finance',          TRUE, FALSE, FALSE, FALSE),
    ('branch_manager', 'reports',          TRUE, FALSE, FALSE, FALSE),
    ('branch_manager', 'manasik',          TRUE, TRUE,  TRUE,  FALSE),
    ('branch_manager', 'equipment',        TRUE, TRUE,  TRUE,  FALSE),
    ('branch_manager', 'visa',             TRUE, TRUE,  TRUE,  FALSE),
    ('branch_manager', 'sos',              TRUE, FALSE, TRUE,  FALSE),
    ('branch_manager', 'whatsapp',         TRUE, TRUE,  FALSE, FALSE),
    ('branch_manager', 'settings',         TRUE, TRUE,  TRUE,  FALSE)
  ON CONFLICT (role, permission_key) DO NOTHING;

  -- agent role
  INSERT INTO public.role_permissions (role, permission_key, can_view, can_create, can_edit, can_delete) VALUES
    ('agent', 'dashboard',   TRUE, FALSE, FALSE, FALSE),
    ('agent', 'bookings',    TRUE, TRUE,  FALSE, FALSE),
    ('agent', 'customers',   TRUE, TRUE,  FALSE, FALSE),
    ('agent', 'packages',    TRUE, FALSE, FALSE, FALSE),
    ('agent', 'departures',  TRUE, FALSE, FALSE, FALSE),
    ('agent', 'leads',       TRUE, TRUE,  TRUE,  FALSE)
  ON CONFLICT (role, permission_key) DO NOTHING;

  -- customer role (portal access only)
  INSERT INTO public.role_permissions (role, permission_key, can_view, can_create, can_edit, can_delete) VALUES
    ('customer', 'bookings',  TRUE, FALSE, FALSE, FALSE),
    ('customer', 'payments',  TRUE, TRUE,  FALSE, FALSE),
    ('customer', 'savings',   TRUE, TRUE,  FALSE, FALSE)
  ON CONFLICT (role, permission_key) DO NOTHING;

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'SKIP role_permissions seed: % — periksa skema tabel role_permissions.', SQLERRM;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. NOTIFICATION_TEMPLATES — Default templates
-- ---------------------------------------------------------------------------
INSERT INTO public.notification_templates
  (code, name, channel, title, body, variables, trigger_event)
VALUES
  ('booking_confirmed',   'Booking Dikonfirmasi',    'push',   'Booking Dikonfirmasi ✅',
   'Booking {{booking_code}} Anda telah dikonfirmasi.',
   ARRAY['booking_code'], 'booking.confirmed'),
  ('payment_received',    'Pembayaran Diterima',     'push',   'Pembayaran Diterima 💰',
   'Kami telah menerima pembayaran Anda sebesar Rp {{amount}}.',
   ARRAY['amount'], 'payment.received'),
  ('visa_status_changed', 'Status Visa Berubah',     'push',   'Update Status Visa 🛂',
   'Status visa Anda berubah menjadi: {{status}}.',
   ARRAY['status'], 'visa.status_changed'),
  ('sos_received',        'SOS Diterima',            'in_app', 'SOS ALERT 🆘',
   'Alert darurat dari jamaah {{customer_name}}: {{message}}',
   ARRAY['customer_name','message'], 'sos.received'),
  ('departure_reminder',  'Pengingat Keberangkatan', 'push',   'Pengingat Keberangkatan ✈️',
   'Keberangkatan Anda {{days}} hari lagi. Pastikan dokumen sudah lengkap.',
   ARRAY['days'], 'departure.reminder'),
  ('approval_needed',     'Persetujuan Dibutuhkan',  'in_app', 'Menunggu Persetujuan Anda',
   'Ada {{type}} senilai Rp {{amount}} yang membutuhkan persetujuan Anda.',
   ARRAY['type','amount'], 'approval.created'),
  ('manasik_reminder',    'Pengingat Manasik',       'push',   'Jadwal Manasik Besok 📿',
   'Jangan lupa manasik besok: {{title}} pukul {{time}} di {{location}}.',
   ARRAY['title','time','location'], 'manasik.reminder'),
  ('payment_reminder',    'Reminder Pembayaran',     'whatsapp','Pengingat Pembayaran 🔔',
   'Halo {{full_name}}, sisa pembayaran booking {{booking_code}} sebesar Rp {{remaining}} jatuh tempo {{deadline}}.',
   ARRAY['full_name','booking_code','remaining','deadline'], 'payment.deadline_reminder'),
  ('savings_due',         'Setoran Tabungan Jatuh Tempo', 'push', 'Setoran Tabungan 💳',
   'Setoran tabungan Anda sebesar Rp {{amount}} jatuh tempo hari ini.',
   ARRAY['amount'], 'savings.due')
ON CONFLICT (code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 4. APPROVAL_CONFIGS — Alur persetujuan default
-- ---------------------------------------------------------------------------
INSERT INTO public.approval_configs
  (type, level, required_role, amount_threshold, percentage_threshold, auto_approve_below)
VALUES
  ('refund',         1, 'branch_manager', 5000000,  NULL,  500000),
  ('refund',         2, 'admin',          50000000, NULL, 5000000),
  ('refund',         3, 'super_admin',    NULL,     NULL,     NULL),
  ('discount',       1, 'branch_manager', NULL,     10.0,     NULL),
  ('discount',       2, 'admin',          NULL,     30.0,     NULL),
  ('cancellation',   1, 'branch_manager', NULL,     NULL,     NULL),
  ('cancellation',   2, 'admin',          NULL,     NULL,     NULL),
  ('vendor_invoice', 1, 'finance',        10000000, NULL, 1000000),
  ('vendor_invoice', 2, 'super_admin',    NULL,     NULL, 10000000)
ON CONFLICT (type, level, required_role) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 5. BAGGAGE_REFERENCE_ITEMS — Bawaan standar jamaah
-- ---------------------------------------------------------------------------
INSERT INTO public.baggage_reference_items
  (name, category, estimated_weight_kg, is_mandatory)
VALUES
  ('Koper besar (kosong)',       'koper',      3.50, TRUE),
  ('Koper kabin (kosong)',       'koper',      2.00, FALSE),
  ('Tas ransel',                 'tas',        0.80, FALSE),
  ('Baju ihram pria (2 lembar)', 'pakaian',    0.80, TRUE),
  ('Mukena',                     'pakaian',    0.40, FALSE),
  ('Sandal',                     'alas_kaki',  0.40, TRUE),
  ('Al-Quran',                   'ibadah',     0.50, FALSE),
  ('Sajadah travel',             'ibadah',     0.30, FALSE),
  ('Masker (kotak)',             'kesehatan',  0.20, TRUE),
  ('Obat-obatan pribadi',        'kesehatan',  0.50, FALSE),
  ('Charger & kabel',            'elektronik', 0.30, FALSE),
  ('Power bank',                 'elektronik', 0.25, FALSE)
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- 6. COMPANY_SETTINGS — Konfigurasi global perusahaan
-- Auto-detects schema: new migration has is_public, older databases do not.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='company_settings' AND column_name='is_public'
  ) THEN
    INSERT INTO public.company_settings
      (setting_key, setting_value, setting_type, description, is_public)
    VALUES
      ('company_name',         '"Vinstour Travel"',                                               'string', 'Nama resmi perusahaan',               TRUE),
      ('company_tagline',      '"Perjalanan Suci Anda"',                                          'string', 'Tagline perusahaan',                   TRUE),
      ('company_phone',        '"021-1234567"',                                                   'string', 'Nomor telepon utama',                  TRUE),
      ('company_email',        '"info@vinstour.com"',                                             'string', 'Email utama perusahaan',               TRUE),
      ('company_address',      '"Jakarta, Indonesia"',                                            'string', 'Alamat kantor pusat',                  TRUE),
      ('company_logo_url',     'null',                                                            'url',    'URL logo perusahaan',                  TRUE),
      ('company_wa_number',    '"628111234567"',                                                  'string', 'Nomor WhatsApp utama (format 62xxx)',   TRUE),
      ('kpi_targets_monthly',  '{"bookings":150,"revenue":3500000000,"leads":500,"conversion":30}','json',  'Target KPI bulanan',                  FALSE),
      ('fonnte_api_key',       'null',                                                            'string', 'API key Fonnte untuk kirim WhatsApp',  FALSE),
      ('max_booking_dp_pct',   '30',                                                              'number', 'Persentase minimal DP booking (%)',    FALSE),
      ('booking_expiry_hours', '24',                                                              'number', 'Jam sebelum booking pending kadaluarsa',FALSE),
      ('currency_default',     '"IDR"',                                                           'string', 'Mata uang default sistem',             TRUE),
      ('timezone',             '"Asia/Jakarta"',                                                  'string', 'Timezone sistem',                      FALSE),
      ('usd_exchange_rate',    '16000',                                                           'number', 'Kurs USD ke IDR (update manual)',      FALSE)
    ON CONFLICT (setting_key) DO NOTHING;
  ELSE
    INSERT INTO public.company_settings
      (setting_key, setting_value, setting_type, description)
    VALUES
      ('company_name',         '"Vinstour Travel"',                                               'string', 'Nama resmi perusahaan'),
      ('company_tagline',      '"Perjalanan Suci Anda"',                                          'string', 'Tagline perusahaan'),
      ('company_phone',        '"021-1234567"',                                                   'string', 'Nomor telepon utama'),
      ('company_email',        '"info@vinstour.com"',                                             'string', 'Email utama perusahaan'),
      ('company_address',      '"Jakarta, Indonesia"',                                            'string', 'Alamat kantor pusat'),
      ('company_logo_url',     'null',                                                            'string', 'URL logo perusahaan'),
      ('company_wa_number',    '"628111234567"',                                                  'string', 'Nomor WhatsApp utama (format 62xxx)'),
      ('kpi_targets_monthly',  '{"bookings":150,"revenue":3500000000,"leads":500,"conversion":30}','json',  'Target KPI bulanan'),
      ('fonnte_api_key',       'null',                                                            'string', 'API key Fonnte untuk kirim WhatsApp'),
      ('max_booking_dp_pct',   '30',                                                              'number', 'Persentase minimal DP booking (%)'),
      ('booking_expiry_hours', '24',                                                              'number', 'Jam sebelum booking pending kadaluarsa'),
      ('currency_default',     '"IDR"',                                                           'string', 'Mata uang default sistem'),
      ('timezone',             '"Asia/Jakarta"',                                                  'string', 'Timezone sistem'),
      ('usd_exchange_rate',    '16000',                                                           'number', 'Kurs USD ke IDR (update manual)')
    ON CONFLICT (setting_key) DO NOTHING;
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 7. BANK_ACCOUNTS — Rekening bank default (ganti dengan data nyata)
-- ---------------------------------------------------------------------------
INSERT INTO public.bank_accounts
  (bank_name, account_number, account_name, branch_name, is_primary, is_active)
VALUES
  ('Bank BCA',     '1234567890', 'PT Vinstour Wisata Utama', 'KCP Jakarta Pusat',  TRUE,  TRUE),
  ('Bank Mandiri', '0987654321', 'PT Vinstour Wisata Utama', 'KC Jakarta Selatan', FALSE, TRUE)
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- 8. WEBSITE_SETTINGS — Global default (fixed UUID for frontend stability)
-- Schema (003_tables_users): includes template, secondary_color, tagline,
--   meta_title, meta_description, hero_*, package_card_*, is_published, etc.
-- Uses DO block: only inserts when no global record exists yet
--   (partial unique index idx_website_settings_global prevents duplicates
--   where agent_id IS NULL AND branch_id IS NULL).
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.website_settings
    WHERE agent_id IS NULL AND branch_id IS NULL
  ) THEN
    INSERT INTO public.website_settings (
      id,
      company_name, active_theme, template,
      primary_color, secondary_color, accent_color, background_color, foreground_color,
      heading_font, body_font,
      tagline, footer_description, footer_bottom_text,
      meta_title, meta_description,
      hero_title, hero_subtitle, hero_cta_text, hero_cta_link, hero_display_mode,
      featured_packages_count, package_card_layout, package_card_image_ratio,
      package_card_show_airline, package_card_show_hotel,
      package_card_show_duration, package_card_show_departure,
      is_published
    ) VALUES (
      '00000000-0000-0000-0000-000000000001',
      'Vinstour Travel', 'classic', 'classic',
      '160 84% 25%', '160 20% 96%', '45 93% 47%', '0 0% 100%', '160 50% 5%',
      'Plus Jakarta Sans', 'Inter',
      'Perjalanan Suci Anda',
      'Layanan perjalanan Umroh & Haji terpercaya dengan pengalaman lebih dari 15 tahun.',
      '© 2025 Vinstour Travel. All rights reserved.',
      'Vinstour Travel - Perjalanan Umroh Terpercaya',
      'Layanan perjalanan umroh berkualitas dengan harga terjangkau',
      'Perjalanan Umroh Impian Anda',
      'Nikmati pengalaman spiritual yang tak terlupakan bersama kami',
      'Pesan Sekarang', '/packages', 'both',
      6, 'modern', '16/10',
      TRUE, TRUE, TRUE, TRUE,
      TRUE
    );
    RAISE NOTICE 'website_settings: global default inserted OK';
  ELSE
    RAISE NOTICE 'website_settings: global record already exists — skipped (idempotent).';
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 9. CONTACT_PAGE_CONTENT — Default konten halaman kontak
-- Schema (003_tables_users): hero_title, hero_subtitle, form_title,
--   operating_hours (no settings_id, no map_url in this version).
-- ---------------------------------------------------------------------------
INSERT INTO public.contact_page_content
  (hero_title, hero_subtitle, form_title, operating_hours)
VALUES (
  'Hubungi Kami',
  'Tim kami siap membantu Anda merencanakan perjalanan ibadah terbaik.',
  'Kirim Pesan',
  '{"senin_jumat":"08.00 - 17.00 WIB","sabtu":"08.00 - 13.00 WIB","minggu":"Tutup"}'::jsonb
)
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- 10. MEMBERSHIP_PLANS — Default plans
-- ---------------------------------------------------------------------------
INSERT INTO public.membership_plans
  (name, plan_type, price_yearly, max_sub_agents, commission_rate, description, features, sort_order)
VALUES
  ('Silver',   'agent',  500000,   5,    2, 'Paket dasar untuk agen baru',
   '["Dashboard portal agen","Website agen dasar","Maksimal 5 sub agen","Komisi 2%"]'::jsonb,        1),
  ('Gold',     'agent',  1500000,  20,   3, 'Paket menengah dengan fitur lengkap',
   '["Dashboard portal agen","Website agen lengkap","Laporan komisi","Maksimal 20 sub agen","Komisi 3%"]'::jsonb, 2),
  ('Platinum', 'agent',  3000000,  NULL, 4, 'Paket premium tanpa batas sub agen',
   '["Semua fitur Gold","Sub agen tidak terbatas","Priority support","Komisi 4%"]'::jsonb,           3),
  ('Reguler',  'branch', 5000000,  50,   1, 'Paket cabang standar',
   '["Dashboard cabang","Website cabang","Maksimal 50 agen","Komisi cabang 1%"]'::jsonb,             1),
  ('Premium',  'branch', 12000000, NULL, 2, 'Paket cabang premium',
   '["Semua fitur Reguler","Agen tidak terbatas","CRM & laporan lanjutan","Komisi cabang 2%"]'::jsonb, 2)
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- 11. CHART_OF_ACCOUNTS — COA default
-- Guarded: table only exists in full migration chain (005_tables_finance).
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='chart_of_accounts'
  ) THEN
    INSERT INTO public.chart_of_accounts (code, name, type, description, sort_order) VALUES
      ('1000', 'Aset',                   'asset',     'Total aset perusahaan',            1),
      ('1100', 'Kas & Bank',             'asset',     'Uang tunai dan saldo rekening',    2),
      ('1200', 'Piutang Usaha',          'asset',     'Tagihan kepada pelanggan',         3),
      ('2000', 'Kewajiban',              'liability', 'Total kewajiban perusahaan',       10),
      ('2100', 'Utang Usaha',            'liability', 'Hutang kepada vendor',             11),
      ('2200', 'Utang Pajak',            'liability', 'Kewajiban pajak',                  12),
      ('3000', 'Ekuitas',                'equity',    'Modal pemilik',                    20),
      ('4000', 'Pendapatan',             'revenue',   'Total pendapatan',                 30),
      ('4100', 'Pendapatan Paket Umroh', 'revenue',   'Penjualan paket umroh',            31),
      ('4200', 'Pendapatan Paket Haji',  'revenue',   'Penjualan paket haji',             32),
      ('4300', 'Pendapatan Toko',        'revenue',   'Penjualan produk toko',            33),
      ('4400', 'Pendapatan Lain-lain',   'revenue',   'Pendapatan di luar operasi utama', 34),
      ('5000', 'Harga Pokok Penjualan',  'cogs',      'Biaya langsung paket wisata',      40),
      ('5100', 'HPP Tiket Pesawat',      'cogs',      'Biaya tiket pesawat',              41),
      ('5200', 'HPP Hotel',              'cogs',      'Biaya hotel Mekkah & Madinah',     42),
      ('5300', 'HPP Visa',               'cogs',      'Biaya pengurusan visa',            43),
      ('5400', 'HPP Handling & Ground',  'cogs',      'Biaya handling & ground handling', 44),
      ('6000', 'Biaya Operasional',      'expense',   'Total biaya operasional',          50),
      ('6100', 'Biaya Gaji',             'expense',   'Gaji & tunjangan karyawan',        51),
      ('6200', 'Biaya Marketing',        'expense',   'Iklan & promosi',                  52),
      ('6300', 'Biaya Kantor',           'expense',   'Sewa, utilitas, supplies',         53),
      ('6400', 'Biaya Komisi Agen',      'expense',   'Komisi mitra agen',                54)
    ON CONFLICT (code) DO NOTHING;
  ELSE
    RAISE NOTICE 'SKIP chart_of_accounts: tabel tidak ada di database ini.';
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 12. WA_FEATURE_ROADMAP — Roadmap pengembangan fitur WA
-- Guarded: table only exists in full migration chain (005_tables_finance).
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='wa_feature_roadmap'
  ) THEN
    INSERT INTO public.wa_feature_roadmap
      (phase, code, title, description, status, sort_order)
    VALUES
      (1, 'WA_BASIC_SEND',        'Kirim WA via Fonnte',              'Kirim pesan single & bulk via Fonnte',                'done',        10),
      (1, 'WA_TEMPLATES_ENGINE',  'Template Pesan Dinamis',           'Variabel {nama}, {kode}, {tanggal} di template',      'done',        20),
      (1, 'WA_SEND_LOGS',         'Log Pengiriman WA',                'Riwayat setiap pesan terkirim / gagal',               'done',        30),
      (1, 'WA_BLAST_DEPARTURE',   'Broadcast per Keberangkatan',      'Kirim massal ke semua jamaah satu keberangkatan',     'done',        40),
      (1, 'WA_AUTO_BOOKING',      'Notif Otomatis Booking Baru',      'Auto-kirim WA saat booking/DP/lunas dikonfirmasi',    'done',        60),
      (2, 'WA_MULTIPROVIDER',     'Multi-Provider WA',                'Support Fonnte, Wablas, Waboxapp, dll',               'in_progress', 70),
      (2, 'WA_AUTO_REMINDER',     'Auto-Jadwal Reminder Pembayaran',  'Buat baris reminder H-7/H-3 otomatis',               'in_progress', 90),
      (3, 'WA_BROADCAST_SEGMENT', 'Broadcast Tersegmentasi',          'Filter penerima: by paket, keberangkatan, status',   'planned',     100),
      (4, 'WA_CHATBOT_KEYWORD',   'Auto-Reply Berbasis Kata Kunci',   'Balas otomatis jika jamaah kirim kata kunci tertentu','planned',     130),
      (5, 'WA_META_CLOUD',        'WhatsApp Cloud API (Meta)',        'Integrasi resmi Meta Business API',                   'planned',     160)
    ON CONFLICT (code) DO NOTHING;
  ELSE
    RAISE NOTICE 'SKIP wa_feature_roadmap: tabel tidak ada di database ini.';
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 13. FAQS — FAQ default
-- Guarded: table only exists in full migration chain (003_tables_users).
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='faqs'
  ) THEN
    INSERT INTO public.faqs (question, answer, category, sort_order, is_published) VALUES
      ('Apa itu Vinstour Travel?',
       'Vinstour Travel adalah platform manajemen perjalanan Umroh dan Haji yang membantu travel agent dan jamaah dalam mengelola seluruh proses perjalanan ibadah.',
       'Umum', 1, TRUE),
      ('Bagaimana cara memesan paket umroh?',
       'Anda dapat memesan paket umroh langsung melalui website kami atau menghubungi kantor terdekat. Tim kami siap membantu proses pemesanan Anda.',
       'Pemesanan', 2, TRUE),
      ('Berapa lama proses pengurusan visa?',
       'Proses pengurusan visa umroh biasanya memakan waktu 7-14 hari kerja setelah semua dokumen lengkap dan dikirimkan ke Kedutaan.',
       'Visa', 3, TRUE),
      ('Apa yang termasuk dalam paket umroh?',
       'Paket umroh kami umumnya mencakup: tiket pesawat PP, akomodasi hotel bintang di Mekkah & Madinah, visa umroh, bimbingan ibadah, dan perlengkapan umroh.',
       'Paket', 4, TRUE),
      ('Bagaimana sistem pembayaran?',
       'Kami menerima pembayaran melalui transfer bank, kartu kredit, dan payment gateway online. Tersedia opsi cicilan dan program tabungan umroh.',
       'Pembayaran', 5, TRUE)
    ON CONFLICT DO NOTHING;
  ELSE
    RAISE NOTICE 'SKIP faqs: tabel tidak ada di database ini.';
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 14. PACKAGE_GROUPS — Kategori paket default
-- Guarded: table only exists in full migration chain (003_tables_users).
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='package_groups'
  ) THEN
    INSERT INTO public.package_groups (name, slug, description, sort_order, is_active)
    VALUES
      ('Umroh Reguler',    'umroh-reguler',    'Paket umroh standar dengan akomodasi bintang 3-4', 1, TRUE),
      ('Umroh Premium',    'umroh-premium',    'Paket umroh eksklusif dengan hotel bintang 5',     2, TRUE),
      ('Umroh Ramadhan',   'umroh-ramadhan',   'Paket umroh di bulan Ramadhan penuh berkah',       3, TRUE),
      ('Haji Plus',        'haji-plus',        'Paket haji plus dengan fasilitas ONH+ terpilih',   4, TRUE),
      ('Wisata Halal',     'wisata-halal',     'Paket wisata halal ke destinasi pilihan',          5, TRUE),
      ('Umroh Backpacker', 'umroh-backpacker', 'Paket umroh hemat untuk jamaah mandiri',           6, TRUE)
    ON CONFLICT (slug) DO NOTHING;
  ELSE
    RAISE NOTICE 'SKIP package_groups: tabel tidak ada di database ini.';
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 15. AIRLINES — Maskapai utama Indonesia–Arab Saudi
-- Auto-detects schema: new migration uses iata_code/icao_code,
-- older databases use a single 'code' column.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='airlines' AND column_name='iata_code'
  ) THEN
    -- New migration schema (004_tables_travel.sql)
    INSERT INTO public.airlines (name, iata_code, icao_code, country, is_active) VALUES
      ('Garuda Indonesia',       'GA',  'GIA', 'Indonesia',    TRUE),
      ('Saudi Arabian Airlines', 'SV',  'SVA', 'Saudi Arabia', TRUE),
      ('Lion Air',               'JT',  'LNI', 'Indonesia',    TRUE),
      ('Batik Air',              'ID',  'BTK', 'Indonesia',    TRUE),
      ('Saudia',                 'SV2', 'SVA', 'Saudi Arabia', FALSE),
      ('Emirates',               'EK',  'UAE', 'UAE',          TRUE),
      ('Qatar Airways',          'QR',  'QTR', 'Qatar',        TRUE),
      ('Flynas',                 'XY',  'KNE', 'Saudi Arabia', TRUE),
      ('Flyadeal',               'F3',  'FAD', 'Saudi Arabia', TRUE)
    ON CONFLICT (iata_code) DO NOTHING;
  ELSE
    -- Older schema uses single 'code' column
    INSERT INTO public.airlines (name, code, country, is_active) VALUES
      ('Garuda Indonesia',       'GA',  'Indonesia',    TRUE),
      ('Saudi Arabian Airlines', 'SV',  'Saudi Arabia', TRUE),
      ('Lion Air',               'JT',  'Indonesia',    TRUE),
      ('Batik Air',              'ID',  'Indonesia',    TRUE),
      ('Emirates',               'EK',  'UAE',          TRUE),
      ('Qatar Airways',          'QR',  'Qatar',        TRUE),
      ('Flynas',                 'XY',  'Saudi Arabia', TRUE),
      ('Flyadeal',               'F3',  'Saudi Arabia', TRUE)
    ON CONFLICT (code) DO NOTHING;
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 16. AIRPORTS — Bandara utama terkait rute Indonesia–Tanah Suci
-- Guarded: table only exists in full migration chain (004_tables_travel).
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='airports'
  ) THEN
    INSERT INTO public.airports (iata_code, icao_code, name, city, country, country_code, timezone)
    VALUES
      ('CGK', 'WIII', 'Soekarno-Hatta International Airport',  'Jakarta',  'Indonesia',   'ID', 'Asia/Jakarta'),
      ('SUB', 'WARR', 'Juanda International Airport',           'Surabaya', 'Indonesia',   'ID', 'Asia/Jakarta'),
      ('UPG', 'WAAA', 'Sultan Hasanuddin International Airport','Makassar', 'Indonesia',   'ID', 'Asia/Makassar'),
      ('KNO', 'WIMM', 'Kualanamu International Airport',        'Medan',    'Indonesia',   'ID', 'Asia/Jakarta'),
      ('JED', 'OEJN', 'King Abdulaziz International Airport',   'Jeddah',   'Saudi Arabia','SA', 'Asia/Riyadh'),
      ('MED', 'OEMA', 'Prince Mohammad Bin Abdulaziz Airport',  'Madinah',  'Saudi Arabia','SA', 'Asia/Riyadh'),
      ('RUH', 'OERK', 'King Khalid International Airport',      'Riyadh',   'Saudi Arabia','SA', 'Asia/Riyadh'),
      ('DXB', 'OMDB', 'Dubai International Airport',            'Dubai',    'UAE',         'AE', 'Asia/Dubai'),
      ('DOH', 'OTHH', 'Hamad International Airport',            'Doha',     'Qatar',       'QA', 'Asia/Qatar')
    ON CONFLICT (iata_code) DO NOTHING;
  ELSE
    RAISE NOTICE 'SKIP airports: tabel tidak ada di database ini.';
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 17. HOTELS — Hotel default Mekkah & Madinah
-- Auto-detects schema: new migration uses star_rating + distance_to_haram,
-- older databases use 'stars' without distance_to_haram.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='hotels' AND column_name='star_rating'
  ) THEN
    -- New migration schema (004_tables_travel.sql)
    INSERT INTO public.hotels (name, city, star_rating, distance_to_haram, is_active) VALUES
      ('Makkah Clock Royal Tower',      'makkah',  5, 0.1,  TRUE),
      ('Swissotel Makkah',              'makkah',  5, 0.2,  TRUE),
      ('Hilton Suites Makkah',          'makkah',  5, 0.3,  TRUE),
      ('Sheraton Makkah',               'makkah',  5, 0.4,  TRUE),
      ('Grand Zam Zam',                 'makkah',  4, 0.5,  TRUE),
      ('Al Massa Hotel',                'makkah',  4, 0.8,  TRUE),
      ('Dar Al Tawhid Intercontinental','makkah',  5, 0.1,  TRUE),
      ('Pullman ZamZam Makkah',         'makkah',  5, 0.15, TRUE),
      ('Anwar Al Madinah Mövenpick',    'madinah', 5, 0.1,  TRUE),
      ('Oberoi Madinah',                'madinah', 5, 0.05, TRUE),
      ('Al Harameyn Hotel Madinah',     'madinah', 4, 0.3,  TRUE),
      ('Grand Mercure Madinah',         'madinah', 5, 0.2,  TRUE),
      ('Dallah Taibah Hotel',           'madinah', 4, 0.4,  TRUE)
    ON CONFLICT DO NOTHING;
  ELSE
    -- Older schema uses 'stars' without distance_to_haram
    INSERT INTO public.hotels (name, city, stars, is_active) VALUES
      ('Makkah Clock Royal Tower',      'makkah',  5, TRUE),
      ('Swissotel Makkah',              'makkah',  5, TRUE),
      ('Hilton Suites Makkah',          'makkah',  5, TRUE),
      ('Sheraton Makkah',               'makkah',  5, TRUE),
      ('Grand Zam Zam',                 'makkah',  4, TRUE),
      ('Al Massa Hotel',                'makkah',  4, TRUE),
      ('Dar Al Tawhid Intercontinental','makkah',  5, TRUE),
      ('Pullman ZamZam Makkah',         'makkah',  5, TRUE),
      ('Anwar Al Madinah Mövenpick',    'madinah', 5, TRUE),
      ('Oberoi Madinah',                'madinah', 5, TRUE),
      ('Al Harameyn Hotel Madinah',     'madinah', 4, TRUE),
      ('Grand Mercure Madinah',         'madinah', 5, TRUE),
      ('Dallah Taibah Hotel',           'madinah', 4, TRUE)
    ON CONFLICT DO NOTHING;
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- DONE
-- ---------------------------------------------------------------------------
SELECT '011_seed_admin: OK — Full seed complete' AS result;
