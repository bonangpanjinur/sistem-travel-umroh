-- =============================================================================
-- v2_P07 — SDM/HR: Payroll, Cuti, Disiplin, Karir, Presensi
-- Modul : Sumber Daya Manusia
-- Aman  : CREATE TABLE IF NOT EXISTS, ADD COLUMN IF NOT EXISTS
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. PAYROLL_RECORDS — Tambah kolom pph21_amount (via INT-09)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payroll_records (
  id                  UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id         UUID    NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
  period_year         INTEGER NOT NULL,
  period_month        INTEGER NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  basic_salary        NUMERIC(15,2) NOT NULL DEFAULT 0,
  allowances          NUMERIC(15,2) NOT NULL DEFAULT 0,
  overtime_pay        NUMERIC(15,2) NOT NULL DEFAULT 0,
  bonus               NUMERIC(15,2) NOT NULL DEFAULT 0,
  deductions          NUMERIC(15,2) NOT NULL DEFAULT 0,
  bpjs_kes            NUMERIC(15,2) NOT NULL DEFAULT 0,
  bpjs_tk             NUMERIC(15,2) NOT NULL DEFAULT 0,
  pph21_amount        NUMERIC(15,2) NOT NULL DEFAULT 0,
  gross_salary        NUMERIC(15,2) GENERATED ALWAYS AS
                        (basic_salary + allowances + overtime_pay + bonus) STORED,
  net_salary          NUMERIC(15,2) GENERATED ALWAYS AS
                        (basic_salary + allowances + overtime_pay + bonus
                         - deductions - bpjs_kes - bpjs_tk - pph21_amount) STORED,
  status              TEXT    NOT NULL DEFAULT 'draft'
                              CHECK (status IN ('draft','finalized','paid')),
  payment_date        DATE,
  transfer_proof_url  TEXT,
  notes               TEXT,
  created_by          UUID    REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (employee_id, period_year, period_month)
);

-- Jika tabel sudah ada, pastikan kolom pph21_amount ada
ALTER TABLE payroll_records ADD COLUMN IF NOT EXISTS pph21_amount NUMERIC(15,2) NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_pr_employee_id ON payroll_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_pr_period      ON payroll_records(period_year, period_month);
CREATE INDEX IF NOT EXISTS idx_pr_status      ON payroll_records(status);
CREATE INDEX IF NOT EXISTS idx_pr_payment_date ON payroll_records(payment_date);

ALTER TABLE payroll_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pr_hr_manage" ON payroll_records;
DROP POLICY IF EXISTS "pr_own_read"  ON payroll_records;

CREATE POLICY "pr_hr_manage" ON payroll_records
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','hr','finance'))
  );

CREATE POLICY "pr_own_read" ON payroll_records
  FOR SELECT USING (
    employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_payroll_records_updated_at'
    AND tgrelid='payroll_records'::regclass) THEN
    CREATE TRIGGER set_payroll_records_updated_at
      BEFORE UPDATE ON payroll_records
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2. PAYROLL_COMPONENTS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payroll_components (
  id             UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  name           TEXT    NOT NULL,
  code           TEXT    NOT NULL UNIQUE,
  type           TEXT    NOT NULL CHECK (type IN ('allowance','deduction')),
  calc_type      TEXT    CHECK (calc_type IN ('fixed','percentage','formula')),
  default_amount NUMERIC(15,2) DEFAULT 0,
  formula        TEXT,
  is_active      BOOLEAN DEFAULT TRUE,
  is_taxable     BOOLEAN DEFAULT FALSE,
  description    TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE payroll_components ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pc_hr_manage" ON payroll_components;
CREATE POLICY "pc_hr_manage" ON payroll_components
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','hr','finance'))
  );

-- ---------------------------------------------------------------------------
-- 3. EMPLOYEE_PAYROLL_COMPONENTS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS employee_payroll_components (
  id           UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id  UUID    NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  component_id UUID    NOT NULL REFERENCES payroll_components(id) ON DELETE CASCADE,
  period       TEXT,
  amount       NUMERIC(15,2) NOT NULL DEFAULT 0,
  note         TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_epc_employee_id ON employee_payroll_components(employee_id);

ALTER TABLE employee_payroll_components ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "epc_hr_manage" ON employee_payroll_components;
CREATE POLICY "epc_hr_manage" ON employee_payroll_components
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','hr','finance'))
  );

-- ---------------------------------------------------------------------------
-- 4. PAYROLL_SLIPS — Slip gaji digital
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payroll_slips (
  id           UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id  UUID    NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
  period_year  INTEGER NOT NULL,
  period_month INTEGER NOT NULL,
  basic_salary NUMERIC(15,2) DEFAULT 0,
  allowances   JSONB   DEFAULT '[]',
  deductions   JSONB   DEFAULT '[]',
  gross_salary NUMERIC(15,2) DEFAULT 0,
  net_salary   NUMERIC(15,2) DEFAULT 0,
  pdf_url      TEXT,
  status       TEXT    DEFAULT 'draft'
                       CHECK (status IN ('draft','sent','confirmed')),
  sent_at      TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ps_employee_id ON payroll_slips(employee_id);

ALTER TABLE payroll_slips ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ps_hr_manage" ON payroll_slips;
DROP POLICY IF EXISTS "ps_own_read"  ON payroll_slips;

CREATE POLICY "ps_hr_manage" ON payroll_slips
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','hr','finance'))
  );

CREATE POLICY "ps_own_read" ON payroll_slips
  FOR SELECT USING (
    employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- 5. LEAVE_REQUESTS & LEAVE_QUOTAS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS leave_requests (
  id              UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id     UUID    NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  leave_type      TEXT    NOT NULL
                          CHECK (leave_type IN
                            ('annual','sick','emergency','maternity','paternity','unpaid','other')),
  start_date      DATE    NOT NULL,
  end_date        DATE    NOT NULL,
  total_days      INTEGER NOT NULL,
  reason          TEXT,
  attachment_url  TEXT,
  status          TEXT    NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending','approved','rejected','cancelled')),
  approved_by     UUID    REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at     TIMESTAMPTZ,
  rejection_notes TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_lr_employee_id ON leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_lr_status      ON leave_requests(status);

ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "lr_hr_manage" ON leave_requests;
DROP POLICY IF EXISTS "lr_own_manage" ON leave_requests;

CREATE POLICY "lr_hr_manage" ON leave_requests
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','hr','branch_manager'))
  );

CREATE POLICY "lr_own_manage" ON leave_requests
  FOR ALL USING (
    employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_leave_requests_updated_at'
    AND tgrelid='leave_requests'::regclass) THEN
    CREATE TRIGGER set_leave_requests_updated_at
      BEFORE UPDATE ON leave_requests
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS leave_quotas (
  id           UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id  UUID    NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  year         INTEGER NOT NULL,
  annual_quota INTEGER NOT NULL DEFAULT 12,
  carry_over   INTEGER NOT NULL DEFAULT 0,
  annual_used  INTEGER NOT NULL DEFAULT 0,
  sick_used    INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (employee_id, year)
);

ALTER TABLE leave_quotas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "lq_hr_manage" ON leave_quotas;
CREATE POLICY "lq_hr_manage" ON leave_quotas
  FOR ALL USING (auth.role() = 'authenticated');

-- ---------------------------------------------------------------------------
-- 6. DISCIPLINARY_RECORDS & DISCIPLINARY_LETTERS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS disciplinary_records (
  id              UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id     UUID    NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  type            TEXT    NOT NULL,
  violation_date  DATE    NOT NULL,
  description     TEXT    NOT NULL,
  action_taken    TEXT,
  witnesses       TEXT[],
  attachments     JSONB   DEFAULT '[]',
  issued_by       UUID    REFERENCES auth.users(id) ON DELETE SET NULL,
  acknowledged_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dr_employee_id ON disciplinary_records(employee_id);

ALTER TABLE disciplinary_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "dr_hr_manage" ON disciplinary_records;
CREATE POLICY "dr_hr_manage" ON disciplinary_records
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','hr'))
  );

CREATE TABLE IF NOT EXISTS disciplinary_letters (
  id              UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id     UUID    NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  letter_type     TEXT    NOT NULL CHECK (letter_type IN ('sp1','sp2','sp3','warning','termination')),
  letter_number   TEXT    NOT NULL UNIQUE,
  issued_date     DATE    NOT NULL,
  violation       TEXT    NOT NULL,
  description     TEXT,
  action_taken    TEXT,
  signed_by       UUID    REFERENCES auth.users(id) ON DELETE SET NULL,
  pdf_url         TEXT,
  status          TEXT    DEFAULT 'draft'
                          CHECK (status IN ('draft','signed','acknowledged')),
  acknowledged_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dl_employee_id ON disciplinary_letters(employee_id);

-- ---------------------------------------------------------------------------
-- 7. CAREER_HISTORY
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS career_history (
  id             UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id    UUID    NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  effective_date DATE    NOT NULL,
  change_type    TEXT    NOT NULL,
  old_position   TEXT,
  new_position   TEXT,
  old_department TEXT,
  new_department TEXT,
  old_salary     NUMERIC(15,2),
  new_salary     NUMERIC(15,2),
  old_branch_id  UUID    REFERENCES branches(id) ON DELETE SET NULL,
  new_branch_id  UUID    REFERENCES branches(id) ON DELETE SET NULL,
  reason         TEXT,
  approved_by    UUID    REFERENCES auth.users(id) ON DELETE SET NULL,
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ch_employee_id ON career_history(employee_id);

ALTER TABLE career_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ch_hr_manage" ON career_history;
CREATE POLICY "ch_hr_manage" ON career_history
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','hr'))
  );

-- ---------------------------------------------------------------------------
-- 8. PERFORMANCE_REVIEWS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS performance_reviews (
  id               UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id      UUID    NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  reviewer_id      UUID    REFERENCES employees(id) ON DELETE SET NULL,
  review_period    TEXT    NOT NULL,
  review_type      TEXT    DEFAULT 'quarterly',
  quality          NUMERIC(3,1),
  productivity     NUMERIC(3,1),
  initiative       NUMERIC(3,1),
  teamwork         NUMERIC(3,1),
  attendance_score NUMERIC(3,1),
  overall_score    NUMERIC(3,1),
  strengths        TEXT,
  improvements     TEXT,
  goals            TEXT,
  status           TEXT    DEFAULT 'draft',
  finalized_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_perf_employee_id ON performance_reviews(employee_id);

ALTER TABLE performance_reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "perf_hr_manage" ON performance_reviews;
CREATE POLICY "perf_hr_manage" ON performance_reviews
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','hr'))
  );

-- ---------------------------------------------------------------------------
-- 9. EMPLOYEE_CONTRACTS, JOB_POSTINGS, JOB_APPLICANTS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS employee_contracts (
  id            UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id   UUID    NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  contract_type TEXT    NOT NULL CHECK (contract_type IN ('pkwt','pkwtt','freelance','intern')),
  start_date    DATE    NOT NULL,
  end_date      DATE,
  probation_end DATE,
  salary        NUMERIC(15,2),
  file_url      TEXT,
  status        TEXT    DEFAULT 'active'
                        CHECK (status IN ('draft','active','expired','terminated')),
  notes         TEXT,
  signed_at     DATE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ec_employee_id ON employee_contracts(employee_id);
CREATE INDEX IF NOT EXISTS idx_ec_status      ON employee_contracts(status);

ALTER TABLE employee_contracts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ec_hr_manage" ON employee_contracts;
CREATE POLICY "ec_hr_manage" ON employee_contracts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','hr'))
  );

CREATE TABLE IF NOT EXISTS job_postings (
  id           UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id    UUID    REFERENCES branches(id) ON DELETE SET NULL,
  title        TEXT    NOT NULL,
  department   TEXT,
  description  TEXT,
  requirements TEXT,
  status       TEXT    DEFAULT 'open' CHECK (status IN ('open','closed','draft')),
  deadline     DATE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE job_postings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "jp_hr_manage" ON job_postings;
CREATE POLICY "jp_hr_manage" ON job_postings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','hr'))
  );

CREATE TABLE IF NOT EXISTS job_applicants (
  id             UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  job_posting_id UUID    REFERENCES job_postings(id) ON DELETE SET NULL,
  full_name      TEXT    NOT NULL,
  email          TEXT,
  phone          TEXT,
  cover_letter   TEXT,
  resume_url     TEXT,
  status         TEXT    DEFAULT 'new',
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ja_job_posting_id ON job_applicants(job_posting_id);

ALTER TABLE job_applicants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ja_hr_manage" ON job_applicants;
CREATE POLICY "ja_hr_manage" ON job_applicants
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','hr'))
  );

-- ---------------------------------------------------------------------------
-- 10. ATTENDANCE — Absensi manasik / keberangkatan
--     ⚠️ Kode lama memakai 'attendance_records' — view alias ada di P12
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS attendance (
  id           UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  departure_id UUID    REFERENCES departures(id)  ON DELETE SET NULL,
  customer_id  UUID    REFERENCES customers(id)   ON DELETE CASCADE,
  session_type TEXT    NOT NULL DEFAULT 'lainnya',
  session_label TEXT,
  status       TEXT    NOT NULL DEFAULT 'hadir'
                       CHECK (status IN ('hadir','absen','terlambat','izin')),
  notes        TEXT,
  recorded_by  UUID    REFERENCES profiles(id)    ON DELETE SET NULL,
  recorded_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_att_departure_id ON attendance(departure_id);
CREATE INDEX IF NOT EXISTS idx_att_customer_id  ON attendance(customer_id);

ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "att_staff_manage"  ON attendance;
DROP POLICY IF EXISTS "att_own_read"      ON attendance;

CREATE POLICY "att_staff_manage" ON attendance
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','branch_manager','operational','hr'))
  );

CREATE POLICY "att_own_read" ON attendance
  FOR SELECT USING (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  );

