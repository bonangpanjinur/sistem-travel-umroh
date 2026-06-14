-- =============================================================================
-- VINSTOUR TRAVEL PORTAL — Clean Migration v2
-- FILE 009: Agents, Sub-Agents & Wallet Tables
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. AGENTS — Agen mitra + sub-agen (self-referencing)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agents (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  branch_id        UUID        REFERENCES public.branches(id) ON DELETE SET NULL,
  parent_agent_id  UUID        REFERENCES public.agents(id) ON DELETE SET NULL,
  agent_type       TEXT        NOT NULL DEFAULT 'agent'
                               CHECK (agent_type IN ('agent','sub_agent')),
  agent_code       TEXT        UNIQUE,
  slug             TEXT        UNIQUE,
  company_name     TEXT        NOT NULL,
  pic_name         TEXT,
  phone            TEXT,
  email            TEXT,
  address          TEXT,
  city             TEXT,
  province         TEXT,
  status           TEXT        NOT NULL DEFAULT 'active'
                               CHECK (status IN ('active','inactive','suspended','pending')),
  commission_rate  NUMERIC     NOT NULL DEFAULT 0,
  plan_type        TEXT        DEFAULT 'silver'
                               CHECK (plan_type IN ('silver','gold','platinum')),
  max_sub_agents   INTEGER,
  logo_url         TEXT,
  website_url      TEXT,
  notes            TEXT,
  meta_data        JSONB,
  joined_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Jika tabel sudah ada dari schema lama, tambahkan kolom baru secara idempotent
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS parent_agent_id UUID        REFERENCES public.agents(id) ON DELETE SET NULL;
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS agent_type      TEXT        NOT NULL DEFAULT 'agent' CHECK (agent_type IN ('agent','sub_agent'));
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS agent_code      TEXT;
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS slug            TEXT;
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS plan_type       TEXT        DEFAULT 'silver' CHECK (plan_type IN ('silver','gold','platinum'));
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS max_sub_agents  INTEGER;
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS logo_url        TEXT;
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS website_url     TEXT;
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS meta_data       JSONB;
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_agents_user_id     ON public.agents(user_id);
CREATE INDEX IF NOT EXISTS idx_agents_branch_id   ON public.agents(branch_id);
CREATE INDEX IF NOT EXISTS idx_agents_slug        ON public.agents(slug);
CREATE INDEX IF NOT EXISTS idx_agents_parent      ON public.agents(parent_agent_id);
CREATE INDEX IF NOT EXISTS idx_agents_status      ON public.agents(status);

COMMENT ON TABLE public.agents IS
  'Agen mitra dan sub-agen. Sub-agen ditandai dengan parent_agent_id terisi.';

-- ---------------------------------------------------------------------------
-- 2. AGENT_COMMISSION_TIERS — Tier komisi berdasarkan volume booking
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agent_commission_tiers (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT        NOT NULL,
  plan_type        TEXT        NOT NULL DEFAULT 'silver'
                               CHECK (plan_type IN ('silver','gold','platinum')),
  min_bookings     INTEGER     NOT NULL DEFAULT 0,
  max_bookings     INTEGER,
  commission_rate  NUMERIC     NOT NULL DEFAULT 0,
  bonus_amount     NUMERIC     NOT NULL DEFAULT 0,
  is_active        BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.agent_commission_tiers ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 3. MEMBERSHIP_PLANS — Paket membership agen (silver/gold/platinum)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.membership_plans (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT        NOT NULL,
  type             TEXT        NOT NULL UNIQUE
                               CHECK (type IN ('silver','gold','platinum')),
  commission_base  NUMERIC     NOT NULL DEFAULT 0,
  max_sub_agents   INTEGER     NOT NULL DEFAULT 0,
  monthly_fee      NUMERIC     NOT NULL DEFAULT 0,
  features         JSONB,
  is_active        BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.membership_plans ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 4. AGENT_WALLETS — Dompet digital komisi agen
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agent_wallets (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id         UUID        NOT NULL UNIQUE REFERENCES public.agents(id) ON DELETE CASCADE,
  balance          NUMERIC     NOT NULL DEFAULT 0 CHECK (balance >= 0),
  total_earned     NUMERIC     NOT NULL DEFAULT 0,
  total_withdrawn  NUMERIC     NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.agent_wallets ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 5. AGENT_WALLET_TRANSACTIONS — Riwayat transaksi wallet
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agent_wallet_transactions (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id        UUID        NOT NULL REFERENCES public.agent_wallets(id) ON DELETE CASCADE,
  type             TEXT        NOT NULL CHECK (type IN ('credit','debit')),
  amount           NUMERIC     NOT NULL CHECK (amount > 0),
  description      TEXT        NOT NULL,
  reference_type   TEXT,
  reference_id     UUID,
  balance_after    NUMERIC     NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.agent_wallet_transactions ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_agent_wallet_txn_wallet
  ON public.agent_wallet_transactions(wallet_id);

-- ---------------------------------------------------------------------------
-- 6. AGENT_COMMISSIONS — Riwayat komisi per booking
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agent_commissions (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id         UUID        NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  booking_id       UUID        REFERENCES public.bookings(id) ON DELETE SET NULL,
  amount           NUMERIC     NOT NULL,
  rate             NUMERIC     NOT NULL,
  type             TEXT        NOT NULL DEFAULT 'booking'
                               CHECK (type IN ('booking','referral','bonus')),
  status           TEXT        NOT NULL DEFAULT 'pending'
                               CHECK (status IN ('pending','approved','paid','cancelled')),
  paid_at          TIMESTAMPTZ,
  paid_to_wallet   BOOLEAN     NOT NULL DEFAULT FALSE,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.agent_commissions ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_agent_commissions_agent
  ON public.agent_commissions(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_commissions_booking
  ON public.agent_commissions(booking_id);
