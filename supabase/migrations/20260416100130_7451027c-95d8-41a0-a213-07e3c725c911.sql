
ALTER TABLE public.packages 
ADD COLUMN IF NOT EXISTS package_type_id UUID REFERENCES public.package_types(id);
