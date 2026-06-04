
CREATE TABLE IF NOT EXISTS public.ibadah_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ibadah_type TEXT NOT NULL,
  ibadah_date DATE NOT NULL DEFAULT CURRENT_DATE,
  count INTEGER NOT NULL DEFAULT 1,
  target INTEGER,
  notes TEXT,
  completed BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, ibadah_type, ibadah_date)
);

CREATE INDEX IF NOT EXISTS idx_ibadah_progress_user_date ON public.ibadah_progress(user_id, ibadah_date DESC);

ALTER TABLE public.ibadah_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own ibadah progress"
  ON public.ibadah_progress
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_ibadah_progress_updated_at
  BEFORE UPDATE ON public.ibadah_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
