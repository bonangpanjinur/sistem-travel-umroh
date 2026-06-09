-- ============================================================
-- 39_journal_entries.sql
-- Jurnal Umum (General Journal) — double-entry bookkeeping
-- ============================================================

-- ─── 1. journal_entries ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS journal_entries (
  id              UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entry_number    TEXT        NOT NULL UNIQUE,
  entry_date      DATE        NOT NULL DEFAULT CURRENT_DATE,
  description     TEXT        NOT NULL DEFAULT '',
  ref_type        TEXT,       -- 'booking' | 'payment' | 'vendor_cost' | 'cash' | 'manual'
  ref_id          UUID,
  ref_code        TEXT,       -- kode referensi human-readable (mis. BK-2026-0001)
  status          TEXT        NOT NULL DEFAULT 'posted'
                              CHECK (status IN ('draft','posted','voided')),
  total_debit     NUMERIC(18,2) NOT NULL DEFAULT 0,
  total_credit    NUMERIC(18,2) NOT NULL DEFAULT 0,
  branch_id       UUID        REFERENCES branches(id) ON DELETE SET NULL,
  created_by      UUID,
  created_by_name TEXT,
  voided_at       TIMESTAMPTZ,
  voided_reason   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_je_entry_date    ON journal_entries(entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_je_status        ON journal_entries(status);
CREATE INDEX IF NOT EXISTS idx_je_ref           ON journal_entries(ref_type, ref_id) WHERE ref_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_je_branch        ON journal_entries(branch_id)         WHERE branch_id IS NOT NULL;

-- ─── 2. journal_entry_lines ──────────────────────────────────
CREATE TABLE IF NOT EXISTS journal_entry_lines (
  id              UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entry_id        UUID        NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  line_number     SMALLINT    NOT NULL DEFAULT 1,
  account_code    TEXT        NOT NULL,
  account_name    TEXT,
  description     TEXT,
  debit           NUMERIC(18,2) NOT NULL DEFAULT 0 CHECK (debit >= 0),
  credit          NUMERIC(18,2) NOT NULL DEFAULT 0 CHECK (credit >= 0),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_jel_entry_id     ON journal_entry_lines(entry_id);
CREATE INDEX IF NOT EXISTS idx_jel_account_code ON journal_entry_lines(account_code);

-- ─── 3. Constraint: setiap baris hanya boleh isi debit ATAU credit ───
ALTER TABLE journal_entry_lines
  ADD CONSTRAINT chk_jel_one_side
  CHECK (NOT (debit > 0 AND credit > 0));

-- ─── 4. Trigger: auto-update total_debit / total_credit di header ────
CREATE OR REPLACE FUNCTION sync_journal_entry_totals()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE journal_entries
  SET
    total_debit  = COALESCE((SELECT SUM(debit)  FROM journal_entry_lines WHERE entry_id = COALESCE(NEW.entry_id, OLD.entry_id)), 0),
    total_credit = COALESCE((SELECT SUM(credit) FROM journal_entry_lines WHERE entry_id = COALESCE(NEW.entry_id, OLD.entry_id)), 0),
    updated_at   = now()
  WHERE id = COALESCE(NEW.entry_id, OLD.entry_id);
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_je_totals ON journal_entry_lines;
CREATE TRIGGER trg_sync_je_totals
  AFTER INSERT OR UPDATE OR DELETE ON journal_entry_lines
  FOR EACH ROW EXECUTE FUNCTION sync_journal_entry_totals();

-- ─── 5. RLS ──────────────────────────────────────────────────
ALTER TABLE journal_entries      ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entry_lines  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_manage_journal_entries"      ON journal_entries;
DROP POLICY IF EXISTS "staff_manage_journal_entry_lines"  ON journal_entry_lines;

CREATE POLICY "staff_manage_journal_entries"
  ON journal_entries FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "staff_manage_journal_entry_lines"
  ON journal_entry_lines FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

COMMENT ON TABLE journal_entries      IS 'Jurnal Umum (General Journal) — header setiap entri akuntansi double-entry';
COMMENT ON TABLE journal_entry_lines  IS 'Baris Jurnal — pasangan debit/kredit per entri jurnal';
