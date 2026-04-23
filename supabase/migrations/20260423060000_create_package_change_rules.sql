-- Create table for dynamic package change rules if not exists
CREATE TABLE IF NOT EXISTS public.package_change_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_id UUID REFERENCES public.packages(id) ON DELETE CASCADE,
    min_days_before_departure INTEGER NOT NULL, -- H-X
    penalty_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    penalty_type VARCHAR(20) DEFAULT 'fixed', -- 'fixed' or 'percentage'
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add index for faster lookup (using IF NOT EXISTS logic via DO block for safety)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = 'idx_package_change_rules_package_id' AND n.nspname = 'public') THEN
        CREATE INDEX idx_package_change_rules_package_id ON public.package_change_rules(package_id);
    END IF;
END $$;

-- Enable RLS
ALTER TABLE public.package_change_rules ENABLE ROW LEVEL SECURITY;

-- Add RLS Policies (using DO block to avoid "already exists" errors)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow authenticated users to read package_change_rules' AND tablename = 'package_change_rules') THEN
        CREATE POLICY "Allow authenticated users to read package_change_rules" 
        ON public.package_change_rules FOR SELECT 
        TO authenticated 
        USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow super_admins to manage package_change_rules' AND tablename = 'package_change_rules') THEN
        CREATE POLICY "Allow super_admins to manage package_change_rules" 
        ON public.package_change_rules FOR ALL 
        TO authenticated 
        USING (public.is_super_admin(auth.uid()))
        WITH CHECK (public.is_super_admin(auth.uid()));
    END IF;
END $$;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS set_updated_at_package_change_rules ON public.package_change_rules;
CREATE TRIGGER set_updated_at_package_change_rules
BEFORE UPDATE ON public.package_change_rules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
