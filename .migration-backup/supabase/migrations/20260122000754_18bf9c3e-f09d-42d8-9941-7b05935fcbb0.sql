-- Add airline, hotels, and pricing to departures table
ALTER TABLE public.departures
ADD COLUMN IF NOT EXISTS airline_id uuid REFERENCES public.airlines(id),
ADD COLUMN IF NOT EXISTS hotel_makkah_id uuid REFERENCES public.hotels(id),
ADD COLUMN IF NOT EXISTS hotel_madinah_id uuid REFERENCES public.hotels(id),
ADD COLUMN IF NOT EXISTS price_quad numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS price_triple numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS price_double numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS price_single numeric DEFAULT 0;

-- Make package_id nullable so departures can exist without being linked to a package
ALTER TABLE public.departures
ALTER COLUMN package_id DROP NOT NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.departures.package_id IS 'Optional link to a package. Departures can exist independently.';