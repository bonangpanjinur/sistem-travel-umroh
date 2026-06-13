-- =============================================================================
-- VINSTOUR TRAVEL PORTAL — Clean Migration v2
-- FILE 023: System Settings & Security
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. COMPANY_SETTINGS — Key-value store konfigurasi global
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.company_settings (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key   TEXT        NOT NULL UNIQUE,
  setting_value TEXT        NOT NULL DEFAULT 'null',
  setting_type  TEXT        NOT NULL DEFAULT 'string'
                            CHECK (setting_type IN ('string','number','boolean','json','url')),
  description   TEXT,
  is_public     BOOLEAN     NOT NULL DEFAULT FALSE,
  updated_by    UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_company_settings_key
  ON public.company_settings(setting_key);
CREATE INDEX IF NOT EXISTS idx_company_settings_public
  ON public.company_settings(is_public);

COMMENT ON TABLE public.company_settings IS
  'Key-value store untuk konfigurasi sistem. '
  'is_public=TRUE berarti bisa diakses oleh anon (tanpa autentikasi).';

-- ---------------------------------------------------------------------------
-- 2. OTP_CODES — OTP sementara
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.otp_codes (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code         TEXT        NOT NULL,
  purpose      TEXT        NOT NULL DEFAULT 'login'
                           CHECK (purpose IN ('login','email_verify','phone_verify','password_reset')),
  expires_at   TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '15 minutes',
  used_at      TIMESTAMPTZ,
  attempts     INTEGER     NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_otp_codes_user
  ON public.otp_codes(user_id, purpose)
  WHERE used_at IS NULL;

-- ---------------------------------------------------------------------------
-- 3. USER_2FA_SETTINGS — TOTP / 2FA settings per user
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_2fa_settings (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  totp_secret   TEXT,
  is_enabled    BOOLEAN     NOT NULL DEFAULT FALSE,
  backup_codes  TEXT[],
  enabled_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_2fa_settings ENABLE ROW LEVEL SECURITY;
