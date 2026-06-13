-- =============================================================================
-- VINSTOUR TRAVEL PORTAL — Seeds
-- FILE: seed_admin.sql
-- Creates the initial super_admin user account.
--
-- IMPORTANT: Replace the placeholder UUID and email below with the actual
-- Supabase auth.users record created via the Supabase dashboard or Auth API.
-- You MUST create the auth.users entry first before running this seed.
--
-- Usage on Supabase:
--   1. Create user via Supabase Dashboard → Authentication → Users
--   2. Copy the generated UUID
--   3. Replace '00000000-0000-0000-0000-000000000099' below with that UUID
--   4. Run this file
-- =============================================================================

-- CONFIGURATION — edit before running
DO $$
DECLARE
  v_admin_id    UUID := '00000000-0000-0000-0000-000000000099'; -- ← Replace with real auth.users ID
  v_admin_email TEXT := 'admin@vinstour.com';                   -- ← Replace with real email
  v_admin_name  TEXT := 'Super Administrator';
BEGIN

  -- 1. Upsert profile
  INSERT INTO public.profiles (id, email, full_name, role, is_active)
  VALUES (v_admin_id, v_admin_email, v_admin_name, 'super_admin', TRUE)
  ON CONFLICT (id) DO UPDATE SET
    role       = 'super_admin',
    is_active  = TRUE,
    full_name  = COALESCE(EXCLUDED.full_name, profiles.full_name),
    updated_at = NOW();

  -- 2. Ensure user_role entry
  INSERT INTO public.user_roles (user_id, role, granted_by)
  VALUES (v_admin_id, 'super_admin', v_admin_id)
  ON CONFLICT (user_id, role) DO NOTHING;

  RAISE NOTICE 'Super admin seeded: % (%)', v_admin_name, v_admin_email;
END;
$$;

SELECT 'seed_admin: OK' AS result;
