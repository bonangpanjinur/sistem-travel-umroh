-- =============================================================================
-- Migration 071: Onboarding Tables + Payroll Components
-- =============================================================================

-- ── 1. Onboarding Templates ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS onboarding_templates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT,
  category    TEXT NOT NULL DEFAULT 'general',
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 2. Onboarding Template Items ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS onboarding_template_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id  UUID NOT NULL REFERENCES onboarding_templates(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  description  TEXT,
  category     TEXT NOT NULL DEFAULT 'orientasi'
    CHECK (category IN ('orientasi','administrasi','akses_sistem','pelatihan','lainnya')),
  due_days     INTEGER NOT NULL DEFAULT 1,
  is_required  BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_onboarding_template_items_template
  ON onboarding_template_items(template_id, sort_order);

-- ── 3. Employee Onboarding Tasks ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS employee_onboarding_tasks (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id      UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  template_item_id UUID REFERENCES onboarding_template_items(id) ON DELETE SET NULL,
  title            TEXT NOT NULL,
  description      TEXT,
  category         TEXT NOT NULL DEFAULT 'orientasi'
    CHECK (category IN ('orientasi','administrasi','akses_sistem','pelatihan','lainnya')),
  due_date         DATE,
  status           TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','in_progress','done','skipped')),
  completed_at     TIMESTAMPTZ,
  completed_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes            TEXT,
  sort_order       INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_employee_onboarding_tasks_employee
  ON employee_onboarding_tasks(employee_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_employee_onboarding_tasks_status
  ON employee_onboarding_tasks(status);

-- ── 4. Payroll Components Master ─────────────────────────────────────────────
-- Komponen gaji yang bisa diterapkan ke karyawan (bonus, tunjangan, potongan)
CREATE TABLE IF NOT EXISTS payroll_components (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  code        TEXT NOT NULL UNIQUE,
  type        TEXT NOT NULL
    CHECK (type IN ('allowance','deduction','bonus')),
  amount_type TEXT NOT NULL DEFAULT 'fixed'
    CHECK (amount_type IN ('fixed','percentage')),
  amount      NUMERIC(15,2) NOT NULL DEFAULT 0,
  description TEXT,
  is_taxable  BOOLEAN NOT NULL DEFAULT FALSE,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payroll_components_type ON payroll_components(type);
CREATE INDEX IF NOT EXISTS idx_payroll_components_active ON payroll_components(is_active);

-- ── 5. Employee Payroll Components (per-karyawan override) ───────────────────
CREATE TABLE IF NOT EXISTS employee_payroll_components (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id     UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  component_id    UUID NOT NULL REFERENCES payroll_components(id) ON DELETE CASCADE,
  amount_override NUMERIC(15,2),    -- NULL = gunakan default dari payroll_components
  effective_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date        DATE,             -- NULL = berlaku terus
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (employee_id, component_id, effective_date)
);

CREATE INDEX IF NOT EXISTS idx_emp_payroll_comp_employee
  ON employee_payroll_components(employee_id);
CREATE INDEX IF NOT EXISTS idx_emp_payroll_comp_component
  ON employee_payroll_components(component_id);

-- ── 6. Internal Staff Training Sessions ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS staff_training_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL,
  description     TEXT,
  category        TEXT NOT NULL DEFAULT 'general'
    CHECK (category IN ('general','technical','compliance','leadership','service','safety','lainnya')),
  trainer_name    TEXT,
  location        TEXT,
  start_datetime  TIMESTAMPTZ NOT NULL,
  end_datetime    TIMESTAMPTZ NOT NULL,
  max_participants INTEGER,
  is_mandatory    BOOLEAN NOT NULL DEFAULT FALSE,
  target_audience TEXT[] DEFAULT '{}',  -- ['all','hr','operational','finance',...]
  status          TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled','ongoing','completed','cancelled')),
  notes           TEXT,
  created_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staff_training_status ON staff_training_sessions(status);
CREATE INDEX IF NOT EXISTS idx_staff_training_start ON staff_training_sessions(start_datetime DESC);

-- ── 7. Staff Training Attendance ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS staff_training_attendance (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID NOT NULL REFERENCES staff_training_sessions(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  status      TEXT NOT NULL DEFAULT 'registered'
    CHECK (status IN ('registered','attended','absent','excused')),
  score       NUMERIC(5,2),   -- nilai quiz/post-test 0-100
  notes       TEXT,
  registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  attended_at   TIMESTAMPTZ,
  UNIQUE (session_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_staff_training_attendance_session
  ON staff_training_attendance(session_id);
CREATE INDEX IF NOT EXISTS idx_staff_training_attendance_employee
  ON staff_training_attendance(employee_id);

-- ── RLS: Enable for all new tables ───────────────────────────────────────────
ALTER TABLE onboarding_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_template_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_onboarding_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_payroll_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_training_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_training_attendance ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users (HR/admin) to manage
CREATE POLICY IF NOT EXISTS "auth_all_onboarding_templates"
  ON onboarding_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "auth_all_onboarding_template_items"
  ON onboarding_template_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "auth_all_employee_onboarding_tasks"
  ON employee_onboarding_tasks FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "auth_all_payroll_components"
  ON payroll_components FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "auth_all_employee_payroll_components"
  ON employee_payroll_components FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "auth_all_staff_training_sessions"
  ON staff_training_sessions FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "auth_all_staff_training_attendance"
  ON staff_training_attendance FOR ALL TO authenticated USING (true) WITH CHECK (true);
