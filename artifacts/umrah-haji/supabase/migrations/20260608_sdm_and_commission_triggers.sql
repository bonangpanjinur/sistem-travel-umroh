-- =============================================================================
-- MIGRATION: SDM Tables + Auto Commission Triggers + KTP Upload Support
-- Tanggal: 2026-06-08
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. ALTER TABLE agents — tambah kolom KTP
-- ---------------------------------------------------------------------------
ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS ktp_number      TEXT,
  ADD COLUMN IF NOT EXISTS ktp_url         TEXT,
  ADD COLUMN IF NOT EXISTS ktp_verified_at TIMESTAMPTZ;

-- ---------------------------------------------------------------------------
-- 2. ALTER TABLE training_modules — target_audience
-- ---------------------------------------------------------------------------
ALTER TABLE public.training_modules
  ADD COLUMN IF NOT EXISTS target_audience TEXT DEFAULT 'all'
    CHECK (target_audience IN ('agent','staff','all'));

-- ---------------------------------------------------------------------------
-- 3. TABLE: disciplinary_records (Surat Peringatan / SP)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.disciplinary_records (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id     UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  type            TEXT NOT NULL
    CHECK (type IN ('sp1','sp2','sp3','phk','warning','memo')),
  violation_date  DATE NOT NULL,
  description     TEXT NOT NULL,
  action_taken    TEXT,
  issued_by       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  acknowledged_at TIMESTAMPTZ,
  document_url    TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 4. TABLE: career_history (Riwayat Karir & Promosi)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.career_history (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id    UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  effective_date DATE NOT NULL,
  change_type    TEXT NOT NULL
    CHECK (change_type IN ('hire','promotion','demotion','transfer','salary_change','resign','terminate')),
  old_position   TEXT,
  new_position   TEXT,
  old_department TEXT,
  new_department TEXT,
  old_branch_id  UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  new_branch_id  UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  old_salary     NUMERIC(15,2),
  new_salary     NUMERIC(15,2),
  notes          TEXT,
  approved_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 5. TABLE: employee_contracts (Manajemen Kontrak Karyawan)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.employee_contracts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id     UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  contract_type   TEXT NOT NULL
    CHECK (contract_type IN ('pkwtt','pkwt','probation','freelance')),
  start_date      DATE NOT NULL,
  end_date        DATE,
  probation_end   DATE,
  document_url    TEXT,
  status          TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','expired','terminated','renewed')),
  reminder_sent   BOOLEAN NOT NULL DEFAULT FALSE,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 6. TABLE: work_schedules (Jadwal Kerja / Shift)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.work_schedules (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time  TIME NOT NULL,
  end_time    TIME NOT NULL,
  is_offday   BOOLEAN NOT NULL DEFAULT FALSE,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (employee_id, day_of_week)
);

-- ---------------------------------------------------------------------------
-- 7. TABLE: payroll_components (Definisi Komponen Bonus/Tunjangan/Potongan)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payroll_components (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  code       TEXT NOT NULL UNIQUE,
  type       TEXT NOT NULL CHECK (type IN ('tunjangan','bonus','potongan')),
  calc_type  TEXT NOT NULL DEFAULT 'fixed' CHECK (calc_type IN ('fixed','percentage')),
  default_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  is_taxable BOOLEAN NOT NULL DEFAULT TRUE,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 8. TABLE: employee_payroll_components (Assign komponen ke karyawan per periode)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.employee_payroll_components (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_run_id UUID REFERENCES public.payroll_runs(id) ON DELETE CASCADE,
  employee_id  UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  component_id UUID NOT NULL REFERENCES public.payroll_components(id) ON DELETE CASCADE,
  amount       NUMERIC(15,2) NOT NULL DEFAULT 0,
  notes        TEXT,
  period       TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 9. TABLE: staff_training_progress (Progress Training Staf Internal)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.staff_training_progress (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id  UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  module_id    UUID NOT NULL REFERENCES public.training_modules(id) ON DELETE CASCADE,
  status       TEXT NOT NULL DEFAULT 'not_started'
    CHECK (status IN ('not_started','in_progress','completed')),
  score        INTEGER,
  completed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (employee_id, module_id)
);

-- ---------------------------------------------------------------------------
-- 10. TABLE: training_certificates (Sertifikat setelah lulus semua modul)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.training_certificates (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id           UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  employee_id        UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  issued_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cert_url           TEXT,
  modules_completed  INTEGER NOT NULL DEFAULT 0
);

-- ---------------------------------------------------------------------------
-- 11. TABLE: job_postings (ATS — Lowongan Kerja)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.job_postings (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT NOT NULL,
  department   TEXT,
  branch_id    UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  description  TEXT,
  requirements TEXT,
  salary_min   NUMERIC(15,2),
  salary_max   NUMERIC(15,2),
  status       TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','open','closed','filled')),
  deadline     DATE,
  created_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 12. TABLE: job_applicants (ATS — Pelamar)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.job_applicants (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_posting_id UUID NOT NULL REFERENCES public.job_postings(id) ON DELETE CASCADE,
  full_name      TEXT NOT NULL,
  email          TEXT NOT NULL,
  phone          TEXT,
  cv_url         TEXT,
  cover_letter   TEXT,
  status         TEXT NOT NULL DEFAULT 'applied'
    CHECK (status IN ('applied','screening','interview','offered','hired','rejected')),
  interview_date TIMESTAMPTZ,
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 13. AUTO-COMMISSION TRIGGERS (A-01 & A-02)
--     Otomatis insert agent_commissions + branch_commissions
--     saat booking_status berubah menjadi 'confirmed'
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.auto_create_commissions()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Hanya proses jika status berubah ke 'confirmed'
  IF (NEW.booking_status = 'confirmed' AND
      (OLD.booking_status IS NULL OR OLD.booking_status <> 'confirmed')) THEN

    -- Komisi agen
    IF NEW.agent_id IS NOT NULL THEN
      INSERT INTO public.agent_commissions (
        booking_id, agent_id, commission_amount, status, created_at
      )
      SELECT
        NEW.id,
        NEW.agent_id,
        ROUND(NEW.total_price * a.commission_rate / 100, 0),
        'pending',
        NOW()
      FROM public.agents a
      WHERE a.id = NEW.agent_id
      ON CONFLICT DO NOTHING;

      -- Override komisi untuk agen induk
      INSERT INTO public.agent_override_commissions (
        booking_id, agent_id, sub_agent_id, override_percentage, override_amount, status, created_at
      )
      SELECT
        NEW.id,
        parent.id,
        sub.id,
        COALESCE(parent.commission_rate, 0) * 0.20,
        ROUND(NEW.total_price * sub.commission_rate / 100 * 0.20, 0),
        'pending',
        NOW()
      FROM public.agents sub
      JOIN public.agents parent ON parent.id = sub.parent_agent_id
      WHERE sub.id = NEW.agent_id AND sub.parent_agent_id IS NOT NULL
      ON CONFLICT DO NOTHING;

      -- Komisi cabang (2% default)
      INSERT INTO public.branch_commissions (
        booking_id, branch_id, commission_amount, commission_rate, status, created_at
      )
      SELECT
        NEW.id,
        ag.branch_id,
        ROUND(NEW.total_price * 0.02, 0),
        2.00,
        'pending',
        NOW()
      FROM public.agents ag
      WHERE ag.id = NEW.agent_id AND ag.branch_id IS NOT NULL
      ON CONFLICT DO NOTHING;
    END IF;

  END IF;
  RETURN NEW;
END;
$$;

-- Drop trigger lama jika ada
DROP TRIGGER IF EXISTS trg_auto_commission ON public.bookings;

-- Buat trigger baru
CREATE TRIGGER trg_auto_commission
  AFTER UPDATE OF booking_status ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_commissions();

-- ---------------------------------------------------------------------------
-- 14. UNIQUE CONSTRAINTS untuk ON CONFLICT (jika belum ada)
-- ---------------------------------------------------------------------------

-- agent_commissions: pastikan tidak duplikat per booking per agent
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'agent_commissions_booking_agent_unique'
    AND conrelid = 'public.agent_commissions'::regclass
  ) THEN
    ALTER TABLE public.agent_commissions
      ADD CONSTRAINT agent_commissions_booking_agent_unique
      UNIQUE (booking_id, agent_id);
  END IF;
EXCEPTION WHEN undefined_table THEN NULL;
END$$;

-- branch_commissions: pastikan tidak duplikat per booking per branch
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'branch_commissions_booking_branch_unique'
    AND conrelid = 'public.branch_commissions'::regclass
  ) THEN
    ALTER TABLE public.branch_commissions
      ADD CONSTRAINT branch_commissions_booking_branch_unique
      UNIQUE (booking_id, branch_id);
  END IF;
EXCEPTION WHEN undefined_table THEN NULL;
END$$;

-- ---------------------------------------------------------------------------
-- CATATAN PENTING:
-- Setelah menjalankan migration ini, buat Supabase Storage Bucket baru:
--   Nama bucket: "agent-ktp"
--   Public: FALSE (private)
--   Policy: allow INSERT for anon (untuk upload saat pendaftaran)
--           allow SELECT for authenticated (untuk admin view)
-- Cara: Supabase Dashboard > Storage > New Bucket
-- ---------------------------------------------------------------------------
