-- Migration 070: payroll_slips table untuk ESS portal
-- Menyimpan slip gaji bulanan per karyawan

CREATE TABLE IF NOT EXISTS payroll_slips (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id     UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  period_year     INTEGER NOT NULL,
  period_month    INTEGER NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  basic_salary    NUMERIC(15,2) NOT NULL DEFAULT 0,
  allowances      JSONB NOT NULL DEFAULT '{}',
  deductions      JSONB NOT NULL DEFAULT '{}',
  gross_salary    NUMERIC(15,2) NOT NULL DEFAULT 0,
  net_salary      NUMERIC(15,2) NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','processed','paid')),
  notes           TEXT,
  generated_by    UUID,
  generated_at    TIMESTAMPTZ,
  paid_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (employee_id, period_year, period_month)
);

CREATE INDEX IF NOT EXISTS idx_payroll_slips_employee ON payroll_slips(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_slips_period   ON payroll_slips(period_year DESC, period_month DESC);
CREATE INDEX IF NOT EXISTS idx_payroll_slips_status   ON payroll_slips(status);
