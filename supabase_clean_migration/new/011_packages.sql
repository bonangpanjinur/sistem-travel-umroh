-- =============================================================================
-- VINSTOUR TRAVEL PORTAL — Clean Migration v2
-- FILE 011: Travel Catalog — Airlines, Airports, Hotels, Packages
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. AIRLINES
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.airlines (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT        NOT NULL,
  iata_code    TEXT        UNIQUE,
  icao_code    TEXT,
  logo_url     TEXT,
  country      TEXT,
  is_active    BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.airlines ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 2. AIRPORTS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.airports (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  iata_code    TEXT        NOT NULL UNIQUE,
  icao_code    TEXT,
  name         TEXT        NOT NULL,
  city         TEXT,
  country      TEXT,
  country_code TEXT,
  timezone     TEXT,
  latitude     NUMERIC,
  longitude    NUMERIC,
  is_active    BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.airports ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 3. HOTELS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.hotels (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT        NOT NULL,
  city              TEXT        NOT NULL CHECK (city IN ('makkah','madinah','jeddah','other')),
  address           TEXT,
  star_rating       INTEGER     CHECK (star_rating BETWEEN 1 AND 5),
  distance_to_haram NUMERIC,
  photo_url         TEXT,
  photos            TEXT[],
  amenities         TEXT[],
  description       TEXT,
  is_active         BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.hotels ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_hotels_city      ON public.hotels(city);
CREATE INDEX IF NOT EXISTS idx_hotels_is_active ON public.hotels(is_active);

-- ---------------------------------------------------------------------------
-- 4. HOTEL_ROOM_CAPACITIES
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.hotel_room_capacities (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id     UUID        NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  room_type    TEXT        NOT NULL CHECK (room_type IN ('quad','triple','double','single')),
  capacity     INTEGER     NOT NULL DEFAULT 4,
  UNIQUE (hotel_id, room_type)
);

ALTER TABLE public.hotel_room_capacities ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 5. VENDORS — Supplier / vendor layanan
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vendors (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT        NOT NULL,
  vendor_type      TEXT        NOT NULL DEFAULT 'general'
                               CHECK (vendor_type IN ('airline','hotel','transport','visa',
                                                       'insurance','catering','general')),
  contact_person   TEXT,
  phone            TEXT,
  email            TEXT,
  address          TEXT,
  country          TEXT,
  currency         TEXT        NOT NULL DEFAULT 'IDR',
  payment_terms    TEXT,
  tax_number       TEXT,
  is_active        BOOLEAN     NOT NULL DEFAULT TRUE,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 6. PACKAGE_LABELS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.package_labels (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT        NOT NULL,
  color        TEXT        NOT NULL DEFAULT '#3B82F6',
  text_color   TEXT        NOT NULL DEFAULT '#FFFFFF',
  sort_order   INTEGER     NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.package_labels ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 7. PACKAGE_GROUPS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.package_groups (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT        NOT NULL,
  slug         TEXT        UNIQUE,
  description  TEXT,
  sort_order   INTEGER     NOT NULL DEFAULT 0,
  is_active    BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.package_groups ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 8. PACKAGES — Paket umroh & haji
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.packages (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  TEXT        NOT NULL,
  code                  TEXT        UNIQUE,
  slug                  TEXT        UNIQUE,
  package_type          TEXT        NOT NULL DEFAULT 'umroh'
                                    CHECK (package_type IN ('umroh','haji','wisata','haji_plus')),
  duration_days         INTEGER     NOT NULL DEFAULT 9,
  airline_id            UUID        REFERENCES public.airlines(id) ON DELETE SET NULL,
  hotel_makkah_id       UUID        REFERENCES public.hotels(id) ON DELETE SET NULL,
  hotel_madinah_id      UUID        REFERENCES public.hotels(id) ON DELETE SET NULL,
  hotel_makkah_nights   INTEGER     NOT NULL DEFAULT 4,
  hotel_madinah_nights  INTEGER     NOT NULL DEFAULT 4,
  room_type_default     TEXT        NOT NULL DEFAULT 'quad'
                                    CHECK (room_type_default IN ('quad','triple','double','single')),
  base_price_quad       NUMERIC     NOT NULL DEFAULT 0,
  base_price_triple     NUMERIC     NOT NULL DEFAULT 0,
  base_price_double     NUMERIC     NOT NULL DEFAULT 0,
  base_price_single     NUMERIC     NOT NULL DEFAULT 0,
  includes              TEXT[],
  excludes              TEXT[],
  description           TEXT,
  highlights            TEXT[],
  itinerary             JSONB,
  photo_url             TEXT,
  photos                TEXT[],
  thumbnail_url         TEXT,
  label_id              UUID        REFERENCES public.package_labels(id) ON DELETE SET NULL,
  group_id              UUID        REFERENCES public.package_groups(id) ON DELETE SET NULL,
  view_count            INTEGER     NOT NULL DEFAULT 0,
  is_published          BOOLEAN     NOT NULL DEFAULT FALSE,
  is_featured           BOOLEAN     NOT NULL DEFAULT FALSE,
  is_active             BOOLEAN     NOT NULL DEFAULT TRUE,
  sort_order            INTEGER     NOT NULL DEFAULT 0,
  seo_title             TEXT,
  seo_description       TEXT,
  seo_keywords          TEXT[],
  created_by            UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Jika tabel sudah ada dari schema lama, tambahkan kolom baru secara idempotent
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS airline_id           UUID    REFERENCES public.airlines(id) ON DELETE SET NULL;
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS hotel_makkah_id      UUID    REFERENCES public.hotels(id) ON DELETE SET NULL;
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS hotel_madinah_id     UUID    REFERENCES public.hotels(id) ON DELETE SET NULL;
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS hotel_makkah_nights  INTEGER NOT NULL DEFAULT 4;
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS hotel_madinah_nights INTEGER NOT NULL DEFAULT 4;
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS room_type_default    TEXT    NOT NULL DEFAULT 'quad';
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS base_price_triple    NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS base_price_double    NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS base_price_single    NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS includes             TEXT[];
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS excludes             TEXT[];
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS highlights           TEXT[];
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS itinerary            JSONB;
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS photos               TEXT[];
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS thumbnail_url        TEXT;
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS label_id             UUID    REFERENCES public.package_labels(id) ON DELETE SET NULL;
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS group_id             UUID    REFERENCES public.package_groups(id) ON DELETE SET NULL;
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS view_count           INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS is_featured          BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS sort_order           INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS seo_title            TEXT;
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS seo_description      TEXT;
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS seo_keywords         TEXT[];
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS created_by           UUID    REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS slug                 TEXT;
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS code                 TEXT;
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS is_published         BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS is_active            BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_packages_published
  ON public.packages(is_published, is_featured, sort_order);
CREATE INDEX IF NOT EXISTS idx_packages_type
  ON public.packages(package_type, is_published);
CREATE INDEX IF NOT EXISTS idx_packages_slug
  ON public.packages(slug);

-- ---------------------------------------------------------------------------
-- 9. PACKAGE_HPP_TEMPLATES — Template harga pokok per paket
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.package_hpp_templates (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id   UUID        NOT NULL REFERENCES public.packages(id) ON DELETE CASCADE,
  item_name    TEXT        NOT NULL,
  item_type    TEXT        NOT NULL DEFAULT 'per_pax'
                           CHECK (item_type IN ('per_pax','fixed','per_room','per_night')),
  cost_usd     NUMERIC     NOT NULL DEFAULT 0,
  cost_idr     NUMERIC     NOT NULL DEFAULT 0,
  vendor_id    UUID        REFERENCES public.vendors(id) ON DELETE SET NULL,
  notes        TEXT,
  sort_order   INTEGER     NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.package_hpp_templates ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_pkg_hpp_package
  ON public.package_hpp_templates(package_id);
