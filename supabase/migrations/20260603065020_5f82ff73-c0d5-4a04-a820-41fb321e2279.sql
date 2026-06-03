-- 1. Add public_token column
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS public_token TEXT;

-- 2. Backfill existing rows
UPDATE public.bookings
SET public_token = encode(gen_random_bytes(32), 'hex')
WHERE public_token IS NULL;

-- 3. Enforce uniqueness + not null + default
ALTER TABLE public.bookings
  ALTER COLUMN public_token SET NOT NULL,
  ALTER COLUMN public_token SET DEFAULT encode(gen_random_bytes(32), 'hex');

CREATE UNIQUE INDEX IF NOT EXISTS bookings_public_token_key
  ON public.bookings(public_token);

-- 4. New RPC by token
CREATE OR REPLACE FUNCTION public.get_public_booking_by_token(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF p_token IS NULL OR length(p_token) < 16 THEN
    RETURN NULL;
  END IF;

  SELECT id INTO v_id
  FROM public.bookings
  WHERE public_token = p_token
  LIMIT 1;

  IF v_id IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN public.get_public_booking_details(v_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_booking_by_token(TEXT) TO anon, authenticated;

-- 5. Revoke anonymous access to the by-ID function (still callable by authenticated/service_role)
REVOKE EXECUTE ON FUNCTION public.get_public_booking_details(UUID) FROM anon;
