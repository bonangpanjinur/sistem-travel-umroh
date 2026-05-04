-- Re-grant execute permissions on validate_employee_user_sync to authenticated role
-- This fixes the 400 error when HR menu tries to call this RPC

-- Ensure function exists with correct signature (idempotent recreate)
CREATE OR REPLACE FUNCTION public.validate_employee_user_sync()
 RETURNS TABLE(issue_type text, employee_id uuid, user_id uuid, full_name text, employee_code text, description text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  -- Employees with user_id pointing to a non-existent auth user
  SELECT
    'orphan_user_id'::text AS issue_type,
    e.id AS employee_id,
    e.user_id,
    e.full_name,
    e.employee_code,
    'Employee references a user that no longer exists'::text AS description
  FROM public.employees e
  WHERE e.user_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = e.user_id)
  UNION ALL
  -- Employees without user_id
  SELECT
    'missing_user_link'::text AS issue_type,
    e.id AS employee_id,
    NULL::uuid AS user_id,
    e.full_name,
    e.employee_code,
    'Employee has no linked user account'::text AS description
  FROM public.employees e
  WHERE e.user_id IS NULL;
$function$;

-- Revoke from PUBLIC then grant only to authenticated (and service_role) — restricts unauthorized use while fixing 400
REVOKE ALL ON FUNCTION public.validate_employee_user_sync() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_employee_user_sync() TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_employee_user_sync() TO service_role;