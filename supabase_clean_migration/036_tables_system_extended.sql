-- =============================================================================
-- VINSTOUR TRAVEL PORTAL — Clean Migration Chain
-- FILE 036: System Extended Tables
--   user_permission_overrides, login_attempts,
--   dashboard_access_config, dashboard_access_audit_log,
--   access_policies,
--   virtual_accounts,
--   vendor_contracts, cancellation_policies,
--   support_tickets, support_messages
-- Run AFTER 035. Idempotent — IF NOT EXISTS throughout.
-- RLS policies: see 039_rls_extended.sql
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. USER_PERMISSION_OVERRIDES — Override permission per user (ABAC)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_permission_overrides (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission_key TEXT        NOT NULL REFERENCES public.permissions_list(key) ON DELETE CASCADE,
  can_view       BOOLEAN,
  can_create     BOOLEAN,
  can_edit       BOOLEAN,
  can_delete     BOOLEAN,
  reason         TEXT,
  granted_by     UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  valid_from     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until    TIMESTAMPTZ,
  is_active      BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, permission_key)
);

ALTER TABLE public.user_permission_overrides ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_user_permission_overrides_user_id        ON public.user_permission_overrides(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permission_overrides_permission_key ON public.user_permission_overrides(permission_key);

-- ---------------------------------------------------------------------------
-- 2. LOGIN_ATTEMPTS — Tracking login untuk rate-limiting & audit
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.login_attempts (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  email        TEXT,
  ip_address   TEXT,
  user_agent   TEXT,
  status       TEXT        NOT NULL DEFAULT 'failed'
                           CHECK (status IN ('success','failed','blocked')),
  failure_reason TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_login_attempts_user_id    ON public.login_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_login_attempts_email      ON public.login_attempts(email);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip_address ON public.login_attempts(ip_address);
CREATE INDEX IF NOT EXISTS idx_login_attempts_created_at ON public.login_attempts(created_at);

-- ---------------------------------------------------------------------------
-- 3. DASHBOARD_ACCESS_CONFIG — Konfigurasi widget dashboard per role/user
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.dashboard_access_config (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        REFERENCES auth.users(id) ON DELETE CASCADE,
  role            TEXT,
  branch_id       UUID        REFERENCES public.branches(id) ON DELETE CASCADE,
  widget_key      TEXT        NOT NULL,
  widget_label    TEXT,
  is_visible      BOOLEAN     NOT NULL DEFAULT TRUE,
  sort_order      INTEGER     NOT NULL DEFAULT 0,
  config          JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.dashboard_access_config ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_dashboard_access_config_user_id ON public.dashboard_access_config(user_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_access_config_role    ON public.dashboard_access_config(role);

-- ---------------------------------------------------------------------------
-- 4. DASHBOARD_ACCESS_AUDIT_LOG — Log perubahan konfigurasi dashboard
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.dashboard_access_audit_log (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id   UUID        REFERENCES public.dashboard_access_config(id) ON DELETE SET NULL,
  changed_by  UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  action      TEXT        NOT NULL CHECK (action IN ('create','update','delete','reset')),
  old_value   JSONB,
  new_value   JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.dashboard_access_audit_log ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 5. ACCESS_POLICIES — Kebijakan akses ABAC tingkat lanjut
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.access_policies (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT        NOT NULL,
  description   TEXT,
  resource      TEXT        NOT NULL,
  action        TEXT        NOT NULL,
  conditions    JSONB       NOT NULL DEFAULT '{}',
  effect        TEXT        NOT NULL DEFAULT 'allow'
                            CHECK (effect IN ('allow','deny')),
  priority      INTEGER     NOT NULL DEFAULT 100,
  applies_to    TEXT        NOT NULL DEFAULT 'role'
                            CHECK (applies_to IN ('role','user','branch','all')),
  role          TEXT,
  user_id       UUID        REFERENCES auth.users(id) ON DELETE CASCADE,
  branch_id     UUID        REFERENCES public.branches(id) ON DELETE CASCADE,
  is_active     BOOLEAN     NOT NULL DEFAULT TRUE,
  valid_from    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until   TIMESTAMPTZ,
  created_by    UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.access_policies ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_access_policies_resource ON public.access_policies(resource);
CREATE INDEX IF NOT EXISTS idx_access_policies_role     ON public.access_policies(role);

-- ---------------------------------------------------------------------------
-- 6. VIRTUAL_ACCOUNTS — Virtual account otomatis per booking
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.virtual_accounts (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id     UUID        NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  customer_id    UUID        NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  bank_code      TEXT        NOT NULL,
  va_number      TEXT        NOT NULL UNIQUE,
  va_name        TEXT,
  amount         NUMERIC     NOT NULL,
  amount_paid    NUMERIC     NOT NULL DEFAULT 0,
  status         TEXT        NOT NULL DEFAULT 'active'
                             CHECK (status IN ('active','paid','expired','cancelled')),
  expired_at     TIMESTAMPTZ NOT NULL,
  paid_at        TIMESTAMPTZ,
  provider       TEXT        NOT NULL DEFAULT 'midtrans'
                             CHECK (provider IN ('midtrans','xendit','doku','tripay','other')),
  provider_ref   TEXT,
  provider_data  JSONB,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.virtual_accounts ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_virtual_accounts_booking_id  ON public.virtual_accounts(booking_id);
CREATE INDEX IF NOT EXISTS idx_virtual_accounts_customer_id ON public.virtual_accounts(customer_id);
CREATE INDEX IF NOT EXISTS idx_virtual_accounts_status      ON public.virtual_accounts(status);

-- ---------------------------------------------------------------------------
-- 7. VENDOR_CONTRACTS — Kontrak dengan vendor / supplier
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vendor_contracts (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id        UUID        NOT NULL REFERENCES public.vendors(id) ON DELETE RESTRICT,
  contract_number  TEXT        UNIQUE,
  title            TEXT        NOT NULL,
  contract_type    TEXT        NOT NULL DEFAULT 'service'
                               CHECK (contract_type IN ('service','supply','hotel','transport',
                                                         'airline','catering','other')),
  start_date       DATE        NOT NULL,
  end_date         DATE,
  amount           NUMERIC,
  currency         TEXT        NOT NULL DEFAULT 'IDR',
  payment_terms    TEXT,
  terms            TEXT,
  status           TEXT        NOT NULL DEFAULT 'active'
                               CHECK (status IN ('draft','active','expired','terminated','renewal')),
  file_url         TEXT,
  signed_at        TIMESTAMPTZ,
  signed_by        UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.vendor_contracts ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_vendor_contracts_vendor_id ON public.vendor_contracts(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_contracts_status    ON public.vendor_contracts(status);

-- ---------------------------------------------------------------------------
-- 8. CANCELLATION_POLICIES — Kebijakan pembatalan & refund
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cancellation_policies (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT        NOT NULL,
  applies_to      TEXT        NOT NULL DEFAULT 'all'
                              CHECK (applies_to IN ('all','package','departure','booking_type')),
  package_id      UUID        REFERENCES public.packages(id) ON DELETE CASCADE,
  days_before     INTEGER     NOT NULL,
  refund_pct      NUMERIC     NOT NULL DEFAULT 0
                              CHECK (refund_pct BETWEEN 0 AND 100),
  deduction_pct   NUMERIC     NOT NULL DEFAULT 0
                              CHECK (deduction_pct BETWEEN 0 AND 100),
  description     TEXT,
  is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
  sort_order      INTEGER     NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.cancellation_policies ENABLE ROW LEVEL SECURITY;

-- Seed default cancellation policy
DO $$
BEGIN
  INSERT INTO public.cancellation_policies (name, applies_to, days_before, refund_pct, deduction_pct, description, sort_order) VALUES
    ('Lebih dari 90 hari',  'all', 90, 90, 10, 'Pembatalan > 90 hari sebelum keberangkatan', 10),
    ('30–90 hari',           'all', 30, 75, 25, 'Pembatalan 30–90 hari sebelum keberangkatan', 20),
    ('14–30 hari',           'all', 14, 50, 50, 'Pembatalan 14–30 hari sebelum keberangkatan', 30),
    ('7–14 hari',            'all',  7, 25, 75, 'Pembatalan 7–14 hari sebelum keberangkatan',  40),
    ('Kurang dari 7 hari',   'all',  0,  0,100, 'Pembatalan < 7 hari sebelum keberangkatan',   50)
  ON CONFLICT DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'SKIP cancellation_policies seed: %', SQLERRM;
END;
$$;

-- ---------------------------------------------------------------------------
-- 9. SUPPORT_TICKETS — Tiket dukungan pelanggan / agen
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number  TEXT        UNIQUE,
  subject        TEXT        NOT NULL,
  category       TEXT        NOT NULL DEFAULT 'general'
                             CHECK (category IN ('general','booking','payment','visa','technical',
                                                  'equipment','complaint','other')),
  priority       TEXT        NOT NULL DEFAULT 'medium'
                             CHECK (priority IN ('low','medium','high','urgent')),
  status         TEXT        NOT NULL DEFAULT 'open'
                             CHECK (status IN ('open','in_progress','waiting','resolved','closed')),
  customer_id    UUID        REFERENCES public.customers(id) ON DELETE SET NULL,
  agent_id       UUID        REFERENCES public.agents(id) ON DELETE SET NULL,
  user_id        UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  booking_id     UUID        REFERENCES public.bookings(id) ON DELETE SET NULL,
  assigned_to    UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  branch_id      UUID        REFERENCES public.branches(id) ON DELETE SET NULL,
  source         TEXT        NOT NULL DEFAULT 'web'
                             CHECK (source IN ('web','whatsapp','email','phone','walk_in')),
  resolved_at    TIMESTAMPTZ,
  closed_at      TIMESTAMPTZ,
  sla_due_at     TIMESTAMPTZ,
  rating         INTEGER     CHECK (rating BETWEEN 1 AND 5),
  feedback       TEXT,
  tags           TEXT[],
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_support_tickets_status      ON public.support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_customer_id ON public.support_tickets(customer_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned_to ON public.support_tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at  ON public.support_tickets(created_at);

-- Generate ticket_number trigger
CREATE OR REPLACE FUNCTION public.fn_generate_ticket_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.ticket_number IS NULL THEN
    NEW.ticket_number := 'TKT-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' ||
                         LPAD(NEXTVAL('public.support_ticket_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE SEQUENCE IF NOT EXISTS public.support_ticket_seq;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_support_ticket_number'
  ) THEN
    CREATE TRIGGER trg_support_ticket_number
      BEFORE INSERT ON public.support_tickets
      FOR EACH ROW EXECUTE FUNCTION public.fn_generate_ticket_number();
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 10. SUPPORT_MESSAGES — Pesan percakapan dalam tiket
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.support_messages (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id   UUID        NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  user_id     UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_role TEXT        NOT NULL DEFAULT 'customer'
                          CHECK (sender_role IN ('customer','agent','staff','system')),
  message     TEXT        NOT NULL,
  attachments JSONB,
  is_internal BOOLEAN     NOT NULL DEFAULT FALSE,
  is_read     BOOLEAN     NOT NULL DEFAULT FALSE,
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_support_messages_ticket_id  ON public.support_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_support_messages_created_at ON public.support_messages(created_at);

-- Grant permissions
DO $$
BEGIN
  GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
  GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
  GRANT ALL    ON ALL TABLES IN SCHEMA public TO service_role;
  GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, anon, service_role;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'GRANT on tables/sequences skipped: %', SQLERRM;
END;
$$;

SELECT '036_tables_system_extended: OK' AS result;
