
-- Training Modules
CREATE TABLE IF NOT EXISTS public.training_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'lainnya',
  content_type text NOT NULL DEFAULT 'text',  -- video | pdf | text
  content_url text,
  content_text text,
  order_index int NOT NULL DEFAULT 0,
  is_mandatory boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.training_quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid NOT NULL REFERENCES public.training_modules(id) ON DELETE CASCADE,
  question text NOT NULL,
  options jsonb NOT NULL,  -- [{text, is_correct}]
  order_index int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_training_quizzes_module ON public.training_quizzes(module_id);

CREATE TABLE IF NOT EXISTS public.agent_training_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  module_id uuid NOT NULL REFERENCES public.training_modules(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'in_progress', -- in_progress | completed | failed
  quiz_score int,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (agent_id, module_id)
);
CREATE INDEX IF NOT EXISTS idx_agent_training_progress_agent ON public.agent_training_progress(agent_id);

-- updated_at trigger reuse
DROP TRIGGER IF EXISTS trg_training_modules_updated ON public.training_modules;
CREATE TRIGGER trg_training_modules_updated BEFORE UPDATE ON public.training_modules
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_agent_training_progress_updated ON public.agent_training_progress;
CREATE TRIGGER trg_agent_training_progress_updated BEFORE UPDATE ON public.agent_training_progress
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.training_modules        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_quizzes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_training_progress ENABLE ROW LEVEL SECURITY;

-- Read: any authenticated user can read active modules + their quizzes.
CREATE POLICY "auth read active modules" ON public.training_modules
FOR SELECT TO authenticated USING (is_active = true OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "auth read quizzes" ON public.training_quizzes
FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.training_modules m
    WHERE m.id = training_quizzes.module_id AND (m.is_active OR public.has_role(auth.uid(),'super_admin')))
);

-- Manage: super_admin / owner / branch_manager
CREATE POLICY "admin manage modules" ON public.training_modules
FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'owner') OR public.has_role(auth.uid(),'branch_manager'))
WITH CHECK (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'owner') OR public.has_role(auth.uid(),'branch_manager'));

CREATE POLICY "admin manage quizzes" ON public.training_quizzes
FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'owner') OR public.has_role(auth.uid(),'branch_manager'))
WITH CHECK (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'owner') OR public.has_role(auth.uid(),'branch_manager'));

-- Progress: agent can read/write own; admins can read all.
CREATE POLICY "agent read own progress" ON public.agent_training_progress
FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.agents a WHERE a.id = agent_training_progress.agent_id AND a.user_id = auth.uid())
  OR public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'owner') OR public.has_role(auth.uid(),'branch_manager')
);

CREATE POLICY "agent insert own progress" ON public.agent_training_progress
FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.agents a WHERE a.id = agent_training_progress.agent_id AND a.user_id = auth.uid())
);

CREATE POLICY "agent update own progress" ON public.agent_training_progress
FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.agents a WHERE a.id = agent_training_progress.agent_id AND a.user_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.agents a WHERE a.id = agent_training_progress.agent_id AND a.user_id = auth.uid())
);

-- Seed
INSERT INTO public.training_modules (title, description, category, content_type, content_text, order_index, is_mandatory)
VALUES
  ('Product Knowledge Umroh', 'Pengenalan produk paket Umroh: tipe paket, hotel, fasilitas, dan komponen harga.', 'product_knowledge', 'text',
   'Modul ini membahas struktur paket Umroh: durasi, hotel di Makkah/Madinah, maskapai, perlengkapan, manasik, dan komponen biaya. Pelajari perbedaan paket Hemat, Reguler, dan VIP serta cara menjelaskan keunggulan tiap paket kepada calon jamaah.',
   1, true),
  ('Script Penjualan Profesional', 'Teknik komunikasi & closing untuk calon jamaah.', 'script_penjualan', 'text',
   '1) Pembukaan: salam + identifikasi kebutuhan. 2) Discovery: tanyakan tanggal target, budget, dan komposisi keluarga. 3) Presentasi paket sesuai profile. 4) Handling objection harga, jadwal, dokumen. 5) Closing dengan urgency (kuota terbatas, harga naik). 6) Follow-up via WhatsApp dalam 24 jam.',
   2, true),
  ('SOP Pendaftaran Jamaah', 'Standard Operating Procedure registrasi & dokumen.', 'sop', 'text',
   'Alur: Pendaftaran → Booking → DP → Upload KTP & Paspor → Validasi dokumen → Pelunasan → Manasik → Keberangkatan. Pastikan paspor berlaku ≥ 6 bulan dari tanggal keberangkatan. Upload KTP dan paspor sebelum H-45.',
   3, false)
ON CONFLICT DO NOTHING;

-- Seed quiz for module 1 (Product Knowledge)
INSERT INTO public.training_quizzes (module_id, question, options, order_index)
SELECT m.id,
       'Berapa lama validitas paspor minimum sebelum tanggal keberangkatan Umroh?',
       '[{"text":"3 bulan","is_correct":false},{"text":"6 bulan","is_correct":true},{"text":"1 tahun","is_correct":false},{"text":"Tidak ada syarat","is_correct":false}]'::jsonb,
       1
FROM public.training_modules m WHERE m.title = 'Product Knowledge Umroh'
ON CONFLICT DO NOTHING;

INSERT INTO public.training_quizzes (module_id, question, options, order_index)
SELECT m.id,
       'Komponen yang TIDAK termasuk dalam paket Umroh standar adalah:',
       '[{"text":"Tiket pesawat PP","is_correct":false},{"text":"Hotel di Makkah & Madinah","is_correct":false},{"text":"Pengurusan visa","is_correct":false},{"text":"Oleh-oleh pribadi","is_correct":true}]'::jsonb,
       2
FROM public.training_modules m WHERE m.title = 'Product Knowledge Umroh'
ON CONFLICT DO NOTHING;
