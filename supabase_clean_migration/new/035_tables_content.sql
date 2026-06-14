-- =============================================================================
-- VINSTOUR TRAVEL PORTAL — Clean Migration Chain
-- FILE 035: Content Management Tables
--   blog_categories, blog_tags, blog_posts, blog_post_tags,
--   landing_pages, about_page_content, hero_stats,
--   office_assets, office_asset_maintenance,
--   company_features
-- Run AFTER 034. Idempotent — IF NOT EXISTS throughout.
-- RLS policies: see 039_rls_extended.sql
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. BLOG_CATEGORIES — Kategori artikel blog
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.blog_categories (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  slug        TEXT        NOT NULL UNIQUE,
  description TEXT,
  photo_url   TEXT,
  sort_order  INTEGER     NOT NULL DEFAULT 0,
  is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.blog_categories ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 2. BLOG_TAGS — Tag / label artikel
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.blog_tags (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT        NOT NULL,
  slug       TEXT        NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.blog_tags ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 3. BLOG_POSTS — Artikel blog / berita umroh & haji
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.blog_posts (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id     UUID        REFERENCES public.blog_categories(id) ON DELETE SET NULL,
  author_id       UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  title           TEXT        NOT NULL,
  slug            TEXT        NOT NULL UNIQUE,
  excerpt         TEXT,
  content         TEXT,
  featured_image  TEXT,
  is_published    BOOLEAN     NOT NULL DEFAULT FALSE,
  published_at    TIMESTAMPTZ,
  view_count      INTEGER     NOT NULL DEFAULT 0,
  meta_title      TEXT,
  meta_description TEXT,
  reading_time    INTEGER,
  is_featured     BOOLEAN     NOT NULL DEFAULT FALSE,
  allow_comments  BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_blog_posts_category_id   ON public.blog_posts(category_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_is_published  ON public.blog_posts(is_published);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published_at  ON public.blog_posts(published_at);
CREATE INDEX IF NOT EXISTS idx_blog_posts_title         ON public.blog_posts USING gin(title gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- 4. BLOG_POST_TAGS — Pivot tabel blog_posts ↔ blog_tags
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.blog_post_tags (
  post_id    UUID NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  tag_id     UUID NOT NULL REFERENCES public.blog_tags(id)  ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);

ALTER TABLE public.blog_post_tags ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 5. LANDING_PAGES — Halaman landing custom per agen / paket
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.landing_pages (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id       UUID        REFERENCES public.agents(id) ON DELETE CASCADE,
  branch_id      UUID        REFERENCES public.branches(id) ON DELETE CASCADE,
  package_id     UUID        REFERENCES public.packages(id) ON DELETE SET NULL,
  title          TEXT        NOT NULL,
  slug           TEXT        NOT NULL UNIQUE,
  description    TEXT,
  template       TEXT        NOT NULL DEFAULT 'default',
  sections       JSONB,
  meta_title     TEXT,
  meta_description TEXT,
  og_image_url   TEXT,
  custom_css     TEXT,
  custom_js      TEXT,
  is_published   BOOLEAN     NOT NULL DEFAULT FALSE,
  published_at   TIMESTAMPTZ,
  view_count     INTEGER     NOT NULL DEFAULT 0,
  expires_at     TIMESTAMPTZ,
  created_by     UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.landing_pages ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_landing_pages_agent_id   ON public.landing_pages(agent_id);
CREATE INDEX IF NOT EXISTS idx_landing_pages_branch_id  ON public.landing_pages(branch_id);

-- ---------------------------------------------------------------------------
-- 6. ABOUT_PAGE_CONTENT — Konten halaman About Us
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.about_page_content (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id            UUID        REFERENCES public.agents(id) ON DELETE CASCADE,
  branch_id           UUID        REFERENCES public.branches(id) ON DELETE CASCADE,
  hero_title          TEXT        DEFAULT 'Tentang Kami',
  hero_subtitle       TEXT,
  hero_image_url      TEXT,
  company_story       TEXT,
  vision              TEXT,
  mission             TEXT[],
  values              JSONB,
  team_section        JSONB,
  certificates        JSONB,
  partners            JSONB,
  awards              JSONB,
  extra_sections      JSONB,
  updated_by          UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.about_page_content ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 7. HERO_STATS — Statistik counter di hero section website
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.hero_stats (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id    UUID        REFERENCES public.agents(id) ON DELETE CASCADE,
  branch_id   UUID        REFERENCES public.branches(id) ON DELETE CASCADE,
  label       TEXT        NOT NULL,
  value       TEXT        NOT NULL,
  suffix      TEXT,
  icon        TEXT,
  sort_order  INTEGER     NOT NULL DEFAULT 0,
  is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.hero_stats ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 8. OFFICE_ASSETS — Inventaris aset kantor
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.office_assets (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id        UUID        REFERENCES public.branches(id) ON DELETE SET NULL,
  asset_code       TEXT        UNIQUE,
  name             TEXT        NOT NULL,
  category         TEXT        NOT NULL DEFAULT 'furniture'
                               CHECK (category IN ('furniture','electronic','vehicle','building',
                                                     'equipment','it_hardware','other')),
  brand            TEXT,
  model            TEXT,
  serial_number    TEXT,
  purchase_date    DATE,
  purchase_price   NUMERIC,
  current_value    NUMERIC,
  depreciation_rate NUMERIC,
  location         TEXT,
  assigned_to      UUID        REFERENCES public.employees(id) ON DELETE SET NULL,
  condition        TEXT        NOT NULL DEFAULT 'good'
                               CHECK (condition IN ('excellent','good','fair','poor','damaged','disposed')),
  warranty_until   DATE,
  photo_url        TEXT,
  notes            TEXT,
  is_active        BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.office_assets ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_office_assets_branch_id ON public.office_assets(branch_id);

-- ---------------------------------------------------------------------------
-- 9. OFFICE_ASSET_MAINTENANCE — Log perawatan aset kantor
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.office_asset_maintenance (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id       UUID        NOT NULL REFERENCES public.office_assets(id) ON DELETE CASCADE,
  maintenance_type TEXT      NOT NULL DEFAULT 'routine'
                             CHECK (maintenance_type IN ('routine','repair','calibration',
                                                          'replacement','inspection')),
  description    TEXT        NOT NULL,
  cost           NUMERIC     NOT NULL DEFAULT 0,
  vendor         TEXT,
  performed_at   DATE        NOT NULL DEFAULT CURRENT_DATE,
  next_due_at    DATE,
  performed_by   UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  status         TEXT        NOT NULL DEFAULT 'completed'
                             CHECK (status IN ('scheduled','in_progress','completed','cancelled')),
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.office_asset_maintenance ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_office_asset_maintenance_asset_id ON public.office_asset_maintenance(asset_id);

-- ---------------------------------------------------------------------------
-- 10. COMPANY_FEATURES — Feature flags / toggles per branch/agent
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.company_features (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id    UUID        REFERENCES public.branches(id) ON DELETE CASCADE,
  agent_id     UUID        REFERENCES public.agents(id) ON DELETE CASCADE,
  feature_key  TEXT        NOT NULL,
  is_enabled   BOOLEAN     NOT NULL DEFAULT FALSE,
  config       JSONB,
  enabled_by   UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  enabled_at   TIMESTAMPTZ,
  expires_at   TIMESTAMPTZ,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (branch_id, agent_id, feature_key)
);

ALTER TABLE public.company_features ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_company_features_branch_id   ON public.company_features(branch_id);
CREATE INDEX IF NOT EXISTS idx_company_features_feature_key ON public.company_features(feature_key);

-- Seed default blog categories
DO $$
BEGIN
  INSERT INTO public.blog_categories (name, slug, sort_order) VALUES
    ('Tips Umroh',    'tips-umroh',    10),
    ('Info Haji',     'info-haji',     20),
    ('Destinasi',     'destinasi',     30),
    ('Berita',        'berita',        40),
    ('Panduan Visa',  'panduan-visa',  50),
    ('Kisah Jamaah',  'kisah-jamaah',  60)
  ON CONFLICT (slug) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'SKIP blog_categories seed: %', SQLERRM;
END;
$$;

-- Grant permissions
DO $$
BEGIN
  GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
  GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
  GRANT ALL    ON ALL TABLES IN SCHEMA public TO service_role;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'GRANT on tables/sequences skipped: %', SQLERRM;
END;
$$;

SELECT '035_tables_content: OK' AS result;
