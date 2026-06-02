CREATE OR REPLACE FUNCTION public.get_public_booking_details(p_booking_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'id', b.id,
    'booking_code', b.booking_code,
    'booking_status', b.booking_status,
    'payment_status', b.payment_status,
    'total_price', b.total_price,
    'paid_amount', b.paid_amount,
    'remaining_amount', GREATEST(0, b.total_price - COALESCE(b.paid_amount, 0)),
    'currency', b.currency,
    'room_type', b.room_type,
    'total_pax', b.total_pax,
    'created_at', b.created_at,
    'payment_deadline', b.payment_deadline,
    'customer', jsonb_build_object(
      'full_name', c.full_name,
      'phone_masked',
        CASE
          WHEN c.phone IS NULL OR length(c.phone) < 4 THEN NULL
          ELSE left(c.phone, 4) || repeat('*', GREATEST(0, length(c.phone) - 6)) || right(c.phone, 2)
        END
    ),
    'departure', CASE WHEN d.id IS NULL THEN NULL ELSE jsonb_build_object(
      'departure_date', d.departure_date,
      'return_date', d.return_date,
      'package', CASE WHEN p.id IS NULL THEN NULL ELSE jsonb_build_object(
        'name', p.name,
        'code', p.code
      ) END
    ) END
  )
  INTO result
  FROM public.bookings b
  LEFT JOIN public.customers c ON c.id = b.customer_id
  LEFT JOIN public.departures d ON d.id = b.departure_id
  LEFT JOIN public.packages p ON p.id = d.package_id
  WHERE b.id = p_booking_id;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_booking_details(uuid) TO anon, authenticated;
