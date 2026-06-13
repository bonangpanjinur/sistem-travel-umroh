-- =============================================================================
-- VINSTOUR TRAVEL PORTAL — Master Migration v3
-- FILE M12: Seed Data — Data default & konfigurasi awal
-- Semua INSERT pakai ON CONFLICT DO NOTHING — aman diulang.
-- Jalankan TERAKHIR setelah M01–M11.
-- =============================================================================

-- =============================================================================
-- 1. PERMISSIONS_LIST — Daftar izin akses sistem
-- =============================================================================
INSERT INTO permissions_list (key, label, group_name, description) VALUES
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


-- =============================================================================
-- 2. NOTIFICATION_TEMPLATES — Template notifikasi default
-- =============================================================================
INSERT INTO notification_templates (code, name, channel, title, body, variables, trigger_event) VALUES
  ('booking_confirmed',   'Booking Dikonfirmasi',    'push',   'Booking Dikonfirmasi ✅',     'Booking {{booking_code}} Anda telah dikonfirmasi.', ARRAY['booking_code'], 'booking.confirmed'),
  ('payment_received',    'Pembayaran Diterima',     'push',   'Pembayaran Diterima 💰',      'Kami telah menerima pembayaran Anda sebesar Rp {{amount}}.', ARRAY['amount'], 'payment.received'),
  ('visa_status_changed', 'Status Visa Berubah',     'push',   'Update Status Visa 🛂',       'Status visa Anda berubah menjadi: {{status}}.', ARRAY['status'], 'visa.status_changed'),
  ('sos_received',        'SOS Diterima',            'in_app', 'SOS ALERT 🆘',                'Alert darurat dari jamaah {{customer_name}}: {{message}}', ARRAY['customer_name','message'], 'sos.received'),
  ('departure_reminder',  'Pengingat Keberangkatan', 'push',   'Pengingat Keberangkatan ✈️', 'Keberangkatan Anda {{days}} hari lagi. Pastikan dokumen sudah lengkap.', ARRAY['days'], 'departure.reminder'),
  ('approval_needed',     'Persetujuan Dibutuhkan',  'in_app', 'Menunggu Persetujuan Anda',   'Ada {{type}} senilai Rp {{amount}} yang membutuhkan persetujuan Anda.', ARRAY['type','amount'], 'approval.created'),
  ('manasik_reminder',    'Pengingat Manasik',       'push',   'Jadwal Manasik Besok 📿',     'Jangan lupa manasik besok: {{title}} pukul {{time}} di {{location}}.', ARRAY['title','time','location'], 'manasik.reminder')
ON CONFLICT (code) DO NOTHING;


-- =============================================================================
-- 3. APPROVAL_CONFIGS — Konfigurasi alur persetujuan default
-- =============================================================================
INSERT INTO approval_configs (type, level, required_role, amount_threshold, percentage_threshold, auto_approve_below)
VALUES
  ('refund',         1, 'branch_manager', 5000000,  NULL,  500000),
  ('refund',         2, 'admin',          50000000, NULL, 5000000),
  ('refund',         3, 'owner',          NULL,     NULL,     NULL),
  ('discount',       1, 'branch_manager', NULL,     10.0,     NULL),
  ('discount',       2, 'admin',          NULL,     30.0,     NULL),
  ('cancellation',   1, 'branch_manager', NULL,     NULL,     NULL),
  ('cancellation',   2, 'admin',          NULL,     NULL,     NULL),
  ('vendor_invoice', 1, 'finance',        10000000, NULL, 1000000),
  ('vendor_invoice', 2, 'owner',          NULL,     NULL, 10000000)
ON CONFLICT (type, level, required_role) DO NOTHING;


-- =============================================================================
-- 4. BAGGAGE_REFERENCE_ITEMS — Bawaan standar jamaah
-- =============================================================================
INSERT INTO baggage_reference_items (name, category, estimated_weight_kg, is_mandatory) VALUES
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


-- =============================================================================
-- 5. COMPANY_SETTINGS — Pengaturan global perusahaan
-- =============================================================================
INSERT INTO company_settings (setting_key, setting_value, setting_type, description, is_public) VALUES
  ('company_name',          '"Vinstour Travel"',                                              'string',  'Nama resmi perusahaan',                         TRUE),
  ('company_tagline',       '"Perjalanan Suci Anda"',                                         'string',  'Tagline perusahaan',                            TRUE),
  ('company_phone',         '"021-1234567"',                                                  'string',  'Nomor telepon utama',                           TRUE),
  ('company_email',         '"info@vinstour.com"',                                            'string',  'Email utama perusahaan',                        TRUE),
  ('company_address',       '"Jakarta, Indonesia"',                                           'string',  'Alamat kantor pusat',                           TRUE),
  ('company_logo_url',      'null',                                                           'url',     'URL logo perusahaan',                           TRUE),
  ('company_wa_number',     '"628111234567"',                                                 'string',  'Nomor WhatsApp utama (format 62xxx)',           TRUE),
  ('kpi_targets_monthly',   '{"bookings":150,"revenue":3500000000,"leads":500,"conversion":30}', 'json', 'Target KPI bulanan',                           FALSE),
  ('fonnte_api_key',        'null',                                                           'string',  'API key Fonnte untuk kirim WhatsApp',           FALSE),
  ('max_booking_dp_pct',    '30',                                                             'number',  'Persentase minimal DP booking (%)',             FALSE),
  ('booking_expiry_hours',  '24',                                                             'number',  'Jam sebelum booking pending kadaluarsa',        FALSE)
ON CONFLICT (setting_key) DO NOTHING;


-- =============================================================================
-- 6. BANK_ACCOUNTS — Rekening bank default (ganti dengan data nyata)
-- =============================================================================
INSERT INTO bank_accounts (bank_name, account_number, account_name, branch_name, is_primary, is_active)
VALUES
  ('Bank BCA',     '1234567890', 'PT Vinstour Wisata Utama', 'KCP Jakarta Pusat',  TRUE,  TRUE),
  ('Bank Mandiri', '0987654321', 'PT Vinstour Wisata Utama', 'KC Jakarta Selatan', FALSE, TRUE)
ON CONFLICT DO NOTHING;


-- =============================================================================
-- 7. WEBSITE_SETTINGS — Pengaturan global (ID tetap agar frontend tidak 404)
-- =============================================================================
INSERT INTO website_settings (
  id,
  company_name, active_theme, template,
  primary_color, secondary_color, accent_color, background_color, foreground_color,
  heading_font, body_font,
  tagline, footer_description, footer_bottom_text,
  meta_title, meta_description,
  hero_title, hero_subtitle, hero_cta_text, hero_cta_link, hero_display_mode,
  featured_packages_count, package_card_layout, package_card_image_ratio,
  package_card_show_airline, package_card_show_hotel,
  package_card_show_duration, package_card_show_departure
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
  'Nikmati pengalaman spiritual yang tak terlupakan',
  'Pesan Sekarang', '/packages', 'both',
  6, 'modern', '16/10',
  TRUE, TRUE, TRUE, TRUE
)
ON CONFLICT (id) DO UPDATE SET
  company_name = COALESCE(EXCLUDED.company_name, website_settings.company_name),
  active_theme = COALESCE(EXCLUDED.active_theme,  website_settings.active_theme),
  template     = COALESCE(EXCLUDED.template,      website_settings.template),
  updated_at   = NOW();


-- =============================================================================
-- 8. CONTACT_PAGE_CONTENT — Konten halaman kontak default
-- =============================================================================
INSERT INTO contact_page_content (hero_title, hero_subtitle, form_title, operating_hours)
VALUES (
  'Hubungi Kami',
  'Tim kami siap membantu Anda merencanakan perjalanan ibadah terbaik.',
  'Kirim Pesan',
  '{"senin_jumat":"08.00 - 17.00 WIB","sabtu":"08.00 - 13.00 WIB","minggu":"Tutup"}'::jsonb
)
ON CONFLICT DO NOTHING;


-- =============================================================================
-- 9. MEMBERSHIP_PLANS — Paket berlangganan default
-- =============================================================================
INSERT INTO membership_plans (name, plan_type, price_yearly, max_sub_agents, commission_rate, description, features, sort_order)
VALUES
  ('Silver',   'agent',  500000,   5,    2, 'Paket dasar untuk agen baru',         '["Dashboard portal agen","Website agen dasar","Maksimal 5 sub agen","Komisi 2%"]',        1),
  ('Gold',     'agent',  1500000,  20,   3, 'Paket menengah dengan fitur lengkap', '["Dashboard portal agen","Website agen lengkap","Laporan komisi","Maksimal 20 sub agen","Komisi 3%"]', 2),
  ('Platinum', 'agent',  3000000,  NULL, 4, 'Paket premium tanpa batas sub agen',  '["Semua fitur Gold","Sub agen tidak terbatas","Priority support","Komisi 4%"]',           3),
  ('Reguler',  'branch', 5000000,  50,   1, 'Paket cabang standar',                '["Dashboard cabang","Website cabang","Maksimal 50 agen","Komisi cabang 1%"]',             1),
  ('Premium',  'branch', 12000000, NULL, 2, 'Paket cabang premium',                '["Semua fitur Reguler","Agen tidak terbatas","CRM & laporan lanjutan","Komisi cabang 2%"]', 2)
ON CONFLICT DO NOTHING;


-- =============================================================================
-- 10. WA_FEATURE_ROADMAP — Roadmap fitur WA
-- =============================================================================
INSERT INTO wa_feature_roadmap (phase, code, title, description, status, sort_order) VALUES
  (1, 'WA_BASIC_SEND',        'Kirim WA via Fonnte',               'Kirim pesan single & bulk via provider Fonnte',               'done',        10),
  (1, 'WA_TEMPLATES_ENGINE',  'Template Pesan Dinamis',            'Variabel {nama}, {kode}, {tanggal} di template',              'done',        20),
  (1, 'WA_SEND_LOGS',         'Log Pengiriman WA',                 'Riwayat setiap pesan terkirim / gagal',                       'done',        30),
  (1, 'WA_BLAST_DEPARTURE',   'Broadcast per Keberangkatan',       'Kirim massal ke semua jamaah satu keberangkatan',             'done',        40),
  (1, 'WA_AUTO_BOOKING',      'Notif Otomatis Booking Baru',       'Auto-kirim WA saat booking/DP/lunas dikonfirmasi',            'done',        60),
  (2, 'WA_MULTIPROVIDER',     'Multi-Provider (Fonnte/Wablas/…)',  'Support banyak gateway WA, dipilih dari panel admin',         'in_progress', 70),
  (2, 'WA_AUTO_REMINDER',     'Auto-Jadwal Reminder Pembayaran',   'Buat baris reminder H-7/H-3 otomatis',                       'in_progress', 90),
  (3, 'WA_BROADCAST_SEGMENT', 'Broadcast Tersegmentasi',           'Filter penerima: by paket, keberangkatan, status bayar',     'planned',     100),
  (4, 'WA_CHATBOT_KEYWORD',   'Auto-Reply Berbasis Kata Kunci',    'Balas otomatis jika jamaah kirim kata kunci tertentu',        'planned',     130),
  (5, 'WA_META_CLOUD',        'WhatsApp Cloud API (Meta/WABA)',    'Integrasi resmi Meta Business API',                           'planned',     160)
ON CONFLICT (code) DO NOTHING;


-- =============================================================================
-- 11. CHART_OF_ACCOUNTS — COA default
-- =============================================================================
INSERT INTO chart_of_accounts (code, name, type, description, sort_order) VALUES
  ('1000', 'Aset',                   'asset',     'Total aset perusahaan',                    1),
  ('1100', 'Kas & Bank',             'asset',     'Uang tunai dan saldo rekening',            2),
  ('1200', 'Piutang Usaha',          'asset',     'Tagihan kepada pelanggan',                 3),
  ('2000', 'Kewajiban',              'liability', 'Total kewajiban perusahaan',               10),
  ('2100', 'Utang Usaha',            'liability', 'Hutang kepada vendor',                     11),
  ('2200', 'Utang Pajak',            'liability', 'Kewajiban pajak',                          12),
  ('3000', 'Ekuitas',                'equity',    'Modal pemilik',                            20),
  ('4000', 'Pendapatan',             'revenue',   'Total pendapatan',                         30),
  ('4100', 'Pendapatan Paket Umroh', 'revenue',   'Penjualan paket umroh',                    31),
  ('4200', 'Pendapatan Paket Haji',  'revenue',   'Penjualan paket haji',                     32),
  ('4300', 'Pendapatan Toko',        'revenue',   'Penjualan produk toko',                    33),
  ('4400', 'Pendapatan Lain-lain',   'revenue',   'Pendapatan di luar operasi utama',         34),
  ('5000', 'Harga Pokok Penjualan',  'cogs',      'Biaya langsung paket wisata',              40),
  ('5100', 'HPP Tiket Pesawat',      'cogs',      'Biaya tiket pesawat',                      41),
  ('5200', 'HPP Hotel',              'cogs',      'Biaya hotel Mekkah & Madinah',             42),
  ('5300', 'HPP Visa',               'cogs',      'Biaya pengurusan visa',                    43),
  ('5400', 'HPP Handling & Ground',  'cogs',      'Biaya handling & ground handling',         44),
  ('6000', 'Biaya Operasional',      'expense',   'Total biaya operasional',                  50),
  ('6100', 'Biaya Gaji',             'expense',   'Gaji & tunjangan karyawan',                51),
  ('6200', 'Biaya Marketing',        'expense',   'Iklan & promosi',                          52),
  ('6300', 'Biaya Kantor',           'expense',   'Sewa, utilitas, supplies',                 53),
  ('6400', 'Biaya Komisi Agen',      'expense',   'Komisi mitra agen',                        54)
ON CONFLICT (code) DO NOTHING;


-- =============================================================================
-- SELESAI — File M12: Seed Data
-- =============================================================================
SELECT 'v3_M12_seed_data: OK — Master Migration v3 complete!' AS result;
