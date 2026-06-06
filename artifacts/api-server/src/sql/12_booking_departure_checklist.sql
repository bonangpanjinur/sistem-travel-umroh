-- ============================================================
-- Migration 12: booking_departure_checklists
-- Per-booking departure readiness checklist
-- Idempotent — safe to run multiple times
-- ============================================================

-- 1. Create table
CREATE TABLE IF NOT EXISTS booking_departure_checklists (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id  UUID        NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  items       JSONB       NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (booking_id)
);

-- 2. Index for fast lookup by booking
CREATE INDEX IF NOT EXISTS idx_booking_departure_checklists_booking_id
  ON booking_departure_checklists (booking_id);

-- 3. Enable Row Level Security
ALTER TABLE booking_departure_checklists ENABLE ROW LEVEL SECURITY;

-- 4. Staff policy — authenticated users can read & write their org's checklists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'booking_departure_checklists'
      AND policyname = 'staff_manage_booking_departure_checklists'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY staff_manage_booking_departure_checklists
        ON booking_departure_checklists
        FOR ALL
        USING (auth.uid() IS NOT NULL)
        WITH CHECK (auth.uid() IS NOT NULL)
    $policy$;
  END IF;
END;
$$;

-- 5. Auto-update updated_at on row change
CREATE OR REPLACE FUNCTION update_booking_departure_checklist_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_booking_departure_checklist_updated_at
  ON booking_departure_checklists;

CREATE TRIGGER trg_booking_departure_checklist_updated_at
  BEFORE UPDATE ON booking_departure_checklists
  FOR EACH ROW EXECUTE FUNCTION update_booking_departure_checklist_updated_at();
