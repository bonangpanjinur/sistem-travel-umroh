CREATE OR REPLACE FUNCTION public.generate_booking_code(_package_code TEXT DEFAULT '', _departure_date DATE DEFAULT CURRENT_DATE)
RETURNS TEXT LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
  pkg_init TEXT;
  date_part TEXT;
BEGIN
  pkg_init := UPPER(SUBSTRING(COALESCE(NULLIF(_package_code, ''), 'XX'), 1, 3));
  date_part := TO_CHAR(COALESCE(_departure_date, CURRENT_DATE), 'YYMMDD');
  LOOP
    new_code := 'TRA' || pkg_init || date_part || UPPER(SUBSTRING(md5(random()::text), 1, 4));
    SELECT EXISTS(SELECT 1 FROM public.bookings WHERE booking_code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  RETURN new_code;
END;
$$;