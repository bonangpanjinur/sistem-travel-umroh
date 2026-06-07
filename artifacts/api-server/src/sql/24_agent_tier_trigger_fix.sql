-- =============================================================================
-- 24 — Fix agent tier trigger (column-agnostic, row-level)
-- =============================================================================
-- Migration 23 created the trigger with UPDATE OF booking_status which fails
-- on DB environments where the column is named differently. This migration
-- re-creates the trigger without column restriction (fires on ALL updates),
-- with the same guard inside the function body.

-- Re-drop and recreate trigger without column-level restriction
DROP TRIGGER IF EXISTS trg_update_agent_tier ON bookings;

CREATE TRIGGER trg_update_agent_tier
  AFTER INSERT OR UPDATE OR DELETE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION trg_booking_update_agent_tier();
