-- =============================================================================
-- 07_trip_timeline_v2.sql
-- The MASTER_FRESH_INSTALL schema created trip_timeline with (event_date,
-- event_time, type, sort_order, is_public). Migration 057 defines the correct
-- app schema (day_number, activity_type, time_start, is_completed, …).
-- This migration adds the missing columns so both TripTimelinePage and
-- JamaahItinerary can use the table.
-- Idempotent — safe to run multiple times.
-- =============================================================================

ALTER TABLE public.trip_timeline
  ADD COLUMN IF NOT EXISTS day_number      INTEGER   NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS activity_type   TEXT      NOT NULL DEFAULT 'other',
  ADD COLUMN IF NOT EXISTS time_start      TEXT,
  ADD COLUMN IF NOT EXISTS is_completed    BOOLEAN   NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS completed_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_by    UUID      REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS notes          TEXT;

-- Backfill day_number from event_date (relative to the departure's departure_date)
-- Only needed if there are existing rows with NULL day_number populated via old schema
UPDATE public.trip_timeline tt
SET day_number = GREATEST(1, COALESCE(
  (tt.event_date - d.departure_date::date)::integer + 1,
  tt.sort_order,
  1
))
FROM departures d
WHERE tt.departure_id = d.id
  AND tt.day_number = 1          -- only default rows (not user-set)
  AND tt.event_date IS NOT NULL  -- only rows that have event_date
  AND tt.event_date != d.departure_date::date; -- skip day-1 rows

-- Backfill activity_type from type column (old schema)
UPDATE public.trip_timeline
SET activity_type = CASE type
  WHEN 'flight'    THEN 'flight'
  WHEN 'hotel'     THEN 'hotel'
  WHEN 'activity'  THEN 'location'
  WHEN 'milestone' THEN 'group'
  WHEN 'ceremony'  THEN 'group'
  ELSE 'other'
END
WHERE activity_type = 'other' AND type IS NOT NULL;

-- Backfill time_start from event_time
UPDATE public.trip_timeline
SET time_start = event_time
WHERE time_start IS NULL AND event_time IS NOT NULL;

-- Index for portal jamaah queries
CREATE INDEX IF NOT EXISTS idx_trip_timeline_public_dep
  ON public.trip_timeline (departure_id, day_number, time_start)
  WHERE is_completed = FALSE OR is_completed = TRUE;

-- =============================================================================
SELECT '07_trip_timeline_v2 complete' AS result;
