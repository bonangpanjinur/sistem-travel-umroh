
-- Add category column to equipment_items
ALTER TABLE public.equipment_items ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'general';

-- Create departure_itineraries table
CREATE TABLE public.departure_itineraries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  departure_id UUID NOT NULL REFERENCES public.departures(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES public.itinerary_templates(id) ON DELETE CASCADE,
  customized_days JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(departure_id)
);

ALTER TABLE public.departure_itineraries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage departure itineraries"
  ON public.departure_itineraries FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

NOTIFY pgrst, 'reload schema';
