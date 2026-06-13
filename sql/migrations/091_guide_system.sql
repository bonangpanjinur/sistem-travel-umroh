-- ============================================================
-- Migration 091: Guide System — semua tabel untuk muthawif/TL
-- Berdasarkan rencanasql.md §24.9 & F-29
-- Tabel: guide_channels, guide_broadcasts, guide_broadcast_reads,
--        guide_sessions, guide_session_attendance,
--        guide_subgroups, guide_subgroup_members,
--        guide_locations, guide_audio_sessions
-- Idempotent: CREATE TABLE IF NOT EXISTS
-- ============================================================

-- ============================================================
-- 1. guide_channels — saluran komunikasi per keberangkatan
-- ============================================================
CREATE TABLE IF NOT EXISTS guide_channels (
  id           UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  departure_id UUID    NOT NULL REFERENCES departures(id) ON DELETE CASCADE,
  name         TEXT    NOT NULL DEFAULT 'Seluruh Rombongan',
  channel_type TEXT    NOT NULL DEFAULT 'all'
                       CHECK (channel_type IN ('all','bus_1','bus_2','bus_3','custom')),
  description  TEXT,
  created_by   UUID    REFERENCES profiles(id) ON DELETE SET NULL,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_gc_departure_id ON guide_channels(departure_id);

-- ============================================================
-- 2. guide_broadcasts — pesan siaran dari muthawif/TL
-- ============================================================
CREATE TABLE IF NOT EXISTS guide_broadcasts (
  id             UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id     UUID    NOT NULL REFERENCES guide_channels(id) ON DELETE CASCADE,
  departure_id   UUID    NOT NULL REFERENCES departures(id)     ON DELETE CASCADE,
  sender_user_id UUID    REFERENCES profiles(id) ON DELETE SET NULL,
  sender_role    TEXT,   -- 'muthawif'|'tour_leader'|'admin'
  message_type   TEXT    NOT NULL DEFAULT 'text'
                         CHECK (message_type IN ('text','image','audio','location','system')),
  content        TEXT    NOT NULL,
  media_url      TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_gb_channel_id   ON guide_broadcasts(channel_id);
CREATE INDEX IF NOT EXISTS idx_gb_departure_id ON guide_broadcasts(departure_id);
CREATE INDEX IF NOT EXISTS idx_gb_created_at   ON guide_broadcasts(created_at DESC);

-- ============================================================
-- 3. guide_broadcast_reads — tracking baca pesan
-- ============================================================
CREATE TABLE IF NOT EXISTS guide_broadcast_reads (
  broadcast_id UUID NOT NULL REFERENCES guide_broadcasts(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES profiles(id)         ON DELETE CASCADE,
  read_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (broadcast_id, user_id)
);

-- ============================================================
-- 4. guide_sessions — sesi kegiatan (boarding, sholat, dll)
-- ============================================================
CREATE TABLE IF NOT EXISTS guide_sessions (
  id            UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  departure_id  UUID    NOT NULL REFERENCES departures(id) ON DELETE CASCADE,
  session_type  TEXT    NOT NULL DEFAULT 'custom'
                        CHECK (session_type IN (
                          'bus_boarding','sholat','ziarah','makan',
                          'hotel_checkin','airport','briefing','custom'
                        )),
  title         TEXT    NOT NULL,
  location      TEXT,
  scheduled_at  TIMESTAMPTZ,
  started_at    TIMESTAMPTZ,
  ended_at      TIMESTAMPTZ,
  qr_token      TEXT    UNIQUE,
  qr_expires_at TIMESTAMPTZ,
  created_by    UUID    REFERENCES profiles(id) ON DELETE SET NULL,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_gs_departure_id ON guide_sessions(departure_id);
CREATE INDEX IF NOT EXISTS idx_gs_scheduled    ON guide_sessions(scheduled_at);

-- ============================================================
-- 5. guide_session_attendance — absensi per sesi
-- ============================================================
CREATE TABLE IF NOT EXISTS guide_session_attendance (
  id          UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id  UUID    NOT NULL REFERENCES guide_sessions(id)  ON DELETE CASCADE,
  customer_id UUID    NOT NULL REFERENCES customers(id)        ON DELETE CASCADE,
  status      TEXT    DEFAULT 'hadir'
                      CHECK (status IN ('hadir','absen','terlambat','izin')),
  checked_by  UUID    REFERENCES profiles(id) ON DELETE SET NULL,
  notes       TEXT,
  checked_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (session_id, customer_id)
);
CREATE INDEX IF NOT EXISTS idx_gsa_session_id ON guide_session_attendance(session_id);

-- ============================================================
-- 6. guide_subgroups — kelompok bus/rombongan
-- ============================================================
CREATE TABLE IF NOT EXISTS guide_subgroups (
  id           UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  departure_id UUID    NOT NULL REFERENCES departures(id) ON DELETE CASCADE,
  name         TEXT    NOT NULL,
  color        TEXT,
  description  TEXT,
  capacity     INTEGER,
  created_by   UUID    REFERENCES profiles(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_gsub_departure_id ON guide_subgroups(departure_id);

-- ============================================================
-- 7. guide_subgroup_members — anggota subgroup
-- ============================================================
CREATE TABLE IF NOT EXISTS guide_subgroup_members (
  subgroup_id UUID NOT NULL REFERENCES guide_subgroups(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id)       ON DELETE CASCADE,
  added_at    TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (subgroup_id, customer_id)
);

-- ============================================================
-- 8. guide_locations — tracking lokasi real-time
-- ============================================================
CREATE TABLE IF NOT EXISTS guide_locations (
  id           UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  departure_id UUID    NOT NULL REFERENCES departures(id) ON DELETE CASCADE,
  user_id      UUID    REFERENCES profiles(id) ON DELETE CASCADE,
  role         TEXT,   -- 'muthawif'|'tour_leader'|'jamaah'
  label        TEXT,
  latitude     NUMERIC(10,7) NOT NULL,
  longitude    NUMERIC(10,7) NOT NULL,
  accuracy_m   NUMERIC(8,2),
  recorded_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_gl_departure_id ON guide_locations(departure_id);
CREATE INDEX IF NOT EXISTS idx_gl_recorded_at  ON guide_locations(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_gl_user_id      ON guide_locations(user_id);

-- ============================================================
-- 9. guide_audio_sessions — sesi audio live (murottal, tausyiah)
-- ============================================================
CREATE TABLE IF NOT EXISTS guide_audio_sessions (
  id                      UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  departure_id            UUID    NOT NULL REFERENCES departures(id) ON DELETE CASCADE,
  title                   TEXT    NOT NULL,
  session_type            TEXT    NOT NULL DEFAULT 'murottal'
                                  CHECK (session_type IN ('murottal','tausyiah','briefing','custom')),
  status                  TEXT    NOT NULL DEFAULT 'idle'
                                  CHECK (status IN ('idle','live','ended')),
  current_speaker_user_id UUID    REFERENCES profiles(id) ON DELETE SET NULL,
  started_at              TIMESTAMPTZ,
  ended_at                TIMESTAMPTZ,
  recording_url           TEXT,
  created_by              UUID    REFERENCES profiles(id) ON DELETE SET NULL,
  notes                   TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_gas_departure_id ON guide_audio_sessions(departure_id);
CREATE INDEX IF NOT EXISTS idx_gas_status       ON guide_audio_sessions(status);
