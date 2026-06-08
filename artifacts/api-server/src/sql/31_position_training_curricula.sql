-- ── Migration 31: Kurikulum Training Per Jabatan ────────────────────────────
-- Maps job positions to required training modules for structured staff onboarding

CREATE TABLE IF NOT EXISTS position_training_curricula (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  position_name TEXT        NOT NULL,
  module_id     UUID        NOT NULL REFERENCES training_modules(id) ON DELETE CASCADE,
  is_mandatory  BOOLEAN     NOT NULL DEFAULT true,
  due_days      INTEGER     NOT NULL DEFAULT 30,
  sort_order    INTEGER     NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (position_name, module_id)
);

CREATE INDEX IF NOT EXISTS idx_ptc_position ON position_training_curricula(position_name);
CREATE INDEX IF NOT EXISTS idx_ptc_module   ON position_training_curricula(module_id);

-- Ensure employee_training_progress has all needed columns
ALTER TABLE employee_training_progress
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add index for faster per-employee lookups
CREATE INDEX IF NOT EXISTS idx_etp_employee ON employee_training_progress(employee_id);
CREATE INDEX IF NOT EXISTS idx_etp_module   ON employee_training_progress(module_id);
