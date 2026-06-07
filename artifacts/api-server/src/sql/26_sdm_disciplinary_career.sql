-- =============================================================================
-- Migration 069: SDM Sprint 1 — Surat Peringatan & Riwayat Karir
-- =============================================================================

-- ── 1. Disciplinary Records (Surat Peringatan & Disiplin) ───────────────────
CREATE TABLE IF NOT EXISTS disciplinary_records (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id    UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  type           TEXT NOT NULL
    CHECK (type IN ('sp1','sp2','sp3','phk','warning','memo')),
  violation_date DATE NOT NULL,
  description    TEXT NOT NULL,
  action_taken   TEXT,
  issued_by      UUID REFERENCES auth.users(id),
  acknowledged_at TIMESTAMPTZ,
  document_url   TEXT,
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_disciplinary_records_employee_id
  ON disciplinary_records(employee_id);

CREATE INDEX IF NOT EXISTS idx_disciplinary_records_type
  ON disciplinary_records(type);

-- ── 2. Career History (Riwayat Karir & Promosi) ────────────────────────────
CREATE TABLE IF NOT EXISTS career_history (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id    UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  effective_date DATE NOT NULL,
  change_type    TEXT NOT NULL
    CHECK (change_type IN ('hire','promotion','demotion','transfer','salary_change','resign','terminate')),
  old_position   TEXT,
  new_position   TEXT,
  old_department TEXT,
  new_department TEXT,
  old_branch_id  UUID REFERENCES branches(id),
  new_branch_id  UUID REFERENCES branches(id),
  old_salary     NUMERIC,
  new_salary     NUMERIC,
  notes          TEXT,
  approved_by    UUID REFERENCES auth.users(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_career_history_employee_id
  ON career_history(employee_id);

CREATE INDEX IF NOT EXISTS idx_career_history_effective_date
  ON career_history(effective_date DESC);
