-- =============================================================================
-- 094_is_admin_final_fix.sql
-- Perbaikan akhir is_admin(): gunakan CREATE OR REPLACE dengan nama parameter
-- yang sama (user_id) dan referensi $1 agar tidak konflik dengan dependent objects.
-- Idempotent — aman dijalankan berkali-kali.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = COALESCE(
      $1,
      NULLIF(current_setting('request.jwt.claims', true)::jsonb->>'sub', '')::UUID
    )
    AND ur.role IN ('super_admin', 'owner', 'admin')
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO PUBLIC;

-- Pastikan has_role dan user_belongs_to_branch ada (idempotent)
CREATE OR REPLACE FUNCTION public.has_role(p_user_id UUID, p_role TEXT)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = $1
      AND user_roles.role = $2
  );
$$;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, TEXT) TO PUBLIC;

CREATE OR REPLACE FUNCTION public.user_belongs_to_branch(p_user_id UUID, p_branch_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = $1 AND user_roles.branch_id = $2
  )
  OR EXISTS (
    SELECT 1 FROM public.employees
    WHERE employees.user_id = $1 AND employees.branch_id = $2
  );
$$;
GRANT EXECUTE ON FUNCTION public.user_belongs_to_branch(UUID, UUID) TO PUBLIC;

-- Grant auth stubs
GRANT EXECUTE ON FUNCTION auth.uid()   TO PUBLIC;
GRANT EXECUTE ON FUNCTION auth.role()  TO PUBLIC;
GRANT EXECUTE ON FUNCTION auth.jwt()   TO PUBLIC;
GRANT EXECUTE ON FUNCTION auth.email() TO PUBLIC;

SELECT '094_is_admin_final_fix complete' AS result;
