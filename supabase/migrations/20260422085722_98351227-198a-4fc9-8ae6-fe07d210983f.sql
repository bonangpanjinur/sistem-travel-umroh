
-- Add break_even_pax, operational_cost_per_pax, and deadline fields to departures
ALTER TABLE public.departures
  ADD COLUMN IF NOT EXISTS break_even_pax integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS operational_cost_per_pax numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS document_deadline date,
  ADD COLUMN IF NOT EXISTS payment_deadline date,
  ADD COLUMN IF NOT EXISTS visa_deadline date,
  ADD COLUMN IF NOT EXISTS month varchar(2);

-- Create departure_hotels table for additional hotels (transit, umroh plus, haji, etc)
CREATE TABLE IF NOT EXISTS public.departure_hotels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  departure_id uuid NOT NULL REFERENCES public.departures(id) ON DELETE CASCADE,
  hotel_id uuid NOT NULL REFERENCES public.hotels(id) ON DELETE RESTRICT,
  hotel_role text NOT NULL DEFAULT 'additional',
  check_in_date date,
  check_out_date date,
  nights integer,
  notes text,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_departure_hotels_departure ON public.departure_hotels(departure_id);

ALTER TABLE public.departure_hotels ENABLE ROW LEVEL SECURITY;

-- Public can read (paket detail public)
DROP POLICY IF EXISTS "Departure hotels are viewable by everyone" ON public.departure_hotels;
CREATE POLICY "Departure hotels are viewable by everyone"
  ON public.departure_hotels FOR SELECT
  USING (true);

-- Admins manage
DROP POLICY IF EXISTS "Admins manage departure hotels" ON public.departure_hotels;
CREATE POLICY "Admins manage departure hotels"
  ON public.departure_hotels FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
