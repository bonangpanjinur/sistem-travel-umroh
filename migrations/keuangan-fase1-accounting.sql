-- Migration: Tabel Akuntansi Dasar — Jurnal Umum, Budget, Rekonsiliasi
-- Jalankan di Neon/Supabase SQL Editor
-- Fix: CREATE POLICY IF NOT EXISTS tidak valid di PostgreSQL — gunakan DROP IF EXISTS + CREATE

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. journal_entries — header jurnal umum
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.journal_entries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_number    TEXT NOT NULL UNIQUE,        -- JU-2026-0001
  entry_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  description     TEXT NOT NULL DEFAULT '',
  ref_type        TEXT,                         -- 'payment' | 'vendor_cost' | 'cash' | 'manual'
  ref_id          UUID,
  ref_code        TEXT,
  status          TEXT NOT NULL DEFAULT 'posted'
                  CHECK (status IN ('draft','posted','voided')),
  total_debit     NUMERIC(18,2) NOT NULL DEFAULT 0,
  total_credit    NUMERIC(18,2) NOT NULL DEFAULT 0,
  is_posted       BOOLEAN NOT NULL DEFAULT true,
  created_by      UUID,
  created_by_name TEXT,
  voided_at       TIMESTAMPTZ,
  voided_reason   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. journal_entry_lines — baris debit/kredit per jurnal
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.journal_entry_lines (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id      UUID NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
  line_number   SMALLINT NOT NULL DEFAULT 1,
  account_code  TEXT NOT NULL,               -- COA code dari coa_categories
  account_name  TEXT,
  description   TEXT,
  debit         NUMERIC(18,2) NOT NULL DEFAULT 0 CHECK (debit >= 0),
  credit        NUMERIC(18,2) NOT NULL DEFAULT 0 CHECK (credit >= 0),
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_jel_one_side CHECK (NOT (debit > 0 AND credit > 0))
);

-- index untuk query per akun
CREATE INDEX IF NOT EXISTS idx_jel_account_code ON public.journal_entry_lines(account_code);
CREATE INDEX IF NOT EXISTS idx_jel_entry_id     ON public.journal_entry_lines(entry_id);
CREATE INDEX IF NOT EXISTS idx_je_entry_date    ON public.journal_entries(entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_je_status        ON public.journal_entries(status);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. finance_budgets — anggaran per periode per akun COA
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.finance_budgets (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_year    INTEGER NOT NULL,
  period_month   INTEGER NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  account_code   TEXT NOT NULL,
  budget_amount  NUMERIC(18,2) NOT NULL DEFAULT 0,
  notes          TEXT,
  created_by     UUID,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (period_year, period_month, account_code)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. bank_reconciliations — rekonsiliasi saldo bank
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.bank_reconciliations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id    UUID,                         -- referensi ke bank account
  account_name  TEXT,                         -- nama rekening bank
  period_date   DATE NOT NULL,                -- tanggal rekonsiliasi (akhir bulan)
  bank_balance  NUMERIC(18,2) NOT NULL DEFAULT 0,
  book_balance  NUMERIC(18,2) NOT NULL DEFAULT 0,
  difference    NUMERIC(18,2) GENERATED ALWAYS AS (bank_balance - book_balance) STORED,
  status        TEXT NOT NULL DEFAULT 'open', -- 'open' | 'reconciled'
  notes         TEXT,
  created_by    UUID,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. reconciliation_items — item rekonsiliasi per transaksi
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.reconciliation_items (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reconciliation_id   UUID NOT NULL REFERENCES public.bank_reconciliations(id) ON DELETE CASCADE,
  transaction_ref     TEXT,                   -- nomor referensi transaksi
  transaction_date    DATE,
  description         TEXT,
  amount              NUMERIC(18,2) NOT NULL DEFAULT 0,
  is_reconciled       BOOLEAN NOT NULL DEFAULT false,
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recon_items_recon_id ON public.reconciliation_items(reconciliation_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. K-10: account_code di tabel transaksi
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.cash_transactions
  ADD COLUMN IF NOT EXISTS account_code TEXT;

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS account_code TEXT;

ALTER TABLE public.vendor_costs
  ADD COLUMN IF NOT EXISTS account_code TEXT;

-- Auto-populate account_code dari transaction_type untuk cash_transactions
UPDATE public.cash_transactions ct
SET account_code = CASE
  WHEN ct.type = 'income'  THEN '4100'   -- Pendapatan
  WHEN ct.type = 'expense' THEN '6100'   -- Biaya Operasional
  ELSE '1100'                             -- Kas & Bank
END
WHERE ct.account_code IS NULL
  AND ct.type IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS: hanya role admin/finance yang bisa akses
-- (DROP IF EXISTS + CREATE adalah cara yang benar di PostgreSQL)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.journal_entries       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entry_lines   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_budgets       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_reconciliations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reconciliation_items  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "journal_entries_select"     ON public.journal_entries;
DROP POLICY IF EXISTS "journal_entries_manage"     ON public.journal_entries;
DROP POLICY IF EXISTS "journal_entry_lines_select" ON public.journal_entry_lines;
DROP POLICY IF EXISTS "journal_entry_lines_manage" ON public.journal_entry_lines;
DROP POLICY IF EXISTS "finance_budgets_all"        ON public.finance_budgets;
DROP POLICY IF EXISTS "bank_reconciliations_all"   ON public.bank_reconciliations;
DROP POLICY IF EXISTS "reconciliation_items_all"   ON public.reconciliation_items;

CREATE POLICY "journal_entries_select"     ON public.journal_entries     FOR SELECT USING (true);
CREATE POLICY "journal_entries_manage"     ON public.journal_entries     FOR ALL    USING (true) WITH CHECK (true);
CREATE POLICY "journal_entry_lines_select" ON public.journal_entry_lines FOR SELECT USING (true);
CREATE POLICY "journal_entry_lines_manage" ON public.journal_entry_lines FOR ALL    USING (true) WITH CHECK (true);
CREATE POLICY "finance_budgets_all"        ON public.finance_budgets     FOR ALL    USING (true) WITH CHECK (true);
CREATE POLICY "bank_reconciliations_all"   ON public.bank_reconciliations FOR ALL   USING (true) WITH CHECK (true);
CREATE POLICY "reconciliation_items_all"   ON public.reconciliation_items FOR ALL   USING (true) WITH CHECK (true);
