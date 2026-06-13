-- =============================================================================
-- VINSTOUR TRAVEL PORTAL — Clean Migration v2
-- FILE 022: Website CMS Tables
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. WEBSITE_SETTINGS — Konfigurasi website global (singleton)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.website_settings (
  id                  UUID        PRIMARY KEY DEFAULT '00000000-0000-0000-0000-000000000001',
  site_name           TEXT        NOT NULL DEFAULT 'Vinstour',
  tagline             TEXT,
  logo_url            TEXT,
  favicon_url         TEXT,
  primary_color       TEXT        DEFAULT '#1e40af',
  secondary_color     TEXT        DEFAULT '#d97706',
  contact_phone       TEXT,
  contact_email       TEXT,
  contact_address     TEXT,
  social_wa           TEXT,
  social_ig           TEXT,
  social_fb           TEXT,
  social_yt           TEXT,
  social_tiktok       TEXT,
  meta_description    TEXT,
  meta_keywords       TEXT[],
  google_analytics_id TEXT,
  is_maintenance      BOOLEAN     NOT NULL DEFAULT FALSE,
  maintenance_msg     TEXT,
  footer_text         TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.website_settings ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.website_settings IS
  'Singleton row (id = 00000...001). Update saja, jangan INSERT baru.';

-- ---------------------------------------------------------------------------
-- 2. FAQS — FAQ publik website
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.faqs (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  question     TEXT        NOT NULL,
  answer       TEXT        NOT NULL,
  category     TEXT        DEFAULT 'umum',
  is_published BOOLEAN     NOT NULL DEFAULT TRUE,
  sort_order   INTEGER     NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_faqs_published
  ON public.faqs(is_published, sort_order);

-- ---------------------------------------------------------------------------
-- 3. TESTIMONIALS — Testimoni jamaah untuk website
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.testimonials (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name    TEXT        NOT NULL,
  customer_photo   TEXT,
  rating           INTEGER     NOT NULL DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
  content          TEXT        NOT NULL,
  package_type     TEXT,
  departure_year   INTEGER,
  is_featured      BOOLEAN     NOT NULL DEFAULT FALSE,
  is_published     BOOLEAN     NOT NULL DEFAULT TRUE,
  sort_order       INTEGER     NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_testimonials_published
  ON public.testimonials(is_published, is_featured, sort_order);

-- ---------------------------------------------------------------------------
-- 4. GALLERY_ITEMS — Galeri foto website
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.gallery_items (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT,
  image_url    TEXT        NOT NULL,
  category     TEXT        DEFAULT 'umum',
  alt_text     TEXT,
  sort_order   INTEGER     NOT NULL DEFAULT 0,
  is_active    BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.gallery_items ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 5. CONTACT_PAGE_CONTENT — Konten halaman kontak (singleton)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.contact_page_content (
  id               UUID        PRIMARY KEY DEFAULT '00000000-0000-0000-0000-000000000002',
  address          TEXT,
  phone            TEXT,
  email            TEXT,
  maps_embed_url   TEXT,
  office_hours     TEXT,
  whatsapp         TEXT,
  description      TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.contact_page_content ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 6. MENU_ITEMS — Navigasi sidebar dinamis
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.menu_items (
  id           UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  label        TEXT             NOT NULL,
  icon         TEXT,
  path         TEXT,
  permission   TEXT,
  parent_id    UUID             REFERENCES public.menu_items(id) ON DELETE CASCADE,
  sort_order   INTEGER          NOT NULL DEFAULT 0,
  is_active    BOOLEAN          NOT NULL DEFAULT TRUE,
  roles        public.app_role[],
  created_at   TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_menu_items_parent
  ON public.menu_items(parent_id, sort_order);

-- ---------------------------------------------------------------------------
-- 7. MEDIA_GALLERY — Galeri media umum (trip photos, dll)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.media_gallery (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  departure_id  UUID        REFERENCES public.departures(id) ON DELETE SET NULL,
  uploader_id   UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  title         TEXT,
  file_url      TEXT        NOT NULL,
  file_type     TEXT        NOT NULL DEFAULT 'image'
                            CHECK (file_type IN ('image','video','document')),
  mime_type     TEXT,
  file_size     INTEGER,
  is_public     BOOLEAN     NOT NULL DEFAULT TRUE,
  is_featured   BOOLEAN     NOT NULL DEFAULT FALSE,
  sort_order    INTEGER     NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.media_gallery ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_media_gallery_departure
  ON public.media_gallery(departure_id);
CREATE INDEX IF NOT EXISTS idx_media_gallery_public
  ON public.media_gallery(is_public, is_featured, sort_order);
