-- =========================================
-- 0. EXTENSION (WAJIB untuk UUID)
-- =========================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =========================================
-- 1. FIX website_settings (TAMBAH user_id)
-- =========================================
ALTER TABLE public.website_settings
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- =========================================
-- 2. TABLE about_page_content
-- =========================================
CREATE TABLE IF NOT EXISTS public.about_page_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  settings_id UUID REFERENCES public.website_settings(id) ON DELETE CASCADE,

  mission_text TEXT,
  vision_text TEXT,
  values JSONB,
  milestones JSONB,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =========================================
-- 3. INDEX (PERFORMA)
-- =========================================
CREATE INDEX IF NOT EXISTS idx_about_settings_id 
ON public.about_page_content(settings_id);

-- =========================================
-- 4. RLS
-- =========================================
ALTER TABLE public.about_page_content ENABLE ROW LEVEL SECURITY;

-- =========================================
-- 5. DROP POLICY (BIAR GAK BENTROK)
-- =========================================
DROP POLICY IF EXISTS "Public about_page_content are viewable by everyone." ON public.about_page_content;
DROP POLICY IF EXISTS "Authenticated users can insert about_page_content." ON public.about_page_content;
DROP POLICY IF EXISTS "Authenticated users can update their own about_page_content." ON public.about_page_content;
DROP POLICY IF EXISTS "Authenticated users can delete their own about_page_content." ON public.about_page_content;

-- =========================================
-- 6. POLICIES (SUDAH FIX OWNERSHIP)
-- =========================================

-- Public read
CREATE POLICY "Public read about content"
ON public.about_page_content
FOR SELECT
USING (true);

-- Insert (harus sesuai owner website_settings)
CREATE POLICY "Insert about content"
ON public.about_page_content
FOR INSERT
WITH CHECK (
  auth.uid() = (
    SELECT ws.user_id 
    FROM public.website_settings ws 
    WHERE ws.id = settings_id
  )
);

-- Update (owner only)
CREATE POLICY "Update own about content"
ON public.about_page_content
FOR UPDATE
USING (
  auth.uid() = (
    SELECT ws.user_id 
    FROM public.website_settings ws 
    WHERE ws.id = settings_id
  )
);

-- Delete (owner only)
CREATE POLICY "Delete own about content"
ON public.about_page_content
FOR DELETE
USING (
  auth.uid() = (
    SELECT ws.user_id 
    FROM public.website_settings ws 
    WHERE ws.id = settings_id
  )
);

-- =========================================
-- 7. TRIGGER updated_at
-- =========================================
DROP TRIGGER IF EXISTS update_about_page_updated_at ON public.about_page_content;

CREATE TRIGGER update_about_page_updated_at
BEFORE UPDATE ON public.about_page_content
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
