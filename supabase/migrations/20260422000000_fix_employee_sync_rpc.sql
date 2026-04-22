-- Fix validate_employee_user_sync RPC to match the expected return type in the frontend
CREATE OR REPLACE FUNCTION public.validate_employee_user_sync()
RETURNS TABLE (
    issue_type TEXT,
    employee_id UUID,
    user_id UUID,
    full_name TEXT,
    employee_code TEXT,
    description TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- 1. Employees without User ID
    RETURN QUERY
    SELECT 
        'MISSING_USER_ID'::TEXT,
        e.id,
        NULL::UUID,
        e.full_name,
        e.employee_code,
        'Employee record exists but user_id is null'::TEXT
    FROM public.employees e
    WHERE e.user_id IS NULL;

    -- 2. Employees with User ID that doesn't exist in auth.users
    RETURN QUERY
    SELECT 
        'ORPHANED_EMPLOYEE'::TEXT,
        e.id,
        e.user_id,
        e.full_name,
        e.employee_code,
        'Employee references a user_id that does not exist in auth.users'::TEXT
    FROM public.employees e
    LEFT JOIN auth.users u ON e.user_id = u.id
    WHERE e.user_id IS NOT NULL AND u.id IS NULL;

    -- 3. Users with employee-like roles but no employee record
    RETURN QUERY
    SELECT 
        'MISSING_EMPLOYEE_RECORD'::TEXT,
        NULL::UUID,
        ur.user_id,
        p.full_name,
        NULL::TEXT,
        'User has role ' || ur.role || ' but no record in employees table'::TEXT
    FROM public.user_roles ur
    JOIN public.profiles p ON ur.user_id = p.user_id
    LEFT JOIN public.employees e ON ur.user_id = e.user_id
    WHERE ur.role IN ('branch_manager', 'finance', 'operational', 'sales', 'marketing', 'equipment')
      AND e.id IS NULL;
END;
$$;
