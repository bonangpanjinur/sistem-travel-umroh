CREATE OR REPLACE FUNCTION public.validate_employee_user_sync()
RETURNS TABLE(
  issue_type text,
  employee_id uuid,
  user_id uuid,
  full_name text,
  employee_code text,
  description text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    'orphan_user_id'::text AS issue_type,
    e.id::uuid AS employee_id,
    e.user_id::uuid AS user_id,
    e.full_name::text AS full_name,
    e.employee_code::text AS employee_code,
    'Employee references a user that no longer exists'::text AS description
  FROM public.employees e
  WHERE e.user_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM auth.users u
      WHERE u.id = e.user_id
    )

  UNION ALL

  SELECT
    'missing_user_link'::text AS issue_type,
    e.id::uuid AS employee_id,
    NULL::uuid AS user_id,
    e.full_name::text AS full_name,
    e.employee_code::text AS employee_code,
    'Employee has no linked user account'::text AS description
  FROM public.employees e
  WHERE e.user_id IS NULL;
$function$;

GRANT EXECUTE ON FUNCTION public.validate_employee_user_sync() TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_employee_user_sync() TO service_role;

NOTIFY pgrst, 'reload schema';