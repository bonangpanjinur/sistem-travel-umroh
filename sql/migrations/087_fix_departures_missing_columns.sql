-- ============================================================
-- Migration 087: Fix departures table — semua kolom yang hilang
-- Berdasarkan analisis rencanasql.md §17.2 & §24.5
-- Idempotent: gunakan ADD COLUMN IF NOT EXISTS
-- ============================================================

-- Penerbangan & Bandara
ALTER TABLE departures ADD COLUMN IF NOT EXISTS flight_number            TEXT;
ALTER TABLE departures ADD COLUMN IF NOT EXISTS departure_time           TIME;
ALTER TABLE departures ADD COLUMN IF NOT EXISTS departure_airport_id     UUID;  -- FK ke airports ditambah di 094
ALTER TABLE departures ADD COLUMN IF NOT EXISTS arrival_airport_id       UUID;  -- FK ke airports ditambah di 094

-- Hotel FK (referensi langsung ke hotels per departure)
ALTER TABLE departures ADD COLUMN IF NOT EXISTS hotel_makkah_id          UUID REFERENCES hotels(id)   ON DELETE SET NULL;
ALTER TABLE departures ADD COLUMN IF NOT EXISTS hotel_madinah_id         UUID REFERENCES hotels(id)   ON DELETE SET NULL;

-- Maskapai FK
ALTER TABLE departures ADD COLUMN IF NOT EXISTS airline_id               UUID REFERENCES airlines(id) ON DELETE SET NULL;

-- Harga per tipe kamar (sebelumnya hanya di packages, kini diakses dari departures)
ALTER TABLE departures ADD COLUMN IF NOT EXISTS price_double             NUMERIC(15,2);
ALTER TABLE departures ADD COLUMN IF NOT EXISTS price_triple             NUMERIC(15,2);
ALTER TABLE departures ADD COLUMN IF NOT EXISTS price_quad               NUMERIC(15,2);

-- Mata uang & keuangan operasional
ALTER TABLE departures ADD COLUMN IF NOT EXISTS currency                 TEXT    DEFAULT 'IDR';
ALTER TABLE departures ADD COLUMN IF NOT EXISTS break_even_pax           INTEGER;
ALTER TABLE departures ADD COLUMN IF NOT EXISTS operational_cost_per_pax NUMERIC(15,2);

-- Deadline dokumen & visa
ALTER TABLE departures ADD COLUMN IF NOT EXISTS payment_deadline         DATE;
ALTER TABLE departures ADD COLUMN IF NOT EXISTS document_deadline        DATE;
ALTER TABLE departures ADD COLUMN IF NOT EXISTS visa_deadline            DATE;

-- Filter bulan (format 'YYYY-MM')
ALTER TABLE departures ADD COLUMN IF NOT EXISTS month                    TEXT;

-- Tour leader (FK ke profiles — tidak ke auth.users agar kompatibel Neon)
ALTER TABLE departures ADD COLUMN IF NOT EXISTS team_leader_id           UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- SEO fields (jika belum ada dari migration sebelumnya)
ALTER TABLE departures ADD COLUMN IF NOT EXISTS slug                     TEXT    UNIQUE;
ALTER TABLE departures ADD COLUMN IF NOT EXISTS meta_title               TEXT;
ALTER TABLE departures ADD COLUMN IF NOT EXISTS meta_description         TEXT;

-- Index tambahan untuk kolom baru
CREATE INDEX IF NOT EXISTS idx_departures_hotel_makkah    ON departures(hotel_makkah_id);
CREATE INDEX IF NOT EXISTS idx_departures_hotel_madinah   ON departures(hotel_madinah_id);
CREATE INDEX IF NOT EXISTS idx_departures_airline_id      ON departures(airline_id);
CREATE INDEX IF NOT EXISTS idx_departures_month           ON departures(month);
CREATE INDEX IF NOT EXISTS idx_departures_team_leader     ON departures(team_leader_id);
CREATE INDEX IF NOT EXISTS idx_departures_slug            ON departures(slug);

-- Auto-populate month dari departure_date untuk data lama
UPDATE departures
SET month = TO_CHAR(departure_date, 'YYYY-MM')
WHERE month IS NULL AND departure_date IS NOT NULL;
