
-- ============ PUSH OUTBOX ============
CREATE TABLE IF NOT EXISTS public.push_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_ids uuid[] NOT NULL DEFAULT '{}',
  customer_ids uuid[] NOT NULL DEFAULT '{}',
  title text NOT NULL,
  body text NOT NULL,
  type text NOT NULL DEFAULT 'info',
  url text,
  status text NOT NULL DEFAULT 'pending', -- pending|processing|sent|failed
  attempts int NOT NULL DEFAULT 0,
  last_error text,
  scheduled_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_outbox_pending
  ON public.push_outbox (status, scheduled_at)
  WHERE status = 'pending';

ALTER TABLE public.push_outbox ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage push_outbox" ON public.push_outbox;
CREATE POLICY "Admins manage push_outbox"
ON public.push_outbox
FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- ============ HELPER: enqueue ============
CREATE OR REPLACE FUNCTION public.enqueue_push(
  _user_ids uuid[],
  _title text,
  _body text,
  _type text DEFAULT 'info',
  _url text DEFAULT NULL,
  _customer_ids uuid[] DEFAULT '{}'
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_id uuid;
BEGIN
  IF (COALESCE(array_length(_user_ids,1),0) = 0
      AND COALESCE(array_length(_customer_ids,1),0) = 0) THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.push_outbox(user_ids, customer_ids, title, body, type, url)
  VALUES (COALESCE(_user_ids,'{}'), COALESCE(_customer_ids,'{}'), _title, _body, _type, _url)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- ============ TRIGGER: bookings status change ============
CREATE OR REPLACE FUNCTION public.tg_push_booking_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_title text;
  v_body text;
  v_type text := 'info';
BEGIN
  IF NEW.booking_status IS NOT DISTINCT FROM OLD.booking_status THEN
    RETURN NEW;
  END IF;

  SELECT user_id INTO v_user_id FROM public.customers WHERE id = NEW.customer_id;
  IF v_user_id IS NULL THEN RETURN NEW; END IF;

  v_title := 'Status Booking Diperbarui';
  v_body := 'Booking ' || NEW.booking_code || ' kini berstatus: ' || NEW.booking_status;

  IF NEW.booking_status::text = 'confirmed' THEN v_type := 'success';
  ELSIF NEW.booking_status::text IN ('cancelled','refunded') THEN v_type := 'warning';
  END IF;

  PERFORM public.enqueue_push(
    ARRAY[v_user_id], v_title, v_body, v_type,
    '/jamaah/booking/' || NEW.id::text
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS push_booking_status_change ON public.bookings;
CREATE TRIGGER push_booking_status_change
AFTER UPDATE OF booking_status ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.tg_push_booking_status();

-- ============ TRIGGER: payments paid ============
CREATE OR REPLACE FUNCTION public.tg_push_payment_paid()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_booking_code text;
BEGIN
  IF NEW.status::text <> 'paid' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status::text = 'paid' THEN RETURN NEW; END IF;

  SELECT c.user_id, b.booking_code
    INTO v_user_id, v_booking_code
  FROM public.bookings b
  JOIN public.customers c ON c.id = b.customer_id
  WHERE b.id = NEW.booking_id;

  IF v_user_id IS NULL THEN RETURN NEW; END IF;

  PERFORM public.enqueue_push(
    ARRAY[v_user_id],
    'Pembayaran Diterima',
    'Pembayaran Rp ' || to_char(NEW.amount, 'FM999,999,999')
       || ' untuk booking ' || COALESCE(v_booking_code,'') || ' telah diverifikasi.',
    'success',
    '/jamaah/pembayaran'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS push_payment_paid ON public.payments;
CREATE TRIGGER push_payment_paid
AFTER INSERT OR UPDATE OF status ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.tg_push_payment_paid();

-- ============ TRIGGER: store_orders shipped ============
CREATE OR REPLACE FUNCTION public.tg_push_store_order_shipped()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_user_id uuid;
BEGIN
  IF NEW.status <> 'shipped' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'shipped' THEN RETURN NEW; END IF;

  v_user_id := NEW.user_id;
  IF v_user_id IS NULL AND NEW.customer_id IS NOT NULL THEN
    SELECT user_id INTO v_user_id FROM public.customers WHERE id = NEW.customer_id;
  END IF;
  IF v_user_id IS NULL THEN RETURN NEW; END IF;

  PERFORM public.enqueue_push(
    ARRAY[v_user_id],
    'Pesanan Dikirim',
    'Pesanan ' || NEW.order_number || ' telah dikirim. Pantau status pengiriman di portal.',
    'success',
    '/jamaah/orders/' || NEW.id::text
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS push_store_order_shipped ON public.store_orders;
CREATE TRIGGER push_store_order_shipped
AFTER UPDATE OF status ON public.store_orders
FOR EACH ROW EXECUTE FUNCTION public.tg_push_store_order_shipped();

-- ============ H-1 DEPARTURE REMINDER ============
CREATE OR REPLACE FUNCTION public.enqueue_h_minus_one_push()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int := 0;
  r record;
  v_user_ids uuid[];
BEGIN
  FOR r IN
    SELECT d.id, d.departure_date, p.name AS package_name
    FROM public.departures d
    LEFT JOIN public.packages p ON p.id = d.package_id
    WHERE d.departure_date = (CURRENT_DATE + INTERVAL '1 day')::date
      AND COALESCE(d.status::text,'open') NOT IN ('cancelled','closed')
  LOOP
    SELECT COALESCE(array_agg(DISTINCT c.user_id) FILTER (WHERE c.user_id IS NOT NULL), '{}')
      INTO v_user_ids
    FROM public.bookings b
    JOIN public.customers c ON c.id = b.customer_id
    WHERE b.departure_id = r.id
      AND b.booking_status::text NOT IN ('cancelled','refunded');

    IF COALESCE(array_length(v_user_ids,1),0) > 0 THEN
      PERFORM public.enqueue_push(
        v_user_ids,
        'Keberangkatan Besok!',
        'Keberangkatan ' || COALESCE(r.package_name,'Anda')
          || ' dijadwalkan besok (' || to_char(r.departure_date,'DD Mon YYYY')
          || '). Pastikan dokumen & perlengkapan siap.',
        'warning',
        '/jamaah/jadwal'
      );
      v_count := v_count + 1;
    END IF;
  END LOOP;
  RETURN v_count;
END;
$$;
