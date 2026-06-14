-- =============================================================================
-- VINSTOUR TRAVEL PORTAL — Clean Migration v2
-- FILE 003: Profiles Table
-- Extended profile 1:1 dengan auth.users.
-- TIDAK ada kolom role di sini — role dikelola via user_roles (file 007).
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id                UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email             TEXT        UNIQUE,
  full_name         TEXT,
  phone             TEXT,
  avatar_url        TEXT,
  is_active         BOOLEAN     NOT NULL DEFAULT TRUE,
  session_version   INTEGER     NOT NULL DEFAULT 0,
  last_sign_in_at   TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tambahkan face_descriptor jika belum ada (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'profiles'
      AND column_name  = 'face_descriptor'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN face_descriptor FLOAT8[];
  END IF;
END;
$$;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE  public.profiles IS 'Extended user profile (1:1 auth.users). Role managed via user_roles table.';
COMMENT ON COLUMN public.profiles.session_version IS 'Increment to invalidate all existing JWT sessions for this user.';
COMMENT ON COLUMN public.profiles.face_descriptor IS 'Float array for face recognition (optional feature).';

-- Index untuk lookup cepat
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
