
-- Sprint 10: Multi-currency Booking Wizard + Adaptive Booking Mode

-- 1. Add currency snapshot fields to bookings
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS exchange_rate numeric NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS total_price_original numeric,
  ADD COLUMN IF NOT EXISTS total_price_idr numeric;

-- Backfill: existing bookings (assume IDR)
UPDATE public.bookings
SET total_price_original = COALESCE(total_price_original, total_price),
    total_price_idr = COALESCE(total_price_idr, total_price),
    exchange_rate = COALESCE(exchange_rate, 1)
WHERE total_price_original IS NULL OR total_price_idr IS NULL;

-- 2. Booking mode on packages
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='packages' AND column_name='booking_mode'
  ) THEN
    ALTER TABLE public.packages ADD COLUMN booking_mode text NOT NULL DEFAULT 'umroh';
    ALTER TABLE public.packages ADD CONSTRAINT packages_booking_mode_check
      CHECK (booking_mode IN ('umroh','haji','wisata'));
  END IF;
END $$;

-- Backfill booking_mode from package_type when possible
UPDATE public.packages
SET booking_mode = CASE
  WHEN package_type::text ILIKE '%haji%' THEN 'haji'
  WHEN package_type::text ILIKE '%wisata%' OR package_type::text ILIKE '%tour%' THEN 'wisata'
  ELSE 'umroh'
END
WHERE booking_mode = 'umroh';

-- 3. exchange_rates table
CREATE TABLE IF NOT EXISTS public.exchange_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  currency_from text NOT NULL,
  currency_to text NOT NULL DEFAULT 'IDR',
  rate numeric NOT NULL CHECK (rate > 0),
  source text NOT NULL DEFAULT 'manual',
  notes text,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exchange_rates_active
  ON public.exchange_rates (currency_from, currency_to, is_active, fetched_at DESC);

ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read active rates" ON public.exchange_rates;
CREATE POLICY "Anyone can read active rates"
  ON public.exchange_rates FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can manage rates" ON public.exchange_rates;
CREATE POLICY "Admins can manage rates"
  ON public.exchange_rates FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- 4. Helper: get latest active rate
CREATE OR REPLACE FUNCTION public.get_active_exchange_rate(_currency_from text, _currency_to text DEFAULT 'IDR')
RETURNS numeric
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT CASE
    WHEN UPPER(_currency_from) = UPPER(_currency_to) THEN 1
    ELSE COALESCE((
      SELECT rate FROM public.exchange_rates
      WHERE UPPER(currency_from) = UPPER(_currency_from)
        AND UPPER(currency_to) = UPPER(_currency_to)
        AND is_active = true
      ORDER BY fetched_at DESC
      LIMIT 1
    ), 1)
  END;
$$;

-- 5. Seed default rates (initial values; admin updates in UI)
INSERT INTO public.exchange_rates (currency_from, currency_to, rate, source, notes)
VALUES
  ('USD','IDR', 16500, 'seed', 'Default seed rate — please update'),
  ('SAR','IDR', 4400,  'seed', 'Default seed rate — please update'),
  ('EUR','IDR', 17800, 'seed', 'Default seed rate — please update'),
  ('MYR','IDR', 3500,  'seed', 'Default seed rate — please update')
ON CONFLICT DO NOTHING;
