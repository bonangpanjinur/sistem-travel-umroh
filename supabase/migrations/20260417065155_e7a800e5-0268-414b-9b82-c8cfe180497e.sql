
-- Add missing validate_employee_user_sync RPC to fix 400 error in AdminHR
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
SET search_path = public
AS $$
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
$$;
