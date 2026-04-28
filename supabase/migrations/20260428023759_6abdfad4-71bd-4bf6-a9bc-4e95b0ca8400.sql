DROP VIEW IF EXISTS public.v_role_user_counts;
CREATE VIEW public.v_role_user_counts WITH (security_invoker=true) AS
SELECT role::text AS role, COUNT(DISTINCT user_id) AS user_count
FROM public.user_roles
GROUP BY role;
GRANT SELECT ON public.v_role_user_counts TO authenticated;