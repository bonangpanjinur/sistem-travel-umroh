-- =============================================================================
-- v2_P02 — Lookup Tables: Airports (baru), Airlines ext, Hotels ext
-- Modul : Travel Lookup
-- Aman  : IF NOT EXISTS di semua CREATE TABLE
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. AIRPORTS — Tabel baru (belum ada di schema sebelumnya)
--    Diperlukan oleh: DepartureForm, BookingDocumentActions, BulkSendTab
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS airports (
  id         UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  name       TEXT    NOT NULL,
  code       TEXT    NOT NULL UNIQUE,   -- IATA: CGK, JED, MED, DMK
  city       TEXT    NOT NULL,
  country    TEXT    NOT NULL DEFAULT 'Indonesia',
  terminal   TEXT,
  is_active  BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_airports_code      ON airports(code);
CREATE INDEX IF NOT EXISTS idx_airports_is_active ON airports(is_active);

ALTER TABLE airports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "airports_admin_manage" ON airports;
DROP POLICY IF EXISTS "airports_public_read"  ON airports;

CREATE POLICY "airports_admin_manage" ON airports
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','operational'))
  );

CREATE POLICY "airports_public_read" ON airports
  FOR SELECT USING (is_active = TRUE);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_airports_updated_at'
    AND tgrelid='airports'::regclass) THEN
    CREATE TRIGGER set_airports_updated_at
      BEFORE UPDATE ON airports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Seed bandara utama Indonesia & Arab Saudi
INSERT INTO airports (name, code, city, country) VALUES
  ('Soekarno-Hatta International Airport', 'CGK', 'Tangerang', 'Indonesia'),
  ('Juanda International Airport',         'SUB', 'Surabaya',  'Indonesia'),
  ('Sultan Hasanuddin International',      'UPG', 'Makassar',  'Indonesia'),
  ('Kualanamu International Airport',      'KNO', 'Medan',     'Indonesia'),
  ('Ngurah Rai International Airport',     'DPS', 'Denpasar',  'Indonesia'),
  ('King Abdulaziz International Airport', 'JED', 'Jeddah',    'Saudi Arabia'),
  ('Prince Mohammad Bin Abdulaziz Airport','MED', 'Madinah',   'Saudi Arabia'),
  ('King Khalid International Airport',    'RUH', 'Riyadh',    'Saudi Arabia')
ON CONFLICT (code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. AIRLINES — Kolom tambahan
-- ---------------------------------------------------------------------------
ALTER TABLE airlines ADD COLUMN IF NOT EXISTS website_url  TEXT;
ALTER TABLE airlines ADD COLUMN IF NOT EXISTS phone        TEXT;
ALTER TABLE airlines ADD COLUMN IF NOT EXISTS notes        TEXT;

-- ---------------------------------------------------------------------------
-- 3. HOTELS — Kolom tambahan
-- ---------------------------------------------------------------------------
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS website_url   TEXT;
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS location_lat  NUMERIC(10,7);
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS location_lng  NUMERIC(10,7);
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS distance_to_haram_m INTEGER; -- jarak ke Masjidil Haram (meter)
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS gallery_urls  JSONB DEFAULT '[]';
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS amenities     TEXT[];
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS notes         TEXT;

-- ---------------------------------------------------------------------------
-- 4. AGENT_INVITATION_TOKENS — dari migration 062
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS agent_invitation_tokens (
  id                UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id          UUID    NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  token             TEXT    NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  used_at           TIMESTAMPTZ,
  used_by_agent_id  UUID    REFERENCES agents(id) ON DELETE SET NULL,
  expires_at        TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ait_agent_id ON agent_invitation_tokens(agent_id);

-- ---------------------------------------------------------------------------
-- 5. AGENT_TIER_CONFIG — dari migration 23
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS agent_tier_config (
  tier         TEXT    NOT NULL PRIMARY KEY,
  min_bookings INTEGER NOT NULL DEFAULT 0,
  label        TEXT    NOT NULL,
  color        TEXT    DEFAULT '#888',
  description  TEXT,
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default tiers
INSERT INTO agent_tier_config (tier, min_bookings, label, color, description) VALUES
  ('bronze',   0,   'Bronze',   '#CD7F32', 'Tier pemula'),
  ('silver',   10,  'Silver',   '#C0C0C0', '10+ booking terkonfirmasi'),
  ('gold',     50,  'Gold',     '#FFD700', '50+ booking terkonfirmasi'),
  ('platinum', 150, 'Platinum', '#E5E4E2', '150+ booking terkonfirmasi')
ON CONFLICT (tier) DO NOTHING;

