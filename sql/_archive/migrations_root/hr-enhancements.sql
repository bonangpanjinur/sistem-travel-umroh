-- HR Enhancements Migration
-- Menambahkan tabel untuk penggajian, cuti, dan penilaian kinerja

-- ─── PAYROLL RECORDS ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payroll_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  period_year INTEGER NOT NULL,
  period_month INTEGER NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  basic_salary NUMERIC(15,2) NOT NULL DEFAULT 0,
  allowances NUMERIC(15,2) NOT NULL DEFAULT 0,
  overtime_pay NUMERIC(15,2) NOT NULL DEFAULT 0,
  bonus NUMERIC(15,2) NOT NULL DEFAULT 0,
  deductions NUMERIC(15,2) NOT NULL DEFAULT 0,
  bpjs_kes_employee NUMERIC(15,2) NOT NULL DEFAULT 0,
  bpjs_kes_employer NUMERIC(15,2) NOT NULL DEFAULT 0,
  bpjs_tk_employee NUMERIC(15,2) NOT NULL DEFAULT 0,
  bpjs_tk_employer NUMERIC(15,2) NOT NULL DEFAULT 0,
  tax_pph21 NUMERIC(15,2) NOT NULL DEFAULT 0,
  net_salary NUMERIC(15,2) NOT NULL DEFAULT 0,
  working_days INTEGER DEFAULT 0,
  present_days INTEGER DEFAULT 0,
  absent_days INTEGER DEFAULT 0,
  late_days INTEGER DEFAULT 0,
  overtime_hours NUMERIC(5,2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved','paid')),
  notes TEXT,
  paid_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES auth.users(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (employee_id, period_year, period_month)
);

CREATE INDEX IF NOT EXISTS idx_payroll_employee_id ON payroll_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_period ON payroll_records(period_year, period_month);
CREATE INDEX IF NOT EXISTS idx_payroll_status ON payroll_records(status);

ALTER TABLE payroll_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hr_can_manage_payroll" ON payroll_records FOR ALL
  USING (auth.uid() IN (SELECT user_id FROM user_roles WHERE role IN ('super_admin','owner','branch_manager','finance')));


-- ─── LEAVE REQUESTS (PENGAJUAN CUTI) ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  leave_type TEXT NOT NULL DEFAULT 'annual' CHECK (leave_type IN ('annual','sick','maternity','paternity','emergency','unpaid','other')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_days INTEGER GENERATED ALWAYS AS (end_date - start_date + 1) STORED,
  reason TEXT NOT NULL,
  attachment_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','cancelled')),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leave_employee_id ON leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_status ON leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_leave_dates ON leave_requests(start_date, end_date);

ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;

-- Karyawan bisa lihat dan buat cuti milik sendiri
CREATE POLICY "employee_can_view_own_leaves" ON leave_requests FOR SELECT
  USING (employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid()));

CREATE POLICY "employee_can_create_leave" ON leave_requests FOR INSERT
  WITH CHECK (employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid()));

-- HR/Admin bisa manage semua cuti
CREATE POLICY "hr_can_manage_leaves" ON leave_requests FOR ALL
  USING (auth.uid() IN (SELECT user_id FROM user_roles WHERE role IN ('super_admin','owner','branch_manager')));


-- ─── LEAVE QUOTAS (KUOTA CUTI) ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leave_quotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  annual_quota INTEGER NOT NULL DEFAULT 12,
  annual_used INTEGER NOT NULL DEFAULT 0,
  sick_used INTEGER NOT NULL DEFAULT 0,
  carry_over INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (employee_id, year)
);

ALTER TABLE leave_quotas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hr_can_manage_leave_quotas" ON leave_quotas FOR ALL
  USING (auth.uid() IN (SELECT user_id FROM user_roles WHERE role IN ('super_admin','owner','branch_manager','finance')));


-- ─── PERFORMANCE REVIEWS (PENILAIAN KINERJA) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS performance_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  reviewer_id UUID REFERENCES auth.users(id),
  review_period TEXT NOT NULL, -- e.g. '2025-Q1', '2025-H1', '2025'
  review_type TEXT NOT NULL DEFAULT 'quarterly' CHECK (review_type IN ('monthly','quarterly','semi_annual','annual')),
  -- Scoring dimensions (1-5)
  score_quality NUMERIC(3,1) CHECK (score_quality BETWEEN 1 AND 5),
  score_productivity NUMERIC(3,1) CHECK (score_productivity BETWEEN 1 AND 5),
  score_initiative NUMERIC(3,1) CHECK (score_initiative BETWEEN 1 AND 5),
  score_teamwork NUMERIC(3,1) CHECK (score_teamwork BETWEEN 1 AND 5),
  score_attendance NUMERIC(3,1) CHECK (score_attendance BETWEEN 1 AND 5),
  overall_score NUMERIC(3,1) GENERATED ALWAYS AS (
    (COALESCE(score_quality,0) + COALESCE(score_productivity,0) + COALESCE(score_initiative,0) + COALESCE(score_teamwork,0) + COALESCE(score_attendance,0)) / 5.0
  ) STORED,
  grade TEXT, -- A, B, C, D, E
  strengths TEXT,
  improvements TEXT,
  goals TEXT,
  comments TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','acknowledged')),
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_perf_employee_id ON performance_reviews(employee_id);
CREATE INDEX IF NOT EXISTS idx_perf_period ON performance_reviews(review_period);

ALTER TABLE performance_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hr_can_manage_performance" ON performance_reviews FOR ALL
  USING (auth.uid() IN (SELECT user_id FROM user_roles WHERE role IN ('super_admin','owner','branch_manager')));

-- Karyawan bisa lihat review mereka sendiri
CREATE POLICY "employee_can_view_own_review" ON performance_reviews FOR SELECT
  USING (employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid()));


-- ─── EMPLOYEE SALARY CONFIG ────────────────────────────────────────────────────
ALTER TABLE employees ADD COLUMN IF NOT EXISTS basic_salary NUMERIC(15,2) DEFAULT 0;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS allowances JSONB DEFAULT '{}';
ALTER TABLE employees ADD COLUMN IF NOT EXISTS bank_name TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS bank_account_number TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS bank_account_name TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS tax_id TEXT; -- NPWP
ALTER TABLE employees ADD COLUMN IF NOT EXISTS bpjs_kes_number TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS bpjs_tk_number TEXT;
