-- Migration to add constraints for savings packages
-- Ensures that if package_type is 'tabungan', savings_target is required and greater than 0

-- 1. Add check constraint to ensure savings_target is set for tabungan packages
ALTER TABLE public.packages 
ADD CONSTRAINT check_savings_target_for_tabungan 
CHECK (
    (package_type != 'tabungan') OR 
    (package_type = 'tabungan' AND savings_target > 0)
);

-- 2. Add comment to explain the constraint
COMMENT ON CONSTRAINT check_savings_target_for_tabungan ON public.packages IS 'Ensures savings_target is required and positive for tabungan package types';

-- 3. Ensure price columns are 0 for tabungan packages (optional but recommended in analysis)
-- We won't force it to be 0 via constraint yet to avoid breaking existing data, 
-- but we'll add a trigger or just handle it in the frontend as recommended.
