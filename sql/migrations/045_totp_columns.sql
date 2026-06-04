-- Migration 045: TOTP columns for profiles table
-- Dibutuhkan oleh: Admin2FASettings (implementasi TOTP via Authenticator App)
-- Flow: enroll → generate secret → user scan QR → verify OTP → totp_enabled = true

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS totp_secret      TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS totp_enabled     BOOLEAN      DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS totp_verified_at TIMESTAMPTZ;

-- Index untuk lookup cepat saat verifikasi
CREATE INDEX IF NOT EXISTS idx_profiles_totp_enabled ON profiles(totp_enabled) WHERE totp_enabled = true;

-- RLS: pengguna hanya bisa baca status TOTP milik sendiri (bukan secret-nya)
-- Secret tetap server-side only — tidak pernah di-expose ke frontend via Supabase
COMMENT ON COLUMN profiles.totp_secret IS 'Base32-encoded TOTP secret. Server-side only — never expose to frontend.';
COMMENT ON COLUMN profiles.totp_enabled IS 'Whether TOTP 2FA is currently active for this user.';
COMMENT ON COLUMN profiles.totp_verified_at IS 'Timestamp of last successful TOTP verification.';
