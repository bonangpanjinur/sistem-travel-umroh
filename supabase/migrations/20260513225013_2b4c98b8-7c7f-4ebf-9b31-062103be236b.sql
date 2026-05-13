REVOKE EXECUTE ON FUNCTION public.delete_departure_safely(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.delete_departure_safely(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.delete_departure_safely(uuid) TO authenticated;