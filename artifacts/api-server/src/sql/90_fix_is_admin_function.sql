-- =============================================================================
-- 90_fix_is_admin_function.sql
-- Mendefinisikan fungsi is_admin() yang direferensikan di banyak RLS policy
-- tapi tidak pernah di-CREATE secara eksplisit di migration manapun.
-- Fungsi ini juga di-GRANT ke PUBLIC agar bisa dipanggil dari konteks RLS.
-- =============================================================================

-- ── Fungsi is_admin: cek apakah user adalah admin/owner/super_admin ──────────
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = COALESCE($1, (
      SELECT NULLIF(current_setting('request.jwt.claims', true)::jsonb->>'sub', '')::uuid
    ))
    AND user_roles.role IN ('super_admin', 'owner', 'admin')
  );
$$;

-- Beri akses ke semua role agar bisa dipanggil dari RLS policies
GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO PUBLIC;

-- ── Juga grant akses ke fungsi-fungsi auth yang dipakai di RLS ──────────────
GRANT EXECUTE ON FUNCTION auth.uid()   TO PUBLIC;
GRANT EXECUTE ON FUNCTION auth.role()  TO PUBLIC;
GRANT EXECUTE ON FUNCTION auth.jwt()   TO PUBLIC;
GRANT EXECUTE ON FUNCTION auth.email() TO PUBLIC;

-- =============================================================================
SELECT '90_fix_is_admin_function complete' AS result;
