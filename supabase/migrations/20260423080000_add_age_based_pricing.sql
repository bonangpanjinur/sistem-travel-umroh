-- Add age-based pricing columns to departures
-- Prices for adult, child, and infant per departure date

ALTER TABLE public.departures 
ADD COLUMN IF NOT EXISTS price_adult NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS price_child NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS price_infant NUMERIC DEFAULT 0;

COMMENT ON COLUMN public.departures.price_adult IS 'Harga untuk dewasa (> 2 tahun)';
COMMENT ON COLUMN public.departures.price_child IS 'Harga untuk anak (2-12 tahun)';
COMMENT ON COLUMN public.departures.price_infant IS 'Harga untuk balita (< 2 tahun)';

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_departures_age_pricing ON public.departures(package_id, departure_date) 
WHERE price_adult > 0 OR price_child > 0 OR price_infant > 0;
