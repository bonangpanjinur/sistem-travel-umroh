-- =========================================
-- 1. TAMBAH KOLOM (AMAN)
-- =========================================
ALTER TABLE public.equipment_items 
ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'general';

-- =========================================
-- 2. TABLE (AMAN)
-- =========================================
CREATE TABLE IF NOT EXISTS public.departure_itineraries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  departure_id UUID NOT NULL 
  REFERENCES public.departures(id) ON DELETE CASCADE,

  template_id UUID NOT NULL 
  REFERENCES public.itinerary_templates(id) ON DELETE CASCADE,

  customized_days JSONB,

  created_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(departure_id)
);

-- =========================================
-- 3. INDEX (OPSIONAL TAPI BAGUS)
-- =========================================
CREATE INDEX IF NOT EXISTS idx_departure_itineraries_departure 
ON public.departure_itineraries(departure_id);

-- =========================================
-- 4. RLS
-- =========================================
ALTER TABLE public.departure_itineraries ENABLE ROW LEVEL SECURITY;

-- =========================================
-- 5. DROP POLICY (BIAR GAK BENTROK)
-- =========================================
DROP POLICY IF EXISTS "Admin can manage departure itineraries" 
ON public.departure_itineraries;

-- =========================================
-- 6. POLICY
-- =========================================
CREATE POLICY "Admin can manage departure itineraries"
ON public.departure_itineraries
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- =========================================
-- 7. RELOAD POSTGREST
-- =========================================
NOTIFY pgrst, 'reload schema';
