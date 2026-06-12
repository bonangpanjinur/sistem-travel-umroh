-- ═══════════════════════════════════════════════════════════════════════════
-- FASE 33 — Fix Registration Flow + Global Website Settings Seed
--
-- 1. Robust handle_new_user() — exception handler so auth signup never 500s
-- 2. Seed global website_settings row with hardcoded UUID that frontend expects
-- 3. Safe SECURITY DEFINER RPCs for email/phone availability check (no anon RLS issues)
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. Robust handle_new_user ────────────────────────────────────────────────
-- Wrap INSERT in BEGIN/EXCEPTION so a trigger error never aborts auth signup
CREATE OR REPLACE FUNCTION handle_new_user()
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
    -- Log the warning but never abort the auth signup
    RAISE WARNING 'handle_new_user: failed to create profile for %: %', NEW.id, SQLERRM;
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recreate trigger (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─── 2. Seed global website_settings with the UUID the frontend expects ───────
-- Frontend always queries: .eq("id", "00000000-0000-0000-0000-000000000001")
-- fase18 inserts with a random UUID, causing a 404. This seeds the specific row.
INSERT INTO public.website_settings (
  id,
  company_name,
  active_theme,
  template,
  primary_color,
  secondary_color,
  accent_color,
  background_color,
  foreground_color,
  heading_font,
  body_font,
  tagline,
  footer_description,
  footer_bottom_text,
  meta_title,
  meta_description,
  hero_title,
  hero_subtitle,
  hero_cta_text,
  hero_cta_link,
  hero_display_mode,
  featured_packages_count,
  package_card_layout,
  package_card_image_ratio,
  package_card_show_airline,
  package_card_show_hotel,
  package_card_show_duration,
  package_card_show_departure
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Vinstour Travel',
  'classic',
  'classic',
  '160 84% 25%',
  '160 20% 96%',
  '45 93% 47%',
  '0 0% 100%',
  '160 50% 5%',
  'Plus Jakarta Sans',
  'Inter',
  'Perjalanan Suci Anda',
  'Layanan perjalanan Umroh & Haji terpercaya dengan pengalaman lebih dari 15 tahun.',
  '© 2025 Vinstour Travel. All rights reserved.',
  'Vinstour Travel - Perjalanan Umroh Terpercaya',
  'Layanan perjalanan umroh berkualitas dengan harga terjangkau',
  'Perjalanan Umroh Impian Anda',
  'Nikmati pengalaman spiritual yang tak terlupakan',
  'Pesan Sekarang',
  '/packages',
  'both',
  6,
  'modern',
  '16/10',
  true,
  true,
  true,
  true
)
ON CONFLICT (id) DO UPDATE SET
  company_name  = COALESCE(EXCLUDED.company_name, website_settings.company_name),
  active_theme  = COALESCE(EXCLUDED.active_theme,  website_settings.active_theme),
  template      = COALESCE(EXCLUDED.template,      website_settings.template),
  updated_at    = NOW();

-- ─── 3. Safe email / phone availability RPCs ──────────────────────────────────
-- Called by the registration form as anon — bypasses RLS entirely via SECURITY DEFINER
-- Returns TRUE when the value is NOT taken (safe to register), FALSE when already used.

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
  -- Normalise variants: +628xx → 08xx, 628xx → 08xx, keep 08xx as-is
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

-- Grant execute to both anon (unauthenticated visitors) and authenticated users
GRANT EXECUTE ON FUNCTION public.check_email_available(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_phone_available(TEXT) TO anon, authenticated;

SELECT 'Fase 33 — fix register + settings seed installed' AS result;
