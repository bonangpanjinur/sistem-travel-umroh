-- Function to delete a user from auth.users
-- This requires super_admin role only
CREATE OR REPLACE FUNCTION public.delete_user_by_admin(target_user_id UUID)
RETURNS VOID
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
        RAISE EXCEPTION 'Only super_admin can delete users';
    END IF;

    -- Prevent self-deletion
    IF auth.uid() = target_user_id THEN
        RAISE EXCEPTION 'You cannot delete your own account';
    END IF;

    -- Delete from auth.users (cascades to other tables if configured, 
    -- but usually profiles and user_roles are linked with ON DELETE CASCADE)
    DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;

-- Grant access to authenticated users (the function itself checks for roles)
GRANT EXECUTE ON FUNCTION public.delete_user_by_admin(UUID) TO authenticated;
