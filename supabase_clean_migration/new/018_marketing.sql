-- =============================================================================
-- VINSTOUR TRAVEL PORTAL — Clean Migration v2
-- FILE 018: Marketing — Leads, Referrals, Loyalty
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. LEADS — Prospek calon jamaah
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.leads (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name      TEXT        NOT NULL,
  phone          TEXT,
  email          TEXT,
  source         TEXT        DEFAULT 'website'
                             CHECK (source IN ('website','whatsapp','referral','walk_in',
                                               'social_media','agent','other')),
  interest       TEXT,
  package_id     UUID        REFERENCES public.packages(id) ON DELETE SET NULL,
  branch_id      UUID        REFERENCES public.branches(id) ON DELETE SET NULL,
  agent_id       UUID        REFERENCES public.agents(id) ON DELETE SET NULL,
  assigned_to    UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  status         TEXT        NOT NULL DEFAULT 'new'
                             CHECK (status IN ('new','contacted','interested','negotiating',
                                               'converted','lost','inactive')),
  notes          TEXT,
  last_contact   TIMESTAMPTZ,
  converted_at   TIMESTAMPTZ,
  customer_id    UUID        REFERENCES public.customers(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Jika tabel sudah ada dari schema lama, tambahkan kolom baru secara idempotent
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS agent_id       UUID REFERENCES public.agents(id) ON DELETE SET NULL;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS branch_id      UUID REFERENCES public.branches(id) ON DELETE SET NULL;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS package_id     UUID REFERENCES public.packages(id) ON DELETE SET NULL;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS assigned_to    UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS last_contact   TIMESTAMPTZ;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS converted_at   TIMESTAMPTZ;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS customer_id    UUID REFERENCES public.customers(id) ON DELETE SET NULL;

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_leads_status      ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_agent       ON public.leads(agent_id);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON public.leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_customer    ON public.leads(customer_id);

-- ---------------------------------------------------------------------------
-- 2. REFERRAL_CODES — Kode referral
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.referral_codes (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  code                TEXT        NOT NULL UNIQUE,
  owner_type          TEXT        NOT NULL CHECK (owner_type IN ('agent','branch','customer')),
  owner_id            UUID        NOT NULL,
  discount_percent    NUMERIC     NOT NULL DEFAULT 0,
  commission_percent  NUMERIC     NOT NULL DEFAULT 0,
  usage_count         INTEGER     NOT NULL DEFAULT 0,
  max_usage           INTEGER,
  is_active           BOOLEAN     NOT NULL DEFAULT TRUE,
  expires_at          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_referral_codes_code
  ON public.referral_codes(code);
CREATE INDEX IF NOT EXISTS idx_referral_codes_owner
  ON public.referral_codes(owner_type, owner_id);

-- ---------------------------------------------------------------------------
-- 3. REFERRAL_USAGES — Penggunaan kode referral
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.referral_usages (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_code_id    UUID        NOT NULL REFERENCES public.referral_codes(id) ON DELETE RESTRICT,
  booking_id          UUID        REFERENCES public.bookings(id) ON DELETE SET NULL,
  used_by             UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  discount_applied    NUMERIC     NOT NULL DEFAULT 0,
  commission_earned   NUMERIC     NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.referral_usages ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_referral_usages_code
  ON public.referral_usages(referral_code_id);

-- ---------------------------------------------------------------------------
-- 4. LOYALTY_POINTS — Poin loyalitas jamaah
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.loyalty_points (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id      UUID        NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  booking_id       UUID        REFERENCES public.bookings(id) ON DELETE SET NULL,
  points           INTEGER     NOT NULL,
  type             TEXT        NOT NULL DEFAULT 'earned'
                               CHECK (type IN ('earned','redeemed','expired','adjusted')),
  description      TEXT,
  expires_at       TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.loyalty_points ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_loyalty_points_customer
  ON public.loyalty_points(customer_id);
