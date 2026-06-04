
ALTER TABLE public.departures
  ADD COLUMN IF NOT EXISTS price_adult numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price_child numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price_infant numeric DEFAULT 0;
