-- Final fix for dynamic package types
-- 1. Add 'tour' to the legacy enum just in case any old code still relies on it
ALTER TYPE public.package_type ADD VALUE IF NOT EXISTS 'tour';

-- 2. Make the legacy package_type column nullable so it's not required by the database
ALTER TABLE public.packages ALTER COLUMN package_type DROP NOT NULL;

-- 3. Ensure all existing packages have their package_type_id set correctly
UPDATE public.packages p
SET package_type_id = pt.id
FROM public.package_types pt
WHERE p.package_type::text = pt.code
AND p.package_type_id IS NULL;
