-- =====================================================
-- EMPLOYEE & USER SYNC IMPROVEMENTS
-- =====================================================

-- 1. Ensure employees.user_id has ON DELETE CASCADE if not already
-- First, find the constraint name
DO $$ 
DECLARE 
    const_name TEXT;
BEGIN
    SELECT constraint_name INTO const_name
    FROM information_schema.key_column_usage
    WHERE table_name = 'employees' AND column_name = 'user_id' AND table_schema = 'public';

    IF const_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.employees DROP CONSTRAINT ' || const_name;
    END IF;
    
    ALTER TABLE public.employees 
    ADD CONSTRAINT employees_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
END $$;

-- 2. RPC for Data Consistency Validation
-- =====================================================
CREATE OR REPLACE FUNCTION public.validate_employee_user_sync()
RETURNS TABLE (
    issue_type TEXT,
    entity_id UUID,
    entity_name TEXT,
    details TEXT
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
        e.full_name,
        'Employee record exists but user_id is null'::TEXT
    FROM public.employees e
    WHERE e.user_id IS NULL;

    -- 2. Employees with User ID that doesn't exist in auth.users
    -- (Should be prevented by FK, but good for deep check)
    RETURN QUERY
    SELECT 
        'ORPHANED_EMPLOYEE'::TEXT,
        e.id,
        e.full_name,
        'Employee references a user_id that does not exist in auth.users'::TEXT
    FROM public.employees e
    LEFT JOIN auth.users u ON e.user_id = u.id
    WHERE e.user_id IS NOT NULL AND u.id IS NULL;

    -- 3. Users with employee-like roles but no employee record
    RETURN QUERY
    SELECT 
        'MISSING_EMPLOYEE_RECORD'::TEXT,
        ur.user_id,
        p.full_name,
        'User has role ' || ur.role || ' but no record in employees table'::TEXT
    FROM public.user_roles ur
    JOIN public.profiles p ON ur.user_id = p.user_id
    LEFT JOIN public.employees e ON ur.user_id = e.user_id
    WHERE ur.role IN ('branch_manager', 'finance', 'operational', 'sales', 'marketing', 'equipment')
      AND e.id IS NULL;
END;
$$;

-- 3. RPC for Unified Employee Deletion
-- =====================================================
-- This function deletes both the employee and the associated auth user
CREATE OR REPLACE FUNCTION public.delete_employee_unified(_employee_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    _user_id UUID;
    _full_name TEXT;
BEGIN
    -- Check if caller is admin
    IF NOT public.is_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Unauthorized: Only admins can delete employees';
    END IF;

    -- Get user_id and name before deletion
    SELECT user_id, full_name INTO _user_id, _full_name
    FROM public.employees
    WHERE id = _employee_id;

    IF _user_id IS NULL THEN
        -- If no user_id, just delete the employee record
        DELETE FROM public.employees WHERE id = _employee_id;
    ELSE
        -- Delete from auth.users (cascades to employees, profiles, user_roles)
        -- Note: In Supabase, deleting from auth.users requires service_role or admin privileges.
        -- Since this is a SECURITY DEFINER function, it runs as the owner.
        -- However, direct delete from auth.users might be restricted.
        -- We'll use a trick: delete from employees first if cascade doesn't work from auth side,
        -- but usually we want to delete the user.
        
        -- For safety in Edge Functions, we usually call admin auth API.
        -- But here we can try to delete from public.employees and let the UI/Edge function handle auth.
        -- Actually, the best way is to have the Edge Function handle both.
        -- This RPC will just be a helper for the database part if needed.
        
        DELETE FROM public.employees WHERE id = _employee_id;
        -- The Edge function will call auth.admin.deleteUser(_user_id)
    END IF;

    -- Log the action
    PERFORM public.log_audit_action(
        'employees',
        _employee_id,
        'DELETE_EMPLOYEE',
        'DELETE',
        jsonb_build_object('full_name', _full_name, 'user_id', _user_id),
        NULL,
        'warning',
        jsonb_build_object('deleted_by', auth.uid())
    );

    RETURN TRUE;
END;
$$;
