-- Enable pgcrypto for crypt() and gen_salt()
-- In Supabase, extensions are typically in the extensions schema
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Function to reset user password by admin
-- This requires super_admin or owner role
-- This function sends a password reset email to the user
CREATE OR REPLACE FUNCTION public.reset_user_password_by_admin(target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
    caller_role TEXT;
    target_user_email TEXT;
    result JSONB;
BEGIN
    -- Check if the caller is a super_admin only
    SELECT role INTO caller_role
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = 'super_admin'
    LIMIT 1;

    IF caller_role IS NULL THEN
        RAISE EXCEPTION 'Only super_admin can reset user passwords';
    END IF;

    -- Prevent self-password-reset (user should use forgot password instead)
    IF auth.uid() = target_user_id THEN
        RAISE EXCEPTION 'You cannot reset your own password. Please use the forgot password feature.';
    END IF;

    -- Get the target user's email
    SELECT email INTO target_user_email
    FROM auth.users
    WHERE id = target_user_id;

    IF target_user_email IS NULL THEN
        RAISE EXCEPTION 'User not found';
    END IF;

    -- Call the Supabase auth function to send password reset email
    -- This will send a reset link to the user's email
    SELECT auth.send_recovery_email(target_user_email) INTO result;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Password reset email sent to ' || target_user_email,
        'email', target_user_email
    );
END;
$$;

-- Grant access to authenticated users (the function itself checks for roles)
GRANT EXECUTE ON FUNCTION public.reset_user_password_by_admin(UUID) TO authenticated;

-- Alternative function: directly update password (more direct but requires password input)
-- Use this if you want super admin to set a temporary password directly
CREATE OR REPLACE FUNCTION public.set_user_password_by_admin(new_password TEXT, target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
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
        RAISE EXCEPTION 'Only super_admin can set user passwords';
    END IF;

    -- Prevent self-password-change (user should use their own settings)
    IF auth.uid() = target_user_id THEN
        RAISE EXCEPTION 'You cannot change your own password this way. Please use your account settings.';
    END IF;

    -- Validate password strength (minimum 8 characters)
    IF LENGTH(new_password) < 8 THEN
        RAISE EXCEPTION 'Password must be at least 8 characters long';
    END IF;

    -- Update the user's password
    -- We use explicit type casting to avoid "function does not exist" errors
    -- and include extensions in the search_path
    UPDATE auth.users
    SET encrypted_password = extensions.crypt(new_password::text, extensions.gen_salt('bf'::text))
    WHERE id = target_user_id;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Password updated successfully'
    );
END;
$$;

-- Grant access to authenticated users (the function itself checks for roles)
GRANT EXECUTE ON FUNCTION public.set_user_password_by_admin(TEXT, UUID) TO authenticated;
