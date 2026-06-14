-- =============================================================================
-- VINSTOUR TRAVEL PORTAL — Clean Migration v2
-- FILE 016: Finance, Accounting & HR Tables
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. CHART_OF_ACCOUNTS (COA)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chart_of_accounts (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  code         TEXT        NOT NULL UNIQUE,
  name         TEXT        NOT NULL,
  type         TEXT        NOT NULL
                           CHECK (type IN ('asset','liability','equity','revenue','cogs','expense')),
  parent_code  TEXT        REFERENCES public.chart_of_accounts(code) ON DELETE SET NULL,
  description  TEXT,
  is_active    BOOLEAN     NOT NULL DEFAULT TRUE,
  sort_order   INTEGER     NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.chart_of_accounts ADD COLUMN IF NOT EXISTS parent_code  TEXT;
ALTER TABLE public.chart_of_accounts ADD COLUMN IF NOT EXISTS description  TEXT;
ALTER TABLE public.chart_of_accounts ADD COLUMN IF NOT EXISTS sort_order   INTEGER DEFAULT 0;

ALTER TABLE public.chart_of_accounts ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_coa_type ON public.chart_of_accounts(type, code);

-- ---------------------------------------------------------------------------
-- 2. JOURNAL_ENTRIES — Header jurnal double-entry
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.journal_entries (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_number   TEXT        UNIQUE,
  entry_date     DATE        NOT NULL DEFAULT CURRENT_DATE,
  type           TEXT        NOT NULL DEFAULT 'general'
                             CHECK (type IN ('general','sales','purchase','payment',
                                              'receipt','adjustment')),
  description    TEXT        NOT NULL,
  reference_type TEXT,
  reference_id   UUID,
  total_debit    NUMERIC     NOT NULL DEFAULT 0,
  total_credit   NUMERIC     NOT NULL DEFAULT 0,
  status         TEXT        NOT NULL DEFAULT 'draft'
                             CHECK (status IN ('draft','posted','voided')),
  posted_by      UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  posted_at      TIMESTAMPTZ,
  voided_by      UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  voided_at      TIMESTAMPTZ,
  notes          TEXT,
  created_by     UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.journal_entries ADD COLUMN IF NOT EXISTS entry_number   TEXT        UNIQUE;
ALTER TABLE public.journal_entries ADD COLUMN IF NOT EXISTS type           TEXT        DEFAULT 'general';
ALTER TABLE public.journal_entries ADD COLUMN IF NOT EXISTS reference_type TEXT;
ALTER TABLE public.journal_entries ADD COLUMN IF NOT EXISTS reference_id   UUID;
ALTER TABLE public.journal_entries ADD COLUMN IF NOT EXISTS total_debit    NUMERIC     DEFAULT 0;
ALTER TABLE public.journal_entries ADD COLUMN IF NOT EXISTS total_credit   NUMERIC     DEFAULT 0;
ALTER TABLE public.journal_entries ADD COLUMN IF NOT EXISTS status         TEXT        DEFAULT 'draft';
ALTER TABLE public.journal_entries ADD COLUMN IF NOT EXISTS posted_by      UUID        REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.journal_entries ADD COLUMN IF NOT EXISTS posted_at      TIMESTAMPTZ;
ALTER TABLE public.journal_entries ADD COLUMN IF NOT EXISTS voided_by      UUID        REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.journal_entries ADD COLUMN IF NOT EXISTS voided_at      TIMESTAMPTZ;
ALTER TABLE public.journal_entries ADD COLUMN IF NOT EXISTS notes          TEXT;
ALTER TABLE public.journal_entries ADD COLUMN IF NOT EXISTS created_by     UUID        REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_journal_entries_date   ON public.journal_entries(entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_journal_entries_ref    ON public.journal_entries(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_status ON public.journal_entries(status);

-- ---------------------------------------------------------------------------
-- 3. JOURNAL_LINES — Baris debit/kredit
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.journal_lines (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_id     UUID        NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
  account_code   TEXT        NOT NULL REFERENCES public.chart_of_accounts(code) ON DELETE RESTRICT,
  debit          NUMERIC     NOT NULL DEFAULT 0,
  credit         NUMERIC     NOT NULL DEFAULT 0,
  description    TEXT,
  currency       TEXT        NOT NULL DEFAULT 'IDR',
  exchange_rate  NUMERIC     NOT NULL DEFAULT 1,
  amount_foreign NUMERIC,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.journal_lines ADD COLUMN IF NOT EXISTS journal_id     UUID        REFERENCES public.journal_entries(id) ON DELETE CASCADE;
ALTER TABLE public.journal_lines ADD COLUMN IF NOT EXISTS account_code   TEXT        REFERENCES public.chart_of_accounts(code) ON DELETE RESTRICT;
ALTER TABLE public.journal_lines ADD COLUMN IF NOT EXISTS debit          NUMERIC     DEFAULT 0;
ALTER TABLE public.journal_lines ADD COLUMN IF NOT EXISTS credit         NUMERIC     DEFAULT 0;
ALTER TABLE public.journal_lines ADD COLUMN IF NOT EXISTS description    TEXT;
ALTER TABLE public.journal_lines ADD COLUMN IF NOT EXISTS currency       TEXT        DEFAULT 'IDR';
ALTER TABLE public.journal_lines ADD COLUMN IF NOT EXISTS exchange_rate  NUMERIC     DEFAULT 1;
ALTER TABLE public.journal_lines ADD COLUMN IF NOT EXISTS amount_foreign NUMERIC;

ALTER TABLE public.journal_lines ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_journal_lines_journal ON public.journal_lines(journal_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_account ON public.journal_lines(account_code);

-- ---------------------------------------------------------------------------
-- 4. VENDOR_INVOICES — Tagihan dari vendor
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vendor_invoices (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id      UUID        NOT NULL REFERENCES public.vendors(id) ON DELETE RESTRICT,
  departure_id   UUID        REFERENCES public.departures(id) ON DELETE SET NULL,
  invoice_number TEXT        NOT NULL,
  invoice_date   DATE        NOT NULL,
  due_date       DATE,
  amount_usd     NUMERIC     NOT NULL DEFAULT 0,
  amount_idr     NUMERIC     NOT NULL DEFAULT 0,
  exchange_rate  NUMERIC     NOT NULL DEFAULT 1,
  currency       TEXT        NOT NULL DEFAULT 'IDR',
  status         TEXT        NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending','approved','paid','disputed','cancelled')),
  description    TEXT,
  file_url       TEXT,
  paid_at        TIMESTAMPTZ,
  paid_by        UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_by    UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at    TIMESTAMPTZ,
  notes          TEXT,
  created_by     UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.vendor_invoices ADD COLUMN IF NOT EXISTS departure_id  UUID        REFERENCES public.departures(id) ON DELETE SET NULL;
ALTER TABLE public.vendor_invoices ADD COLUMN IF NOT EXISTS due_date      DATE;
ALTER TABLE public.vendor_invoices ADD COLUMN IF NOT EXISTS amount_usd    NUMERIC     DEFAULT 0;
ALTER TABLE public.vendor_invoices ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC     DEFAULT 1;
ALTER TABLE public.vendor_invoices ADD COLUMN IF NOT EXISTS currency      TEXT        DEFAULT 'IDR';
ALTER TABLE public.vendor_invoices ADD COLUMN IF NOT EXISTS status        TEXT        DEFAULT 'pending';
ALTER TABLE public.vendor_invoices ADD COLUMN IF NOT EXISTS description   TEXT;
ALTER TABLE public.vendor_invoices ADD COLUMN IF NOT EXISTS file_url      TEXT;
ALTER TABLE public.vendor_invoices ADD COLUMN IF NOT EXISTS paid_at       TIMESTAMPTZ;
ALTER TABLE public.vendor_invoices ADD COLUMN IF NOT EXISTS paid_by       UUID        REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.vendor_invoices ADD COLUMN IF NOT EXISTS approved_by   UUID        REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.vendor_invoices ADD COLUMN IF NOT EXISTS approved_at   TIMESTAMPTZ;
ALTER TABLE public.vendor_invoices ADD COLUMN IF NOT EXISTS notes         TEXT;
ALTER TABLE public.vendor_invoices ADD COLUMN IF NOT EXISTS created_by    UUID        REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.vendor_invoices ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_vendor_invoices_vendor    ON public.vendor_invoices(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_invoices_departure ON public.vendor_invoices(departure_id);
CREATE INDEX IF NOT EXISTS idx_vendor_invoices_status    ON public.vendor_invoices(status);

-- ---------------------------------------------------------------------------
-- 5. DEPARTURE_COST_ITEMS — HPP aktual per departure
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.departure_cost_items (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  departure_id     UUID        NOT NULL REFERENCES public.departures(id) ON DELETE CASCADE,
  vendor_id        UUID        REFERENCES public.vendors(id) ON DELETE SET NULL,
  item_name        TEXT        NOT NULL,
  item_type        TEXT        NOT NULL DEFAULT 'per_pax'
                               CHECK (item_type IN ('per_pax','fixed','per_room','per_night')),
  quantity         INTEGER     NOT NULL DEFAULT 1,
  unit_cost_usd    NUMERIC     NOT NULL DEFAULT 0,
  unit_cost_idr    NUMERIC     NOT NULL DEFAULT 0,
  exchange_rate    NUMERIC     NOT NULL DEFAULT 1,
  total_cost_idr   NUMERIC     NOT NULL DEFAULT 0,
  is_planned       BOOLEAN     NOT NULL DEFAULT FALSE,
  notes            TEXT,
  invoice_id       UUID        REFERENCES public.vendor_invoices(id) ON DELETE SET NULL,
  created_by       UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.departure_cost_items ADD COLUMN IF NOT EXISTS vendor_id      UUID REFERENCES public.vendors(id) ON DELETE SET NULL;
ALTER TABLE public.departure_cost_items ADD COLUMN IF NOT EXISTS item_type      TEXT DEFAULT 'per_pax';
ALTER TABLE public.departure_cost_items ADD COLUMN IF NOT EXISTS unit_cost_usd  NUMERIC DEFAULT 0;
ALTER TABLE public.departure_cost_items ADD COLUMN IF NOT EXISTS exchange_rate  NUMERIC DEFAULT 1;
ALTER TABLE public.departure_cost_items ADD COLUMN IF NOT EXISTS total_cost_idr NUMERIC DEFAULT 0;
ALTER TABLE public.departure_cost_items ADD COLUMN IF NOT EXISTS is_planned     BOOLEAN DEFAULT FALSE;
ALTER TABLE public.departure_cost_items ADD COLUMN IF NOT EXISTS notes          TEXT;
ALTER TABLE public.departure_cost_items ADD COLUMN IF NOT EXISTS invoice_id     UUID REFERENCES public.vendor_invoices(id) ON DELETE SET NULL;
ALTER TABLE public.departure_cost_items ADD COLUMN IF NOT EXISTS created_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.departure_cost_items ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_dep_cost_items_departure ON public.departure_cost_items(departure_id);
CREATE INDEX IF NOT EXISTS idx_dep_cost_items_vendor    ON public.departure_cost_items(vendor_id);

-- ---------------------------------------------------------------------------
-- 6. DEPARTURE_EXPENSES — Pengeluaran operasional
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.departure_expenses (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  departure_id     UUID        NOT NULL REFERENCES public.departures(id) ON DELETE CASCADE,
  category         TEXT        NOT NULL DEFAULT 'operational'
                               CHECK (category IN ('operational','transport','meals','guide',
                                                    'commission','insurance','other')),
  description      TEXT        NOT NULL,
  amount_idr       NUMERIC     NOT NULL DEFAULT 0,
  amount_usd       NUMERIC     NOT NULL DEFAULT 0,
  exchange_rate    NUMERIC     NOT NULL DEFAULT 1,
  expense_date     DATE        NOT NULL DEFAULT CURRENT_DATE,
  vendor_id        UUID        REFERENCES public.vendors(id) ON DELETE SET NULL,
  receipt_url      TEXT,
  approved_by      UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at      TIMESTAMPTZ,
  status           TEXT        NOT NULL DEFAULT 'pending'
                               CHECK (status IN ('pending','approved','rejected')),
  created_by       UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.departure_expenses ADD COLUMN IF NOT EXISTS amount_usd    NUMERIC     DEFAULT 0;
ALTER TABLE public.departure_expenses ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC     DEFAULT 1;
ALTER TABLE public.departure_expenses ADD COLUMN IF NOT EXISTS vendor_id     UUID        REFERENCES public.vendors(id) ON DELETE SET NULL;
ALTER TABLE public.departure_expenses ADD COLUMN IF NOT EXISTS receipt_url   TEXT;
ALTER TABLE public.departure_expenses ADD COLUMN IF NOT EXISTS approved_by   UUID        REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.departure_expenses ADD COLUMN IF NOT EXISTS approved_at   TIMESTAMPTZ;
ALTER TABLE public.departure_expenses ADD COLUMN IF NOT EXISTS status        TEXT        DEFAULT 'pending';
ALTER TABLE public.departure_expenses ADD COLUMN IF NOT EXISTS created_by    UUID        REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.departure_expenses ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_departure_expenses_departure ON public.departure_expenses(departure_id);
CREATE INDEX IF NOT EXISTS idx_departure_expenses_status    ON public.departure_expenses(status);

-- ---------------------------------------------------------------------------
-- 7. DEPARTURE_OTHER_REVENUES — Pendapatan tambahan
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.departure_other_revenues (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  departure_id   UUID        NOT NULL REFERENCES public.departures(id) ON DELETE CASCADE,
  source         TEXT        NOT NULL DEFAULT 'other'
                             CHECK (source IN ('shop','tips','upgrade','insurance','other')),
  description    TEXT        NOT NULL,
  amount_idr     NUMERIC     NOT NULL DEFAULT 0,
  received_date  DATE        NOT NULL DEFAULT CURRENT_DATE,
  notes          TEXT,
  created_by     UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.departure_other_revenues ADD COLUMN IF NOT EXISTS source        TEXT DEFAULT 'other';
ALTER TABLE public.departure_other_revenues ADD COLUMN IF NOT EXISTS received_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE public.departure_other_revenues ADD COLUMN IF NOT EXISTS notes         TEXT;
ALTER TABLE public.departure_other_revenues ADD COLUMN IF NOT EXISTS created_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.departure_other_revenues ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_departure_revenues_departure ON public.departure_other_revenues(departure_id);

-- ---------------------------------------------------------------------------
-- 8. COMMISSIONS — Komisi agen / cabang / karyawan
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.commissions (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  type              TEXT        NOT NULL DEFAULT 'agent'
                                CHECK (type IN ('agent','branch','referral','employee')),
  booking_id        UUID        REFERENCES public.bookings(id) ON DELETE SET NULL,
  agent_id          UUID        REFERENCES public.agents(id) ON DELETE SET NULL,
  branch_id         UUID        REFERENCES public.branches(id) ON DELETE SET NULL,
  employee_id       UUID        REFERENCES public.employees(id) ON DELETE SET NULL,
  commission_rate   NUMERIC     NOT NULL DEFAULT 0,
  commission_amount NUMERIC     NOT NULL DEFAULT 0,
  currency          TEXT        NOT NULL DEFAULT 'IDR',
  status            TEXT        NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending','approved','paid','cancelled')),
  paid_at           TIMESTAMPTZ,
  paid_by           UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.commissions ADD COLUMN IF NOT EXISTS type              TEXT DEFAULT 'agent';
ALTER TABLE public.commissions ADD COLUMN IF NOT EXISTS booking_id        UUID REFERENCES public.bookings(id) ON DELETE SET NULL;
ALTER TABLE public.commissions ADD COLUMN IF NOT EXISTS agent_id          UUID REFERENCES public.agents(id) ON DELETE SET NULL;
ALTER TABLE public.commissions ADD COLUMN IF NOT EXISTS branch_id         UUID REFERENCES public.branches(id) ON DELETE SET NULL;
ALTER TABLE public.commissions ADD COLUMN IF NOT EXISTS employee_id       UUID REFERENCES public.employees(id) ON DELETE SET NULL;
ALTER TABLE public.commissions ADD COLUMN IF NOT EXISTS commission_rate   NUMERIC DEFAULT 0;
ALTER TABLE public.commissions ADD COLUMN IF NOT EXISTS currency          TEXT DEFAULT 'IDR';
ALTER TABLE public.commissions ADD COLUMN IF NOT EXISTS status            TEXT DEFAULT 'pending';
ALTER TABLE public.commissions ADD COLUMN IF NOT EXISTS paid_at           TIMESTAMPTZ;
ALTER TABLE public.commissions ADD COLUMN IF NOT EXISTS paid_by           UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.commissions ADD COLUMN IF NOT EXISTS notes             TEXT;

ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_commissions_booking  ON public.commissions(booking_id);
CREATE INDEX IF NOT EXISTS idx_commissions_agent    ON public.commissions(agent_id);
CREATE INDEX IF NOT EXISTS idx_commissions_status   ON public.commissions(status);

-- ---------------------------------------------------------------------------
-- 9. CASHFLOW_ENTRIES — Arus kas manual
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cashflow_entries (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_date     DATE        NOT NULL DEFAULT CURRENT_DATE,
  type           TEXT        NOT NULL DEFAULT 'inflow'
                             CHECK (type IN ('inflow','outflow')),
  category       TEXT        NOT NULL,
  description    TEXT        NOT NULL,
  amount         NUMERIC     NOT NULL DEFAULT 0,
  reference_type TEXT,
  reference_id   UUID,
  notes          TEXT,
  created_by     UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.cashflow_entries ADD COLUMN IF NOT EXISTS reference_type TEXT;
ALTER TABLE public.cashflow_entries ADD COLUMN IF NOT EXISTS reference_id   UUID;
ALTER TABLE public.cashflow_entries ADD COLUMN IF NOT EXISTS notes          TEXT;
ALTER TABLE public.cashflow_entries ADD COLUMN IF NOT EXISTS created_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.cashflow_entries ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_cashflow_date ON public.cashflow_entries(entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_cashflow_type ON public.cashflow_entries(type);

-- ---------------------------------------------------------------------------
-- 10. SCHEDULED_REPORTS — Laporan otomatis terjadwal
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.scheduled_reports (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT        NOT NULL,
  report_type     TEXT        NOT NULL,
  schedule_cron   TEXT        NOT NULL,
  recipients      TEXT[],
  parameters      JSONB,
  last_run_at     TIMESTAMPTZ,
  next_run_at     TIMESTAMPTZ,
  is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
  created_by      UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.scheduled_reports ADD COLUMN IF NOT EXISTS recipients  TEXT[];
ALTER TABLE public.scheduled_reports ADD COLUMN IF NOT EXISTS parameters  JSONB;
ALTER TABLE public.scheduled_reports ADD COLUMN IF NOT EXISTS last_run_at TIMESTAMPTZ;
ALTER TABLE public.scheduled_reports ADD COLUMN IF NOT EXISTS next_run_at TIMESTAMPTZ;
ALTER TABLE public.scheduled_reports ADD COLUMN IF NOT EXISTS created_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.scheduled_reports ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 11. AR_REMINDER_LOG — Log reminder piutang
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ar_reminder_log (
  id           UUID                             PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id   UUID                             NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  sent_at      TIMESTAMPTZ                      NOT NULL DEFAULT NOW(),
  channel      public.notification_channel_type NOT NULL DEFAULT 'whatsapp',
  message      TEXT,
  status       TEXT                             NOT NULL DEFAULT 'sent'
                                                CHECK (status IN ('sent','failed','pending')),
  error        TEXT,
  created_at   TIMESTAMPTZ                      NOT NULL DEFAULT NOW()
);

ALTER TABLE public.ar_reminder_log ADD COLUMN IF NOT EXISTS channel TEXT DEFAULT 'whatsapp';
ALTER TABLE public.ar_reminder_log ADD COLUMN IF NOT EXISTS message TEXT;
ALTER TABLE public.ar_reminder_log ADD COLUMN IF NOT EXISTS status  TEXT DEFAULT 'sent';
ALTER TABLE public.ar_reminder_log ADD COLUMN IF NOT EXISTS error   TEXT;

ALTER TABLE public.ar_reminder_log ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_ar_reminder_booking ON public.ar_reminder_log(booking_id);
CREATE INDEX IF NOT EXISTS idx_ar_reminder_status  ON public.ar_reminder_log(status);

-- ---------------------------------------------------------------------------
-- 12. EMPLOYEES — Karyawan internal
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.employees (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  branch_id         UUID        REFERENCES public.branches(id) ON DELETE SET NULL,
  employee_code     TEXT        UNIQUE,
  full_name         TEXT        NOT NULL,
  email             TEXT,
  phone             TEXT,
  nik               TEXT,
  gender            public.gender_type,
  birth_date        DATE,
  address           TEXT,
  position          TEXT,
  department        TEXT,
  employment_type   TEXT        NOT NULL DEFAULT 'permanent'
                                CHECK (employment_type IN ('permanent','contract','part_time','intern')),
  status            TEXT        NOT NULL DEFAULT 'active'
                                CHECK (status IN ('active','inactive','on_leave','terminated')),
  join_date         DATE,
  resign_date       DATE,
  base_salary       NUMERIC     NOT NULL DEFAULT 0,
  bank_name         TEXT,
  bank_account_no   TEXT,
  bank_account_name TEXT,
  photo_url         TEXT,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS branch_id         UUID        REFERENCES public.branches(id) ON DELETE SET NULL;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS employee_code     TEXT        UNIQUE;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS nik               TEXT;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS gender            public.gender_type;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS birth_date        DATE;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS address           TEXT;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS position          TEXT;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS department        TEXT;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS employment_type   TEXT        DEFAULT 'permanent';
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS status            TEXT        DEFAULT 'active';
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS join_date         DATE;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS resign_date       DATE;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS base_salary       NUMERIC     DEFAULT 0;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS bank_name         TEXT;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS bank_account_no   TEXT;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS bank_account_name TEXT;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS photo_url         TEXT;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS notes             TEXT;

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_employees_user_id   ON public.employees(user_id);
CREATE INDEX IF NOT EXISTS idx_employees_branch_id ON public.employees(branch_id);
CREATE INDEX IF NOT EXISTS idx_employees_status    ON public.employees(status);

-- ---------------------------------------------------------------------------
-- 13. PAYROLL — Periode penggajian
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payroll (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  period_month    INTEGER     NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  period_year     INTEGER     NOT NULL CHECK (period_year BETWEEN 2020 AND 2099),
  branch_id       UUID        REFERENCES public.branches(id) ON DELETE SET NULL,
  total_gross     NUMERIC     NOT NULL DEFAULT 0,
  total_deduction NUMERIC     NOT NULL DEFAULT 0,
  total_net       NUMERIC     NOT NULL DEFAULT 0,
  employee_count  INTEGER     NOT NULL DEFAULT 0,
  status          TEXT        NOT NULL DEFAULT 'draft'
                              CHECK (status IN ('draft','finalized','paid','cancelled')),
  finalized_by    UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  finalized_at    TIMESTAMPTZ,
  paid_at         TIMESTAMPTZ,
  notes           TEXT,
  created_by      UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (period_month, period_year, branch_id)
);

ALTER TABLE public.payroll ADD COLUMN IF NOT EXISTS branch_id       UUID        REFERENCES public.branches(id) ON DELETE SET NULL;
ALTER TABLE public.payroll ADD COLUMN IF NOT EXISTS total_deduction NUMERIC     DEFAULT 0;
ALTER TABLE public.payroll ADD COLUMN IF NOT EXISTS employee_count  INTEGER     DEFAULT 0;
ALTER TABLE public.payroll ADD COLUMN IF NOT EXISTS status          TEXT        DEFAULT 'draft';
ALTER TABLE public.payroll ADD COLUMN IF NOT EXISTS finalized_by    UUID        REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.payroll ADD COLUMN IF NOT EXISTS finalized_at    TIMESTAMPTZ;
ALTER TABLE public.payroll ADD COLUMN IF NOT EXISTS paid_at         TIMESTAMPTZ;
ALTER TABLE public.payroll ADD COLUMN IF NOT EXISTS notes           TEXT;
ALTER TABLE public.payroll ADD COLUMN IF NOT EXISTS created_by      UUID        REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.payroll ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_payroll_period ON public.payroll(period_year, period_month);
CREATE INDEX IF NOT EXISTS idx_payroll_status ON public.payroll(status);

-- ---------------------------------------------------------------------------
-- 14. PAYROLL_SLIPS — Slip gaji individual
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payroll_slips (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_id       UUID        NOT NULL REFERENCES public.payroll(id) ON DELETE CASCADE,
  employee_id      UUID        NOT NULL REFERENCES public.employees(id) ON DELETE RESTRICT,
  base_salary      NUMERIC     NOT NULL DEFAULT 0,
  allowances       NUMERIC     NOT NULL DEFAULT 0,
  overtime         NUMERIC     NOT NULL DEFAULT 0,
  bonus            NUMERIC     NOT NULL DEFAULT 0,
  gross_salary     NUMERIC     NOT NULL DEFAULT 0,
  bpjs_tk          NUMERIC     NOT NULL DEFAULT 0,
  bpjs_kes         NUMERIC     NOT NULL DEFAULT 0,
  income_tax       NUMERIC     NOT NULL DEFAULT 0,
  other_deductions NUMERIC     NOT NULL DEFAULT 0,
  net_salary       NUMERIC     NOT NULL DEFAULT 0,
  components       JSONB,
  paid_at          TIMESTAMPTZ,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (payroll_id, employee_id)
);

ALTER TABLE public.payroll_slips ADD COLUMN IF NOT EXISTS allowances       NUMERIC DEFAULT 0;
ALTER TABLE public.payroll_slips ADD COLUMN IF NOT EXISTS overtime         NUMERIC DEFAULT 0;
ALTER TABLE public.payroll_slips ADD COLUMN IF NOT EXISTS bonus            NUMERIC DEFAULT 0;
ALTER TABLE public.payroll_slips ADD COLUMN IF NOT EXISTS bpjs_tk          NUMERIC DEFAULT 0;
ALTER TABLE public.payroll_slips ADD COLUMN IF NOT EXISTS bpjs_kes         NUMERIC DEFAULT 0;
ALTER TABLE public.payroll_slips ADD COLUMN IF NOT EXISTS income_tax       NUMERIC DEFAULT 0;
ALTER TABLE public.payroll_slips ADD COLUMN IF NOT EXISTS other_deductions NUMERIC DEFAULT 0;
ALTER TABLE public.payroll_slips ADD COLUMN IF NOT EXISTS components       JSONB;
ALTER TABLE public.payroll_slips ADD COLUMN IF NOT EXISTS paid_at          TIMESTAMPTZ;
ALTER TABLE public.payroll_slips ADD COLUMN IF NOT EXISTS notes            TEXT;

ALTER TABLE public.payroll_slips ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_payroll_slips_payroll   ON public.payroll_slips(payroll_id);
CREATE INDEX IF NOT EXISTS idx_payroll_slips_employee  ON public.payroll_slips(employee_id);

-- ---------------------------------------------------------------------------
-- 15. LEAVE_REQUESTS — Pengajuan cuti
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.leave_requests (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id    UUID        NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  leave_type     TEXT        NOT NULL DEFAULT 'annual'
                             CHECK (leave_type IN ('annual','sick','personal','emergency','unpaid')),
  start_date     DATE        NOT NULL,
  end_date       DATE        NOT NULL,
  days_count     INTEGER,
  reason         TEXT,
  status         TEXT        NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending','approved','rejected','cancelled')),
  reviewed_by    UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at    TIMESTAMPTZ,
  reviewer_notes TEXT,
  attachment_url TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS leave_type     TEXT DEFAULT 'annual';
ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS days_count     INTEGER;
ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS reason         TEXT;
ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS status         TEXT DEFAULT 'pending';
ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS reviewed_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS reviewed_at    TIMESTAMPTZ;
ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS reviewer_notes TEXT;
ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS attachment_url TEXT;

ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_leave_requests_employee ON public.leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status   ON public.leave_requests(status);

-- ---------------------------------------------------------------------------
-- 16. PERFORMANCE_REVIEWS — Penilaian kinerja
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.performance_reviews (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id     UUID        NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  reviewer_id     UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  period_month    INTEGER     CHECK (period_month BETWEEN 1 AND 12),
  period_year     INTEGER,
  overall_score   NUMERIC     CHECK (overall_score BETWEEN 0 AND 100),
  kpi_scores      JSONB,
  strengths       TEXT,
  improvements    TEXT,
  notes           TEXT,
  status          TEXT        NOT NULL DEFAULT 'draft'
                              CHECK (status IN ('draft','submitted','acknowledged')),
  submitted_at    TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.performance_reviews ADD COLUMN IF NOT EXISTS reviewer_id     UUID        REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.performance_reviews ADD COLUMN IF NOT EXISTS period_month    INTEGER;
ALTER TABLE public.performance_reviews ADD COLUMN IF NOT EXISTS period_year     INTEGER;
ALTER TABLE public.performance_reviews ADD COLUMN IF NOT EXISTS overall_score   NUMERIC;
ALTER TABLE public.performance_reviews ADD COLUMN IF NOT EXISTS kpi_scores      JSONB;
ALTER TABLE public.performance_reviews ADD COLUMN IF NOT EXISTS strengths       TEXT;
ALTER TABLE public.performance_reviews ADD COLUMN IF NOT EXISTS improvements    TEXT;
ALTER TABLE public.performance_reviews ADD COLUMN IF NOT EXISTS notes           TEXT;
ALTER TABLE public.performance_reviews ADD COLUMN IF NOT EXISTS status          TEXT DEFAULT 'draft';
ALTER TABLE public.performance_reviews ADD COLUMN IF NOT EXISTS submitted_at    TIMESTAMPTZ;
ALTER TABLE public.performance_reviews ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMPTZ;

ALTER TABLE public.performance_reviews ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_performance_reviews_employee ON public.performance_reviews(employee_id);
CREATE INDEX IF NOT EXISTS idx_performance_reviews_status   ON public.performance_reviews(status);
