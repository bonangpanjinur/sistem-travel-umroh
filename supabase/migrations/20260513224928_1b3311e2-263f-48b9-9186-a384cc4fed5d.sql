CREATE OR REPLACE FUNCTION public.delete_departure_safely(_departure_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_booking_count integer := 0;
  v_deleted_count integer := 0;
BEGIN
  IF _departure_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'departure_id_required');
  END IF;

  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Anda tidak memiliki akses untuk menghapus jadwal keberangkatan';
  END IF;

  SELECT COUNT(*) INTO v_booking_count
  FROM public.bookings
  WHERE departure_id = _departure_id;

  IF v_booking_count > 0 THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'departure_has_bookings',
      'booking_count', v_booking_count
    );
  END IF;

  -- Bersihkan data operasional yang mengikuti jadwal keberangkatan.
  DELETE FROM public.equipment_distributions WHERE departure_id = _departure_id;
  DELETE FROM public.manasik_schedules WHERE departure_id = _departure_id;
  DELETE FROM public.attendance WHERE departure_id = _departure_id;
  DELETE FROM public.bus_assignments WHERE departure_id = _departure_id;
  DELETE FROM public.departure_hotels WHERE departure_id = _departure_id;
  DELETE FROM public.departure_itineraries WHERE departure_id = _departure_id;
  DELETE FROM public.departure_surveys WHERE departure_id = _departure_id;
  DELETE FROM public.jamaah_daily_attendance WHERE departure_id = _departure_id;
  DELETE FROM public.jamaah_qr_codes WHERE departure_id = _departure_id;
  DELETE FROM public.luggage WHERE departure_id = _departure_id;
  DELETE FROM public.manifests WHERE departure_id = _departure_id;
  DELETE FROM public.room_assignments WHERE departure_id = _departure_id;
  DELETE FROM public.seat_holds WHERE departure_id = _departure_id;
  DELETE FROM public.vendor_costs WHERE departure_id = _departure_id;

  -- Simpan data riwayat, hanya lepaskan relasinya ke jadwal.
  UPDATE public.support_tickets SET departure_id = NULL WHERE departure_id = _departure_id;
  UPDATE public.visa_applications SET departure_id = NULL WHERE departure_id = _departure_id;
  UPDATE public.jamaah_live_locations SET departure_id = NULL WHERE departure_id = _departure_id;
  UPDATE public.room_assignment_audit SET departure_id = NULL WHERE departure_id = _departure_id;

  DELETE FROM public.departures WHERE id = _departure_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  IF v_deleted_count = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'departure_not_found');
  END IF;

  RETURN jsonb_build_object('ok', true, 'deleted_count', v_deleted_count);
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_departure_safely(uuid) TO authenticated;