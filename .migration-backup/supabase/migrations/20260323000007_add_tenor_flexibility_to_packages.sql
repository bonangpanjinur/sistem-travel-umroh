-- Migration to add tenor flexibility setting for savings packages
-- Allows admin to specify whether jemaah can choose tenor (flexible) or if tenor is fixed

-- 1. Add is_tenor_flexible column to packages table
ALTER TABLE public.packages 
ADD COLUMN is_tenor_flexible boolean DEFAULT true;

-- 2. Add fixed_tenor_months column for fixed tenor packages
ALTER TABLE public.packages 
ADD COLUMN fixed_tenor_months integer;

-- 3. Add constraint: if is_tenor_flexible is false, fixed_tenor_months must be set
ALTER TABLE public.packages 
ADD CONSTRAINT check_fixed_tenor_when_not_flexible 
CHECK (
    (is_tenor_flexible = true) OR 
    (is_tenor_flexible = false AND fixed_tenor_months > 0)
);

-- 4. Add comment to explain the columns
COMMENT ON COLUMN public.packages.is_tenor_flexible IS 'If true, jemaah can choose tenor (6-36 months). If false, tenor is fixed to fixed_tenor_months value.';
COMMENT ON COLUMN public.packages.fixed_tenor_months IS 'Fixed tenor in months when is_tenor_flexible is false. Only applicable for tabungan packages.';
