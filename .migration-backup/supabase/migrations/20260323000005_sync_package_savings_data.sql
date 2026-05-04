-- Migration to sync savings_target and metadata in packages table
-- This ensures we use the explicit savings_target column instead of JSONB metadata

-- 1. Update savings_target from metadata if it's currently 0 or NULL
UPDATE public.packages
SET savings_target = (metadata->>'target_amount')::NUMERIC
WHERE package_type = 'tabungan' 
  AND (savings_target IS NULL OR savings_target = 0)
  AND metadata ? 'target_amount';

-- 2. Ensure all tabungan packages have a savings_target
-- If still 0, we can default it to price_quad if that exists
UPDATE public.packages
SET savings_target = price_quad
WHERE package_type = 'tabungan'
  AND (savings_target IS NULL OR savings_target = 0)
  AND price_quad > 0;

-- 3. Add a comment to the column for clarity
COMMENT ON COLUMN public.packages.savings_target IS 'Target nominal tabungan untuk paket tipe tabungan';

-- 4. Add metadata column if it doesn't exist (safety check)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'packages' AND column_name = 'metadata') THEN
        ALTER TABLE public.packages ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;
