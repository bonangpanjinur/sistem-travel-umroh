-- Seat hold system (BOOK-FIX3)
CREATE TABLE IF NOT EXISTS public.seat_holds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  departure_id uuid NOT NULL REFERENCES public.departures(id) ON DELETE CASCADE,
  session_id text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  pax_count integer NOT NULL DEFAULT 1 CHECK (pax_count > 0),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '15 minutes'),
  created_at timestamptz NOT NULL DEFAULT now(),
  released_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_seat_holds_departure_active
  ON public.seat_holds (departure_id) WHERE released_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_seat_holds_session ON public.seat_holds (session_id);
CREATE INDEX IF NOT EXISTS idx_seat_holds_expires ON public.seat_holds (expires_at) WHERE released_at IS NULL;

ALTER TABLE public.seat_holds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read seat holds count"
  ON public.seat_holds FOR SELECT USING (true);

CREATE POLICY "Anyone can create seat hold"
  ON public.seat_holds FOR INSERT WITH CHECK (true);

CREATE POLICY "Owner can release own seat hold"
  ON public.seat_holds FOR UPDATE
  USING (user_id = auth.uid() OR user_id IS NULL)
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- Function: get active (non-expired, non-released) hold count
CREATE OR REPLACE FUNCTION public.get_active_seat_holds(_departure_id uuid)
RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT COALESCE(SUM(pax_count), 0)::int
  FROM public.seat_holds
  WHERE departure_id = _departure_id
    AND released_at IS NULL
    AND expires_at > now();
$$;

-- Function: create or refresh a hold
CREATE OR REPLACE FUNCTION public.hold_departure_seats(
  _departure_id uuid,
  _session_id text,
  _pax_count integer DEFAULT 1
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_quota integer;
  v_booked integer;
  v_active_holds integer;
  v_available integer;
  v_existing_id uuid;
  v_id uuid;
  v_expires timestamptz;
BEGIN
  IF _pax_count IS NULL OR _pax_count < 1 THEN _pax_count := 1; END IF;

  SELECT quota, COALESCE(booked_count, 0) INTO v_quota, v_booked
    FROM public.departures WHERE id = _departure_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'departure_not_found');
  END IF;

  -- Refresh existing hold for this session (TTL extended)
  SELECT id INTO v_existing_id FROM public.seat_holds
    WHERE departure_id = _departure_id AND session_id = _session_id
      AND released_at IS NULL AND expires_at > now()
    LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.seat_holds
      SET expires_at = now() + interval '15 minutes',
          pax_count = _pax_count,
          user_id = COALESCE(user_id, auth.uid())
      WHERE id = v_existing_id
      RETURNING id, expires_at INTO v_id, v_expires;
    RETURN jsonb_build_object('ok', true, 'hold_id', v_id, 'expires_at', v_expires, 'refreshed', true);
  END IF;

  -- Check capacity: quota - booked - other active holds >= requested
  SELECT COALESCE(SUM(pax_count), 0)::int INTO v_active_holds
    FROM public.seat_holds
    WHERE departure_id = _departure_id
      AND released_at IS NULL
      AND expires_at > now()
      AND session_id <> _session_id;

  v_available := v_quota - v_booked - v_active_holds;
  IF v_available < _pax_count THEN
    RETURN jsonb_build_object('ok', false, 'error', 'insufficient_capacity',
      'available', v_available, 'requested', _pax_count);
  END IF;

  INSERT INTO public.seat_holds (departure_id, session_id, user_id, pax_count)
  VALUES (_departure_id, _session_id, auth.uid(), _pax_count)
  RETURNING id, expires_at INTO v_id, v_expires;

  RETURN jsonb_build_object('ok', true, 'hold_id', v_id, 'expires_at', v_expires);
END;
$$;

-- Function: release hold by session
CREATE OR REPLACE FUNCTION public.release_seat_hold(_session_id text, _departure_id uuid DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_count integer;
BEGIN
  UPDATE public.seat_holds
    SET released_at = now()
    WHERE session_id = _session_id
      AND (_departure_id IS NULL OR departure_id = _departure_id)
      AND released_at IS NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Cleanup function (can be cronned)
CREATE OR REPLACE FUNCTION public.cleanup_expired_seat_holds()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_count integer;
BEGIN
  UPDATE public.seat_holds
    SET released_at = now()
    WHERE released_at IS NULL AND expires_at <= now();
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Booking access tokens for guest checkout recovery (BOOK-FIX7)
CREATE TABLE IF NOT EXISTS public.booking_access_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  email text,
  phone text,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  used_count integer NOT NULL DEFAULT 0,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_booking_access_tokens_booking ON public.booking_access_tokens (booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_access_tokens_expires ON public.booking_access_tokens (expires_at);

ALTER TABLE public.booking_access_tokens ENABLE ROW LEVEL SECURITY;

-- Tokens are sensitive: only service_role / admins manage; redemption goes through edge function
CREATE POLICY "Admins manage booking access tokens"
  ON public.booking_access_tokens FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- RPC to validate & mark token used (called by recovery edge function with service_role)
CREATE OR REPLACE FUNCTION public.redeem_booking_access_token(_token text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_row public.booking_access_tokens%ROWTYPE;
BEGIN
  SELECT * INTO v_row FROM public.booking_access_tokens
    WHERE token = _token AND expires_at > now()
    LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_or_expired');
  END IF;
  UPDATE public.booking_access_tokens
    SET used_count = used_count + 1, last_used_at = now()
    WHERE id = v_row.id;
  RETURN jsonb_build_object('ok', true, 'booking_id', v_row.booking_id);
END;
$$;

-- Midtrans webhook log table (BOOK-FIX6)
CREATE TABLE IF NOT EXISTS public.midtrans_webhook_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id text NOT NULL,
  transaction_status text,
  fraud_status text,
  payment_type text,
  gross_amount numeric,
  signature_valid boolean NOT NULL DEFAULT false,
  payload jsonb,
  processed boolean NOT NULL DEFAULT false,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_midtrans_webhook_order_id ON public.midtrans_webhook_logs (order_id);

ALTER TABLE public.midtrans_webhook_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read webhook logs"
  ON public.midtrans_webhook_logs FOR SELECT
  USING (public.is_admin(auth.uid()));