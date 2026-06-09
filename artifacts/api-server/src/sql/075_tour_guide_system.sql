-- ─── Tour Guide System — Transmisi Digital Umroh & Haji ──────────────────────
-- Tabels: guide_channels, guide_broadcasts, guide_broadcast_reads,
--         guide_sessions, guide_session_attendance, guide_locations

-- 1. Group Channels (saluran per rombongan)
CREATE TABLE IF NOT EXISTS guide_channels (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  departure_id    uuid NOT NULL REFERENCES departures(id) ON DELETE CASCADE,
  name            text NOT NULL DEFAULT 'Seluruh Rombongan',
  channel_type    text NOT NULL DEFAULT 'all'
                  CHECK (channel_type IN ('all','bus_1','bus_2','bus_3','custom')),
  created_by      uuid REFERENCES auth.users(id),
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_guide_channels_departure ON guide_channels(departure_id);

-- 2. Transmisi / Broadcasts dari guide ke jamaah
CREATE TABLE IF NOT EXISTS guide_broadcasts (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id      uuid REFERENCES guide_channels(id) ON DELETE SET NULL,
  departure_id    uuid NOT NULL REFERENCES departures(id) ON DELETE CASCADE,
  sender_user_id  uuid NOT NULL REFERENCES auth.users(id),
  sender_role     text NOT NULL DEFAULT 'tour_leader'
                  CHECK (sender_role IN ('tour_leader','muthawif','admin')),
  message_type    text NOT NULL DEFAULT 'info'
                  CHECK (message_type IN ('info','warning','emergency','program_update')),
  title           text,
  body            text NOT NULL,
  is_pinned       boolean NOT NULL DEFAULT false,
  expires_at      timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_guide_broadcasts_departure ON guide_broadcasts(departure_id);
CREATE INDEX IF NOT EXISTS idx_guide_broadcasts_created  ON guide_broadcasts(created_at DESC);

-- 3. Broadcast Reads (tracking siapa sudah baca)
CREATE TABLE IF NOT EXISTS guide_broadcast_reads (
  broadcast_id    uuid NOT NULL REFERENCES guide_broadcasts(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at         timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (broadcast_id, user_id)
);

-- 4. Sesi Absensi (per sesi ibadah/aktivitas)
CREATE TABLE IF NOT EXISTS guide_sessions (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  departure_id    uuid NOT NULL REFERENCES departures(id) ON DELETE CASCADE,
  session_type    text NOT NULL DEFAULT 'custom'
                  CHECK (session_type IN ('bus_boarding','sholat','ziarah','makan','hotel_checkin','airport','briefing','custom')),
  title           text NOT NULL,
  location        text,
  scheduled_at    timestamptz,
  started_at      timestamptz,
  ended_at        timestamptz,
  qr_token        text UNIQUE,
  qr_expires_at   timestamptz,
  created_by      uuid REFERENCES auth.users(id),
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_guide_sessions_departure ON guide_sessions(departure_id);
CREATE INDEX IF NOT EXISTS idx_guide_sessions_created  ON guide_sessions(created_at DESC);

-- 5. Kehadiran per Sesi
CREATE TABLE IF NOT EXISTS guide_session_attendance (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id      uuid NOT NULL REFERENCES guide_sessions(id) ON DELETE CASCADE,
  customer_id     uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  status          text NOT NULL DEFAULT 'absent'
                  CHECK (status IN ('present','absent','late','excused')),
  check_in_at     timestamptz,
  check_in_method text  CHECK (check_in_method IN ('qr_scan','manual','auto')),
  notes           text,
  UNIQUE (session_id, customer_id)
);
CREATE INDEX IF NOT EXISTS idx_guide_attendance_session ON guide_session_attendance(session_id);

-- 6. Lokasi Guide (share posisi real-time)
CREATE TABLE IF NOT EXISTS guide_locations (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  departure_id    uuid NOT NULL REFERENCES departures(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role            text NOT NULL DEFAULT 'tour_leader',
  label           text,
  latitude        double precision NOT NULL,
  longitude       double precision NOT NULL,
  shared_until    timestamptz,
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_guide_locations_departure ON guide_locations(departure_id, is_active);

-- RLS — disable for Neon (access controlled at Express middleware level)
ALTER TABLE guide_channels           DISABLE ROW LEVEL SECURITY;
ALTER TABLE guide_broadcasts         DISABLE ROW LEVEL SECURITY;
ALTER TABLE guide_broadcast_reads    DISABLE ROW LEVEL SECURITY;
ALTER TABLE guide_sessions           DISABLE ROW LEVEL SECURITY;
ALTER TABLE guide_session_attendance DISABLE ROW LEVEL SECURITY;
ALTER TABLE guide_locations          DISABLE ROW LEVEL SECURITY;
