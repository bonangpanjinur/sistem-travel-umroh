-- Migration to integrate package_types with packages table
-- 1. Add package_type_id column to packages table
ALTER TABLE public.packages 
ADD COLUMN IF NOT EXISTS package_type_id UUID REFERENCES public.package_types(id) ON DELETE SET NULL;

-- 2. Create index for the new foreign key
CREATE INDEX IF NOT EXISTS idx_packages_package_type_id ON public.packages(package_type_id);

-- 3. Migrate data from package_type (enum) to package_type_id (UUID)
-- This assumes the 'code' in package_types matches the values in the package_type enum
UPDATE public.packages p
SET package_type_id = pt.id
FROM public.package_types pt
WHERE p.package_type::text = pt.code;

-- 4. Add a comment to explain the transition
COMMENT ON COLUMN public.packages.package_type IS 'Legacy enum column. Use package_type_id for dynamic types.';
COMMENT ON COLUMN public.packages.package_type_id IS 'Reference to dynamic package types in package_types table.';

-- 5. Update RLS policies for package_types if needed (already handled in create_package_types.sql)
-- But let's ensure the policies are robust
DROP POLICY IF EXISTS "Allow authenticated update" ON package_types;
CREATE POLICY "Allow authenticated update" ON package_types
  FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated insert" ON package_types;
CREATE POLICY "Allow authenticated insert" ON package_types
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated delete" ON package_types;
CREATE POLICY "Allow authenticated delete" ON package_types
  FOR DELETE USING (auth.role() = 'authenticated');
