-- 1. Trigger function untuk sinkronisasi otomatis booked_count
CREATE OR REPLACE FUNCTION public.sync_departure_booked_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_active boolean := false;
  v_new_active boolean := false;
BEGIN
  IF TG_OP IN ('UPDATE','DELETE') THEN
    v_old_active := COALESCE(OLD.booking_status::text, '') NOT IN ('cancelled','refunded');
  END IF;
  IF TG_OP IN ('INSERT','UPDATE') THEN
    v_new_active := COALESCE(NEW.booking_status::text, '') NOT IN ('cancelled','refunded');
  END IF;

  -- Decrement dari old departure
  IF TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND (
        OLD.departure_id IS DISTINCT FROM NEW.departure_id
        OR v_old_active <> v_new_active
        OR COALESCE(OLD.total_pax,0) IS DISTINCT FROM COALESCE(NEW.total_pax,0)
      )) THEN
    IF v_old_active AND OLD.departure_id IS NOT NULL THEN
      UPDATE public.departures
        SET booked_count = GREATEST(0, COALESCE(booked_count,0) - COALESCE(OLD.total_pax,0)),
            updated_at = now()
        WHERE id = OLD.departure_id;
    END IF;
  END IF;

  -- Increment ke new departure
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND (
        OLD.departure_id IS DISTINCT FROM NEW.departure_id
        OR v_old_active <> v_new_active
        OR COALESCE(OLD.total_pax,0) IS DISTINCT FROM COALESCE(NEW.total_pax,0)
      )) THEN
    IF v_new_active AND NEW.departure_id IS NOT NULL THEN
      UPDATE public.departures
        SET booked_count = COALESCE(booked_count,0) + COALESCE(NEW.total_pax,0),
            updated_at = now()
        WHERE id = NEW.departure_id;
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_departure_booked_count ON public.bookings;
CREATE TRIGGER trg_sync_departure_booked_count
AFTER INSERT OR UPDATE OR DELETE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.sync_departure_booked_count();

-- 2. RPC untuk rekonsiliasi manual
CREATE OR REPLACE FUNCTION public.recalculate_departure_booked_count(p_departure_id uuid DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update keberangkatan yang punya booking aktif
  UPDATE public.departures d
    SET booked_count = sub.cnt,
        updated_at = now()
  FROM (
    SELECT departure_id, COALESCE(SUM(total_pax),0)::int AS cnt
    FROM public.bookings
    WHERE booking_status::text NOT IN ('cancelled','refunded')
      AND departure_id IS NOT NULL
      AND (p_departure_id IS NULL OR departure_id = p_departure_id)
    GROUP BY departure_id
  ) sub
  WHERE d.id = sub.departure_id
    AND (p_departure_id IS NULL OR d.id = p_departure_id);

  -- Reset ke 0 untuk keberangkatan tanpa booking aktif
  UPDATE public.departures
    SET booked_count = 0,
        updated_at = now()
  WHERE (p_departure_id IS NULL OR id = p_departure_id)
    AND COALESCE(booked_count,0) <> 0
    AND id NOT IN (
      SELECT departure_id FROM public.bookings
      WHERE booking_status::text NOT IN ('cancelled','refunded')
        AND departure_id IS NOT NULL
    );
END;
$$;

-- 3. Rekonsiliasi data eksisting
SELECT public.recalculate_departure_booked_count();