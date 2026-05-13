
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS payment_mode text NOT NULL DEFAULT 'full',
  ADD COLUMN IF NOT EXISTS dp_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS savings_plan_id uuid REFERENCES public.savings_plans(id) ON DELETE SET NULL;

ALTER TABLE public.bookings
  DROP CONSTRAINT IF EXISTS bookings_payment_mode_check;
ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_payment_mode_check CHECK (payment_mode IN ('full','dp','savings'));
