-- =============================================================================
-- VINSTOUR TRAVEL PORTAL — Seeds
-- FILE: seed_master_data.sql
-- Master / reference data: company settings, COA, banks, packages,
-- departures (demo), hotels, airlines, approval configs, WA roadmap.
-- Safe to re-run — ON CONFLICT DO NOTHING / DO UPDATE throughout.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. COMPANY_SETTINGS
-- ---------------------------------------------------------------------------
INSERT INTO public.company_settings
  (setting_key, setting_value, setting_type, description, is_public)
VALUES
  ('company_name',          '"Vinstour Travel"',    'string', 'Nama resmi perusahaan',            TRUE),
  ('company_tagline',       '"Perjalanan Suci Anda"','string','Tagline perusahaan',               TRUE),
  ('company_phone',         '"021-1234567"',         'string', 'Nomor telepon utama',              TRUE),
  ('company_email',         '"info@vinstour.com"',   'string', 'Email utama perusahaan',           TRUE),
  ('company_address',       '"Jakarta, Indonesia"',  'string', 'Alamat kantor pusat',              TRUE),
  ('company_logo_url',      'null',                  'url',    'URL logo perusahaan',              TRUE),
  ('company_wa_number',     '"628111234567"',         'string', 'Nomor WA utama (format 62xxx)',   TRUE),
  ('currency_default',      '"IDR"',                 'string', 'Mata uang default',                TRUE),
  ('timezone',              '"Asia/Jakarta"',         'string', 'Timezone sistem',                  FALSE),
  ('usd_exchange_rate',     '16000',                 'number', 'Kurs USD ke IDR',                  FALSE),
  ('max_booking_dp_pct',    '30',                    'number', 'Min DP booking (%)',               FALSE),
  ('booking_expiry_hours',  '24',                    'number', 'Jam sebelum booking expired',      FALSE),
  ('kpi_targets_monthly',   '{"bookings":150,"revenue":3500000000,"leads":500,"conversion":30}',
                                                     'json',   'Target KPI bulanan',               FALSE),
  ('fonnte_api_key',        'null',                  'string', 'API key Fonnte WA',                FALSE),
  ('wa_provider',           '"fonnte"',              'string', 'WA provider aktif',                FALSE),
  ('max_upload_size_mb',    '10',                    'number', 'Max ukuran upload file (MB)',       FALSE),
  ('allowed_file_types',    '"jpg,jpeg,png,pdf,doc,docx"','string','Tipe file yang diizinkan',    FALSE)
ON CONFLICT (setting_key) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. CHART_OF_ACCOUNTS
-- ---------------------------------------------------------------------------
INSERT INTO public.chart_of_accounts (code, name, type, description, sort_order)
VALUES
  ('1000','Aset',                   'asset',    'Total aset perusahaan',                  1),
  ('1100','Kas & Bank',             'asset',    'Uang tunai dan saldo rekening',          2),
  ('1110','Kas Kecil',              'asset',    'Petty cash',                             3),
  ('1120','Rekening BCA',           'asset',    'Saldo rekening BCA',                     4),
  ('1130','Rekening Mandiri',       'asset',    'Saldo rekening Mandiri',                 5),
  ('1200','Piutang Usaha',          'asset',    'Tagihan kepada pelanggan',               6),
  ('1210','Piutang Booking',        'asset',    'Sisa pembayaran booking jamaah',         7),
  ('1300','Aset Lainnya',           'asset',    'Perlengkapan, deposit, dll',             8),
  ('2000','Kewajiban',              'liability','Total kewajiban perusahaan',             10),
  ('2100','Utang Usaha',            'liability','Hutang kepada vendor',                   11),
  ('2200','Utang Pajak',            'liability','Kewajiban pajak (PPN, PPh)',             12),
  ('2300','Utang Gaji',             'liability','Gaji yang belum dibayarkan',             13),
  ('2400','Uang Muka Jamaah',       'liability','DP jamaah yang belum berangkat',        14),
  ('3000','Ekuitas',                'equity',   'Modal pemilik',                          20),
  ('3100','Modal Disetor',          'equity',   'Modal awal & tambahan',                  21),
  ('3200','Laba Ditahan',           'equity',   'Akumulasi laba sebelumnya',              22),
  ('4000','Pendapatan',             'revenue',  'Total pendapatan',                       30),
  ('4100','Pendapatan Paket Umroh', 'revenue',  'Penjualan paket umroh',                  31),
  ('4200','Pendapatan Paket Haji',  'revenue',  'Penjualan paket haji',                   32),
  ('4300','Pendapatan Toko',        'revenue',  'Penjualan produk toko online',           33),
  ('4400','Pendapatan Lain-lain',   'revenue',  'Pendapatan di luar operasi utama',       34),
  ('4500','Pendapatan Tabungan',    'revenue',  'Fee program tabungan umroh',             35),
  ('5000','Harga Pokok Penjualan',  'cogs',     'Biaya langsung paket wisata',            40),
  ('5100','HPP Tiket Pesawat',      'cogs',     'Biaya tiket pesawat',                    41),
  ('5200','HPP Hotel Mekkah',       'cogs',     'Biaya hotel di Mekkah',                  42),
  ('5210','HPP Hotel Madinah',      'cogs',     'Biaya hotel di Madinah',                 43),
  ('5300','HPP Visa',               'cogs',     'Biaya pengurusan visa',                  44),
  ('5400','HPP Handling & Ground',  'cogs',     'Biaya handling & ground handling',       45),
  ('5500','HPP Transportasi',       'cogs',     'Biaya transportasi darat',               46),
  ('5600','HPP Muthawif',           'cogs',     'Honor muthawif & tour guide',            47),
  ('6000','Biaya Operasional',      'expense',  'Total biaya operasional',                50),
  ('6100','Biaya Gaji',             'expense',  'Gaji & tunjangan karyawan',              51),
  ('6200','Biaya Marketing',        'expense',  'Iklan, promosi & event',                 52),
  ('6300','Biaya Kantor',           'expense',  'Sewa, utilitas, supplies',               53),
  ('6400','Biaya Komisi Agen',      'expense',  'Komisi mitra agen',                      54),
  ('6500','Biaya Komisi Branch',    'expense',  'Komisi cabang',                          55),
  ('6600','Biaya Teknologi',        'expense',  'Software, hosting, server',              56),
  ('6700','Biaya Perjalanan Dinas', 'expense',  'Akomodasi & transport dinas',            57),
  ('6800','Biaya Lain-lain',        'expense',  'Pengeluaran tak terduga',                58)
ON CONFLICT (code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3. BANK_ACCOUNTS
-- ---------------------------------------------------------------------------
INSERT INTO public.bank_accounts
  (bank_name, account_number, account_name, branch_name, is_primary, is_active)
VALUES
  ('Bank BCA',          '1234567890', 'PT Vinstour Wisata Utama', 'KCP Jakarta Pusat',       TRUE,  TRUE),
  ('Bank Mandiri',      '0987654321', 'PT Vinstour Wisata Utama', 'KC Jakarta Selatan',      FALSE, TRUE),
  ('Bank BNI',          '1122334455', 'PT Vinstour Wisata Utama', 'KC Jakarta Pusat',        FALSE, TRUE),
  ('Bank BSI (Syariah)','6677889900', 'PT Vinstour Wisata Utama', 'KC Jakarta Selatan',      FALSE, TRUE)
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- 4. APPROVAL_CONFIGS
-- ---------------------------------------------------------------------------
INSERT INTO public.approval_configs
  (type, level, required_role, amount_threshold, percentage_threshold, auto_approve_below)
VALUES
  ('refund',         1,'branch_manager', 5000000,  NULL,  500000),
  ('refund',         2,'admin',          50000000, NULL, 5000000),
  ('refund',         3,'super_admin',    NULL,     NULL,     NULL),
  ('discount',       1,'branch_manager', NULL,     10.0,     NULL),
  ('discount',       2,'admin',          NULL,     30.0,     NULL),
  ('cancellation',   1,'branch_manager', NULL,     NULL,     NULL),
  ('cancellation',   2,'admin',          NULL,     NULL,     NULL),
  ('vendor_invoice', 1,'finance',        10000000, NULL, 1000000),
  ('vendor_invoice', 2,'super_admin',    NULL,     NULL, 10000000),
  ('expense',        1,'branch_manager', 5000000,  NULL,  250000),
  ('expense',        2,'finance',        NULL,     NULL,  NULL),
  ('payroll',        1,'finance',        NULL,     NULL,  NULL),
  ('payroll',        2,'super_admin',    NULL,     NULL,  NULL)
ON CONFLICT (type, level, required_role) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 5. MEMBERSHIP_PLANS
-- ---------------------------------------------------------------------------
INSERT INTO public.membership_plans
  (name, plan_type, price_monthly, price_yearly, max_sub_agents, commission_rate,
   description, features, is_active, sort_order)
VALUES
  ('Silver',   'agent',  NULL,    500000,   5,    2.0,
   'Paket dasar untuk agen baru',
   '["Dashboard portal agen","Website agen dasar","Maksimal 5 sub agen","Komisi 2%","Support email"]'::jsonb,
   TRUE, 1),
  ('Gold',     'agent',  NULL,    1500000,  20,   3.0,
   'Paket menengah dengan fitur lengkap',
   '["Dashboard portal agen","Website agen lengkap","Laporan komisi real-time","Maksimal 20 sub agen","Komisi 3%","Support prioritas"]'::jsonb,
   TRUE, 2),
  ('Platinum', 'agent',  NULL,    3000000,  NULL, 4.0,
   'Paket premium tanpa batas sub agen',
   '["Semua fitur Gold","Sub agen tidak terbatas","CRM lanjutan","Custom domain","Priority support 24/7","Komisi 4%"]'::jsonb,
   TRUE, 3),
  ('Reguler',  'branch', NULL,    5000000,  50,   1.0,
   'Paket cabang standar',
   '["Dashboard cabang","Website cabang","Maksimal 50 agen","Komisi cabang 1%","Support prioritas"]'::jsonb,
   TRUE, 1),
  ('Premium',  'branch', NULL,    12000000, NULL, 2.0,
   'Paket cabang premium tanpa batas',
   '["Semua fitur Reguler","Agen tidak terbatas","CRM & laporan lanjutan","API access","Komisi cabang 2%","Account manager dedicated"]'::jsonb,
   TRUE, 2)
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- 6. WA_FEATURE_ROADMAP
-- ---------------------------------------------------------------------------
INSERT INTO public.wa_feature_roadmap (phase, code, title, description, status, sort_order)
VALUES
  (1,'WA_BASIC_SEND',       'Kirim WA via Fonnte',             'Kirim pesan single & bulk via Fonnte',              'done',        10),
  (1,'WA_TEMPLATES_ENGINE', 'Template Pesan Dinamis',          'Variabel {nama}, {kode}, {tanggal} di template',    'done',        20),
  (1,'WA_SEND_LOGS',        'Log Pengiriman WA',               'Riwayat setiap pesan terkirim / gagal',             'done',        30),
  (1,'WA_BLAST_DEPARTURE',  'Broadcast per Keberangkatan',     'Kirim massal ke semua jamaah satu keberangkatan',   'done',        40),
  (1,'WA_AUTO_BOOKING',     'Notif Otomatis Booking Baru',     'Auto-kirim WA saat booking/DP/lunas dikonfirmasi',  'done',        60),
  (2,'WA_MULTIPROVIDER',    'Multi-Provider WA',               'Support Fonnte, Wablas, Waboxapp, Meta Cloud',      'in_progress', 70),
  (2,'WA_AUTO_REMINDER',    'Auto-Jadwal Reminder Pembayaran', 'Buat baris reminder H-7/H-3 otomatis',             'in_progress', 90),
  (3,'WA_BROADCAST_SEGMENT','Broadcast Tersegmentasi',         'Filter penerima by paket / keberangkatan / status', 'planned',    100),
  (4,'WA_CHATBOT_KEYWORD',  'Auto-Reply Kata Kunci',           'Balas otomatis berdasarkan kata kunci jamaah',      'planned',    130),
  (5,'WA_META_CLOUD',       'WhatsApp Cloud API (Meta)',       'Integrasi resmi Meta Business WABA API',            'planned',    160)
ON CONFLICT (code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 7. NOTIFICATION_TEMPLATES
-- ---------------------------------------------------------------------------
INSERT INTO public.notification_templates
  (code, name, channel, title, body, variables, trigger_event)
VALUES
  ('booking_confirmed',   'Booking Dikonfirmasi',    'push',      'Booking Dikonfirmasi ✅',
   'Booking {{booking_code}} Anda telah dikonfirmasi. Selamat datang di keluarga Vinstour!',
   ARRAY['booking_code'], 'booking.confirmed'),
  ('payment_received',    'Pembayaran Diterima',     'push',      'Pembayaran Diterima 💰',
   'Pembayaran Rp {{amount}} untuk booking {{booking_code}} telah kami terima. Terima kasih!',
   ARRAY['amount','booking_code'], 'payment.received'),
  ('payment_reminder',    'Reminder Pembayaran',     'whatsapp',  'Pengingat Pembayaran 🔔',
   'Halo {{full_name}}, sisa pembayaran booking {{booking_code}} sebesar Rp {{remaining}} jatuh tempo {{deadline}}. Segera lakukan pembayaran.',
   ARRAY['full_name','booking_code','remaining','deadline'], 'payment.deadline_reminder'),
  ('visa_status_changed', 'Status Visa Berubah',     'push',      'Update Status Visa 🛂',
   'Status visa Anda untuk booking {{booking_code}} berubah menjadi: {{status}}.',
   ARRAY['booking_code','status'], 'visa.status_changed'),
  ('sos_received',        'SOS Diterima',            'in_app',    'SOS ALERT 🆘',
   'Alert darurat dari jamaah {{customer_name}}: {{message}}. Segera tindaklanjuti!',
   ARRAY['customer_name','message'], 'sos.received'),
  ('departure_reminder',  'Pengingat Keberangkatan', 'push',      'Pengingat Keberangkatan ✈️',
   'Keberangkatan Anda {{days}} hari lagi pada tanggal {{date}}. Pastikan dokumen sudah lengkap.',
   ARRAY['days','date'], 'departure.reminder'),
  ('approval_needed',     'Persetujuan Dibutuhkan',  'in_app',    'Menunggu Persetujuan Anda 📋',
   'Ada {{type}} senilai Rp {{amount}} dari {{requester}} yang membutuhkan persetujuan Anda.',
   ARRAY['type','amount','requester'], 'approval.created'),
  ('manasik_reminder',    'Pengingat Manasik',       'push',      'Jadwal Manasik Besok 📿',
   'Jangan lupa! Manasik besok: {{title}} pukul {{time}} di {{location}}.',
   ARRAY['title','time','location'], 'manasik.reminder'),
  ('savings_due',         'Setoran Tabungan Jatuh Tempo','push',  'Setoran Tabungan 💳',
   'Setoran tabungan umroh Anda sebesar Rp {{amount}} jatuh tempo hari ini.',
   ARRAY['amount'], 'savings.due'),
  ('booking_cancelled',   'Booking Dibatalkan',      'push',      'Booking Dibatalkan ❌',
   'Booking {{booking_code}} Anda telah dibatalkan. Hubungi kami untuk informasi lebih lanjut.',
   ARRAY['booking_code'], 'booking.cancelled')
ON CONFLICT (code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 8. BAGGAGE_REFERENCE_ITEMS
-- ---------------------------------------------------------------------------
INSERT INTO public.baggage_reference_items (name, category, estimated_weight_kg, is_mandatory)
VALUES
  ('Koper besar (kosong)',        'koper',      3.50, TRUE),
  ('Koper kabin (kosong)',        'koper',      2.00, FALSE),
  ('Tas ransel',                  'tas',        0.80, FALSE),
  ('Baju ihram pria (2 lembar)',  'pakaian',    0.80, TRUE),
  ('Mukena',                      'pakaian',    0.40, FALSE),
  ('Baju muslim (5 lembar)',      'pakaian',    2.00, FALSE),
  ('Sandal',                      'alas_kaki',  0.40, TRUE),
  ('Sepatu kasual',               'alas_kaki',  0.80, FALSE),
  ('Al-Quran',                    'ibadah',     0.50, FALSE),
  ('Sajadah travel',              'ibadah',     0.30, FALSE),
  ('Tasbih',                      'ibadah',     0.05, FALSE),
  ('Masker (kotak)',              'kesehatan',  0.20, TRUE),
  ('Obat-obatan pribadi',         'kesehatan',  0.50, FALSE),
  ('Hand sanitizer',              'kesehatan',  0.20, TRUE),
  ('Sunscreen',                   'kesehatan',  0.15, FALSE),
  ('Charger & kabel',             'elektronik', 0.30, FALSE),
  ('Power bank',                  'elektronik', 0.25, FALSE),
  ('Adaptor colokan internasional','elektronik', 0.15, FALSE),
  ('Kamera / handphone cadangan', 'elektronik', 0.20, FALSE)
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- 9. PACKAGE_GROUPS
-- ---------------------------------------------------------------------------
INSERT INTO public.package_groups (name, slug, description, sort_order, is_active)
VALUES
  ('Umroh Reguler',     'umroh-reguler',     'Paket umroh standar bintang 3-4',         1, TRUE),
  ('Umroh Premium',     'umroh-premium',     'Paket umroh eksklusif hotel bintang 5',   2, TRUE),
  ('Umroh Ramadhan',    'umroh-ramadhan',    'Paket umroh di bulan suci Ramadhan',       3, TRUE),
  ('Umroh Hemat',       'umroh-hemat',       'Paket umroh budget-friendly',             4, TRUE),
  ('Haji Plus',         'haji-plus',         'Paket haji plus ONH+',                    5, TRUE),
  ('Wisata Halal',      'wisata-halal',      'Wisata halal ke destinasi pilihan',        6, TRUE),
  ('Spesial Lebaran',   'spesial-lebaran',   'Paket umroh & wisata Hari Raya',          7, TRUE)
ON CONFLICT (slug) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 10. PACKAGE_LABELS
-- ---------------------------------------------------------------------------
INSERT INTO public.package_labels (name, color, text_color, icon)
VALUES
  ('Best Seller', '#f59e0b', '#ffffff', 'star'),
  ('Promo',       '#ef4444', '#ffffff', 'tag'),
  ('Baru',        '#22c55e', '#ffffff', 'sparkles'),
  ('Terbatas',    '#8b5cf6', '#ffffff', 'clock'),
  ('Premium',     '#0ea5e9', '#ffffff', 'crown'),
  ('Hemat',       '#f97316', '#ffffff', 'percent')
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- 11. TESTIMONIALS (sample)
-- ---------------------------------------------------------------------------
INSERT INTO public.testimonials (full_name, city, content, rating, package_name, is_published, sort_order)
VALUES
  ('Bapak Ahmad Fauzi',  'Jakarta',   'Alhamdulillah, perjalanan umroh bersama Vinstour sangat berkesan. Pelayanan prima dari berangkat hingga pulang. Muthawif sangat berpengalaman.', 5, 'Paket Umroh Premium 9 Hari', TRUE, 1),
  ('Ibu Siti Rahayu',    'Surabaya',  'Terima kasih Vinstour atas pengalaman ibadah yang luar biasa. Hotel bintang 5 dekat Masjidil Haram, sangat nyaman untuk ibadah.', 5, 'Paket Umroh Platinum 12 Hari', TRUE, 2),
  ('Ustadz Malik Santoso','Bandung',  'Saya sudah 3 kali berangkat dengan Vinstour. Konsisten dalam pelayanan dan sangat memudahkan proses visa. Sangat direkomendasikan!', 5, 'Paket Umroh Reguler 9 Hari', TRUE, 3),
  ('Keluarga Wirawan',   'Semarang',  'Kami sekeluarga (4 orang) sangat puas dengan pelayanan Vinstour. Paket yang lengkap dengan harga yang sangat bersaing.', 5, 'Paket Umroh Keluarga', TRUE, 4)
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- 12. FAQS
-- ---------------------------------------------------------------------------
INSERT INTO public.faqs (question, answer, category, sort_order, is_published)
VALUES
  ('Apa itu Vinstour Travel?',
   'Vinstour Travel adalah platform travel Umroh & Haji terpercaya dengan pengalaman lebih dari 15 tahun melayani jamaah Indonesia. Kami menyediakan layanan pemesanan paket, bimbingan ibadah, dan dukungan penuh selama perjalanan.',
   'Umum', 1, TRUE),
  ('Bagaimana cara memesan paket umroh?',
   'Cara memesan: (1) Pilih paket di halaman Paket, (2) Klik "Pesan Sekarang", (3) Isi data diri, (4) Bayar DP minimal 30%, (5) Lengkapi dokumen yang diminta. Tim kami akan menghubungi Anda dalam 1x24 jam.',
   'Pemesanan', 2, TRUE),
  ('Berapa lama proses pengurusan visa?',
   'Proses visa umroh biasanya 7-14 hari kerja setelah dokumen lengkap: paspor (min. 7 bulan), pas foto, KTP, buku nikah (untuk suami-istri), dan akte kelahiran (untuk anak).',
   'Visa', 3, TRUE),
  ('Apa saja yang termasuk dalam paket umroh?',
   'Paket umroh kami mencakup: ✅ Tiket pesawat PP ✅ Akomodasi hotel di Mekkah & Madinah ✅ Visa umroh ✅ Transportasi ✅ Bimbingan muthawif berpengalaman ✅ Perlengkapan umroh ✅ Asuransi perjalanan.',
   'Paket', 4, TRUE),
  ('Bagaimana sistem pembayaran?',
   'Kami menerima: transfer bank (BCA, Mandiri, BNI, BSI), kartu kredit, dan QRIS. Minimal DP 30% untuk konfirmasi booking. Sisa pelunasan paling lambat 30 hari sebelum keberangkatan.',
   'Pembayaran', 5, TRUE),
  ('Apakah ada program tabungan umroh?',
   'Ya! Program Tabungan Umroh kami memudahkan Anda menabung secara bertahap. Tentukan target dan periode menabung, setorkan setiap bulan, dan kami bantu mewujudkan impian ibadah Anda.',
   'Pembayaran', 6, TRUE),
  ('Bagaimana jika ingin membatalkan booking?',
   'Pembatalan dikenakan biaya sesuai kebijakan: H-60 atau lebih = DP hangus, H-30 s/d H-60 = 50% hangus, H-0 s/d H-30 = 100% hangus. Silakan hubungi tim kami untuk diskusi lebih lanjut.',
   'Kebijakan', 7, TRUE),
  ('Apakah tersedia paket untuk lansia?',
   'Tentu! Kami memiliki paket khusus lansia dengan fasilitas kursi roda, kamar di lantai bawah, pendamping khusus, dan jadwal ibadah yang disesuaikan dengan kondisi fisik.',
   'Paket', 8, TRUE)
ON CONFLICT DO NOTHING;

SELECT 'seed_master_data: OK' AS result;
