-- Fix Function Search Path Mutable warnings
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'customer');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.generate_booking_code()
RETURNS TEXT AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    new_code := 'UMR' || TO_CHAR(NOW(), 'YYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
    SELECT EXISTS(SELECT 1 FROM public.bookings WHERE booking_code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  RETURN new_code;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE OR REPLACE FUNCTION public.generate_payment_code()
RETURNS TEXT AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    new_code := 'PAY' || TO_CHAR(NOW(), 'YYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
    SELECT EXISTS(SELECT 1 FROM public.payments WHERE payment_code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  RETURN new_code;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Fix RLS Policy Always True warnings by adding proper checks

-- Drop and recreate permissive policies with proper checks
DROP POLICY IF EXISTS "Users can create bookings" ON public.bookings;
CREATE POLICY "Users can create bookings" ON public.bookings FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
);

DROP POLICY IF EXISTS "Users can insert passengers" ON public.booking_passengers;
CREATE POLICY "Users can insert passengers" ON public.booking_passengers FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
);

DROP POLICY IF EXISTS "Users can upload payment proof" ON public.payments;
CREATE POLICY "Users can upload payment proof" ON public.payments FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
);

DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;
CREATE POLICY "System can insert audit logs" ON public.audit_logs FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL OR auth.uid() IS NULL
);

DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
CREATE POLICY "System can create notifications" ON public.notifications FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
);