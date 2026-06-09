-- Migration: Tabel Akuntansi Dasar — Jurnal Umum, Budget, Rekonsiliasi
-- Jalankan di Supabase SQL Editor

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. journal_entries — header jurnal umum
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.journal_entries (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_number  TEXT NOT NULL UNIQUE,        -- JU-2026-0001
  entry_date    DATE NOT NULL,
  description   TEXT NOT NULL,
  ref_type      TEXT,                         -- 'payment' | 'vendor_cost' | 'cash' | 'manual'
  ref_id        UUID,
  is_posted     BOOLEAN NOT NULL DEFAULT false,
  created_by    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. journal_entry_lines — baris debit/kredit per jurnal
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.journal_entry_lines (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id      UUID NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
  account_code  TEXT NOT NULL,               -- COA code dari coa_categories
  description   TEXT,
  debit         NUMERIC(18,2) NOT NULL DEFAULT 0,
  credit        NUMERIC(18,2) NOT NULL DEFAULT 0,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_debit_credit CHECK (
    (debit >= 0 AND credit = 0) OR (credit >= 0 AND debit = 0)
  )
);

-- index untuk query per akun
CREATE INDEX IF NOT EXISTS idx_jel_account_code ON public.journal_entry_lines(account_code);
CREATE INDEX IF NOT EXISTS idx_jel_entry_id     ON public.journal_entry_lines(entry_id);
CREATE INDEX IF NOT EXISTS idx_je_entry_date    ON public.journal_entries(entry_date);

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
  created_by     UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
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
  period_date   DATE NOT NULL,                -- tanggal rekonsiliasi (akhir bulan)
  bank_balance  NUMERIC(18,2) NOT NULL,
  book_balance  NUMERIC(18,2) NOT NULL,
  difference    NUMERIC(18,2) GENERATED ALWAYS AS (bank_balance - book_balance) STORED,
  status        TEXT NOT NULL DEFAULT 'open', -- 'open' | 'reconciled'
  notes         TEXT,
  created_by    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
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
  amount              NUMERIC(18,2) NOT NULL,
  is_reconciled       BOOLEAN NOT NULL DEFAULT false,
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS: hanya role admin/finance yang bisa akses
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.journal_entries       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entry_lines   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_budgets       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_reconciliations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reconciliation_items  ENABLE ROW LEVEL SECURITY;

-- Kebijakan: semua authenticated dapat SELECT; hanya admin/finance yang INSERT/UPDATE/DELETE
-- Sesuaikan dengan kebijakan RLS Anda yang sudah ada
CREATE POLICY IF NOT EXISTS "journal_entries_select" ON public.journal_entries FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "journal_entries_manage" ON public.journal_entries FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS "journal_entry_lines_select" ON public.journal_entry_lines FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "journal_entry_lines_manage" ON public.journal_entry_lines FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS "finance_budgets_all"    ON public.finance_budgets    FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS "bank_reconciliations_all" ON public.bank_reconciliations FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS "reconciliation_items_all" ON public.reconciliation_items FOR ALL USING (true);
