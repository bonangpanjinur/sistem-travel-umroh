-- Migration 076: Add live program columns to trip_timeline (Fase 2 Tour Guide System)

ALTER TABLE trip_timeline
  ADD COLUMN IF NOT EXISTS live_status TEXT DEFAULT 'pending'
    CHECK (live_status IN ('pending','ongoing','done','delayed')),
  ADD COLUMN IF NOT EXISTS delay_minutes INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS live_notes TEXT,
  ADD COLUMN IF NOT EXISTS location_changed_to TEXT;

COMMENT ON COLUMN trip_timeline.live_status IS 'Status real-time item: pending|ongoing|done|delayed';
COMMENT ON COLUMN trip_timeline.delay_minutes IS 'Berapa menit keterlambatan dari jadwal awal';
COMMENT ON COLUMN trip_timeline.live_notes IS 'Catatan real-time dari tour leader untuk jamaah';
COMMENT ON COLUMN trip_timeline.location_changed_to IS 'Jika lokasi berubah mendadak, diisi tour leader';
