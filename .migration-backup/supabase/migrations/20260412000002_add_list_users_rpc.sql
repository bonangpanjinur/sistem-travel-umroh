-- Function to list users with their emails
-- This requires super_admin role only
-- It returns data from auth.users which is normally protected
CREATE OR REPLACE FUNCTION public.list_users_with_emails()
RETURNS TABLE (
    id UUID,
    email TEXT,
    full_name TEXT,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with service_role privileges
SET search_path = public, auth
AS $$
DECLARE
    caller_role TEXT;
BEGIN
    -- Check if the caller is a super_admin only
    SELECT role INTO caller_role
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = 'super_admin'
    LIMIT 1;

    IF caller_role IS NULL THEN
        RAISE EXCEPTION 'Only super_admin can list users with emails';
    END IF;

    RETURN QUERY
    SELECT 
        u.id,
        u.email::TEXT,
        (u.raw_user_meta_data->>'full_name')::TEXT as full_name,
        u.created_at
    FROM auth.users u
    ORDER BY u.created_at DESC;
END;
$$;

-- Grant access to authenticated users (the function itself checks for roles)
GRANT EXECUTE ON FUNCTION public.list_users_with_emails() TO authenticated;
