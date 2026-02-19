
-- Add slug to branches and agents
ALTER TABLE public.branches ADD COLUMN slug VARCHAR(100) UNIQUE;
ALTER TABLE public.agents ADD COLUMN slug VARCHAR(100) UNIQUE;

-- Add tenant and template columns to website_settings
ALTER TABLE public.website_settings ADD COLUMN branch_id UUID REFERENCES public.branches(id);
ALTER TABLE public.website_settings ADD COLUMN agent_id UUID REFERENCES public.agents(id);
ALTER TABLE public.website_settings ADD COLUMN template TEXT NOT NULL DEFAULT 'classic';
