-- =============================================================================
-- VINSTOUR TRAVEL PORTAL — Clean Migration Chain
-- FILE 003: User, Organisation & Branch Tables
--   branches, agents, muthawifs, employees, website_settings,
--   membership_plans, agent_commission_tiers, faqs, testimonials,
--   contact_page_content, gallery_items, package_labels
-- Run AFTER 002. Idempotent — IF NOT EXISTS throughout.
-- RLS policies: see 009_rls_policies.sql
-- Triggers:     see 008_triggers.sql
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. BRANCHES — Regional office / branch units
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.branches (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT        NOT NULL,
  code             TEXT        UNIQUE,
  slug             TEXT        UNIQUE,
  address          TEXT,
  city             TEXT,
  province         TEXT,
  phone            TEXT,
  email            TEXT,
  manager_id       UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_active        BOOLEAN     NOT NULL DEFAULT TRUE,
  logo_url         TEXT,
  description      TEXT,
  meta_data        JSONB,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 2. AGENTS — Travel agents / mitra kerjasama
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agents (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  branch_id        UUID        REFERENCES public.branches(id) ON DELETE SET NULL,
  agent_code       TEXT        UNIQUE,
  slug             TEXT        UNIQUE,
  company_name     TEXT        NOT NULL,
  pic_name         TEXT,
  phone            TEXT,
  email            TEXT,
  address          TEXT,
  city             TEXT,
  province         TEXT,
  status           TEXT        NOT NULL DEFAULT 'active'
                               CHECK (status IN ('active','inactive','suspended','pending')),
  commission_rate  NUMERIC     NOT NULL DEFAULT 0,
  plan_type        TEXT        DEFAULT 'silver'
                               CHECK (plan_type IN ('silver','gold','platinum')),
  max_sub_agents   INTEGER,
  logo_url         TEXT,
  website_url      TEXT,
  notes            TEXT,
  meta_data        JSONB,
  joined_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 3. MUTHAWIFS — Tour guide / muthawif assignment pool
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.muthawifs (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  branch_id        UUID        REFERENCES public.branches(id) ON DELETE SET NULL,
  full_name        TEXT        NOT NULL,
  phone            TEXT,
  email            TEXT,
  nik              TEXT,
  gender           TEXT        CHECK (gender IN ('male','female')),
  specialization   TEXT,
  languages        TEXT[],
  photo_url        TEXT,
  certification_no TEXT,
  is_available     BOOLEAN     NOT NULL DEFAULT TRUE,
  is_active        BOOLEAN     NOT NULL DEFAULT TRUE,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.muthawifs ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 4. EMPLOYEES — Internal staff members
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.employees (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  branch_id         UUID        REFERENCES public.branches(id) ON DELETE SET NULL,
  employee_code     TEXT        UNIQUE,
  full_name         TEXT        NOT NULL,
  email             TEXT,
  phone             TEXT,
  nik               TEXT,
  gender            TEXT        CHECK (gender IN ('male','female')),
  birth_date        DATE,
  address           TEXT,
  position          TEXT,
  department        TEXT,
  employment_type   TEXT        NOT NULL DEFAULT 'permanent'
                                CHECK (employment_type IN ('permanent','contract','part_time','intern')),
  status            TEXT        NOT NULL DEFAULT 'active'
                                CHECK (status IN ('active','inactive','on_leave','terminated')),
  join_date         DATE,
  resign_date       DATE,
  base_salary       NUMERIC     NOT NULL DEFAULT 0,
  bank_name         TEXT,
  bank_account_no   TEXT,
  bank_account_name TEXT,
  photo_url         TEXT,
  notes             TEXT,
  meta_data         JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 5. WEBSITE_SETTINGS — Per-agent / per-branch website customization
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.website_settings (
  id                          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id                    UUID        REFERENCES public.agents(id) ON DELETE CASCADE,
  branch_id                   UUID        REFERENCES public.branches(id) ON DELETE CASCADE,
  company_name                TEXT,
  active_theme                TEXT        NOT NULL DEFAULT 'classic',
  template                    TEXT        NOT NULL DEFAULT 'classic',
  primary_color               TEXT        DEFAULT '160 84% 25%',
  secondary_color             TEXT        DEFAULT '160 20% 96%',
  accent_color                TEXT        DEFAULT '45 93% 47%',
  background_color            TEXT        DEFAULT '0 0% 100%',
  foreground_color            TEXT        DEFAULT '160 50% 5%',
  heading_font                TEXT        DEFAULT 'Plus Jakarta Sans',
  body_font                   TEXT        DEFAULT 'Inter',
  logo_url                    TEXT,
  favicon_url                 TEXT,
  tagline                     TEXT,
  footer_description          TEXT,
  footer_bottom_text          TEXT,
  meta_title                  TEXT,
  meta_description            TEXT,
  hero_title                  TEXT,
  hero_subtitle               TEXT,
  hero_cta_text               TEXT        DEFAULT 'Pesan Sekarang',
  hero_cta_link               TEXT        DEFAULT '/packages',
  hero_display_mode           TEXT        DEFAULT 'both',
  hero_image_url              TEXT,
  hero_video_url              TEXT,
  featured_packages_count     INTEGER     DEFAULT 6,
  package_card_layout         TEXT        DEFAULT 'modern',
  package_card_image_ratio    TEXT        DEFAULT '16/10',
  package_card_show_airline   BOOLEAN     DEFAULT TRUE,
  package_card_show_hotel     BOOLEAN     DEFAULT TRUE,
  package_card_show_duration  BOOLEAN     DEFAULT TRUE,
  package_card_show_departure BOOLEAN     DEFAULT TRUE,
  social_links                JSONB,
  contact_info                JSONB,
  custom_css                  TEXT,
  custom_js                   TEXT,
  view_count                  INTEGER     NOT NULL DEFAULT 0,
  is_published                BOOLEAN     NOT NULL DEFAULT FALSE,
  published_at                TIMESTAMPTZ,
  custom_domain               TEXT,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.website_settings ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 6. MEMBERSHIP_PLANS — Subscription plans for agents and branches
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.membership_plans (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT        NOT NULL,
  plan_type        TEXT        NOT NULL DEFAULT 'agent'
                               CHECK (plan_type IN ('agent','branch')),
  price_monthly    NUMERIC,
  price_yearly     NUMERIC,
  max_sub_agents   INTEGER,
  commission_rate  NUMERIC     NOT NULL DEFAULT 0,
  description      TEXT,
  features         JSONB,
  is_active        BOOLEAN     NOT NULL DEFAULT TRUE,
  sort_order       INTEGER     NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.membership_plans ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 7. AGENT_COMMISSION_TIERS — Tiered commission brackets per agent
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agent_commission_tiers (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id         UUID        NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  tier_name        TEXT        NOT NULL,
  min_bookings     INTEGER     NOT NULL DEFAULT 0,
  max_bookings     INTEGER,
  commission_rate  NUMERIC     NOT NULL DEFAULT 0,
  bonus_amount     NUMERIC     NOT NULL DEFAULT 0,
  is_active        BOOLEAN     NOT NULL DEFAULT TRUE,
  valid_from       DATE,
  valid_until      DATE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.agent_commission_tiers ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 8. FAQS — Frequently asked questions for public website
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.faqs (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  question     TEXT        NOT NULL,
  answer       TEXT        NOT NULL,
  category     TEXT,
  sort_order   INTEGER     NOT NULL DEFAULT 0,
  is_published BOOLEAN     NOT NULL DEFAULT TRUE,
  created_by   UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 9. TESTIMONIALS — Customer testimonials / reviews for website
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.testimonials (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name    TEXT        NOT NULL,
  city         TEXT,
  photo_url    TEXT,
  content      TEXT        NOT NULL,
  rating       INTEGER     NOT NULL DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
  package_name TEXT,
  is_published BOOLEAN     NOT NULL DEFAULT FALSE,
  sort_order   INTEGER     NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 10. CONTACT_PAGE_CONTENT — CMS content for the contact page
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.contact_page_content (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  hero_title          TEXT        DEFAULT 'Hubungi Kami',
  hero_subtitle       TEXT,
  form_title          TEXT        DEFAULT 'Kirim Pesan',
  operating_hours     JSONB,
  address_lines       TEXT[],
  phone_numbers       TEXT[],
  emails              TEXT[],
  google_maps_embed   TEXT,
  whatsapp_number     TEXT,
  whatsapp_message    TEXT,
  extra_content       JSONB,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.contact_page_content ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 11. GALLERY_ITEMS — Image gallery for website
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.gallery_items (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT,
  caption      TEXT,
  image_url    TEXT        NOT NULL,
  category     TEXT,
  sort_order   INTEGER     NOT NULL DEFAULT 0,
  is_published BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.gallery_items ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 12. PACKAGE_LABELS — Custom labels / badges for packages
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.package_labels (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT        NOT NULL,
  color      TEXT        NOT NULL DEFAULT '#22c55e',
  text_color TEXT        NOT NULL DEFAULT '#ffffff',
  icon       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.package_labels ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 13. PACKAGE_GROUPS — Package grouping / category tags
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.package_groups (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  slug        TEXT        UNIQUE,
  description TEXT,
  icon        TEXT,
  sort_order  INTEGER     NOT NULL DEFAULT 0,
  is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.package_groups ENABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL    ON ALL TABLES IN SCHEMA public TO service_role;

SELECT '003_tables_users: OK' AS result;
