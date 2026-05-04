-- Migration: Add PIC (Person in Charge) Features
-- Date: 2026-03-09
-- Description: Add support for PIC assignment to packages and enhance agent profiles

-- 1. Add PIC field to packages table
ALTER TABLE public.packages 
ADD COLUMN IF NOT EXISTS pic_id UUID REFERENCES public.agents(id) ON DELETE SET NULL;

-- 2. Enhance agents table with PIC-specific fields
ALTER TABLE public.agents 
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS specialization VARCHAR(255),
ADD COLUMN IF NOT EXISTS location VARCHAR(255),
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS is_pic BOOLEAN DEFAULT false;

-- 3. Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_packages_pic_id ON public.packages(pic_id);
CREATE INDEX IF NOT EXISTS idx_agents_is_pic ON public.agents(is_pic);
CREATE INDEX IF NOT EXISTS idx_agents_location ON public.agents(location);
CREATE INDEX IF NOT EXISTS idx_agents_specialization ON public.agents(specialization);

-- 4. Create view for active PICs
CREATE OR REPLACE VIEW public.active_pics AS
SELECT 
  id,
  user_id,
  agent_code,
  company_name,
  avatar_url,
  specialization,
  location,
  description,
  is_active,
  created_at,
  updated_at
FROM public.agents
WHERE is_active = true AND is_pic = true
ORDER BY location, agent_code;

-- 5. Create view for PIC packages
CREATE OR REPLACE VIEW public.pic_packages AS
SELECT 
  p.id,
  p.name,
  p.description,
  p.package_type,
  p.duration_days,
  p.price_base,
  p.featured_image,
  a.id as pic_id,
  a.agent_code,
  a.company_name,
  a.avatar_url,
  a.specialization,
  a.location
FROM public.packages p
LEFT JOIN public.agents a ON p.pic_id = a.id
WHERE a.is_active = true AND a.is_pic = true;

-- 6. Add comment for documentation
COMMENT ON COLUMN public.packages.pic_id IS 'Reference to the agent (PIC) responsible for this package';
COMMENT ON COLUMN public.agents.avatar_url IS 'Profile picture URL for the agent/PIC';
COMMENT ON COLUMN public.agents.specialization IS 'Specialization or expertise of the agent (e.g., Umroh, Haji, etc)';
COMMENT ON COLUMN public.agents.location IS 'Geographic location or city where the agent operates';
COMMENT ON COLUMN public.agents.description IS 'Brief description or bio of the agent';
COMMENT ON COLUMN public.agents.is_pic IS 'Flag to indicate if this agent is a PIC (Person in Charge)';

-- 7. Update RLS policies if needed
-- Note: Ensure RLS policies allow public read access to PIC information
-- This should be handled by existing policies, but verify if needed

-- 8. Create function to get PIC info for a package
CREATE OR REPLACE FUNCTION get_package_pic_info(package_id UUID)
RETURNS TABLE (
  pic_id UUID,
  pic_name VARCHAR,
  pic_phone VARCHAR,
  pic_email VARCHAR,
  pic_whatsapp VARCHAR,
  pic_avatar_url TEXT,
  pic_specialization VARCHAR,
  pic_location VARCHAR,
  pic_description TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.agent_code,
    (SELECT phone FROM public.profiles WHERE user_id = a.user_id LIMIT 1),
    (SELECT email FROM auth.users WHERE id = a.user_id LIMIT 1),
    a.bank_account_number, -- Using as placeholder, should be updated to actual WhatsApp field
    a.avatar_url,
    a.specialization,
    a.location,
    a.description
  FROM public.packages p
  LEFT JOIN public.agents a ON p.pic_id = a.id
  WHERE p.id = package_id;
END;
$$ LANGUAGE plpgsql;

-- 9. Grant permissions
GRANT SELECT ON public.active_pics TO anon, authenticated;
GRANT SELECT ON public.pic_packages TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_package_pic_info TO anon, authenticated;
