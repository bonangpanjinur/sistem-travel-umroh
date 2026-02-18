-- Fix security warnings by setting search_path
ALTER FUNCTION public.log_booking_status_change() SET search_path = public;
ALTER FUNCTION public.set_booking_payment_deadline() SET search_path = public;
