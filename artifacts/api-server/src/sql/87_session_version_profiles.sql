-- =============================================================================
-- 87_session_version_profiles.sql
-- Menambah kolom session_version di tabel profiles untuk mendukung
-- server-side session revocation (logout paksa semua device).
-- Idempotent — aman dijalankan berkali-kali.
-- =============================================================================

-- Kolom session_version: dinaikkan saat admin revoke semua session user
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS session_version INTEGER DEFAULT 1;

-- Fungsi helper: naikkan session_version untuk satu user → semua token lama invalid
CREATE OR REPLACE FUNCTION revoke_all_sessions(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE profiles
  SET session_version = COALESCE(session_version, 1) + 1
  WHERE id = target_user_id;
END;
$$;

-- =============================================================================
SELECT '87_session_version_profiles complete' AS result;
