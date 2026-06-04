-- =============================================================================
-- 03_bookings_columns.sql
-- Ensures remaining_amount and related columns exist in bookings.
-- Backfills any NULL remaining_amount values.
-- Idempotent — safe to run multiple times.
-- =============================================================================

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS remaining_amount NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paid_amount      NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_status   TEXT          DEFAULT 'pending';

-- Backfill remaining_amount for rows where it is NULL
UPDATE bookings
SET
  remaining_amount = GREATEST(0, COALESCE(total_price, 0) - COALESCE(paid_amount, 0))
WHERE remaining_amount IS NULL;

-- =============================================================================
SELECT '03_bookings_columns complete' AS result;
