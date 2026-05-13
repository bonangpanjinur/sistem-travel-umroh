-- Recreate delete_departure_safely to guarantee it exists in live DB
CREATE OR REPLACE FUNCTION public.delete_departure_safely(_departure_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking_count int := 0;
  v_deleted int := 0;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin(auth.uid()) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  IF _departure_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_departure_id');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.departures WHERE id = _departure_id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'departure_not_found');
  END IF;

  SELECT COUNT(*) INTO v_booking_count
  FROM public.bookings
  WHERE departure_id = _departure_id
    AND COALESCE(booking_status::text, '') NOT IN ('cancelled', 'refunded');

  IF v_booking_count > 0 THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'departure_has_bookings',
      'booking_count', v_booking_count
    );
  END IF;

  -- Cascading cleanup of dependent data
  DELETE FROM public.equipment_distributions WHERE departure_id = _departure_id;
  DELETE FROM public.manasik_schedules WHERE departure_id = _departure_id;

  -- Optional dependents (ignore if table missing)
  BEGIN DELETE FROM public.attendance WHERE departure_id = _departure_id; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.bus_assignments WHERE departure_id = _departure_id; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.departure_hotels WHERE departure_id = _departure_id; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.itineraries WHERE departure_id = _departure_id; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.surveys WHERE departure_id = _departure_id; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.luggage WHERE departure_id = _departure_id; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.manifests WHERE departure_id = _departure_id; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.room_assignments WHERE departure_id = _departure_id; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.seat_holds WHERE departure_id = _departure_id; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.vendor_costs WHERE departure_id = _departure_id; EXCEPTION WHEN undefined_table THEN NULL; END;

  -- Nullable references (preserve data)
  BEGIN UPDATE public.support_tickets SET departure_id = NULL WHERE departure_id = _departure_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN UPDATE public.visa_applications SET departure_id = NULL WHERE departure_id = _departure_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN UPDATE public.jamaah_live_locations SET departure_id = NULL WHERE departure_id = _departure_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN UPDATE public.room_assignment_audit SET departure_id = NULL WHERE departure_id = _departure_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;

  DELETE FROM public.departures WHERE id = _departure_id;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  RETURN jsonb_build_object('ok', true, 'deleted_count', v_deleted);
END;
$$;

REVOKE ALL ON FUNCTION public.delete_departure_safely(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_departure_safely(uuid) TO authenticated;

-- Force PostgREST schema cache reload so RPC is immediately discoverable
NOTIFY pgrst, 'reload schema';