-- =============================================================================
-- VINSTOUR TRAVEL PORTAL — Seeds
-- FILE: seed_dummy_data.sql
-- Demo / development data: sample packages, departures, a branch, customers.
-- ⚠️  WARNING: Only run this in DEVELOPMENT / STAGING environments.
--              Do NOT run in production.
-- Safe to re-run — uses ON CONFLICT / upsert patterns.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. SAMPLE BRANCH
-- ---------------------------------------------------------------------------
INSERT INTO public.branches (id, name, code, slug, city, province, is_active)
VALUES (
  '10000000-0000-0000-0000-000000000001',
  'Kantor Pusat Jakarta',
  'JKT-PUSAT',
  'jakarta-pusat',
  'Jakarta',
  'DKI Jakarta',
  TRUE
)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. SAMPLE PACKAGES
-- ---------------------------------------------------------------------------
-- Ensure we have at least one airline and hotel to reference
-- (These will be inserted by seed_master_data.sql, but we guard here)
DO $$
DECLARE
  v_airline_id UUID;
  v_hotel_makkah_id UUID;
  v_hotel_madinah_id UUID;
  v_pkg_regular UUID  := '20000000-0000-0000-0000-000000000001';
  v_pkg_premium UUID  := '20000000-0000-0000-0000-000000000002';
  v_pkg_ramadhan UUID := '20000000-0000-0000-0000-000000000003';
  v_dep1 UUID := '30000000-0000-0000-0000-000000000001';
  v_dep2 UUID := '30000000-0000-0000-0000-000000000002';
  v_dep3 UUID := '30000000-0000-0000-0000-000000000003';
  v_dep4 UUID := '30000000-0000-0000-0000-000000000004';
BEGIN
  -- Pick first available airline and hotels
  SELECT id INTO v_airline_id FROM public.airlines WHERE iata_code = 'GA' LIMIT 1;
  SELECT id INTO v_hotel_makkah_id  FROM public.hotels WHERE city = 'makkah'  LIMIT 1;
  SELECT id INTO v_hotel_madinah_id FROM public.hotels WHERE city = 'madinah' LIMIT 1;

  -- Package 1: Umroh Reguler
  INSERT INTO public.packages (
    id, name, code, slug, package_type,
    airline_id, hotel_makkah_id, hotel_madinah_id,
    hotel_makkah_nights, hotel_madinah_nights,
    duration_days,
    base_price_quad, base_price_triple, base_price_double, base_price_single,
    includes, description,
    is_published, is_featured, sort_order
  ) VALUES (
    v_pkg_regular,
    'Umroh Reguler Bintang 4 - 9 Hari', 'UMR-REG-9H',
    'umroh-reguler-bintang-4-9-hari', 'umroh',
    v_airline_id, v_hotel_makkah_id, v_hotel_madinah_id,
    4, 4, 9,
    27500000, 29000000, 32000000, 38000000,
    ARRAY['Tiket pesawat PP kelas ekonomi',
          'Hotel bintang 4 dekat Masjidil Haram',
          'Hotel bintang 4 dekat Masjid Nabawi',
          'Visa umroh', 'Transportasi AC', 'Muthawif berpengalaman',
          'Perlengkapan umroh (koper, baju ihram, sabuk, dll)',
          'Asuransi perjalanan', 'Manasik umroh'],
    'Paket umroh reguler 9 hari dengan akomodasi hotel bintang 4 di Mekkah dan Madinah. ' ||
    'Paket terlengkap dengan bimbingan muthawif berpengalaman dan fasilitas nyaman untuk ibadah optimal.',
    TRUE, TRUE, 1
  )
  ON CONFLICT (id) DO NOTHING;

  -- Package 2: Umroh Premium
  INSERT INTO public.packages (
    id, name, code, slug, package_type,
    airline_id, hotel_makkah_id, hotel_madinah_id,
    hotel_makkah_nights, hotel_madinah_nights,
    duration_days,
    base_price_quad, base_price_triple, base_price_double, base_price_single,
    includes, description,
    is_published, is_featured, sort_order
  ) VALUES (
    v_pkg_premium,
    'Umroh Premium Bintang 5 - 12 Hari', 'UMR-PRM-12H',
    'umroh-premium-bintang-5-12-hari', 'umroh',
    v_airline_id, v_hotel_makkah_id, v_hotel_madinah_id,
    6, 5, 12,
    42000000, 45000000, 50000000, 62000000,
    ARRAY['Tiket pesawat kelas bisnis',
          'Hotel bintang 5 dalam jarak 100m dari Masjidil Haram',
          'Hotel bintang 5 dekat Masjid Nabawi',
          'Visa umroh', 'Transportasi VIP AC',
          'Muthawif senior berpengalaman',
          'Perlengkapan umroh premium',
          'Asuransi perjalanan comprehensive',
          'Manasik umroh eksklusif',
          'Konsultasi pre-departure 1-on-1'],
    'Paket umroh premium 12 hari dengan hotel bintang 5 paling dekat Masjidil Haram. ' ||
    'Layanan VIP dengan muthawif senior dan fasilitas kelas atas untuk pengalaman ibadah terbaik.',
    TRUE, TRUE, 2
  )
  ON CONFLICT (id) DO NOTHING;

  -- Package 3: Umroh Ramadhan
  INSERT INTO public.packages (
    id, name, code, slug, package_type,
    airline_id, hotel_makkah_id, hotel_madinah_id,
    hotel_makkah_nights, hotel_madinah_nights,
    duration_days,
    base_price_quad, base_price_triple, base_price_double, base_price_single,
    includes, description,
    is_published, is_featured, sort_order
  ) VALUES (
    v_pkg_ramadhan,
    'Umroh Ramadhan Spesial - 15 Hari', 'UMR-RMD-15H',
    'umroh-ramadhan-spesial-15-hari', 'umroh',
    v_airline_id, v_hotel_makkah_id, v_hotel_madinah_id,
    8, 6, 15,
    55000000, 58000000, 65000000, 78000000,
    ARRAY['Tiket pesawat PP',
          'Hotel bintang 4+ Mekkah & Madinah',
          'Visa umroh', 'Transportasi AC',
          'Muthawif berpengalaman',
          'Buka puasa & sahur selama Ramadhan',
          'Perlengkapan umroh',
          'Asuransi perjalanan',
          'Sertifikat umroh Ramadhan'],
    'Paket umroh spesial Ramadhan 15 hari — rasakan keistimewaan ibadah di bulan suci. ' ||
    'Termasuk program buka puasa bersama dan sahur selama di Tanah Suci.',
    TRUE, FALSE, 3
  )
  ON CONFLICT (id) DO NOTHING;

  -- ---------------------------------------------------------------------------
  -- 3. SAMPLE DEPARTURES
  -- ---------------------------------------------------------------------------
  -- Departure 1: Next month
  INSERT INTO public.departures (
    id, package_id, airline_id,
    hotel_makkah_id, hotel_madinah_id,
    departure_date, return_date,
    quota, available_seats, status,
    price_quad, price_triple, price_double, price_single,
    flight_number, embarkation_city,
    branch_id
  ) VALUES (
    v_dep1, v_pkg_regular, v_airline_id,
    v_hotel_makkah_id, v_hotel_madinah_id,
    CURRENT_DATE + INTERVAL '45 days',
    CURRENT_DATE + INTERVAL '54 days',
    40, 35, 'open',
    27500000, 29000000, 32000000, 38000000,
    'GA-771', 'Jakarta (CGK)',
    '10000000-0000-0000-0000-000000000001'
  )
  ON CONFLICT (id) DO NOTHING;

  -- Departure 2: 2 months from now
  INSERT INTO public.departures (
    id, package_id, airline_id,
    hotel_makkah_id, hotel_madinah_id,
    departure_date, return_date,
    quota, available_seats, status,
    price_quad, price_triple, price_double, price_single,
    flight_number, embarkation_city,
    branch_id
  ) VALUES (
    v_dep2, v_pkg_regular, v_airline_id,
    v_hotel_makkah_id, v_hotel_madinah_id,
    CURRENT_DATE + INTERVAL '75 days',
    CURRENT_DATE + INTERVAL '84 days',
    40, 40, 'open',
    27500000, 29000000, 32000000, 38000000,
    'GA-773', 'Jakarta (CGK)',
    '10000000-0000-0000-0000-000000000001'
  )
  ON CONFLICT (id) DO NOTHING;

  -- Departure 3: Premium package, 60 days
  INSERT INTO public.departures (
    id, package_id, airline_id,
    hotel_makkah_id, hotel_madinah_id,
    departure_date, return_date,
    quota, available_seats, status,
    price_quad, price_triple, price_double, price_single,
    flight_number, embarkation_city,
    branch_id
  ) VALUES (
    v_dep3, v_pkg_premium, v_airline_id,
    v_hotel_makkah_id, v_hotel_madinah_id,
    CURRENT_DATE + INTERVAL '60 days',
    CURRENT_DATE + INTERVAL '72 days',
    30, 28, 'open',
    42000000, 45000000, 50000000, 62000000,
    'GA-775', 'Jakarta (CGK)',
    '10000000-0000-0000-0000-000000000001'
  )
  ON CONFLICT (id) DO NOTHING;

  -- Departure 4: Premium, nearly full
  INSERT INTO public.departures (
    id, package_id, airline_id,
    hotel_makkah_id, hotel_madinah_id,
    departure_date, return_date,
    quota, available_seats, status,
    price_quad, price_triple, price_double, price_single,
    flight_number, embarkation_city,
    branch_id
  ) VALUES (
    v_dep4, v_pkg_premium, v_airline_id,
    v_hotel_makkah_id, v_hotel_madinah_id,
    CURRENT_DATE + INTERVAL '30 days',
    CURRENT_DATE + INTERVAL '42 days',
    30, 3, 'open',
    42000000, 45000000, 50000000, 62000000,
    'GA-777', 'Jakarta (CGK)',
    '10000000-0000-0000-0000-000000000001'
  )
  ON CONFLICT (id) DO NOTHING;

END;
$$;

-- ---------------------------------------------------------------------------
-- 4. SAMPLE STORE CATEGORY & PRODUCT
-- ---------------------------------------------------------------------------
INSERT INTO public.store_categories (id, name, slug, description, is_active, sort_order)
VALUES
  ('40000000-0000-0000-0000-000000000001','Perlengkapan Ihram',   'perlengkapan-ihram',   'Baju ihram, kain, dll',          TRUE, 1),
  ('40000000-0000-0000-0000-000000000002','Koper & Tas',          'koper-tas',            'Koper, tas ransel, dll',         TRUE, 2),
  ('40000000-0000-0000-0000-000000000003','Kesehatan & Herbal',   'kesehatan-herbal',     'Obat herbal, vitamin, dll',     TRUE, 3),
  ('40000000-0000-0000-0000-000000000004','Buku & Panduan Ibadah','buku-panduan',         'Buku doa, Al-Quran travel',     TRUE, 4),
  ('40000000-0000-0000-0000-000000000005','Elektronik Travel',    'elektronik-travel',    'Adaptor, power bank, dll',      TRUE, 5)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.store_products (
  id, category_id, name, slug, description,
  base_price, stock_quantity, is_published, is_featured, sort_order
)
VALUES
  ('50000000-0000-0000-0000-000000000001',
   '40000000-0000-0000-0000-000000000001',
   'Baju Ihram Premium Pria Set Lengkap',
   'baju-ihram-premium-pria',
   'Set baju ihram pria terbuat dari bahan katun premium 100%. Terdiri dari 2 lembar kain ihram + ikat pinggang. Nyaman dipakai selama ibadah umroh & haji.',
   185000, 150, TRUE, TRUE, 1),

  ('50000000-0000-0000-0000-000000000002',
   '40000000-0000-0000-0000-000000000002',
   'Koper Kabin 20 Inch 4 Roda Spinner',
   'koper-kabin-20-inch',
   'Koper kabin ringan 20 inch dengan 4 roda spinner 360°. Material ABS kuat, kunci TSA, tersedia dalam berbagai warna.',
   450000, 80, TRUE, FALSE, 2),

  ('50000000-0000-0000-0000-000000000003',
   '40000000-0000-0000-0000-000000000003',
   'Habbatussauda Kapsul 200 Butir',
   'habbatussauda-kapsul-200',
   'Habbatussauda kualitas premium 200 kapsul. Menjaga stamina dan daya tahan tubuh selama ibadah di Tanah Suci.',
   125000, 200, TRUE, TRUE, 3),

  ('50000000-0000-0000-0000-000000000004',
   '40000000-0000-0000-0000-000000000004',
   'Al-Quran Terjemah Ukuran Saku',
   'alquran-terjemah-saku',
   'Al-Quran terjemah bahasa Indonesia ukuran saku A6. Ringan dan mudah dibawa selama perjalanan ibadah.',
   85000, 300, TRUE, FALSE, 4),

  ('50000000-0000-0000-0000-000000000005',
   '40000000-0000-0000-0000-000000000005',
   'Universal Travel Adaptor All-in-One',
   'universal-travel-adaptor',
   'Adaptor universal yang kompatibel dengan colokan di 150+ negara termasuk Arab Saudi. Dilengkapi 4 port USB.',
   95000, 120, TRUE, FALSE, 5)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 5. BANNERS (sample)
-- ---------------------------------------------------------------------------
INSERT INTO public.banners (title, subtitle, image_url, link_url, link_text, sort_order, is_active)
VALUES
  ('Umroh Premium 2025',
   'Rasakan keistimewaan ibadah dengan hotel bintang 5 dekat Masjidil Haram',
   '/images/banners/umroh-premium-2025.jpg',
   '/packages?type=premium', 'Lihat Paket', 1, TRUE),
  ('Promo Ramadhan 1447H',
   'Spesial umroh Ramadhan — ibadah di bulan paling mulia. Slot terbatas!',
   '/images/banners/ramadhan-1447.jpg',
   '/packages?group=umroh-ramadhan', 'Daftar Sekarang', 2, TRUE),
  ('Program Tabungan Umroh',
   'Mulai tabung dari Rp 500.000/bulan. Wujudkan impian ibadah Anda',
   '/images/banners/tabungan-umroh.jpg',
   '/savings', 'Mulai Menabung', 3, TRUE)
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- 6. WA_TEMPLATES (sample)
-- ---------------------------------------------------------------------------
INSERT INTO public.wa_templates (code, name, category, type, body, variables, language, is_active)
VALUES
  ('booking_confirmed_wa',
   'Konfirmasi Booking WhatsApp',
   'transactional', 'text',
   'Assalamu''alaikum {{nama_jamaah}},\n\nAlhamdulillah, booking Anda telah DIKONFIRMASI 🎉\n\n' ||
   '📋 Kode Booking: *{{kode_booking}}*\n📦 Paket: {{nama_paket}}\n✈️ Keberangkatan: {{tanggal_berangkat}}\n' ||
   '🏨 Hotel Mekkah: {{hotel_mekkah}}\n🏨 Hotel Madinah: {{hotel_madinah}}\n\n' ||
   'Sisa pembayaran: *Rp {{sisa_bayar}}*\nDeadline: {{deadline}}\n\n' ||
   'Info lebih lanjut hubungi: {{wa_cs}}\n\n_Vinstour Travel — Perjalanan Suci Anda_',
   ARRAY['nama_jamaah','kode_booking','nama_paket','tanggal_berangkat',
         'hotel_mekkah','hotel_madinah','sisa_bayar','deadline','wa_cs'],
   'id', TRUE),

  ('payment_reminder_wa',
   'Reminder Pembayaran WhatsApp',
   'reminder', 'text',
   'Assalamu''alaikum {{nama_jamaah}},\n\n' ||
   '⚠️ *PENGINGAT PEMBAYARAN*\n\n' ||
   'Booking: *{{kode_booking}}*\nSisa: *Rp {{sisa_bayar}}*\n' ||
   'Jatuh tempo: *{{deadline}}* ({{hari_lagi}} hari lagi)\n\n' ||
   'Mohon segera lakukan pelunasan agar keberangkatan Anda dapat diproses.\n\n' ||
   'Transfer ke:\n🏦 {{nama_bank}}\n💳 {{no_rekening}}\na.n. {{pemilik_rekening}}\n\n' ||
   'Setelah transfer, kirim bukti ke: {{wa_cs}}\n\n_Vinstour Travel_',
   ARRAY['nama_jamaah','kode_booking','sisa_bayar','deadline','hari_lagi',
         'nama_bank','no_rekening','pemilik_rekening','wa_cs'],
   'id', TRUE),

  ('departure_info_wa',
   'Info Keberangkatan WhatsApp',
   'notification', 'text',
   'Assalamu''alaikum {{nama_jamaah}},\n\n' ||
   '✈️ *INFO KEBERANGKATAN*\n\n' ||
   'Insya Allah keberangkatan Anda tinggal *{{hari_lagi}} hari* lagi.\n\n' ||
   '📋 Detail Perjalanan:\n' ||
   '📅 Tanggal: {{tanggal_berangkat}}\n⏰ Kumpul di bandara: {{waktu_kumpul}}\n' ||
   '🛫 Penerbangan: {{nomor_penerbangan}}\n🏟️ Terminal: {{terminal}}\n\n' ||
   '📦 Pastikan dokumen sudah lengkap:\n✅ Paspor\n✅ Visa\n✅ Tiket\n✅ KTP\n\n' ||
   'Ada pertanyaan? Hubungi: {{wa_cs}}\n\n_Vinstour Travel — Perjalanan Suci Anda_',
   ARRAY['nama_jamaah','hari_lagi','tanggal_berangkat','waktu_kumpul',
         'nomor_penerbangan','terminal','wa_cs'],
   'id', TRUE)
ON CONFLICT (code) DO NOTHING;

SELECT 'seed_dummy_data: OK — Development data seeded' AS result;
