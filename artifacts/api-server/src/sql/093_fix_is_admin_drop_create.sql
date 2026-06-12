-- =============================================================================
-- 093_fix_is_admin_drop_create.sql
-- Pastikan is_admin(), has_role(), user_belongs_to_branch() terdefinisi benar.
-- Gunakan CREATE OR REPLACE dengan nama parameter SAMA agar tidak error pada
-- database yang sudah memiliki fungsi ini (RLS policies bergantung padanya).
-- Idempotent — aman dijalankan berkali-kali.
-- =============================================================================

-- is_admin(user_id) — pakai nama parameter 'user_id' yang sama seperti sebelumnya
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

-- has_role(p_user_id, p_role TEXT) — cek role tertentu
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

-- user_belongs_to_branch(p_user_id, p_branch_id) — cek keanggotaan cabang
CREATE OR REPLACE FUNCTION public.user_belongs_to_branch(p_user_id UUID, p_branch_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = $1
      AND user_roles.branch_id = $2
  )
  OR EXISTS (
    SELECT 1 FROM public.employees
    WHERE employees.user_id = $1
      AND employees.branch_id = $2
  );
$$;
GRANT EXECUTE ON FUNCTION public.user_belongs_to_branch(UUID, UUID) TO PUBLIC;

-- Grant akses auth stubs ke PUBLIC
GRANT EXECUTE ON FUNCTION auth.uid()   TO PUBLIC;
GRANT EXECUTE ON FUNCTION auth.role()  TO PUBLIC;
GRANT EXECUTE ON FUNCTION auth.jwt()   TO PUBLIC;
GRANT EXECUTE ON FUNCTION auth.email() TO PUBLIC;

-- =============================================================================
SELECT '093_fix_is_admin_drop_create complete' AS result;
