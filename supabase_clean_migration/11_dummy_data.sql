-- =============================================================================
-- FILE 11: DUMMY DATA — Data Contoh Realistis
-- Vinstour Travel Portal
--
-- Berisi data contoh siap pakai untuk testing & demo:
--   • 3 Cabang
--   • 5 Hotel (Mekkah & Madinah)
--   • 4 Vendor
--   • 5 Muthawif
--   • 5 Paket Umroh & Haji
--   • 5 Keberangkatan
--   • 8 Karyawan (tanpa akun Auth)
--   • 20 Jamaah (tanpa akun Auth — user_id NULL)
--   • 18 Booking
--   • 10 Lead prospek
--   • 3 Tabungan
--   • 3 Kupon
--   • 3 Pengumuman
--   • 3 Banner
--
-- CATATAN:
--   • Semua data customer/jamaah tidak terhubung ke Supabase Auth (user_id NULL)
--     Untuk testing penuh, buat akun via Auth lalu update user_id secara manual.
--   • Semua INSERT menggunakan ON CONFLICT DO NOTHING — aman dijalankan ulang.
--   • Jalankan file ini SETELAH file 01–07 berhasil (07 sudah seed airlines, dll).
-- =============================================================================

BEGIN;

-- =============================================================================
-- 1. CABANG
-- =============================================================================
INSERT INTO branches (id, name, code, address, city, province, phone, email, is_active)
VALUES
  ('b1000000-0000-0000-0000-000000000001', 'Vinstour Jakarta Pusat',  'JKT', 'Jl. Sudirman No. 45, Karet Tengsin', 'Jakarta Pusat',  'DKI Jakarta',    '021-57900100', 'jakarta@vinstour.com',  TRUE),
  ('b1000000-0000-0000-0000-000000000002', 'Vinstour Surabaya',       'SBY', 'Jl. Ahmad Yani No. 88, Wonokromo',   'Surabaya',       'Jawa Timur',     '031-82740200', 'surabaya@vinstour.com', TRUE),
  ('b1000000-0000-0000-0000-000000000003', 'Vinstour Bandung',        'BDG', 'Jl. Asia Afrika No. 12, Braga',      'Bandung',        'Jawa Barat',     '022-42080300', 'bandung@vinstour.com',  TRUE)
ON CONFLICT DO NOTHING;


-- =============================================================================
-- 2. HOTEL
-- =============================================================================
INSERT INTO hotels (id, name, city, country, star_rating, address, phone, notes, is_active)
VALUES
  ('h1000000-0000-0000-0000-000000000001', 'Pullman ZamZam Makkah',    'Mekkah',  'Arab Saudi', 5, 'Abraj Al Bait, Ajyad St, Al Haram',         '+966-12-5710000', 'Langsung menghadap Ka''bah',     TRUE),
  ('h1000000-0000-0000-0000-000000000002', 'Movenpick Hotel Hajar',    'Mekkah',  'Arab Saudi', 5, 'Ajyad Al Mashaer St, Al Haram',             '+966-12-5470000', '200m dari Masjidil Haram',       TRUE),
  ('h1000000-0000-0000-0000-000000000003', 'Hilton Suites Makkah',     'Mekkah',  'Arab Saudi', 4, 'Al Nuzha St, Al Haram District',            '+966-12-5490000', '500m dari Masjidil Haram',       TRUE),
  ('h1000000-0000-0000-0000-000000000004', 'Anwar Madinah Mövenpick',  'Madinah', 'Arab Saudi', 5, 'Sultana St, Al Haram, Madinah',             '+966-14-8590000', '50m dari Masjid Nabawi',         TRUE),
  ('h1000000-0000-0000-0000-000000000005', 'Dar Al Taqwa Hotel',       'Madinah', 'Arab Saudi', 4, 'Abu Bakr Al Siddiq Rd, Al Haram, Madinah',  '+966-14-8300000', '200m dari Masjid Nabawi',        TRUE)
ON CONFLICT DO NOTHING;


-- =============================================================================
-- 3. VENDOR
-- =============================================================================
INSERT INTO vendors (id, name, type, contact_person, phone, email, address, notes, is_active)
VALUES
  ('v1000000-0000-0000-0000-000000000001', 'Haramain Bus Services',  'transport',  'Abdul Aziz Al-Qahtani', '+966-50-1234567', 'haramain@busservices.sa',  'Riyadh, Arab Saudi',   'Armada 50 bus AC kapasitas 40 pax',          TRUE),
  ('v1000000-0000-0000-0000-000000000002', 'Nusantara Catering KSA', 'catering',   'Budi Santoso',          '+966-55-9876543', 'nusantara@catering.sa',    'Mekkah, Arab Saudi',   'Masakan Indonesia halal, kapasitas 500 pax/hari', TRUE),
  ('v1000000-0000-0000-0000-000000000003', 'PT Armada Perlengkapan', 'equipment',  'Rini Susanti',          '021-77889900',    'armada@perlengkapan.co.id','Jakarta, Indonesia',    'Koper, kain ihram, tas jinjing',             TRUE),
  ('v1000000-0000-0000-0000-000000000004', 'Ziyarah Tour & Guide',   'guide',      'Muhammad Fadhil',       '+966-54-3456789', 'ziyarah@tour.sa',          'Madinah, Arab Saudi',  'Pemandu wisata ziarah berpengalaman 10 th',  TRUE)
ON CONFLICT DO NOTHING;


-- =============================================================================
-- 4. MUTHAWIF
-- =============================================================================
INSERT INTO muthawifs (id, full_name, gender, phone, email, languages, experience_years, certifications, is_active)
VALUES
  ('m1000000-0000-0000-0000-000000000001', 'Ustadz Ahmad Fauzi, Lc.',    'male',   '081234567001', 'ahmad.fauzi@vinstour.com',    ARRAY['Indonesia','Arab','Inggris'], 12, ARRAY['Sertifikat Haji Kemenag RI','IATA Travel Guide'], TRUE),
  ('m1000000-0000-0000-0000-000000000002', 'Ustadz Yusuf Habibi, M.Ag.', 'male',   '081234567002', 'yusuf.habibi@vinstour.com',   ARRAY['Indonesia','Arab'],           8,  ARRAY['Sertifikat Haji Kemenag RI'],              TRUE),
  ('m1000000-0000-0000-0000-000000000003', 'Ustadzah Rina Safitri, S.Ag.','female', '081234567003', 'rina.safitri@vinstour.com',   ARRAY['Indonesia','Arab','Melayu'],  6,  ARRAY['Sertifikat Haji Kemenag RI'],              TRUE),
  ('m1000000-0000-0000-0000-000000000004', 'Ustadz Malik Ibrahim, Lc.',   'male',   '081234567004', 'malik.ibrahim@vinstour.com',  ARRAY['Indonesia','Arab'],           15, ARRAY['Sertifikat Haji Kemenag RI','Muharrik'],   TRUE),
  ('m1000000-0000-0000-0000-000000000005', 'Ustadz Hasan Basri, MA.',     'male',   '081234567005', 'hasan.basri@vinstour.com',    ARRAY['Indonesia','Arab','Urdu'],    10, ARRAY['Sertifikat Haji Kemenag RI'],              TRUE)
ON CONFLICT DO NOTHING;


-- =============================================================================
-- 5. PAKET (Package)
-- =============================================================================
INSERT INTO packages (id, name, type, duration_days, base_price, description,
  hotel_mecca_id, hotel_medina_id, is_active, is_featured, quota_per_departure, facilities)
VALUES
  (
    'p1000000-0000-0000-0000-000000000001',
    'Umroh Reguler 9 Hari', 'umroh', 9, 24500000,
    'Paket umroh hemat dengan hotel bintang 4, cocok untuk jamaah yang mengutamakan ibadah. Termasuk visa, tiket PP, dan bimbingan muthawif berpengalaman.',
    'h1000000-0000-0000-0000-000000000003',
    'h1000000-0000-0000-0000-000000000005',
    TRUE, FALSE, 45,
    '{"includes":["Visa umroh","Tiket PP Garuda","Hotel bintang 4","Konsumsi 3x sehari","Muthawif","Perlengkapan umroh","Asuransi perjalanan"],"excludes":["Pengeluaran pribadi","Manasik (opsional)","Kelebihan bagasi"]}'
  ),
  (
    'p1000000-0000-0000-0000-000000000002',
    'Umroh VIP 9 Hari', 'umroh', 9, 38500000,
    'Paket umroh premium bintang 5 dengan kamar tipe superior. Hotel Pullman ZamZam menghadap langsung Ka''bah dan Anwar Madinah 50m dari Masjid Nabawi.',
    'h1000000-0000-0000-0000-000000000001',
    'h1000000-0000-0000-0000-000000000004',
    TRUE, TRUE, 30,
    '{"includes":["Visa umroh","Tiket PP Saudi Arabian Airlines Business Class","Hotel bintang 5","Konsumsi 3x sehari (resto hotel)","Muthawif senior","Perlengkapan umroh premium","Asuransi perjalanan komprehensif","Handling khusus bandara"],"excludes":["Pengeluaran pribadi","Biaya ziarah tambahan"]}'
  ),
  (
    'p1000000-0000-0000-0000-000000000003',
    'Umroh Plus Turki 14 Hari', 'umroh', 14, 47000000,
    'Kombinasi ibadah umroh dan wisata sejarah Islam di Istanbul & Bursa. Kunjungi Hagia Sophia, Masjid Biru, dan Topkapi Palace sebelum ke Tanah Suci.',
    'h1000000-0000-0000-0000-000000000002',
    'h1000000-0000-0000-0000-000000000004',
    TRUE, TRUE, 35,
    '{"includes":["Visa umroh & Turki","Tiket PP + penerbangan Turki-Arab Saudi","Hotel bintang 4-5","Konsumsi 3x sehari","Muthawif & tour guide Turki","Perlengkapan umroh","City tour Istanbul 3 hari","Asuransi perjalanan"],"excludes":["Pengeluaran pribadi","Shopping di Grand Bazaar"]}'
  ),
  (
    'p1000000-0000-0000-0000-000000000004',
    'Umroh Ramadhan 15 Hari', 'umroh', 15, 52000000,
    'Rasakan keistimewaan ibadah di bulan suci Ramadhan. Itikaf 10 hari terakhir Ramadhan dengan akses khusus Masjidil Haram dan buka puasa di pelataran Ka''bah.',
    'h1000000-0000-0000-0000-000000000002',
    'h1000000-0000-0000-0000-000000000004',
    TRUE, TRUE, 40,
    '{"includes":["Visa umroh Ramadhan","Tiket PP Garuda","Hotel bintang 4-5","Sahur & iftar","Muthawif senior","Perlengkapan umroh","Buka puasa di Masjidil Haram","Asuransi perjalanan"],"excludes":["Pengeluaran pribadi"]}'
  ),
  (
    'p1000000-0000-0000-0000-000000000005',
    'Haji Reguler ONH Plus', 'haji', 40, 125000000,
    'Paket haji ONH Plus resmi terdaftar Kemenag RI. Masa tunggu lebih singkat, fasilitas lebih baik dari haji regular. Bimbingan intensif pra-keberangkatan.',
    'h1000000-0000-0000-0000-000000000001',
    'h1000000-0000-0000-0000-000000000004',
    TRUE, FALSE, 25,
    '{"includes":["Biaya haji ONH Plus","Tiket PP","Hotel bintang 5 (jarak 500m dari Masjidil Haram)","Konsumsi 3x sehari","Pembimbing ibadah haji","Perlengkapan haji lengkap","Asuransi perjalanan & jiwa","Manasik haji 6 sesi","Kartu BPIH"],"excludes":["Dam/hadyu","Pengeluaran pribadi","Oleh-oleh"]}'
  )
ON CONFLICT DO NOTHING;


-- =============================================================================
-- 6. KEBERANGKATAN (Departures)
-- =============================================================================
INSERT INTO departures (id, package_id, airline_id, departure_date, return_date,
  quota, price_per_person, status, notes, muthawif_id, branch_id)
SELECT
  'd1000000-0000-0000-0000-00000000000' || seq::TEXT,
  pkg_id,
  (SELECT id FROM airlines WHERE iata_code = 'GA' LIMIT 1),
  dep_date::DATE,
  ret_date::DATE,
  quota,
  price,
  status,
  notes,
  muth_id,
  branch_id
FROM (VALUES
  (1, 'p1000000-0000-0000-0000-000000000001'::UUID, '2025-08-10', '2025-08-18', 45, 24500000, 'open',      'Keberangkatan Agustus batch 1 — via Jeddah', 'm1000000-0000-0000-0000-000000000002'::UUID, 'b1000000-0000-0000-0000-000000000001'::UUID),
  (2, 'p1000000-0000-0000-0000-000000000001'::UUID, '2025-09-05', '2025-09-13', 45, 24500000, 'open',      'Keberangkatan September — via Jeddah',       'm1000000-0000-0000-0000-000000000003'::UUID, 'b1000000-0000-0000-0000-000000000002'::UUID),
  (3, 'p1000000-0000-0000-0000-000000000002'::UUID, '2025-08-20', '2025-08-28', 30, 38500000, 'open',      'Paket VIP Agustus — kursi terbatas',         'm1000000-0000-0000-0000-000000000001'::UUID, 'b1000000-0000-0000-0000-000000000001'::UUID),
  (4, 'p1000000-0000-0000-0000-000000000003'::UUID, '2025-10-01', '2025-10-14', 35, 47000000, 'open',      'Umroh + Turki Oktober — pendaftaran dibuka',  'm1000000-0000-0000-0000-000000000004'::UUID, 'b1000000-0000-0000-0000-000000000001'::UUID),
  (5, 'p1000000-0000-0000-0000-000000000004'::UUID, '2026-02-20', '2026-03-06', 40, 52000000, 'open',      'Umroh Ramadhan 1447H — daftar sekarang',     'm1000000-0000-0000-0000-000000000001'::UUID, 'b1000000-0000-0000-0000-000000000003'::UUID)
) AS t(seq, pkg_id, dep_date, ret_date, quota, price, status, notes, muth_id, branch_id)
ON CONFLICT DO NOTHING;


-- =============================================================================
-- 7. AGEN
-- =============================================================================
INSERT INTO agents (id, company_name, agent_code, contact_person, phone, email,
  city, province, branch_id, commission_rate, status, is_active)
VALUES
  ('a1000000-0000-0000-0000-000000000001', 'CV Barokah Tour & Travel',  'AGT-JKT-001', 'Drs. Wahyu Hidayat',    '081211110001', 'wahyu@barokahtour.co.id',  'Jakarta Selatan', 'DKI Jakarta',  'b1000000-0000-0000-0000-000000000001', 3.5, 'active', TRUE),
  ('a1000000-0000-0000-0000-000000000002', 'UD Nur Ilahi Travel',        'AGT-SBY-001', 'Ibu Siti Rahayu',       '081222220002', 'siti@nurilahi.co.id',      'Surabaya',        'Jawa Timur',   'b1000000-0000-0000-0000-000000000002', 3.0, 'active', TRUE),
  ('a1000000-0000-0000-0000-000000000003', 'PT Baitullah Nusantara',     'AGT-BDG-001', 'Bpk. Asep Suryadi',     '081233330003', 'asep@baitullah.co.id',     'Bandung',         'Jawa Barat',   'b1000000-0000-0000-0000-000000000003', 2.5, 'active', TRUE)
ON CONFLICT DO NOTHING;


-- =============================================================================
-- 8. KARYAWAN (tanpa akun Auth — untuk data master)
-- =============================================================================
INSERT INTO employees (id, full_name, employee_code, position, department,
  phone, email, branch_id, hire_date, employment_status, salary_base)
VALUES
  ('e1000000-0000-0000-0000-000000000001', 'Budi Hartono',       'EMP-JKT-001', 'Kepala Cabang',       'Manajemen',    '081311110001', 'budi.hartono@vinstour.com',    'b1000000-0000-0000-0000-000000000001', '2019-03-01', 'active', 12000000),
  ('e1000000-0000-0000-0000-000000000002', 'Dewi Kartika',       'EMP-JKT-002', 'Sales Manager',       'Penjualan',    '081311110002', 'dewi.kartika@vinstour.com',    'b1000000-0000-0000-0000-000000000001', '2020-06-15', 'active',  9500000),
  ('e1000000-0000-0000-0000-000000000003', 'Fajar Nugroho',      'EMP-JKT-003', 'Staff Operasional',   'Operasional',  '081311110003', 'fajar.nugroho@vinstour.com',   'b1000000-0000-0000-0000-000000000001', '2021-01-10', 'active',  6500000),
  ('e1000000-0000-0000-0000-000000000004', 'Sari Wulandari',     'EMP-JKT-004', 'Staff Keuangan',      'Keuangan',     '081311110004', 'sari.wulandari@vinstour.com',  'b1000000-0000-0000-0000-000000000001', '2021-07-01', 'active',  7000000),
  ('e1000000-0000-0000-0000-000000000005', 'Ahmad Ridwan',       'EMP-SBY-001', 'Kepala Cabang',       'Manajemen',    '081322220001', 'ahmad.ridwan@vinstour.com',    'b1000000-0000-0000-0000-000000000002', '2020-01-15', 'active', 11000000),
  ('e1000000-0000-0000-0000-000000000006', 'Nur Azizah',         'EMP-SBY-002', 'Customer Service',    'Penjualan',    '081322220002', 'nur.azizah@vinstour.com',      'b1000000-0000-0000-0000-000000000002', '2022-03-01', 'active',  5500000),
  ('e1000000-0000-0000-0000-000000000007', 'Rizky Firmansyah',   'EMP-BDG-001', 'Kepala Cabang',       'Manajemen',    '081333330001', 'rizky.firmansyah@vinstour.com','b1000000-0000-0000-0000-000000000003', '2021-09-01', 'active', 10500000),
  ('e1000000-0000-0000-0000-000000000008', 'Laila Maghfiroh',    'EMP-BDG-002', 'Staff Marketing',     'Marketing',    '081333330002', 'laila.maghfiroh@vinstour.com', 'b1000000-0000-0000-0000-000000000003', '2022-08-15', 'active',  5800000)
ON CONFLICT DO NOTHING;


-- =============================================================================
-- 9. JAMAAH / CUSTOMERS (user_id NULL — tidak terhubung Auth)
-- =============================================================================
INSERT INTO customers (id, full_name, nik, passport_number, passport_expiry,
  gender, birth_date, phone, email, address, city, province,
  branch_id, agent_id, status)
VALUES
  -- Jamaah Jakarta
  ('c1000000-0000-0000-0000-000000000001', 'H. Suparman Wibowo',       '3174012501700001', 'A1234561', '2027-06-30', 'male',   '1970-01-25', '081411111001', 'suparman.w@gmail.com',    'Jl. Kebayoran Baru No.12',       'Jakarta Selatan', 'DKI Jakarta',  'b1000000-0000-0000-0000-000000000001', NULL,                                    'active'),
  ('c1000000-0000-0000-0000-000000000002', 'Hj. Sri Wahyuni',          '3174015506720002', 'A1234562', '2027-08-15', 'female', '1972-06-15', '081411111002', 'sri.wahyuni@gmail.com',   'Jl. Kebayoran Baru No.12',       'Jakarta Selatan', 'DKI Jakarta',  'b1000000-0000-0000-0000-000000000001', NULL,                                    'active'),
  ('c1000000-0000-0000-0000-000000000003', 'Drs. Hendra Kusuma',       '3171030809780003', 'B2345671', '2026-11-20', 'male',   '1978-09-08', '081411111003', 'hendra.k@yahoo.com',      'Jl. Fatmawati No.88 Blok D',     'Jakarta Selatan', 'DKI Jakarta',  'b1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'active'),
  ('c1000000-0000-0000-0000-000000000004', 'Ir. Bambang Prasetyo',     '3175041204650004', 'B2345672', '2028-03-10', 'male',   '1965-04-12', '081411111004', 'bambang.p@gmail.com',     'Jl. Pondok Indah No.5',          'Jakarta Selatan', 'DKI Jakarta',  'b1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'active'),
  ('c1000000-0000-0000-0000-000000000005', 'Ibu Endang Susilo',        '3175042205680005', 'B2345673', '2028-05-22', 'female', '1968-05-22', '081411111005', 'endang.s@gmail.com',      'Jl. Pondok Indah No.5',          'Jakarta Selatan', 'DKI Jakarta',  'b1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'active'),
  ('c1000000-0000-0000-0000-000000000006', 'Muhammad Irfan Hakim',     '3174010101850006', 'C3456781', '2029-01-01', 'male',   '1985-01-01', '081411111006', 'irfan.hakim@gmail.com',   'Jl. Permata Hijau No.33',        'Jakarta Selatan', 'DKI Jakarta',  'b1000000-0000-0000-0000-000000000001', NULL,                                    'active'),
  ('c1000000-0000-0000-0000-000000000007', 'Ani Rahmawati',            '3174014404900007', 'C3456782', '2029-04-04', 'female', '1990-04-04', '081411111007', 'ani.rahmawati@gmail.com', 'Jl. Tebet Barat No.17',          'Jakarta Selatan', 'DKI Jakarta',  'b1000000-0000-0000-0000-000000000001', NULL,                                    'active'),
  -- Jamaah Surabaya
  ('c1000000-0000-0000-0000-000000000008', 'KH. Mochammad Syukri',     '3578010202550008', 'D4567891', '2027-02-02', 'male',   '1955-02-02', '081522220001', 'kyai.syukri@gmail.com',   'Jl. Darmo No.100',               'Surabaya',        'Jawa Timur',   'b1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000002', 'active'),
  ('c1000000-0000-0000-0000-000000000009', 'Hj. Fatimah Azzahra',      '3578014503580009', 'D4567892', '2027-03-15', 'female', '1958-03-15', '081522220002', 'fatimah.az@gmail.com',    'Jl. Darmo No.100',               'Surabaya',        'Jawa Timur',   'b1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000002', 'active'),
  ('c1000000-0000-0000-0000-000000000010', 'Dian Permatasari',         '3578012006900010', 'E5678901', '2028-06-20', 'female', '1990-06-20', '081522220003', 'dian.perm@gmail.com',     'Jl. Raya Gubeng No.45 Apt 8B',   'Surabaya',        'Jawa Timur',   'b1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000002', 'active'),
  ('c1000000-0000-0000-0000-000000000011', 'Agus Setiawan',            '3578013107870011', 'E5678902', '2028-07-31', 'male',   '1987-07-31', '081522220004', 'agus.seti@gmail.com',     'Jl. Pemuda No.23',               'Surabaya',        'Jawa Timur',   'b1000000-0000-0000-0000-000000000002', NULL,                                    'active'),
  ('c1000000-0000-0000-0000-000000000012', 'Rina Marlina',             '3578012809920012', 'F6789011', '2029-09-28', 'female', '1992-09-28', '081522220005', 'rina.marlina@gmail.com',  'Jl. Ahmad Yani No.77',           'Surabaya',        'Jawa Timur',   'b1000000-0000-0000-0000-000000000002', NULL,                                    'active'),
  -- Jamaah Bandung
  ('c1000000-0000-0000-0000-000000000013', 'Prof. Dr. Hj. Aminah',     '3273010110490013', 'G7890121', '2026-10-01', 'female', '1949-10-01', '081633330001', 'prof.aminah@gmail.com',   'Jl. Dago No.15',                 'Bandung',         'Jawa Barat',   'b1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000003', 'active'),
  ('c1000000-0000-0000-0000-000000000014', 'Ridwan Gunawan',           '3273010205760014', 'G7890122', '2026-05-02', 'male',   '1976-05-02', '081633330002', 'ridwan.g@gmail.com',      'Jl. Buah Batu No.88',            'Bandung',         'Jawa Barat',   'b1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000003', 'active'),
  ('c1000000-0000-0000-0000-000000000015', 'Nenden Susilawati',        '3273014403800015', 'H8901231', '2029-03-04', 'female', '1980-03-04', '081633330003', 'nenden.s@gmail.com',      'Jl. Riau No.22',                 'Bandung',         'Jawa Barat',   'b1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000003', 'active'),
  ('c1000000-0000-0000-0000-000000000016', 'Asep Mulyana',             '3273010606830016', 'H8901232', '2028-06-06', 'male',   '1983-06-06', '081633330004', 'asep.m@gmail.com',        'Jl. Setiabudi No.55',            'Bandung',         'Jawa Barat',   'b1000000-0000-0000-0000-000000000003', NULL,                                    'active'),
  ('c1000000-0000-0000-0000-000000000017', 'Yuli Andriani',            '3273012012880017', 'I9012341', '2028-12-20', 'female', '1988-12-20', '081633330005', 'yuli.a@gmail.com',        'Jl. Sukajadi No.33',             'Bandung',         'Jawa Barat',   'b1000000-0000-0000-0000-000000000003', NULL,                                    'active'),
  ('c1000000-0000-0000-0000-000000000018', 'Dede Rahmat',              '3273011503920018', 'I9012342', '2028-03-15', 'male',   '1992-03-15', '081633330006', 'dede.r@gmail.com',        'Jl. Cihampelas No.10',           'Bandung',         'Jawa Barat',   'b1000000-0000-0000-0000-000000000003', NULL,                                    'active'),
  ('c1000000-0000-0000-0000-000000000019', 'Tuti Handayani',           '3274014108750019', 'J0123451', '2027-08-01', 'female', '1975-08-01', '081411111019', 'tuti.h@gmail.com',        'Jl. Karet Baru No.4',            'Jakarta Pusat',   'DKI Jakarta',  'b1000000-0000-0000-0000-000000000001', NULL,                                    'active'),
  ('c1000000-0000-0000-0000-000000000020', 'Rudi Hermawan',            '3174011009800020', 'J0123452', '2029-09-10', 'male',   '1980-09-10', '081411111020', 'rudi.h@gmail.com',        'Jl. Thamrin No.99 Unit 2A',      'Jakarta Pusat',   'DKI Jakarta',  'b1000000-0000-0000-0000-000000000001', NULL,                                    'active')
ON CONFLICT DO NOTHING;


-- =============================================================================
-- 10. BOOKING
-- =============================================================================
INSERT INTO bookings (id, booking_code, customer_id, departure_id,
  total_pax, total_price, paid_amount, payment_status, status,
  notes, branch_id, agent_id, payment_deadline)
VALUES
  -- Keberangkatan 1 (Reguler Agustus)
  ('bk100000-0000-0000-0000-000000000001', 'VT-2025-0001', 'c1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001', 2, 49000000, 49000000, 'paid',    'confirmed', 'Suami istri, kamar twin',           'b1000000-0000-0000-0000-000000000001', NULL,                                    '2025-07-10'),
  ('bk100000-0000-0000-0000-000000000002', 'VT-2025-0002', 'c1000000-0000-0000-0000-000000000003', 'd1000000-0000-0000-0000-000000000001', 1, 24500000, 12250000, 'partial', 'confirmed', 'DP 50%, sisa bayar H-30',            'b1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', '2025-07-11'),
  ('bk100000-0000-0000-0000-000000000003', 'VT-2025-0003', 'c1000000-0000-0000-0000-000000000004', 'd1000000-0000-0000-0000-000000000001', 2, 49000000, 14700000, 'partial', 'confirmed', 'Paket keluarga, kursi berdampingan', 'b1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', '2025-07-15'),
  ('bk100000-0000-0000-0000-000000000004', 'VT-2025-0004', 'c1000000-0000-0000-0000-000000000006', 'd1000000-0000-0000-0000-000000000001', 1, 24500000,        0, 'unpaid',  'pending',   'Menunggu DP dari jamaah',            'b1000000-0000-0000-0000-000000000001', NULL,                                    '2025-07-20'),
  -- Keberangkatan 2 (Reguler September)
  ('bk100000-0000-0000-0000-000000000005', 'VT-2025-0005', 'c1000000-0000-0000-0000-000000000008', 'd1000000-0000-0000-0000-000000000002', 2, 49000000, 49000000, 'paid',    'confirmed', 'Pasangan suami istri, kamar twin',   'b1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000002', '2025-08-01'),
  ('bk100000-0000-0000-0000-000000000006', 'VT-2025-0006', 'c1000000-0000-0000-0000-000000000010', 'd1000000-0000-0000-0000-000000000002', 1, 24500000, 24500000, 'paid',    'confirmed', NULL,                                 'b1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000002', '2025-08-05'),
  ('bk100000-0000-0000-0000-000000000007', 'VT-2025-0007', 'c1000000-0000-0000-0000-000000000011', 'd1000000-0000-0000-0000-000000000002', 1, 24500000,  7350000, 'partial', 'confirmed', 'DP 30%',                             'b1000000-0000-0000-0000-000000000002', NULL,                                    '2025-08-10'),
  ('bk100000-0000-0000-0000-000000000008', 'VT-2025-0008', 'c1000000-0000-0000-0000-000000000012', 'd1000000-0000-0000-0000-000000000002', 1, 24500000,        0, 'unpaid',  'pending',   'Baru daftar, menunggu DP',           'b1000000-0000-0000-0000-000000000002', NULL,                                    '2025-08-12'),
  -- Keberangkatan 3 (VIP Agustus)
  ('bk100000-0000-0000-0000-000000000009', 'VT-2025-0009', 'c1000000-0000-0000-0000-000000000013', 'd1000000-0000-0000-0000-000000000003', 1, 38500000, 38500000, 'paid',    'confirmed', 'Jamaah lansia, butuh kursi roda',    'b1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000003', '2025-07-15'),
  ('bk100000-0000-0000-0000-000000000010', 'VT-2025-0010', 'c1000000-0000-0000-0000-000000000014', 'd1000000-0000-0000-0000-000000000003', 1, 38500000, 19250000, 'partial', 'confirmed', 'DP 50%',                             'b1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000003', '2025-07-18'),
  ('bk100000-0000-0000-0000-000000000011', 'VT-2025-0011', 'c1000000-0000-0000-0000-000000000007', 'd1000000-0000-0000-0000-000000000003', 1, 38500000, 38500000, 'paid',    'confirmed', NULL,                                 'b1000000-0000-0000-0000-000000000001', NULL,                                    '2025-07-10'),
  -- Keberangkatan 4 (Plus Turki Oktober)
  ('bk100000-0000-0000-0000-000000000012', 'VT-2025-0012', 'c1000000-0000-0000-0000-000000000015', 'd1000000-0000-0000-0000-000000000004', 2, 94000000, 28200000, 'partial', 'confirmed', 'Suami istri, DP 30%',                'b1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000003', '2025-08-20'),
  ('bk100000-0000-0000-0000-000000000013', 'VT-2025-0013', 'c1000000-0000-0000-0000-000000000016', 'd1000000-0000-0000-0000-000000000004', 1, 47000000, 14100000, 'partial', 'confirmed', 'DP 30%, akan lunas bulan depan',     'b1000000-0000-0000-0000-000000000003', NULL,                                    '2025-08-25'),
  ('bk100000-0000-0000-0000-000000000014', 'VT-2025-0014', 'c1000000-0000-0000-0000-000000000019', 'd1000000-0000-0000-0000-000000000004', 1, 47000000,        0, 'unpaid',  'pending',   'Menunggu konfirmasi jamaah',          'b1000000-0000-0000-0000-000000000001', NULL,                                    '2025-08-30'),
  -- Keberangkatan 5 (Ramadhan)
  ('bk100000-0000-0000-0000-000000000015', 'VT-2025-0015', 'c1000000-0000-0000-0000-000000000017', 'd1000000-0000-0000-0000-000000000005', 1, 52000000, 15600000, 'partial', 'confirmed', 'DP 30%, cicil tiap bulan',           'b1000000-0000-0000-0000-000000000003', NULL,                                    '2026-01-20'),
  ('bk100000-0000-0000-0000-000000000016', 'VT-2025-0016', 'c1000000-0000-0000-0000-000000000018', 'd1000000-0000-0000-0000-000000000005', 1, 52000000,        0, 'unpaid',  'pending',   'Baru mendaftar',                     'b1000000-0000-0000-0000-000000000003', NULL,                                    '2025-12-01'),
  ('bk100000-0000-0000-0000-000000000017', 'VT-2025-0017', 'c1000000-0000-0000-0000-000000000020', 'd1000000-0000-0000-0000-000000000005', 2, 104000000,31200000, 'partial', 'confirmed', 'Suami istri paket Ramadhan',          'b1000000-0000-0000-0000-000000000001', NULL,                                    '2026-01-10'),
  ('bk100000-0000-0000-0000-000000000018', 'VT-2025-0018', 'c1000000-0000-0000-0000-000000000009', 'd1000000-0000-0000-0000-000000000005', 1, 52000000, 52000000, 'paid',    'confirmed', 'Lunas dimuka',                       'b1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000002', '2026-01-20')
ON CONFLICT DO NOTHING;


-- =============================================================================
-- 11. BOOKING STATUS HISTORY
-- =============================================================================
INSERT INTO booking_status_history (booking_id, status, notes, created_at)
SELECT id, 'pending', 'Booking dibuat, menunggu pembayaran DP', NOW() - INTERVAL '30 days'
FROM bookings WHERE id LIKE 'bk100000%'
ON CONFLICT DO NOTHING;

INSERT INTO booking_status_history (booking_id, status, notes, created_at)
SELECT id, 'confirmed', 'DP diterima, booking dikonfirmasi', NOW() - INTERVAL '25 days'
FROM bookings WHERE id LIKE 'bk100000%' AND status = 'confirmed'
ON CONFLICT DO NOTHING;


-- =============================================================================
-- 12. LEADS (Prospek Calon Jamaah)
-- =============================================================================
INSERT INTO leads (id, name, phone, email, source, branch_id, agent_id, status, notes, package_interest)
VALUES
  ('l1000000-0000-0000-0000-000000000001', 'Pak Surya Darma',     '081500001001', 'surya.darma@gmail.com',   'instagram',  'b1000000-0000-0000-0000-000000000001', NULL,                                    'contacted',  'Tanya paket untuk keluarga 4 orang', 'Umroh Reguler 9 Hari'),
  ('l1000000-0000-0000-0000-000000000002', 'Bu Intan Permata',    '081500001002', 'intan.p@gmail.com',       'whatsapp',   'b1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'qualified',  'Siap daftar bulan depan, budget 25 juta', 'Umroh VIP 9 Hari'),
  ('l1000000-0000-0000-0000-000000000003', 'Pak Hadi Santoso',    '081500001003', NULL,                      'referral',   'b1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'new',        'Direferensikan oleh H. Suparman',   'Umroh Reguler 9 Hari'),
  ('l1000000-0000-0000-0000-000000000004', 'Pak Gunawan',         '081500001004', 'gunawan@gmail.com',       'facebook',   'b1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000002', 'contacted',  'Tertarik paket umroh Oktober',      'Umroh Plus Turki 14 Hari'),
  ('l1000000-0000-0000-0000-000000000005', 'Bu Lestari',          '081500001005', 'lestari@gmail.com',       'website',    'b1000000-0000-0000-0000-000000000002', NULL,                                    'qualified',  'Ingin umroh bulan Agustus',         'Umroh Reguler 9 Hari'),
  ('l1000000-0000-0000-0000-000000000006', 'Pak Andi Wijaya',     '081500001006', 'andi.w@gmail.com',        'instagram',  'b1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000002', 'new',        'Baru tanya harga saja',             'Umroh VIP 9 Hari'),
  ('l1000000-0000-0000-0000-000000000007', 'Bu Nurul Hidayah',    '081500001007', 'nurul.h@gmail.com',       'referral',   'b1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000003', 'qualified',  'Mau umroh Ramadhan tahun depan',    'Umroh Ramadhan 15 Hari'),
  ('l1000000-0000-0000-0000-000000000008', 'Pak Tono Prakoso',    '081500001008', NULL,                      'direct',     'b1000000-0000-0000-0000-000000000003', NULL,                                    'contacted',  'Datang langsung ke kantor',         'Umroh Reguler 9 Hari'),
  ('l1000000-0000-0000-0000-000000000009', 'Bu Sinta Dewi',       '081500001009', 'sinta.d@gmail.com',       'whatsapp',   'b1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000003', 'converted',  'Sudah jadi jamaah — bk VT-2025-0015','Umroh Ramadhan 15 Hari'),
  ('l1000000-0000-0000-0000-000000000010', 'Pak Reza Pahlevi',    '081500001010', 'reza.p@gmail.com',        'instagram',  'b1000000-0000-0000-0000-000000000001', NULL,                                    'lost',       'Pilih kompetitor karena harga',     'Umroh Reguler 9 Hari')
ON CONFLICT DO NOTHING;


-- =============================================================================
-- 13. TABUNGAN (Savings Plans)
-- =============================================================================
INSERT INTO savings_plans (id, customer_id, target_package_id, target_amount,
  current_amount, monthly_target, start_date, target_date, status, notes)
VALUES
  ('sp100000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000018', 'p1000000-0000-0000-0000-000000000001', 24500000,  4900000, 2000000, '2025-01-01', '2026-01-01', 'active', 'Tabungan umroh reguler 12 bulan'),
  ('sp100000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000012', 'p1000000-0000-0000-0000-000000000003', 47000000, 11750000, 4000000, '2024-10-01', '2025-10-01', 'active', 'Tabungan paket umroh plus Turki'),
  ('sp100000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000020', 'p1000000-0000-0000-0000-000000000004', 52000000,  7800000, 3000000, '2025-03-01', '2026-03-01', 'active', 'Tabungan umroh Ramadhan bersama istri')
ON CONFLICT DO NOTHING;

INSERT INTO savings_deposits (plan_id, amount, deposit_date, notes)
SELECT sp.id, dep.amount, dep.dep_date::DATE, dep.notes
FROM savings_plans sp
CROSS JOIN LATERAL (VALUES
  (2000000::NUMERIC, (NOW() - INTERVAL '90 days')::TEXT, 'Setoran pertama'),
  (2000000::NUMERIC, (NOW() - INTERVAL '60 days')::TEXT, 'Setoran rutin bulanan'),
  (2000000::NUMERIC, (NOW() - INTERVAL '30 days')::TEXT, 'Setoran rutin bulanan')
) AS dep(amount, dep_date, notes)
WHERE sp.id LIKE 'sp100000%';


-- =============================================================================
-- 14. KUPON (Coupons)
-- =============================================================================
INSERT INTO coupons (id, code, name, type, value, min_order_amount,
  max_uses, used_count, valid_from, valid_until, is_active, description)
VALUES
  ('cp100000-0000-0000-0000-000000000001', 'UMROH500K',   'Diskon 500rb Umroh Reguler',  'fixed',      500000,  20000000, 50, 12, '2025-07-01', '2025-12-31', TRUE, 'Berlaku untuk paket Umroh Reguler & VIP. Tidak berlaku untuk Haji.'),
  ('cp100000-0000-0000-0000-000000000002', 'RAMADHAN5',   'Diskon 5% Umroh Ramadhan',    'percentage',      5,  40000000, 30,  5, '2025-07-01', '2025-11-30', TRUE, 'Khusus pendaftaran Umroh Ramadhan 1447H. Maks diskon Rp 3.000.000.'),
  ('cp100000-0000-0000-0000-000000000003', 'EARLYBIRD1M', 'Early Bird Hemat 1 Juta',     'fixed',     1000000,  45000000, 20,  8, '2025-07-01', '2025-08-31', TRUE, 'Early bird keberangkatan Oktober & Ramadhan. Daftar sekarang!')
ON CONFLICT DO NOTHING;


-- =============================================================================
-- 15. PENGUMUMAN (Announcements)
-- =============================================================================
INSERT INTO announcements (id, title, content, type, is_published, published_at, branch_id)
VALUES
  (
    'an100000-0000-0000-0000-000000000001',
    'Pembukaan Pendaftaran Umroh Ramadhan 1447H',
    'Alhamdulillah, pendaftaran Umroh Ramadhan 1447H (Feb-Maret 2026) resmi dibuka. Dapatkan harga early bird dan bonus perlengkapan eksklusif untuk 20 pendaftar pertama. Hubungi cabang terdekat atau WhatsApp 0811-1234-567 untuk informasi lengkap.',
    'info', TRUE, NOW() - INTERVAL '7 days', NULL
  ),
  (
    'an100000-0000-0000-0000-000000000002',
    'Update Aturan Bagasi Saudi Arabian Airlines 2025',
    'Mulai 1 Agustus 2025, Saudi Arabian Airlines memberlakukan aturan bagasi baru untuk rute Indonesia-Arab Saudi. Bagasi tercatat: 2x 23kg. Barang bawaan kabin: 1x 7kg. Pastikan jamaah memperhatikan aturan ini untuk menghindari biaya kelebihan bagasi.',
    'info', TRUE, NOW() - INTERVAL '3 days', NULL
  ),
  (
    'an100000-0000-0000-0000-000000000003',
    'Manasik Umroh Agustus — Jadwal & Lokasi',
    'Manasik umroh untuk keberangkatan Agustus 2025 akan dilaksanakan pada Sabtu, 2 Agustus 2025 pukul 08.00 WIB di Masjid Al-Ikhlas, Jl. Sudirman No.45 Jakarta Pusat. Jamaah wajib hadir. Bawa buku panduan manasik dan perlengkapan umroh untuk dicek.',
    'urgent', TRUE, NOW() - INTERVAL '1 day', 'b1000000-0000-0000-0000-000000000001'
  )
ON CONFLICT DO NOTHING;


-- =============================================================================
-- 16. BANNER
-- =============================================================================
INSERT INTO banners (id, title, subtitle, image_url, link_url, sort_order, is_active, branch_id)
VALUES
  ('bn100000-0000-0000-0000-000000000001', 'Umroh Ramadhan 1447H',        'Rasakan Keistimewaan Ibadah di Bulan Suci — Daftar Sekarang!',          'https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?w=1200', '/packages/umroh-ramadhan', 1, TRUE, NULL),
  ('bn100000-0000-0000-0000-000000000002', 'Umroh Plus Turki — Oktober',  'Gabungkan Ibadah Umroh & Wisata Sejarah Islam di Istanbul',             'https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?w=1200', '/packages/umroh-turki',    2, TRUE, NULL),
  ('bn100000-0000-0000-0000-000000000003', 'Promo Early Bird Hemat 1 Juta','Daftar Sebelum 31 Agustus 2025 — Gunakan Kode: EARLYBIRD1M',            'https://images.unsplash.com/photo-1570338037756-21e16f33df1c?w=1200', '/promo',                   3, TRUE, NULL)
ON CONFLICT DO NOTHING;


-- =============================================================================
-- VERIFIKASI AKHIR
-- =============================================================================
SELECT
  'branches'   AS entity, COUNT(*) AS total FROM branches   WHERE id LIKE 'b1000000%' UNION ALL
SELECT 'hotels',      COUNT(*) FROM hotels     WHERE id LIKE 'h1000000%' UNION ALL
SELECT 'vendors',     COUNT(*) FROM vendors    WHERE id LIKE 'v1000000%' UNION ALL
SELECT 'muthawifs',   COUNT(*) FROM muthawifs  WHERE id LIKE 'm1000000%' UNION ALL
SELECT 'packages',    COUNT(*) FROM packages   WHERE id LIKE 'p1000000%' UNION ALL
SELECT 'departures',  COUNT(*) FROM departures WHERE id LIKE 'd1000000%' UNION ALL
SELECT 'employees',   COUNT(*) FROM employees  WHERE id LIKE 'e1000000%' UNION ALL
SELECT 'customers',   COUNT(*) FROM customers  WHERE id LIKE 'c1000000%' UNION ALL
SELECT 'bookings',    COUNT(*) FROM bookings   WHERE id LIKE 'bk100000%' UNION ALL
SELECT 'leads',       COUNT(*) FROM leads      WHERE id LIKE 'l1000000%' UNION ALL
SELECT 'savings',     COUNT(*) FROM savings_plans WHERE id LIKE 'sp100000%' UNION ALL
SELECT 'coupons',     COUNT(*) FROM coupons    WHERE id LIKE 'cp100000%' UNION ALL
SELECT 'announcements',COUNT(*) FROM announcements WHERE id LIKE 'an100000%' UNION ALL
SELECT 'banners',     COUNT(*) FROM banners    WHERE id LIKE 'bn100000%'
ORDER BY entity;

COMMIT;

-- =============================================================================
-- SELESAI — File 11: Dummy Data
-- =============================================================================
SELECT 'File 11 — Dummy Data: selesai. Data contoh siap digunakan.' AS result;
