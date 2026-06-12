-- =============================================================================
-- 095_profiles_totp_columns.sql
-- Tambah kolom TOTP ke profiles agar getUserById() tidak error.
-- Idempotent — aman dijalankan berkali-kali.
-- =============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS totp_secret       TEXT,
  ADD COLUMN IF NOT EXISTS totp_enabled      BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS totp_verified_at  TIMESTAMPTZ;

-- Kolom tambahan yang umum dipakai di auth flow
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS full_name         TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url        TEXT,
  ADD COLUMN IF NOT EXISTS phone             TEXT,
  ADD COLUMN IF NOT EXISTS email             TEXT,
  ADD COLUMN IF NOT EXISTS role              TEXT DEFAULT 'customer',
  ADD COLUMN IF NOT EXISTS session_version   INTEGER NOT NULL DEFAULT 0;

-- =============================================================================
SELECT '095_profiles_totp_columns complete' AS result;
