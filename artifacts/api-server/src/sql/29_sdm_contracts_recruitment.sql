-- Migration 029: employee_contracts + job_postings + job_applicants
-- SDM-2-02: Manajemen Kontrak Karyawan
-- SDM-3-01: ATS / Rekrutmen

-- ── employee_contracts: satu baris per kontrak karyawan ──────────────────────
CREATE TABLE IF NOT EXISTS public.employee_contracts (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id       UUID        NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  contract_type     TEXT        NOT NULL CHECK (contract_type IN ('pkwtt','pkwt','probation','freelance')) DEFAULT 'pkwt',
  start_date        DATE        NOT NULL,
  end_date          DATE,
  probation_end     DATE,
  document_url      TEXT,
  status            TEXT        NOT NULL CHECK (status IN ('active','expired','terminated','renewed')) DEFAULT 'active',
  reminder_sent     BOOLEAN     NOT NULL DEFAULT FALSE,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_employee_contracts_employee ON public.employee_contracts(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_contracts_status ON public.employee_contracts(status);
CREATE INDEX IF NOT EXISTS idx_employee_contracts_end_date ON public.employee_contracts(end_date);

-- Auto-expire contracts past end_date
CREATE OR REPLACE FUNCTION public.auto_expire_contracts()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.end_date IS NOT NULL AND NEW.end_date < CURRENT_DATE AND NEW.status = 'active' THEN
    NEW.status := 'expired';
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_expire_contracts ON public.employee_contracts;
CREATE TRIGGER trg_auto_expire_contracts
  BEFORE INSERT OR UPDATE ON public.employee_contracts
  FOR EACH ROW EXECUTE FUNCTION public.auto_expire_contracts();

-- RLS
ALTER TABLE public.employee_contracts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "employee_contracts_admin" ON public.employee_contracts;
CREATE POLICY "employee_contracts_admin" ON public.employee_contracts
  USING (TRUE) WITH CHECK (TRUE);

-- ── job_postings: satu baris per lowongan kerja ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.job_postings (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id     UUID        REFERENCES public.branches(id) ON DELETE SET NULL,
  title         TEXT        NOT NULL,
  department    TEXT,
  description   TEXT,
  requirements  TEXT,
  salary_min    NUMERIC(15,2),
  salary_max    NUMERIC(15,2),
  deadline      DATE,
  status        TEXT        NOT NULL CHECK (status IN ('draft','open','closed','filled')) DEFAULT 'draft',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_postings_status ON public.job_postings(status);
CREATE INDEX IF NOT EXISTS idx_job_postings_branch ON public.job_postings(branch_id);

ALTER TABLE public.job_postings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "job_postings_admin" ON public.job_postings;
CREATE POLICY "job_postings_admin" ON public.job_postings
  USING (TRUE) WITH CHECK (TRUE);

-- ── job_applicants: satu baris per pelamar per lowongan ──────────────────────
CREATE TABLE IF NOT EXISTS public.job_applicants (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  job_posting_id   UUID        NOT NULL REFERENCES public.job_postings(id) ON DELETE CASCADE,
  full_name        TEXT        NOT NULL,
  email            TEXT,
  phone            TEXT,
  cover_letter     TEXT,
  status           TEXT        NOT NULL CHECK (status IN ('applied','screening','interview','offered','hired','rejected')) DEFAULT 'applied',
  interview_date   TIMESTAMPTZ,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_applicants_posting ON public.job_applicants(job_posting_id);
CREATE INDEX IF NOT EXISTS idx_job_applicants_status ON public.job_applicants(status);

ALTER TABLE public.job_applicants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "job_applicants_admin" ON public.job_applicants;
CREATE POLICY "job_applicants_admin" ON public.job_applicants
  USING (TRUE) WITH CHECK (TRUE);

-- ── training_modules: tambah kolom target_audience jika belum ada ──────────────
ALTER TABLE public.training_modules ADD COLUMN IF NOT EXISTS target_audience TEXT DEFAULT 'all' CHECK (target_audience IN ('all','agent','staff'));
