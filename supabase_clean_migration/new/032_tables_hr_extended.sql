-- =============================================================================
-- VINSTOUR TRAVEL PORTAL — Clean Migration Chain
-- FILE 032: HR Extended Tables
--   departments, attendance_records, payroll_components, leave_quotas,
--   employee_contracts, warning_letters, training_sessions, training_participants,
--   job_openings, job_applications
-- Run AFTER 031. Idempotent — IF NOT EXISTS throughout.
-- RLS policies: see 039_rls_extended.sql
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. DEPARTMENTS — Departemen organisasi
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.departments (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id   UUID        REFERENCES public.branches(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  code        TEXT,
  head_id     UUID        REFERENCES public.employees(id) ON DELETE SET NULL,
  description TEXT,
  is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (branch_id, code)
);

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_departments_branch_id ON public.departments(branch_id);

-- ---------------------------------------------------------------------------
-- 2. ATTENDANCE_RECORDS — Absensi harian karyawan
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.attendance_records (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id      UUID        NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  date             DATE        NOT NULL,
  check_in_at      TIMESTAMPTZ,
  check_out_at     TIMESTAMPTZ,
  check_in_lat     NUMERIC,
  check_in_lng     NUMERIC,
  check_out_lat    NUMERIC,
  check_out_lng    NUMERIC,
  work_hours       NUMERIC     GENERATED ALWAYS AS (
                     EXTRACT(EPOCH FROM (check_out_at - check_in_at)) / 3600
                   ) STORED,
  status           TEXT        NOT NULL DEFAULT 'present'
                               CHECK (status IN ('present','absent','late','half_day',
                                                  'sick','on_leave','remote','holiday')),
  overtime_hours   NUMERIC     NOT NULL DEFAULT 0,
  notes            TEXT,
  approved_by      UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (employee_id, date)
);

ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_attendance_records_employee_id ON public.attendance_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_date        ON public.attendance_records(date);

-- ---------------------------------------------------------------------------
-- 3. PAYROLL_COMPONENTS — Komponen gaji kustom per karyawan
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payroll_components (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id    UUID        NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  component_type TEXT        NOT NULL
                             CHECK (component_type IN ('allowance','deduction','bonus','reimbursement')),
  name           TEXT        NOT NULL,
  amount         NUMERIC     NOT NULL DEFAULT 0,
  is_recurring   BOOLEAN     NOT NULL DEFAULT TRUE,
  frequency      TEXT        NOT NULL DEFAULT 'monthly'
                             CHECK (frequency IN ('monthly','one_time','quarterly','annual')),
  start_date     DATE,
  end_date       DATE,
  is_taxable     BOOLEAN     NOT NULL DEFAULT TRUE,
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.payroll_components ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_payroll_components_employee_id ON public.payroll_components(employee_id);

-- ---------------------------------------------------------------------------
-- 4. LEAVE_QUOTAS — Kuota cuti per karyawan per tahun
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.leave_quotas (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id    UUID        NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  year           INTEGER     NOT NULL,
  leave_type     TEXT        NOT NULL
                             CHECK (leave_type IN ('annual','sick','personal','emergency','special')),
  total_days     INTEGER     NOT NULL DEFAULT 0,
  used_days      INTEGER     NOT NULL DEFAULT 0,
  remaining_days INTEGER     GENERATED ALWAYS AS (total_days - used_days) STORED,
  carry_over     INTEGER     NOT NULL DEFAULT 0,
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (employee_id, year, leave_type)
);

ALTER TABLE public.leave_quotas ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_leave_quotas_employee_id ON public.leave_quotas(employee_id);

-- ---------------------------------------------------------------------------
-- 5. EMPLOYEE_CONTRACTS — Kontrak kerja karyawan
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.employee_contracts (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id      UUID        NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  contract_number  TEXT        UNIQUE,
  contract_type    TEXT        NOT NULL
                               CHECK (contract_type IN ('pkwt','pkwtt','internship','freelance','other')),
  start_date       DATE        NOT NULL,
  end_date         DATE,
  position         TEXT        NOT NULL,
  department_id    UUID        REFERENCES public.departments(id) ON DELETE SET NULL,
  base_salary      NUMERIC     NOT NULL DEFAULT 0,
  probation_months INTEGER     NOT NULL DEFAULT 0,
  status           TEXT        NOT NULL DEFAULT 'active'
                               CHECK (status IN ('draft','active','expired','terminated')),
  file_url         TEXT,
  signed_at        TIMESTAMPTZ,
  signed_by        UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.employee_contracts ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_employee_contracts_employee_id ON public.employee_contracts(employee_id);

-- ---------------------------------------------------------------------------
-- 6. WARNING_LETTERS — Surat peringatan karyawan
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.warning_letters (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id  UUID        NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  letter_type  TEXT        NOT NULL CHECK (letter_type IN ('sp1','sp2','sp3','termination')),
  letter_date  DATE        NOT NULL DEFAULT CURRENT_DATE,
  reason       TEXT        NOT NULL,
  description  TEXT,
  issued_by    UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  file_url     TEXT,
  acknowledged BOOLEAN     NOT NULL DEFAULT FALSE,
  ack_at       TIMESTAMPTZ,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.warning_letters ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_warning_letters_employee_id ON public.warning_letters(employee_id);

-- ---------------------------------------------------------------------------
-- 7. TRAINING_SESSIONS — Sesi pelatihan / training karyawan
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.training_sessions (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT        NOT NULL,
  description     TEXT,
  category        TEXT        NOT NULL DEFAULT 'internal'
                              CHECK (category IN ('internal','external','online','certification')),
  trainer         TEXT,
  location        TEXT,
  start_date      DATE        NOT NULL,
  end_date        DATE,
  start_time      TIME,
  end_time        TIME,
  max_participants INTEGER,
  status          TEXT        NOT NULL DEFAULT 'planned'
                              CHECK (status IN ('planned','ongoing','completed','cancelled')),
  file_url        TEXT,
  created_by      UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  branch_id       UUID        REFERENCES public.branches(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.training_sessions ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 8. TRAINING_PARTICIPANTS — Peserta sesi training
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.training_participants (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID        NOT NULL REFERENCES public.training_sessions(id) ON DELETE CASCADE,
  employee_id     UUID        NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  status          TEXT        NOT NULL DEFAULT 'registered'
                              CHECK (status IN ('registered','attended','absent','completed','failed')),
  score           NUMERIC,
  certificate_url TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (session_id, employee_id)
);

ALTER TABLE public.training_participants ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_training_participants_session_id  ON public.training_participants(session_id);
CREATE INDEX IF NOT EXISTS idx_training_participants_employee_id ON public.training_participants(employee_id);

-- ---------------------------------------------------------------------------
-- 9. JOB_OPENINGS — Lowongan pekerjaan
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.job_openings (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id       UUID        REFERENCES public.branches(id) ON DELETE SET NULL,
  department_id   UUID        REFERENCES public.departments(id) ON DELETE SET NULL,
  title           TEXT        NOT NULL,
  description     TEXT,
  requirements    TEXT,
  employment_type TEXT        NOT NULL DEFAULT 'permanent'
                              CHECK (employment_type IN ('permanent','contract','part_time','intern')),
  location        TEXT,
  salary_min      NUMERIC,
  salary_max      NUMERIC,
  open_date       DATE        NOT NULL DEFAULT CURRENT_DATE,
  close_date      DATE,
  quota           INTEGER     NOT NULL DEFAULT 1,
  status          TEXT        NOT NULL DEFAULT 'open'
                              CHECK (status IN ('draft','open','closed','cancelled')),
  created_by      UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.job_openings ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 10. JOB_APPLICATIONS — Lamaran kerja
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.job_applications (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  opening_id     UUID        NOT NULL REFERENCES public.job_openings(id) ON DELETE CASCADE,
  full_name      TEXT        NOT NULL,
  email          TEXT        NOT NULL,
  phone          TEXT,
  cv_url         TEXT,
  cover_letter   TEXT,
  status         TEXT        NOT NULL DEFAULT 'applied'
                             CHECK (status IN ('applied','screening','interview','test',
                                               'offered','accepted','rejected','withdrawn')),
  interview_date TIMESTAMPTZ,
  notes          TEXT,
  reviewed_by    UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_job_applications_opening_id ON public.job_applications(opening_id);

-- Grant permissions
DO $$
BEGIN
  GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
  GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
  GRANT ALL    ON ALL TABLES IN SCHEMA public TO service_role;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'GRANT on tables/sequences skipped: %', SQLERRM;
END;
$$;

SELECT '032_tables_hr_extended: OK' AS result;
