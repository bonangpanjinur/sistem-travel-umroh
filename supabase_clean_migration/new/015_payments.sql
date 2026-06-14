-- =============================================================================
-- VINSTOUR TRAVEL PORTAL — Clean Migration v2
-- FILE 015: Payments, Bank Accounts, Savings & Financial Tracking
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. BANK_ACCOUNTS — Rekening bank perusahaan
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bank_accounts (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_name      TEXT        NOT NULL,
  account_number TEXT        NOT NULL,
  account_name   TEXT        NOT NULL,
  branch_name    TEXT,
  is_primary     BOOLEAN     NOT NULL DEFAULT FALSE,
  is_active      BOOLEAN     NOT NULL DEFAULT TRUE,
  qr_code_url    TEXT,
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 2. PAYMENTS — Transaksi pembayaran booking
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payments (
  id               UUID                      PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_code     TEXT                      NOT NULL UNIQUE,
  booking_id       UUID                      NOT NULL REFERENCES public.bookings(id) ON DELETE RESTRICT,
  amount           NUMERIC                   NOT NULL CHECK (amount > 0),
  payment_date     DATE                      NOT NULL DEFAULT CURRENT_DATE,
  payment_method   public.payment_method_type NOT NULL DEFAULT 'transfer',
  bank_account_id  UUID                      REFERENCES public.bank_accounts(id) ON DELETE SET NULL,
  proof_url        TEXT,
  notes            TEXT,
  status           TEXT                      NOT NULL DEFAULT 'pending'
                                             CHECK (status IN ('pending','verified','rejected','refunded')),
  confirmed_by     UUID                      REFERENCES auth.users(id) ON DELETE SET NULL,
  confirmed_at     TIMESTAMPTZ,
  rejected_reason  TEXT,
  created_by       UUID                      REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ               NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ               NOT NULL DEFAULT NOW()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_payments_booking  ON public.payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_status   ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_date     ON public.payments(payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_payments_code     ON public.payments(payment_code);

-- ---------------------------------------------------------------------------
-- 3. SAVINGS_PLANS — Program tabungan umroh/haji
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.savings_plans (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id          UUID        NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  agent_id             UUID        REFERENCES public.agents(id) ON DELETE SET NULL,
  branch_id            UUID        REFERENCES public.branches(id) ON DELETE SET NULL,
  plan_code            TEXT        NOT NULL UNIQUE,
  target_package_id    UUID        REFERENCES public.packages(id) ON DELETE SET NULL,
  target_amount        NUMERIC     NOT NULL CHECK (target_amount > 0),
  saved_amount         NUMERIC     NOT NULL DEFAULT 0,
  monthly_target       NUMERIC,
  status               TEXT        NOT NULL DEFAULT 'active'
                                   CHECK (status IN ('active','paused','completed','cancelled','converted')),
  started_at           DATE        NOT NULL DEFAULT CURRENT_DATE,
  target_date          DATE,
  converted_booking_id UUID        REFERENCES public.bookings(id) ON DELETE SET NULL,
  converted_at         TIMESTAMPTZ,
  notes                TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Jika tabel sudah ada dari schema lama, tambahkan kolom baru secara idempotent
ALTER TABLE public.savings_plans ADD COLUMN IF NOT EXISTS agent_id             UUID REFERENCES public.agents(id) ON DELETE SET NULL;
ALTER TABLE public.savings_plans ADD COLUMN IF NOT EXISTS branch_id            UUID REFERENCES public.branches(id) ON DELETE SET NULL;
ALTER TABLE public.savings_plans ADD COLUMN IF NOT EXISTS monthly_target        NUMERIC;
ALTER TABLE public.savings_plans ADD COLUMN IF NOT EXISTS target_date           DATE;
ALTER TABLE public.savings_plans ADD COLUMN IF NOT EXISTS converted_booking_id  UUID REFERENCES public.bookings(id) ON DELETE SET NULL;
ALTER TABLE public.savings_plans ADD COLUMN IF NOT EXISTS converted_at          TIMESTAMPTZ;

ALTER TABLE public.savings_plans ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_savings_plans_customer
  ON public.savings_plans(customer_id);
CREATE INDEX IF NOT EXISTS idx_savings_plans_status
  ON public.savings_plans(status);

-- ---------------------------------------------------------------------------
-- 4. SAVINGS_DEPOSITS — Setoran tabungan
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.savings_deposits (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id          UUID        NOT NULL REFERENCES public.savings_plans(id) ON DELETE CASCADE,
  deposit_code     TEXT        NOT NULL UNIQUE,
  amount           NUMERIC     NOT NULL CHECK (amount > 0),
  deposit_date     DATE        NOT NULL DEFAULT CURRENT_DATE,
  payment_method   public.payment_method_type NOT NULL DEFAULT 'transfer',
  proof_url        TEXT,
  status           TEXT        NOT NULL DEFAULT 'pending'
                               CHECK (status IN ('pending','verified','rejected')),
  verified_by      UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_at      TIMESTAMPTZ,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.savings_deposits ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_savings_deposits_plan
  ON public.savings_deposits(plan_id);

-- ---------------------------------------------------------------------------
-- 5. SAVINGS_SCHEDULES — Jadwal setoran terjadwal
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.savings_schedules (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id         UUID        NOT NULL REFERENCES public.savings_plans(id) ON DELETE CASCADE,
  scheduled_date  DATE        NOT NULL,
  amount          NUMERIC     NOT NULL,
  status          TEXT        NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending','paid','missed','cancelled')),
  deposit_id      UUID        REFERENCES public.savings_deposits(id) ON DELETE SET NULL,
  reminder_sent   BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.savings_schedules ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 6. PAYMENT_DEADLINE_REMINDERS — Konfigurasi reminder deadline bayar
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payment_deadline_reminders (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id      UUID        NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  reminder_days   INTEGER     NOT NULL DEFAULT 3,
  channel         public.notification_channel_type NOT NULL DEFAULT 'whatsapp',
  status          TEXT        NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending','sent','failed')),
  sent_at         TIMESTAMPTZ,
  error           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.payment_deadline_reminders ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_payment_reminders_booking
  ON public.payment_deadline_reminders(booking_id);

-- ---------------------------------------------------------------------------
-- 7. MIDTRANS_WEBHOOK_LOGS — Log webhook Midtrans
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.midtrans_webhook_logs (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        TEXT        NOT NULL,
  transaction_id  TEXT,
  status          TEXT,
  gross_amount    NUMERIC,
  payment_type    TEXT,
  raw_payload     JSONB       NOT NULL,
  processed       BOOLEAN     NOT NULL DEFAULT FALSE,
  processed_at    TIMESTAMPTZ,
  error           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.midtrans_webhook_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_midtrans_order_id
  ON public.midtrans_webhook_logs(order_id);

-- ---------------------------------------------------------------------------
-- 8. WITHDRAWAL_REQUESTS — Permintaan pencairan (komisi/tabungan)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.withdrawal_requests (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  type             TEXT        NOT NULL DEFAULT 'savings'
                               CHECK (type IN ('savings','commission','refund')),
  reference_id     UUID        NOT NULL,
  amount           NUMERIC     NOT NULL CHECK (amount > 0),
  bank_name        TEXT        NOT NULL,
  account_number   TEXT        NOT NULL,
  account_name     TEXT        NOT NULL,
  status           TEXT        NOT NULL DEFAULT 'pending'
                               CHECK (status IN ('pending','approved','processing','completed','rejected')),
  requested_by     UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_by      UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at      TIMESTAMPTZ,
  transfer_proof   TEXT,
  rejection_reason TEXT,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 9. INVOICE_TEMPLATES — Template PDF invoice
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.invoice_templates (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT        NOT NULL,
  type           TEXT        NOT NULL DEFAULT 'booking'
                             CHECK (type IN ('booking','savings','commission','receipt')),
  header_html    TEXT,
  footer_html    TEXT,
  body_template  TEXT,
  css            TEXT,
  is_default     BOOLEAN     NOT NULL DEFAULT FALSE,
  is_active      BOOLEAN     NOT NULL DEFAULT TRUE,
  created_by     UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.invoice_templates ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 10. BOOKING_INSTALLMENT_SCHEDULES — Jadwal cicilan
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.booking_installment_schedules (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id      UUID        NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  installment_no  INTEGER     NOT NULL,
  due_date        DATE        NOT NULL,
  amount          NUMERIC     NOT NULL,
  status          TEXT        NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending','paid','overdue','cancelled')),
  payment_id      UUID        REFERENCES public.payments(id) ON DELETE SET NULL,
  reminder_sent   BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (booking_id, installment_no)
);

ALTER TABLE public.booking_installment_schedules ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_installments_booking
  ON public.booking_installment_schedules(booking_id);
