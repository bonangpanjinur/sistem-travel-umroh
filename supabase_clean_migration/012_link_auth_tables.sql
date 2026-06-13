-- =============================================================================
-- VINSTOUR TRAVEL PORTAL — Clean Migration Chain
-- FILE 012: Link auth.users ↔ public.profiles ↔ public.user_roles
--
-- Tujuan:
--   1. Buat/perbarui fungsi handle_new_user() — otomatis buat profil +
--      assign role 'customer' setiap kali user baru daftar di auth.users.
--   2. Pasang trigger on_auth_user_created pada auth.users.
--   3. Backfill semua auth.users yang sudah ada tapi belum punya profil
--      atau user_role (termasuk user lama sebelum trigger dipasang).
--
-- Aman dijalankan berulang kali (idempotent).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. FUNGSI: handle_new_user()
--    Dipanggil oleh trigger setiap kali row baru masuk ke auth.users.
--    • Buat profil di public.profiles
--    • Assign role default 'customer'
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Buat profil (ON CONFLICT DO NOTHING agar idempotent)
  INSERT INTO public.profiles (id, full_name, email, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE SET
    email      = COALESCE(EXCLUDED.email, profiles.email),
    updated_at = NOW();

  -- Assign role default 'customer' (jika belum ada role apapun untuk user ini)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'customer')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2. TRIGGER: on_auth_user_created
--    AFTER INSERT pada auth.users → panggil handle_new_user()
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 3. BACKFILL: auth.users yang sudah ada tapi belum punya profil/role
--
--    Kasus ini terjadi jika:
--    • User dibuat sebelum trigger dipasang
--    • Migrasi dijalankan di database yang sudah punya data
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_count_profiles  INTEGER;
  v_count_roles     INTEGER;
BEGIN

  -- 3a. Buat profil untuk semua auth.users yang belum ada di public.profiles
  INSERT INTO public.profiles (id, full_name, email, avatar_url)
  SELECT
    u.id,
    COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
    u.email,
    u.raw_user_meta_data->>'avatar_url'
  FROM auth.users u
  WHERE NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = u.id
  )
  ON CONFLICT (id) DO NOTHING;

  GET DIAGNOSTICS v_count_profiles = ROW_COUNT;
  RAISE NOTICE 'Backfill profiles: % baris baru ditambahkan.', v_count_profiles;

  -- 3b. Assign role 'customer' untuk semua auth.users yang belum punya role apapun
  INSERT INTO public.user_roles (user_id, role)
  SELECT u.id, 'customer'
  FROM auth.users u
  WHERE NOT EXISTS (
    SELECT 1 FROM public.user_roles ur WHERE ur.user_id = u.id
  )
  ON CONFLICT (user_id, role) DO NOTHING;

  GET DIAGNOSTICS v_count_roles = ROW_COUNT;
  RAISE NOTICE 'Backfill user_roles: % baris baru ditambahkan.', v_count_roles;

END;
$$;

-- ---------------------------------------------------------------------------
-- 4. VERIFIKASI — Tampilkan ringkasan koneksi antar tabel
-- ---------------------------------------------------------------------------
SELECT
  u.id                                          AS auth_user_id,
  u.email                                       AS email,
  p.full_name                                   AS profil_nama,
  COALESCE(
    string_agg(ur.role, ', ' ORDER BY ur.role),
    '⚠ belum ada role'
  )                                             AS roles
FROM auth.users u
LEFT JOIN public.profiles   p  ON p.id      = u.id
LEFT JOIN public.user_roles ur ON ur.user_id = u.id
GROUP BY u.id, u.email, p.full_name
ORDER BY u.email;

SELECT '012_link_auth_tables: OK — auth.users ↔ profiles ↔ user_roles terhubung.' AS result;
