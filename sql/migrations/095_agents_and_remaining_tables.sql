-- ============================================================
-- Migration 095: Kolom agents yang hilang + tabel-tabel sisa
-- Berdasarkan rencanasql.md §17.4, §18, §24 — agents, booking_passengers,
--   document tables, additional operational tables
-- Idempotent: ADD COLUMN IF NOT EXISTS / CREATE TABLE IF NOT EXISTS
-- ============================================================

-- ============================================================
-- A. agents — kolom yang diakses kode tapi belum ada di schema
-- ============================================================

-- Tier & membership
ALTER TABLE agents ADD COLUMN IF NOT EXISTS membership_tier             TEXT
  DEFAULT 'regular' CHECK (membership_tier IN ('regular','silver','gold','platinum'));
ALTER TABLE agents ADD COLUMN IF NOT EXISTS membership_tier_updated_at  TIMESTAMPTZ;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS total_confirmed_bookings     INTEGER DEFAULT 0;

-- Identitas & bank
ALTER TABLE agents ADD COLUMN IF NOT EXISTS ktp_number                  TEXT;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS ktp_url                     TEXT;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS npwp                        TEXT;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS bank_name                   TEXT;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS bank_account_number         TEXT;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS bank_account_name           TEXT;

-- Status agen (pending/active/suspended)
ALTER TABLE agents ADD COLUMN IF NOT EXISTS status                      TEXT
  DEFAULT 'active' CHECK (status IN ('pending','active','suspended','inactive'));

-- ============================================================
-- B. booking_passengers — kolom tambahan
-- ============================================================
ALTER TABLE booking_passengers ADD COLUMN IF NOT EXISTS nationality        TEXT;
ALTER TABLE booking_passengers ADD COLUMN IF NOT EXISTS seat_number        TEXT;
ALTER TABLE booking_passengers ADD COLUMN IF NOT EXISTS room_number_madinah TEXT;
ALTER TABLE booking_passengers ADD COLUMN IF NOT EXISTS roommate_id         UUID
  REFERENCES customers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_bp_roommate_id ON booking_passengers(roommate_id);

-- ============================================================
-- C. document_verify_tokens (diakses di /documents/verify-tokens)
-- ============================================================
CREATE TABLE IF NOT EXISTS document_verify_tokens (
  id            UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  token         TEXT    NOT NULL UNIQUE,
  doc_type      TEXT    NOT NULL,
  booking_id    UUID    REFERENCES bookings(id)   ON DELETE CASCADE,
  customer_id   UUID    REFERENCES customers(id)  ON DELETE CASCADE,
  customer_name TEXT,
  doc_number    TEXT,
  expires_at    TIMESTAMPTZ NOT NULL,
  used_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dvt_token       ON document_verify_tokens(token);
CREATE INDEX IF NOT EXISTS idx_dvt_booking_id  ON document_verify_tokens(booking_id);

-- ============================================================
-- D. document_audit_logs (diakses di /documents/audit)
-- ============================================================
CREATE TABLE IF NOT EXISTS document_audit_logs (
  id            UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type    TEXT    NOT NULL,  -- 'generated'|'viewed'|'downloaded'|'verified'|'deleted'
  doc_type      TEXT    NOT NULL,
  booking_id    UUID    REFERENCES bookings(id)   ON DELETE SET NULL,
  customer_id   UUID    REFERENCES customers(id)  ON DELETE SET NULL,
  customer_name TEXT,
  doc_number    TEXT,
  actor_id      UUID    REFERENCES profiles(id)   ON DELETE SET NULL,
  actor_name    TEXT,
  ip_address    TEXT,
  user_agent    TEXT,
  metadata      JSONB   DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dal_booking_id  ON document_audit_logs(booking_id);
CREATE INDEX IF NOT EXISTS idx_dal_customer_id ON document_audit_logs(customer_id);
CREATE INDEX IF NOT EXISTS idx_dal_created_at  ON document_audit_logs(created_at DESC);

-- ============================================================
-- E. customer_signatures (diakses di /documents/signature/:id)
-- ============================================================
CREATE TABLE IF NOT EXISTS customer_signatures (
  id            UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id   UUID    NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  booking_id    UUID    REFERENCES bookings(id) ON DELETE SET NULL,
  signature_url TEXT    NOT NULL,
  signature_type TEXT   DEFAULT 'consent'
                         CHECK (signature_type IN ('consent','contract','refund','other')),
  doc_type      TEXT,
  signed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cs_customer_id ON customer_signatures(customer_id);

-- ============================================================
-- F. generated_documents (pusat log dokumen yang digenerate)
-- ============================================================
CREATE TABLE IF NOT EXISTS generated_documents (
  id              UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id     UUID    REFERENCES customers(id)  ON DELETE SET NULL,
  departure_id    UUID    REFERENCES departures(id) ON DELETE SET NULL,
  booking_id      UUID    REFERENCES bookings(id)   ON DELETE SET NULL,
  document_type   TEXT    NOT NULL,
  document_number TEXT    UNIQUE,
  file_url        TEXT,
  generated_by    UUID    REFERENCES profiles(id)   ON DELETE SET NULL,
  generated_at    TIMESTAMPTZ DEFAULT NOW(),
  expires_at      TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_gd_booking_id    ON generated_documents(booking_id);
CREATE INDEX IF NOT EXISTS idx_gd_customer_id   ON generated_documents(customer_id);
CREATE INDEX IF NOT EXISTS idx_gd_document_type ON generated_documents(document_type);

-- ============================================================
-- G. agent_commissions — trigger komisi otomatis booking confirmed
-- (migration 033 menambah tabel ini, pastikan ada)
-- ============================================================
CREATE TABLE IF NOT EXISTS agent_commissions (
  id              UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id        UUID    NOT NULL REFERENCES agents(id)   ON DELETE CASCADE,
  booking_id      UUID    NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  amount          NUMERIC(15,2) NOT NULL DEFAULT 0,
  commission_rate NUMERIC(5,2),
  type            TEXT    DEFAULT 'direct'
                          CHECK (type IN ('direct','override','bonus')),
  status          TEXT    DEFAULT 'pending'
                          CHECK (status IN ('pending','approved','paid','cancelled')),
  paid_at         TIMESTAMPTZ,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (agent_id, booking_id)
);
CREATE INDEX IF NOT EXISTS idx_ac_agent_id   ON agent_commissions(agent_id);
CREATE INDEX IF NOT EXISTS idx_ac_booking_id ON agent_commissions(booking_id);
CREATE INDEX IF NOT EXISTS idx_ac_status     ON agent_commissions(status);

-- ============================================================
-- H. withdrawal_requests (dompet agen — penarikan komisi)
-- ============================================================
CREATE TABLE IF NOT EXISTS withdrawal_requests (
  id               UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id         UUID    NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  wallet_id        UUID    REFERENCES agent_wallets(id)   ON DELETE SET NULL,
  amount           NUMERIC(15,2) NOT NULL DEFAULT 0,
  bank_name        TEXT,
  bank_account     TEXT,
  bank_holder_name TEXT,
  bank_details     JSONB   DEFAULT '{}',
  status           TEXT    DEFAULT 'pending'
                           CHECK (status IN ('pending','approved','processing','completed','rejected')),
  rejection_reason TEXT,
  processed_by     UUID    REFERENCES profiles(id) ON DELETE SET NULL,
  processed_at     TIMESTAMPTZ,
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_wr_agent_id ON withdrawal_requests(agent_id);
CREATE INDEX IF NOT EXISTS idx_wr_status   ON withdrawal_requests(status);

-- ============================================================
-- I. wa_broadcast_campaigns + wa_broadcast_logs (fase32)
-- ============================================================
CREATE TABLE IF NOT EXISTS wa_broadcast_campaigns (
  id               UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  name             TEXT    NOT NULL,
  branch_id        UUID    REFERENCES branches(id) ON DELETE SET NULL,
  template_id      UUID    REFERENCES wa_templates(id) ON DELETE SET NULL,
  message          TEXT,
  target_type      TEXT    DEFAULT 'all',
  target_filter    JSONB   DEFAULT '{}',
  status           TEXT    DEFAULT 'draft'
                           CHECK (status IN ('draft','sending','sent','failed','partial')),
  scheduled_at     TIMESTAMPTZ,
  sent_at          TIMESTAMPTZ,
  total_recipients INTEGER DEFAULT 0,
  sent_count       INTEGER DEFAULT 0,
  failed_count     INTEGER DEFAULT 0,
  created_by       UUID    REFERENCES profiles(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_wbc_branch_id  ON wa_broadcast_campaigns(branch_id);
CREATE INDEX IF NOT EXISTS idx_wbc_status     ON wa_broadcast_campaigns(status);

CREATE TABLE IF NOT EXISTS wa_broadcast_logs (
  id            UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id   UUID    NOT NULL REFERENCES wa_broadcast_campaigns(id) ON DELETE CASCADE,
  phone         TEXT    NOT NULL,
  full_name     TEXT,
  booking_id    UUID    REFERENCES bookings(id) ON DELETE SET NULL,
  customer_id   UUID    REFERENCES customers(id) ON DELETE SET NULL,
  message_sent  TEXT,
  status        TEXT    DEFAULT 'pending'
                        CHECK (status IN ('pending','sent','delivered','failed')),
  error_msg     TEXT,
  sent_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_wbl_campaign_id ON wa_broadcast_logs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_wbl_phone       ON wa_broadcast_logs(phone);

-- ============================================================
-- J. login_attempts + user_2fa_settings (AdminSecurityAudit)
-- ============================================================
CREATE TABLE IF NOT EXISTS login_attempts (
  id           UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID    REFERENCES profiles(id) ON DELETE SET NULL,
  email        TEXT,
  ip_address   TEXT,
  user_agent   TEXT,
  status       TEXT    DEFAULT 'success'
                       CHECK (status IN ('success','failed','blocked')),
  failure_reason TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_la_user_id    ON login_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_la_email      ON login_attempts(email);
CREATE INDEX IF NOT EXISTS idx_la_created    ON login_attempts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_la_ip         ON login_attempts(ip_address);

CREATE TABLE IF NOT EXISTS user_2fa_settings (
  id           UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID    NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  is_enabled   BOOLEAN DEFAULT FALSE,
  method       TEXT    DEFAULT 'totp'
                       CHECK (method IN ('totp','sms','email')),
  totp_secret  TEXT,   -- disimpan terenkripsi
  phone        TEXT,
  backup_codes TEXT[], -- kode cadangan terenkripsi
  enabled_at   TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- K. rbac_audit_trail (migration 047 — pastikan ada)
-- ============================================================
CREATE TABLE IF NOT EXISTS rbac_audit_trail (
  id          UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  action      TEXT    NOT NULL,  -- 'grant'|'revoke'|'login'|'logout'|'permission_check'
  module_key  TEXT,
  changed_by  TEXT,  -- user_id atau email
  actor_name  TEXT,
  branch_id   UUID    REFERENCES branches(id) ON DELETE SET NULL,
  metadata    JSONB   DEFAULT '{}',
  changed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rat_changed_at ON rbac_audit_trail(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_rat_action     ON rbac_audit_trail(action);

-- ============================================================
-- L. discount_requests (dari CRM / approval workflow)
-- ============================================================
CREATE TABLE IF NOT EXISTS discount_requests (
  id               UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id       UUID    REFERENCES bookings(id)  ON DELETE SET NULL,
  agent_id         UUID    REFERENCES agents(id)    ON DELETE SET NULL,
  branch_id        UUID    REFERENCES branches(id)  ON DELETE SET NULL,
  discount_amount  NUMERIC(15,2),
  discount_pct     NUMERIC(5,2),
  reason           TEXT,
  status           TEXT    DEFAULT 'pending'
                           CHECK (status IN ('pending','approved','rejected')),
  approved_by      UUID    REFERENCES profiles(id)  ON DELETE SET NULL,
  approved_at      TIMESTAMPTZ,
  rejection_notes  TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dr_booking_id ON discount_requests(booking_id);
CREATE INDEX IF NOT EXISTS idx_dr_status     ON discount_requests(status);

-- ============================================================
-- M. cancellation_rule_audit_logs (§F-41 — API route pakai ini)
-- ============================================================
CREATE TABLE IF NOT EXISTS cancellation_rule_audit_logs (
  id         UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  action     TEXT    NOT NULL,  -- 'created'|'updated'|'deleted'|'assigned'|'unassigned'
  actor_name TEXT,
  actor_email TEXT,
  rule_id    UUID    REFERENCES cancellation_rules(id) ON DELETE SET NULL,
  rule_name  TEXT,
  package_id UUID    REFERENCES packages(id)           ON DELETE SET NULL,
  changes    JSONB   DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cral_rule_id    ON cancellation_rule_audit_logs(rule_id);
CREATE INDEX IF NOT EXISTS idx_cral_created_at ON cancellation_rule_audit_logs(created_at DESC);

-- ============================================================
-- N. agent_leads (CRM agen — AgentLeads.tsx)
-- ============================================================
CREATE TABLE IF NOT EXISTS agent_leads (
  id         UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id   UUID    NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  name       TEXT    NOT NULL,
  phone      TEXT    NOT NULL,
  email      TEXT,
  source     TEXT    DEFAULT 'direct',
  stage      TEXT    DEFAULT 'new'
                     CHECK (stage IN ('new','contacted','qualified','converted','lost')),
  notes      TEXT,
  package_interest TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_al_agent_id ON agent_leads(agent_id);
CREATE INDEX IF NOT EXISTS idx_al_stage    ON agent_leads(stage);

-- ============================================================
-- O. exchange_rates (§F-42 — diakses di AdminExchangeRates.tsx)
-- ============================================================
CREATE TABLE IF NOT EXISTS exchange_rates (
  id           UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  from_currency TEXT   NOT NULL DEFAULT 'SAR',
  to_currency   TEXT   NOT NULL DEFAULT 'IDR',
  rate         NUMERIC(15,6) NOT NULL DEFAULT 1,
  source       TEXT    DEFAULT 'manual',
  valid_from   DATE    NOT NULL DEFAULT CURRENT_DATE,
  valid_until  DATE,
  is_active    BOOLEAN DEFAULT TRUE,
  notes        TEXT,
  created_by   UUID    REFERENCES profiles(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (from_currency, to_currency, valid_from)
);
CREATE INDEX IF NOT EXISTS idx_er_currencies ON exchange_rates(from_currency, to_currency);
CREATE INDEX IF NOT EXISTS idx_er_valid_from ON exchange_rates(valid_from DESC);
CREATE INDEX IF NOT EXISTS idx_er_is_active  ON exchange_rates(is_active);

-- Seed nilai kurs awal
INSERT INTO exchange_rates (from_currency, to_currency, rate, source) VALUES
  ('SAR', 'IDR', 4300.00, 'seed'),
  ('USD', 'IDR', 16000.00, 'seed'),
  ('EUR', 'IDR', 17500.00, 'seed')
ON CONFLICT (from_currency, to_currency, valid_from) DO NOTHING;
