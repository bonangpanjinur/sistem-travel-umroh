-- ── Sprint SDM-1: Komponen Payroll Dinamis + Surat Peringatan + Training Staf ──

-- ── 1. Payroll Components (Bonus/Tunjangan/Potongan) ──────────────────────────

CREATE TABLE IF NOT EXISTS public.payroll_components (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  code        TEXT NOT NULL,
  type        TEXT NOT NULL DEFAULT 'bonus' CHECK (type IN ('bonus', 'tunjangan', 'potongan')),
  calc_type   TEXT NOT NULL DEFAULT 'fixed' CHECK (calc_type IN ('fixed', 'percentage')),
  default_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  is_taxable  BOOLEAN NOT NULL DEFAULT false,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_payroll_components_code ON public.payroll_components(code);
CREATE INDEX IF NOT EXISTS idx_payroll_components_type ON public.payroll_components(type);

-- Seed default components
INSERT INTO public.payroll_components (name, code, type, calc_type, default_amount, is_taxable, description)
VALUES
  ('Tunjangan Transportasi', 'TUN_TRANSPORT',  'tunjangan', 'fixed',      500000, false, 'Tunjangan transportasi bulanan'),
  ('Tunjangan Makan',        'TUN_MAKAN',       'tunjangan', 'fixed',      600000, false, 'Tunjangan uang makan'),
  ('Tunjangan Jabatan',      'TUN_JABATAN',     'tunjangan', 'fixed',     1000000, true,  'Tunjangan jabatan/posisi'),
  ('Bonus Performa',         'BONUS_PERFORMA',  'bonus',     'fixed',           0, true,  'Bonus berdasarkan performa bulanan'),
  ('Bonus Kehadiran',        'BONUS_KEHADIRAN', 'bonus',     'fixed',      200000, false, 'Bonus kehadiran penuh'),
  ('THR',                    'THR',             'bonus',     'percentage',      0, true,  'Tunjangan Hari Raya (% dari gaji pokok)')
ON CONFLICT DO NOTHING;

-- ── 2. Employee Payroll Component Entries (per karyawan per periode) ──────────

CREATE TABLE IF NOT EXISTS public.employee_payroll_components (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id  UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  component_id UUID NOT NULL REFERENCES public.payroll_components(id) ON DELETE CASCADE,
  period       TEXT NOT NULL,
  amount       NUMERIC(15,2) NOT NULL DEFAULT 0,
  note         TEXT,
  created_by   UUID,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_emp_pay_comp_period    ON public.employee_payroll_components(employee_id, period);
CREATE INDEX IF NOT EXISTS idx_emp_pay_comp_component ON public.employee_payroll_components(component_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_emp_pay_comp_unique ON public.employee_payroll_components(employee_id, component_id, period);

-- ── 3. Disciplinary Letters / Surat Peringatan (SP) ──────────────────────────

CREATE TABLE IF NOT EXISTS public.disciplinary_letters (
  id                           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id                  UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  letter_type                  TEXT NOT NULL DEFAULT 'SP1' CHECK (letter_type IN ('SP1','SP2','SP3','SKORSING','PHK')),
  letter_number                TEXT NOT NULL,
  issued_date                  DATE NOT NULL DEFAULT CURRENT_DATE,
  violation                    TEXT NOT NULL,
  description                  TEXT,
  consequence                  TEXT,
  issued_by                    UUID,
  status                       TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','expired','revoked')),
  expires_at                   DATE,
  acknowledged_at              TIMESTAMPTZ,
  acknowledged_by_employee     BOOLEAN NOT NULL DEFAULT false,
  attachment_url               TEXT,
  created_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_disciplinary_employee ON public.disciplinary_letters(employee_id, status);
CREATE INDEX IF NOT EXISTS idx_disciplinary_issued_date ON public.disciplinary_letters(issued_date DESC);

-- ── 4. Employee Training Progress (staf internal, bukan agen) ─────────────────

CREATE TABLE IF NOT EXISTS public.employee_training_progress (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  module_id   UUID NOT NULL REFERENCES public.training_modules(id) ON DELETE CASCADE,
  status      TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started','in_progress','completed','failed')),
  quiz_score  NUMERIC(5,2),
  started_at  TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_emp_training_unique ON public.employee_training_progress(employee_id, module_id);
CREATE INDEX IF NOT EXISTS idx_emp_training_module ON public.employee_training_progress(module_id);
