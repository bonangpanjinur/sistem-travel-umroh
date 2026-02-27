-- Create itinerary_templates table if not exists
CREATE TABLE IF NOT EXISTS public.itinerary_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  duration_days INTEGER NOT NULL DEFAULT 9,
  package_type TEXT NOT NULL DEFAULT 'umrah',
  days JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.itinerary_templates ENABLE ROW LEVEL SECURITY;

-- Admin can manage itinerary templates
CREATE POLICY "Admin can manage itinerary_templates" 
ON public.itinerary_templates 
FOR ALL 
USING (public.is_admin(auth.uid()));

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';