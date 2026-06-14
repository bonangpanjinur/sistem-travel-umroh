-- =============================================================================
-- VINSTOUR TRAVEL PORTAL — Clean Migration v2
-- FILE 005: Role Helper Functions
-- Fungsi pembantu untuk semua RLS policy.
-- WAJIB dijalankan sebelum file 027_rls.sql.
-- Referensi ke user_roles table (file 007) — PostgreSQL lazy evaluation,
-- function body divalidasi saat runtime bukan saat CREATE.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- has_role(uid, role) — Cek apakah user memiliki 1 role tertentu
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.has_role(
  uid  UUID,
  r    public.app_role
)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = uid
      AND role::text = r::text
      AND is_active = TRUE
      AND (expires_at IS NULL OR expires_at > NOW())
  );
$$;

-- ---------------------------------------------------------------------------
-- has_any_role(uid, roles[]) — Cek apakah user memiliki salah satu role
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.has_any_role(
  uid   UUID,
  roles public.app_role[]
)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = uid
      AND role::text = ANY(roles::text[])
      AND is_active = TRUE
      AND (expires_at IS NULL OR expires_at > NOW())
  );
$$;

-- ---------------------------------------------------------------------------
-- is_staff(uid) — Cek apakah user adalah staf internal (bukan agen/jamaah)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_staff(uid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT public.has_any_role(uid, ARRAY[
    'super_admin','owner','it','admin','branch_manager',
    'finance','operational','operator','sales','marketing','equipment'
  ]::public.app_role[]);
$$;

-- ---------------------------------------------------------------------------
-- is_admin_or_above(uid) — super_admin / owner / it / admin
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin_or_above(uid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT public.has_any_role(uid, ARRAY[
    'super_admin','owner','it','admin'
  ]::public.app_role[]);
$$;

-- ---------------------------------------------------------------------------
-- get_user_role(uid) — Ambil role tertinggi user (untuk display)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_user_primary_role(uid UUID)
RETURNS public.app_role
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role FROM public.user_roles
  WHERE user_id = uid
    AND is_active = TRUE
    AND (expires_at IS NULL OR expires_at > NOW())
  ORDER BY
    CASE role
      WHEN 'super_admin'    THEN 1
      WHEN 'owner'          THEN 2
      WHEN 'it'             THEN 3
      WHEN 'admin'          THEN 4
      WHEN 'branch_manager' THEN 5
      WHEN 'finance'        THEN 6
      WHEN 'operational'    THEN 7
      WHEN 'operator'       THEN 8
      WHEN 'sales'          THEN 9
      WHEN 'marketing'      THEN 10
      WHEN 'equipment'      THEN 11
      WHEN 'agent'          THEN 12
      WHEN 'sub_agent'      THEN 13
      WHEN 'customer'       THEN 14
      WHEN 'jamaah'         THEN 15
    END
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.has_role IS 'Gunakan di semua RLS policy. Jangan tulis role = ''admin'' langsung di policy.';
COMMENT ON FUNCTION public.has_any_role IS 'Versi multi-role dari has_role().';
COMMENT ON FUNCTION public.is_staff IS 'TRUE jika user adalah staf internal (bukan agen/jamaah).';
