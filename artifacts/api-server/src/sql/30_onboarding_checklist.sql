-- Migration 030: onboarding_templates + onboarding_template_items + employee_onboarding_tasks
-- Fitur: Onboarding Checklist untuk karyawan baru

-- ── onboarding_templates: master template per kategori ───────────────────────
CREATE TABLE IF NOT EXISTS public.onboarding_templates (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  description TEXT,
  category    TEXT        NOT NULL DEFAULT 'general'
                CHECK (category IN ('general','staff','agent','manager','it')),
  is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── onboarding_template_items: item/task dalam template ──────────────────────
CREATE TABLE IF NOT EXISTS public.onboarding_template_items (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id  UUID        NOT NULL REFERENCES public.onboarding_templates(id) ON DELETE CASCADE,
  title        TEXT        NOT NULL,
  description  TEXT,
  category     TEXT        NOT NULL DEFAULT 'orientasi'
                 CHECK (category IN ('orientasi','administrasi','akses_sistem','pelatihan','lainnya')),
  due_days     INT         NOT NULL DEFAULT 1,   -- hari ke-N dari tanggal mulai
  is_required  BOOLEAN     NOT NULL DEFAULT TRUE,
  sort_order   INT         NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_template_items_template ON public.onboarding_template_items(template_id);

-- ── employee_onboarding_tasks: checklist per karyawan ────────────────────────
CREATE TABLE IF NOT EXISTS public.employee_onboarding_tasks (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id     UUID        NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  template_item_id UUID       REFERENCES public.onboarding_template_items(id) ON DELETE SET NULL,
  title           TEXT        NOT NULL,
  description     TEXT,
  category        TEXT        NOT NULL DEFAULT 'orientasi',
  due_date        DATE,
  status          TEXT        NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','in_progress','done','skipped')),
  completed_at    TIMESTAMPTZ,
  completed_by    UUID        REFERENCES public.employees(id) ON DELETE SET NULL,
  notes           TEXT,
  sort_order      INT         NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_onboarding_tasks_employee ON public.employee_onboarding_tasks(employee_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_tasks_status   ON public.employee_onboarding_tasks(status);

-- Auto-update timestamps
CREATE OR REPLACE FUNCTION public.set_onboarding_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := NOW();
  IF NEW.status = 'done' AND OLD.status != 'done' THEN
    NEW.completed_at := NOW();
  ELSIF NEW.status != 'done' THEN
    NEW.completed_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_onboarding_tasks_updated ON public.employee_onboarding_tasks;
CREATE TRIGGER trg_onboarding_tasks_updated
  BEFORE UPDATE ON public.employee_onboarding_tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_onboarding_updated_at();

-- RLS
ALTER TABLE public.onboarding_templates       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_template_items  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_onboarding_tasks  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "onboarding_templates_all"      ON public.onboarding_templates;
DROP POLICY IF EXISTS "onboarding_template_items_all" ON public.onboarding_template_items;
DROP POLICY IF EXISTS "employee_onboarding_tasks_all" ON public.employee_onboarding_tasks;

CREATE POLICY "onboarding_templates_all"      ON public.onboarding_templates      USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "onboarding_template_items_all" ON public.onboarding_template_items USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "employee_onboarding_tasks_all" ON public.employee_onboarding_tasks USING (TRUE) WITH CHECK (TRUE);

-- Seed: default template umum
INSERT INTO public.onboarding_templates (id, name, description, category)
VALUES (
  '00000000-0000-0000-0000-000000000030',
  'Onboarding Umum',
  'Template standar untuk semua karyawan baru',
  'general'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.onboarding_template_items (template_id, title, description, category, due_days, sort_order) VALUES
  ('00000000-0000-0000-0000-000000000030', 'Orientasi perusahaan & nilai-nilai',       'Pengenalan visi, misi, dan budaya kerja Vinstour',            'orientasi',     1, 10),
  ('00000000-0000-0000-0000-000000000030', 'Penandatanganan kontrak kerja',             'Penandatanganan dokumen kontrak dan PKWT/PKWTT',              'administrasi',  1, 20),
  ('00000000-0000-0000-0000-000000000030', 'Pengisian data kepegawaian',                'Formulir data diri, BPJS, rekening gaji, dll.',               'administrasi',  2, 30),
  ('00000000-0000-0000-0000-000000000030', 'Setup akun email & sistem',                 'Pembuatan akun email kantor dan akses sistem portal',          'akses_sistem',  3, 40),
  ('00000000-0000-0000-0000-000000000030', 'Pengenalan tim & departemen',               'Perkenalan dengan anggota tim dan struktur organisasi',        'orientasi',     3, 50),
  ('00000000-0000-0000-0000-000000000030', 'Pelatihan produk Umroh & Haji',             'Materi pengetahuan paket perjalanan ibadah',                  'pelatihan',     7, 60),
  ('00000000-0000-0000-0000-000000000030', 'Pelatihan penggunaan aplikasi portal',      'Cara penggunaan sistem manajemen dan CRM internal',           'pelatihan',     7, 70),
  ('00000000-0000-0000-0000-000000000030', 'Evaluasi masa probasi (30 hari)',           'Review kinerja di akhir bulan pertama',                       'lainnya',      30, 80)
ON CONFLICT DO NOTHING;
