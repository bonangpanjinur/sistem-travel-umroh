-- =============================================================================
-- fase0_5_auth_helper_functions.sql
-- Prerequisite helper functions required by RLS policies throughout all later
-- migrations. Must run AFTER fase0_foundation.sql (which creates user_roles
-- and employees tables) and BEFORE any v0_missing_tables or v4_patches file.
--
-- Functions defined here:
--   • public.is_admin(UUID)              — true if user has super_admin/owner/admin role
--   • public.has_role(UUID, TEXT)        — true if user has a specific role
--   • public.user_belongs_to_branch(UUID, UUID) — true if user is in a branch
--
-- Source: artifacts/api-server/src/sql/094_is_admin_final_fix.sql
-- CREATE OR REPLACE is idempotent — safe to run multiple times.
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

-- has_role(p_user_id, p_role TEXT) — check a specific role
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

-- user_belongs_to_branch(p_user_id, p_branch_id) — check branch membership
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

-- Grant auth stub functions to PUBLIC (Supabase-compatible; no-op on plain Postgres)
DO $$
BEGIN
  EXECUTE 'GRANT EXECUTE ON FUNCTION auth.uid()   TO PUBLIC';
EXCEPTION WHEN undefined_function OR undefined_schema THEN NULL;
END $$;

DO $$
BEGIN
  EXECUTE 'GRANT EXECUTE ON FUNCTION auth.role()  TO PUBLIC';
EXCEPTION WHEN undefined_function OR undefined_schema THEN NULL;
END $$;

DO $$
BEGIN
  EXECUTE 'GRANT EXECUTE ON FUNCTION auth.jwt()   TO PUBLIC';
EXCEPTION WHEN undefined_function OR undefined_schema THEN NULL;
END $$;

DO $$
BEGIN
  EXECUTE 'GRANT EXECUTE ON FUNCTION auth.email() TO PUBLIC';
EXCEPTION WHEN undefined_function OR undefined_schema THEN NULL;
END $$;
