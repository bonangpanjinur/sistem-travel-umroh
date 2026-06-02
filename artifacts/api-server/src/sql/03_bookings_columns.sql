-- =============================================================================
-- 03_bookings_columns.sql
-- Adds columns to the bookings table that are referenced by the payment sync
-- trigger and API routes but are missing from the initial schema run.
-- Idempotent: uses ADD COLUMN IF NOT EXISTS.
-- =============================================================================

-- remaining_amount is SET by the payment sync trigger and read by API routes.
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS remaining_amount NUMERIC(15,2) DEFAULT 0;

-- Backfill: compute remaining from existing paid_amount
UPDATE public.bookings
SET remaining_amount = GREATEST(0, total_price - COALESCE(paid_amount, 0))
WHERE remaining_amount IS NULL OR remaining_amount = 0;
