ALTER TABLE public.packages
  ADD COLUMN IF NOT EXISTS is_popular boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_cheapest boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS display_order integer DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_packages_is_popular ON public.packages(is_popular) WHERE is_popular = true;
CREATE INDEX IF NOT EXISTS idx_packages_is_cheapest ON public.packages(is_cheapest) WHERE is_cheapest = true;