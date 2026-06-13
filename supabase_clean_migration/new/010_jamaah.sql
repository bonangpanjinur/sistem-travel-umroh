-- =============================================================================
-- VINSTOUR TRAVEL PORTAL — Clean Migration v2
-- FILE 010: Jamaah (Customers) & Muthawifs
-- Data jamaah, dokumen, mahram, akun portal, muthawif
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. CUSTOMERS — Data jamaah / calon jamaah
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.customers (
  id                          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                     UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  branch_id                   UUID        REFERENCES public.branches(id) ON DELETE SET NULL,
  agent_id                    UUID        REFERENCES public.agents(id) ON DELETE SET NULL,
  customer_code               TEXT        UNIQUE,
  full_name                   TEXT        NOT NULL,
  nik                         TEXT,
  passport_no                 TEXT,
  passport_expiry             DATE,
  gender                      public.gender_type,
  birth_date                  DATE,
  birth_place                 TEXT,
  phone                       TEXT,
  email                       TEXT,
  address                     TEXT,
  city                        TEXT,
  province                    TEXT,
  postal_code                 TEXT,
  nationality                 TEXT        NOT NULL DEFAULT 'Indonesia',
  education                   TEXT,
  occupation                  TEXT,
  emergency_contact_name      TEXT,
  emergency_contact_phone     TEXT,
  emergency_contact_relation  TEXT,
  photo_url                   TEXT,
  health_notes                TEXT,
  status                      TEXT        NOT NULL DEFAULT 'active'
                                          CHECK (status IN ('active','inactive','blacklisted')),
  notes                       TEXT,
  meta_data                   JSONB,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_customers_user_id   ON public.customers(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_agent_id  ON public.customers(agent_id);
CREATE INDEX IF NOT EXISTS idx_customers_branch_id ON public.customers(branch_id);
CREATE INDEX IF NOT EXISTS idx_customers_code      ON public.customers(customer_code);
CREATE INDEX IF NOT EXISTS idx_customers_phone     ON public.customers(phone);

-- ---------------------------------------------------------------------------
-- 2. CUSTOMER_ACCOUNTS — Akun portal jamaah
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.customer_accounts (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID        NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id           UUID        REFERENCES public.customers(id) ON DELETE SET NULL,
  referred_by_agent_id  UUID        REFERENCES public.agents(id) ON DELETE SET NULL,
  referred_by_branch_id UUID        REFERENCES public.branches(id) ON DELETE SET NULL,
  agent_slug            TEXT,
  branch_slug           TEXT,
  loyalty_points        INTEGER     NOT NULL DEFAULT 0,
  total_bookings        INTEGER     NOT NULL DEFAULT 0,
  total_spent           NUMERIC     NOT NULL DEFAULT 0,
  is_verified           BOOLEAN     NOT NULL DEFAULT FALSE,
  verified_at           TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.customer_accounts ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_customer_accounts_user
  ON public.customer_accounts(user_id);

-- ---------------------------------------------------------------------------
-- 3. CUSTOMER_MAHRAMS — Relasi mahram antar jamaah
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.customer_mahrams (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id    UUID        NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  mahram_id      UUID        NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  relationship   TEXT        NOT NULL,
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (customer_id, mahram_id),
  CHECK (customer_id <> mahram_id)
);

ALTER TABLE public.customer_mahrams ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 4. MUTHAWIFS — Muthawif / tour guide
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.muthawifs (
  id               UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID             REFERENCES auth.users(id) ON DELETE SET NULL,
  branch_id        UUID             REFERENCES public.branches(id) ON DELETE SET NULL,
  full_name        TEXT             NOT NULL,
  phone            TEXT,
  email            TEXT,
  nik              TEXT,
  gender           public.gender_type,
  specialization   TEXT,
  languages        TEXT[],
  photo_url        TEXT,
  certification_no TEXT,
  is_available     BOOLEAN          NOT NULL DEFAULT TRUE,
  is_active        BOOLEAN          NOT NULL DEFAULT TRUE,
  notes            TEXT,
  created_at       TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

ALTER TABLE public.muthawifs ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_muthawifs_branch     ON public.muthawifs(branch_id);
CREATE INDEX IF NOT EXISTS idx_muthawifs_available  ON public.muthawifs(is_available, is_active);

-- ---------------------------------------------------------------------------
-- 5. JAMAAH_IBADAH_TARGETS — Target ibadah pribadi jamaah
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.jamaah_ibadah_targets (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id   UUID        NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  departure_id  UUID        REFERENCES public.departures(id) ON DELETE CASCADE,
  type          TEXT        NOT NULL CHECK (type IN ('tawaf','sai','tahajud','dzikir','quran','other')),
  target_value  INTEGER     NOT NULL DEFAULT 1,
  current_value INTEGER     NOT NULL DEFAULT 0,
  unit          TEXT        NOT NULL DEFAULT 'kali',
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.jamaah_ibadah_targets ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_jamaah_ibadah_targets_customer
  ON public.jamaah_ibadah_targets(customer_id);

-- ---------------------------------------------------------------------------
-- 6. JAMAAH_JURNAL — Jurnal perjalanan pribadi jamaah
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.jamaah_jurnal (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id   UUID        NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  departure_id  UUID        REFERENCES public.departures(id) ON DELETE SET NULL,
  entry_date    DATE        NOT NULL DEFAULT CURRENT_DATE,
  content       TEXT        NOT NULL,
  mood          TEXT        CHECK (mood IN ('happy','grateful','peaceful','emotional','tired','other')),
  photos        TEXT[],
  is_private    BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.jamaah_jurnal ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_jamaah_jurnal_customer
  ON public.jamaah_jurnal(customer_id);

-- ---------------------------------------------------------------------------
-- 7. JAMAAH_BADGES — Badge / pencapaian gamifikasi jamaah
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.jamaah_badges (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id   UUID        NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  badge_type    TEXT        NOT NULL,
  badge_name    TEXT        NOT NULL,
  badge_icon    TEXT,
  earned_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  context_data  JSONB,
  UNIQUE (customer_id, badge_type)
);

ALTER TABLE public.jamaah_badges ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_jamaah_badges_customer
  ON public.jamaah_badges(customer_id);
