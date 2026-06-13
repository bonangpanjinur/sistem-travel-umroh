-- ============================================================
-- Migration 094: Airports table + departures FK
-- Berdasarkan rencanasql.md §17.2 — departures.departure_airport_id
-- Kolom airport sudah ditambah di 087, tapi FK belum ada
-- Idempotent: CREATE TABLE IF NOT EXISTS + ADD CONSTRAINT IF NOT EXISTS
-- ============================================================

-- ============================================================
-- 1. Tabel airports
-- ============================================================
CREATE TABLE IF NOT EXISTS airports (
  id         UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  iata_code  TEXT    NOT NULL UNIQUE,
  icao_code  TEXT,
  name       TEXT    NOT NULL,
  city       TEXT,
  province   TEXT,
  country    TEXT    NOT NULL DEFAULT 'ID',
  timezone   TEXT    DEFAULT 'Asia/Jakarta',
  is_active  BOOLEAN DEFAULT TRUE,
  latitude   NUMERIC(10,7),
  longitude  NUMERIC(10,7),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_airports_iata    ON airports(iata_code);
CREATE INDEX IF NOT EXISTS idx_airports_country ON airports(country);
CREATE INDEX IF NOT EXISTS idx_airports_active  ON airports(is_active);

-- ============================================================
-- 2. Tambah FK constraints ke departures (087 sudah buat kolom)
-- ============================================================
DO $$
BEGIN
  -- FK departure_airport_id
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'departures' AND column_name = 'departure_airport_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_departures_departure_airport'
  ) THEN
    ALTER TABLE departures
      ADD CONSTRAINT fk_departures_departure_airport
      FOREIGN KEY (departure_airport_id) REFERENCES airports(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  -- FK arrival_airport_id
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'departures' AND column_name = 'arrival_airport_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_departures_arrival_airport'
  ) THEN
    ALTER TABLE departures
      ADD CONSTRAINT fk_departures_arrival_airport
      FOREIGN KEY (arrival_airport_id) REFERENCES airports(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Index bandara di departures
CREATE INDEX IF NOT EXISTS idx_departures_dep_airport ON departures(departure_airport_id);
CREATE INDEX IF NOT EXISTS idx_departures_arr_airport ON departures(arrival_airport_id);

-- ============================================================
-- 3. Seed: Bandara embarkasi Haji & Umroh Indonesia
-- ============================================================
INSERT INTO airports (iata_code, icao_code, name, city, province, country) VALUES
  ('CGK', 'WIII', 'Bandara Soekarno-Hatta',          'Tangerang',       'Banten',           'ID'),
  ('SOC', 'WARQ', 'Bandara Adi Soemarmo',              'Solo',            'Jawa Tengah',      'ID'),
  ('JOG', 'WARJ', 'Bandara Adisutjipto',               'Yogyakarta',      'DI Yogyakarta',    'ID'),
  ('SUB', 'WARR', 'Bandara Juanda',                    'Surabaya',        'Jawa Timur',       'ID'),
  ('MES', 'WIMM', 'Bandara Kualanamu',                 'Medan',           'Sumatera Utara',   'ID'),
  ('BPN', 'WALL', 'Bandara Sultan Aji Muhammad Sulaiman','Balikpapan',    'Kalimantan Timur', 'ID'),
  ('UPG', 'WAAA', 'Bandara Sultan Hasanuddin',         'Makassar',        'Sulawesi Selatan', 'ID'),
  ('PLM', 'WIPP', 'Bandara Sultan Mahmud Badaruddin II','Palembang',      'Sumatera Selatan', 'ID'),
  ('PDG', 'WIPT', 'Bandara Minangkabau',               'Padang',          'Sumatera Barat',   'ID'),
  ('PKY', 'WAOP', 'Bandara Tjilik Riwut',              'Palangka Raya',   'Kalimantan Tengah','ID'),
  ('BDJ', 'WAOO', 'Bandara Syamsudin Noor',            'Banjarmasin',     'Kalimantan Selatan','ID'),
  ('LOP', 'WADL', 'Bandara Lombok International',      'Praya',           'NTB',              'ID'),
  ('DPS', 'WADD', 'Bandara I Gusti Ngurah Rai',        'Denpasar',        'Bali',             'ID'),
  ('AMQ', 'WAPP', 'Bandara Pattimura',                 'Ambon',           'Maluku',           'ID'),
  ('MDC', 'WAMM', 'Bandara Sam Ratulangi',             'Manado',          'Sulawesi Utara',   'ID'),
  -- Bandara tujuan
  ('JED', 'OEJN', 'Bandara King Abdulaziz Internasional','Jeddah',        NULL,               'SA'),
  ('MED', 'OEMA', 'Bandara Prince Mohammad bin Abdulaziz','Madinah',      NULL,               'SA'),
  ('RUH', 'OERK', 'Bandara King Khalid Internasional', 'Riyadh',          NULL,               'SA')
ON CONFLICT (iata_code) DO NOTHING;
