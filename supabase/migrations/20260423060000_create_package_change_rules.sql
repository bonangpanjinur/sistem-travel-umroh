-- Create table for dynamic package change rules
CREATE TABLE public.package_change_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_id UUID REFERENCES public.packages(id) ON DELETE CASCADE,
    min_days_before_departure INTEGER NOT NULL, -- H-X
    penalty_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    penalty_type VARCHAR(20) DEFAULT 'fixed', -- 'fixed' or 'percentage'
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add index for faster lookup
CREATE INDEX idx_package_change_rules_package_id ON public.package_change_rules(package_id);

-- Enable RLS
ALTER TABLE public.package_change_rules ENABLE ROW LEVEL SECURITY;

-- Add RLS Policies
CREATE POLICY "Allow authenticated users to read package_change_rules" 
ON public.package_change_rules FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Allow super_admins to manage package_change_rules" 
ON public.package_change_rules FOR ALL 
TO authenticated 
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

-- Function to update updated_at
CREATE TRIGGER set_updated_at_package_change_rules
BEFORE UPDATE ON public.package_change_rules
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
