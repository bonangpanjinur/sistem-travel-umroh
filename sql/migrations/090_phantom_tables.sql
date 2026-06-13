-- ============================================================
-- Migration 090: Buat semua tabel phantom yang diakses kode
-- tapi belum ada di schema (P1 & P2 dari rencanasql.md §15–§16)
-- Idempotent: CREATE TABLE IF NOT EXISTS
-- ============================================================

-- ============================================================
-- 1. cash_transactions (9 file hits — kritis untuk modul kas)
-- ============================================================
CREATE TABLE IF NOT EXISTS cash_transactions (
  id               UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id        UUID    REFERENCES branches(id)     ON DELETE SET NULL,
  transaction_date DATE    NOT NULL DEFAULT CURRENT_DATE,
  type             TEXT    NOT NULL DEFAULT 'income'
                           CHECK (type IN ('income','expense','transfer')),
  category         TEXT    NOT NULL DEFAULT 'other',
  description      TEXT    NOT NULL DEFAULT '',
  amount           NUMERIC(15,2) NOT NULL DEFAULT 0,
  currency         TEXT    DEFAULT 'IDR',
  payment_method   TEXT    DEFAULT 'cash'
                           CHECK (payment_method IN ('cash','transfer','debit','credit','qris')),
  reference_type   TEXT,   -- 'booking'|'payment'|'expense'|'payroll'|'manual'
  reference_id     UUID,
  account_code     TEXT,   -- FK ke coa_categories.code (dibuat di 093)
  receipt_url      TEXT,
  notes            TEXT,
  created_by       UUID    REFERENCES profiles(id)     ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ct_branch_id   ON cash_transactions(branch_id);
CREATE INDEX IF NOT EXISTS idx_ct_date        ON cash_transactions(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_ct_type        ON cash_transactions(type);
CREATE INDEX IF NOT EXISTS idx_ct_ref_id      ON cash_transactions(reference_id);

-- ============================================================
-- 2. agent_wallets + agent_wallet_transactions
-- ============================================================
CREATE TABLE IF NOT EXISTS agent_wallets (
  id          UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id    UUID    NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  balance     NUMERIC(15,2) NOT NULL DEFAULT 0,
  currency    TEXT    DEFAULT 'IDR',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (agent_id)
);

CREATE TABLE IF NOT EXISTS agent_wallet_transactions (
  id             UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_id      UUID    NOT NULL REFERENCES agent_wallets(id) ON DELETE CASCADE,
  type           TEXT    NOT NULL CHECK (type IN ('credit','debit')),
  amount         NUMERIC(15,2) NOT NULL DEFAULT 0,
  balance_after  NUMERIC(15,2) NOT NULL DEFAULT 0,
  description    TEXT    NOT NULL DEFAULT '',
  reference_id   UUID,
  reference_type TEXT,   -- 'commission'|'withdrawal'|'bonus'|'manual'
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_awt_wallet_id ON agent_wallet_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_awt_created   ON agent_wallet_transactions(created_at DESC);

-- ============================================================
-- 3. loyalty_rewards + loyalty_transactions
-- (loyalty_points sudah ada — ini EXTENSION dari sistem poin)
-- ============================================================
CREATE TABLE IF NOT EXISTS loyalty_rewards (
  id          UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID    NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  total_points INTEGER NOT NULL DEFAULT 0,
  tier        TEXT    DEFAULT 'bronze'
                      CHECK (tier IN ('bronze','silver','gold','platinum')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (customer_id)
);

CREATE TABLE IF NOT EXISTS loyalty_transactions (
  id            UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id   UUID    NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  type          TEXT    NOT NULL CHECK (type IN ('earn','redeem','expire','bonus')),
  points        INTEGER NOT NULL DEFAULT 0,
  balance_after INTEGER NOT NULL DEFAULT 0,
  description   TEXT    NOT NULL DEFAULT '',
  reference_id  UUID,
  reference_type TEXT,  -- 'booking'|'payment'|'referral'|'manual'
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_lt_customer_id ON loyalty_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_lt_created     ON loyalty_transactions(created_at DESC);

-- ============================================================
-- 4. jamaah_qr_codes (QR digital ID jamaah)
-- ============================================================
CREATE TABLE IF NOT EXISTS jamaah_qr_codes (
  id           UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id  UUID    NOT NULL REFERENCES customers(id)  ON DELETE CASCADE,
  departure_id UUID    REFERENCES departures(id)          ON DELETE SET NULL,
  qr_token     TEXT    NOT NULL UNIQUE,
  qr_type      TEXT    DEFAULT 'identity'
                       CHECK (qr_type IN ('identity','boarding','checkin','general')),
  qr_data      JSONB   DEFAULT '{}',   -- data terenkripsi di dalamnya
  expires_at   TIMESTAMPTZ,
  is_active    BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_qr_customer_id  ON jamaah_qr_codes(customer_id);
CREATE INDEX IF NOT EXISTS idx_qr_departure_id ON jamaah_qr_codes(departure_id);
CREATE INDEX IF NOT EXISTS idx_qr_token        ON jamaah_qr_codes(qr_token);

-- ============================================================
-- 5. referral_codes + referral_usages
-- ============================================================
CREATE TABLE IF NOT EXISTS referral_codes (
  id             UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  code           TEXT    NOT NULL UNIQUE,
  customer_id    UUID    REFERENCES customers(id) ON DELETE SET NULL,
  agent_id       UUID    REFERENCES agents(id)   ON DELETE SET NULL,
  discount_type  TEXT    DEFAULT 'percentage'
                         CHECK (discount_type IN ('percentage','fixed')),
  discount_value NUMERIC(5,2) DEFAULT 0,
  usage_limit    INTEGER DEFAULT 0,    -- 0 = unlimited
  used_count     INTEGER DEFAULT 0,
  is_active      BOOLEAN DEFAULT TRUE,
  expires_at     TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rc_code       ON referral_codes(code);
CREATE INDEX IF NOT EXISTS idx_rc_customer   ON referral_codes(customer_id);
CREATE INDEX IF NOT EXISTS idx_rc_agent      ON referral_codes(agent_id);

CREATE TABLE IF NOT EXISTS referral_usages (
  id               UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  referral_code_id UUID    NOT NULL REFERENCES referral_codes(id) ON DELETE CASCADE,
  booking_id       UUID    REFERENCES bookings(id)  ON DELETE SET NULL,
  customer_id      UUID    REFERENCES customers(id) ON DELETE CASCADE,
  discount_given   NUMERIC(15,2) DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ru_code_id ON referral_usages(referral_code_id);

-- ============================================================
-- 6. virtual_accounts (diakses di AdminVirtualAccount.tsx)
-- ============================================================
CREATE TABLE IF NOT EXISTS virtual_accounts (
  id          UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id  UUID    REFERENCES bookings(id) ON DELETE SET NULL,
  va_number   TEXT    NOT NULL UNIQUE,
  bank_code   TEXT    NOT NULL,
  amount      NUMERIC(15,2) NOT NULL DEFAULT 0,
  status      TEXT    DEFAULT 'pending'
                      CHECK (status IN ('pending','paid','expired','cancelled')),
  gateway     TEXT    DEFAULT 'midtrans',
  expires_at  TIMESTAMPTZ,
  paid_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_va_booking_id ON virtual_accounts(booking_id);

-- ============================================================
-- 7. payment_page_tokens (token untuk halaman pembayaran publik)
-- ============================================================
CREATE TABLE IF NOT EXISTS payment_page_tokens (
  id         UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID    NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  token      TEXT    NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ppt_booking_id ON payment_page_tokens(booking_id);
CREATE INDEX IF NOT EXISTS idx_ppt_token      ON payment_page_tokens(token);

-- ============================================================
-- 8. agent_invitation_tokens (digunakan di API /agents/invitation)
-- ============================================================
CREATE TABLE IF NOT EXISTS agent_invitation_tokens (
  id           UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  token        TEXT    NOT NULL UNIQUE,
  email        TEXT    NOT NULL,
  branch_id    UUID    REFERENCES branches(id) ON DELETE SET NULL,
  invited_by   UUID    REFERENCES profiles(id) ON DELETE SET NULL,
  role         TEXT    DEFAULT 'agent',
  status       TEXT    DEFAULT 'pending'
                       CHECK (status IN ('pending','accepted','expired','cancelled')),
  expires_at   TIMESTAMPTZ NOT NULL,
  accepted_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ait_token  ON agent_invitation_tokens(token);
CREATE INDEX IF NOT EXISTS idx_ait_email  ON agent_invitation_tokens(email);
