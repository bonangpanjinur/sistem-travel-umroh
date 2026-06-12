-- =============================================================================
-- PATCH: Fix Registrasi Pengguna Baru + Global Website Settings
--
-- Aman dijalankan di project Supabase yang SUDAH berjalan maupun yang BARU.
-- Semua statement idempotent (bisa dijalankan berkali-kali tanpa efek samping).
--
-- Masalah yang diperbaiki:
--   1. auth/v1/signup 500  — handle_new_user() sekarang tidak pernah abort signup
--   2. website_settings 404 — seed row dengan UUID yang dicari frontend
--   3. customers 500 (email/phone check) — RPC SECURITY DEFINER aman untuk anon
-- =============================================================================


-- ─── PRASYARAT: pastikan helper update_updated_at_column() ada ────────────────
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ─── 1. Robust handle_new_user() ──────────────────────────────────────────────
-- Dibungkus BEGIN/EXCEPTION agar error DB tidak pernah membatalkan auth signup.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  BEGIN
    INSERT INTO public.profiles (id, full_name, email, avatar_url)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
      NEW.email,
      NEW.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user: gagal buat profil untuk %: %', NEW.id, SQLERRM;
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ─── 2. Buat tabel website_settings jika belum ada ───────────────────────────
-- Sengaja tanpa FK ke agents/branches agar PATCH bisa jalan di DB fresh.
-- Jika tabel sudah ada, CREATE TABLE IF NOT EXISTS ini tidak melakukan apa-apa.
CREATE TABLE IF NOT EXISTS public.website_settings (
  id                 UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id           UUID,
  branch_id          UUID,
  company_name       TEXT,
  logo_url           TEXT,
  favicon_url        TEXT,
  active_theme       TEXT NOT NULL DEFAULT 'default',
  primary_color      TEXT,
  accent_color       TEXT,
  foreground_color   TEXT,
  background_color   TEXT,
  body_font          TEXT,
  heading_font       TEXT,
  footer_description TEXT,
  footer_address     TEXT,
  footer_phone       TEXT,
  footer_email       TEXT,
  footer_whatsapp    TEXT,
  footer_bottom_text TEXT,
  footer_links       JSONB,
  custom_sections    JSONB,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);

-- Index unik untuk baris global (agent_id IS NULL AND branch_id IS NULL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_website_settings_agent
  ON public.website_settings(agent_id)  WHERE agent_id  IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_website_settings_branch
  ON public.website_settings(branch_id) WHERE branch_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_website_settings_global
  ON public.website_settings((1))       WHERE agent_id IS NULL AND branch_id IS NULL;

ALTER TABLE public.website_settings ENABLE ROW LEVEL SECURITY;

-- Kolom-kolom yang ditambahkan oleh migrasi lanjutan — aman jika sudah ada
ALTER TABLE public.website_settings ADD COLUMN IF NOT EXISTS profile_photo_url  TEXT;
ALTER TABLE public.website_settings ADD COLUMN IF NOT EXISTS banner_url         TEXT;
ALTER TABLE public.website_settings ADD COLUMN IF NOT EXISTS bio                TEXT;
ALTER TABLE public.website_settings ADD COLUMN IF NOT EXISTS testimonials       JSONB DEFAULT '[]';
ALTER TABLE public.website_settings ADD COLUMN IF NOT EXISTS gallery_urls       JSONB DEFAULT '[]';
ALTER TABLE public.website_settings ADD COLUMN IF NOT EXISTS seo_title          TEXT;
ALTER TABLE public.website_settings ADD COLUMN IF NOT EXISTS seo_description    TEXT;
ALTER TABLE public.website_settings ADD COLUMN IF NOT EXISTS view_count         INTEGER DEFAULT 0;
ALTER TABLE public.website_settings ADD COLUMN IF NOT EXISTS social_youtube     TEXT;
ALTER TABLE public.website_settings ADD COLUMN IF NOT EXISTS social_tiktok      TEXT;
ALTER TABLE public.website_settings ADD COLUMN IF NOT EXISTS maps_embed_url     TEXT;
ALTER TABLE public.website_settings ADD COLUMN IF NOT EXISTS chat_bubble_color  TEXT;
ALTER TABLE public.website_settings ADD COLUMN IF NOT EXISTS layout_variant     JSONB DEFAULT '{}';
ALTER TABLE public.website_settings ADD COLUMN IF NOT EXISTS theme_overrides    JSONB DEFAULT '{}';

-- RLS policies (idempotent)
DROP POLICY IF EXISTS "admin_manage_website_settings"      ON public.website_settings;
DROP POLICY IF EXISTS "agent_manage_own_website_settings"  ON public.website_settings;
DROP POLICY IF EXISTS "branch_manage_own_website_settings" ON public.website_settings;
DROP POLICY IF EXISTS "public_read_website_settings"       ON public.website_settings;

CREATE POLICY "admin_manage_website_settings" ON public.website_settings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid() AND role IN ('super_admin','owner','admin'))
  );

CREATE POLICY "agent_manage_own_website_settings" ON public.website_settings
  FOR ALL USING (
    agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid())
  );

CREATE POLICY "branch_manage_own_website_settings" ON public.website_settings
  FOR ALL USING (
    branch_id IN (SELECT id FROM public.branches WHERE manager_user_id = auth.uid())
  );

CREATE POLICY "public_read_website_settings" ON public.website_settings
  FOR SELECT USING (TRUE);

-- Updated-at trigger
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'set_website_settings_updated_at'
      AND tgrelid = 'public.website_settings'::regclass
  ) THEN
    CREATE TRIGGER set_website_settings_updated_at
      BEFORE UPDATE ON public.website_settings
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;


-- ─── 3. Seed global row dengan UUID yang selalu dicari frontend ───────────────
-- Frontend: .eq("id", "00000000-0000-0000-0000-000000000001")
-- Migrasi lama menyisipkan row dengan UUID acak → 404. Row ini memperbaikinya.
INSERT INTO public.website_settings (
  id,
  company_name,
  active_theme,
  primary_color,
  accent_color,
  footer_description,
  footer_bottom_text
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Vinstour Travel',
  'classic',
  '#16a34a',
  '#0d9488',
  'Layanan perjalanan Umroh & Haji terpercaya dengan pengalaman lebih dari 15 tahun.',
  '© 2025 Vinstour Travel. All rights reserved.'
)
ON CONFLICT (id) DO UPDATE SET
  company_name       = COALESCE(EXCLUDED.company_name,       website_settings.company_name),
  active_theme       = COALESCE(EXCLUDED.active_theme,       website_settings.active_theme),
  primary_color      = COALESCE(EXCLUDED.primary_color,      website_settings.primary_color),
  accent_color       = COALESCE(EXCLUDED.accent_color,       website_settings.accent_color),
  footer_description = COALESCE(EXCLUDED.footer_description, website_settings.footer_description),
  updated_at         = NOW();


-- ─── 4. RPC aman untuk cek email & telepon dari form registrasi ──────────────
-- SECURITY DEFINER → bypass RLS, aman dipanggil oleh anon (belum login).
-- Kembalikan TRUE  = tersedia (belum dipakai)
-- Kembalikan FALSE = sudah terdaftar
CREATE OR REPLACE FUNCTION public.check_email_available(p_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM customers
    WHERE lower(trim(email)) = lower(trim(p_email))
    LIMIT 1
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.check_phone_available(p_phone TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_normalised TEXT;
BEGIN
  -- Normalisasi: +628xx → 08xx, 628xx → 08xx, 08xx tetap
  v_normalised :=
    CASE
      WHEN p_phone LIKE '+62%' THEN '0' || substr(trim(p_phone), 4)
      WHEN p_phone LIKE '62%'  THEN '0' || substr(trim(p_phone), 3)
      ELSE trim(p_phone)
    END;

  RETURN NOT EXISTS (
    SELECT 1 FROM customers
    WHERE trim(phone) = trim(p_phone)
       OR trim(phone) = v_normalised
    LIMIT 1
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_email_available(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_phone_available(TEXT) TO anon, authenticated;


SELECT 'PATCH berhasil — handle_new_user, website_settings, dan RPC sudah diperbaiki' AS result;
