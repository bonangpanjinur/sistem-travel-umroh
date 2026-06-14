-- =============================================================================
-- VINSTOUR TRAVEL PORTAL — Clean Migration Chain
-- FILE 033: Equipment Extended Tables
--   equipment_categories, equipment_variants, equipment_photos,
--   equipment_stock_history, equipment_stock_opname,
--   equipment_notification_settings
-- Run AFTER 032. Idempotent — IF NOT EXISTS throughout.
-- RLS policies: see 039_rls_extended.sql
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. EQUIPMENT_CATEGORIES — Kategori perlengkapan jamaah
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.equipment_categories (
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

ALTER TABLE public.equipment_categories ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  INSERT INTO public.equipment_categories (name, slug, sort_order) VALUES
    ('Koper & Tas',       'koper-tas',       10),
    ('Pakaian Ihram',     'pakaian-ihram',   20),
    ('Perlengkapan Doa',  'perlengkapan-doa',30),
    ('Kesehatan',         'kesehatan',       40),
    ('Identitas & Dokumen','identitas-dokumen',50),
    ('Elektronik',        'elektronik',      60),
    ('Lainnya',           'lainnya',         99)
  ON CONFLICT (slug) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'SKIP equipment_categories seed: %', SQLERRM;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2. EQUIPMENT_VARIANTS — Varian perlengkapan (ukuran, warna, dll)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.equipment_variants (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id         UUID        NOT NULL REFERENCES public.equipment_items(id) ON DELETE CASCADE,
  category_id     UUID        REFERENCES public.equipment_categories(id) ON DELETE SET NULL,
  variant_name    TEXT        NOT NULL,
  sku             TEXT        UNIQUE,
  size            TEXT,
  color           TEXT,
  unit            TEXT        NOT NULL DEFAULT 'pcs',
  stock_quantity  INTEGER     NOT NULL DEFAULT 0,
  min_stock       INTEGER     NOT NULL DEFAULT 5,
  purchase_price  NUMERIC     NOT NULL DEFAULT 0,
  sell_price      NUMERIC     NOT NULL DEFAULT 0,
  is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.equipment_variants ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_equipment_variants_item_id     ON public.equipment_variants(item_id);
CREATE INDEX IF NOT EXISTS idx_equipment_variants_category_id ON public.equipment_variants(category_id);

-- ---------------------------------------------------------------------------
-- 3. EQUIPMENT_PHOTOS — Foto produk perlengkapan
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.equipment_photos (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id     UUID        NOT NULL REFERENCES public.equipment_items(id) ON DELETE CASCADE,
  variant_id  UUID        REFERENCES public.equipment_variants(id) ON DELETE CASCADE,
  photo_url   TEXT        NOT NULL,
  alt_text    TEXT,
  is_primary  BOOLEAN     NOT NULL DEFAULT FALSE,
  sort_order  INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.equipment_photos ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_equipment_photos_item_id    ON public.equipment_photos(item_id);
CREATE INDEX IF NOT EXISTS idx_equipment_photos_variant_id ON public.equipment_photos(variant_id);

-- ---------------------------------------------------------------------------
-- 4. EQUIPMENT_STOCK_HISTORY — Riwayat perubahan stok
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.equipment_stock_history (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id        UUID        NOT NULL REFERENCES public.equipment_items(id) ON DELETE CASCADE,
  variant_id     UUID        REFERENCES public.equipment_variants(id) ON DELETE SET NULL,
  movement_type  TEXT        NOT NULL
                             CHECK (movement_type IN ('in','out','adjustment','return','opname',
                                                       'distribute','cancel_distribution')),
  quantity       INTEGER     NOT NULL,
  quantity_before INTEGER    NOT NULL DEFAULT 0,
  quantity_after  INTEGER    NOT NULL DEFAULT 0,
  reference_type TEXT,
  reference_id   UUID,
  notes          TEXT,
  performed_by   UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.equipment_stock_history ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_equipment_stock_history_item_id    ON public.equipment_stock_history(item_id);
CREATE INDEX IF NOT EXISTS idx_equipment_stock_history_variant_id ON public.equipment_stock_history(variant_id);
CREATE INDEX IF NOT EXISTS idx_equipment_stock_history_created_at ON public.equipment_stock_history(created_at);

-- ---------------------------------------------------------------------------
-- 5. EQUIPMENT_STOCK_OPNAME — Sesi stock opname
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.equipment_stock_opname (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id      UUID        REFERENCES public.branches(id) ON DELETE SET NULL,
  opname_date    DATE        NOT NULL DEFAULT CURRENT_DATE,
  status         TEXT        NOT NULL DEFAULT 'draft'
                             CHECK (status IN ('draft','in_progress','completed','cancelled')),
  notes          TEXT,
  performed_by   UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_by    UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.equipment_stock_opname ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 6. EQUIPMENT_OPNAME_ITEMS — Detail item per sesi stock opname
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.equipment_opname_items (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  opname_id       UUID        NOT NULL REFERENCES public.equipment_stock_opname(id) ON DELETE CASCADE,
  item_id         UUID        NOT NULL REFERENCES public.equipment_items(id) ON DELETE CASCADE,
  variant_id      UUID        REFERENCES public.equipment_variants(id) ON DELETE SET NULL,
  system_quantity INTEGER     NOT NULL DEFAULT 0,
  actual_quantity INTEGER     NOT NULL DEFAULT 0,
  discrepancy     INTEGER     GENERATED ALWAYS AS (actual_quantity - system_quantity) STORED,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.equipment_opname_items ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_equipment_opname_items_opname_id ON public.equipment_opname_items(opname_id);
CREATE INDEX IF NOT EXISTS idx_equipment_opname_items_item_id   ON public.equipment_opname_items(item_id);

-- ---------------------------------------------------------------------------
-- 7. EQUIPMENT_NOTIFICATION_SETTINGS — Pengaturan alert stok minimum
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.equipment_notification_settings (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id            UUID        REFERENCES public.equipment_items(id) ON DELETE CASCADE,
  category_id        UUID        REFERENCES public.equipment_categories(id) ON DELETE CASCADE,
  min_stock_threshold INTEGER    NOT NULL DEFAULT 5,
  alert_roles        TEXT[]      NOT NULL DEFAULT ARRAY['equipment','admin','super_admin'],
  is_enabled         BOOLEAN     NOT NULL DEFAULT TRUE,
  last_alerted_at    TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_item_or_category CHECK (
    (item_id IS NOT NULL AND category_id IS NULL) OR
    (item_id IS NULL AND category_id IS NOT NULL)
  )
);

ALTER TABLE public.equipment_notification_settings ENABLE ROW LEVEL SECURITY;

-- Also update equipment_items to add category_id if not present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='equipment_items' AND column_name='category_id'
  ) THEN
    ALTER TABLE public.equipment_items
      ADD COLUMN category_id UUID REFERENCES public.equipment_categories(id) ON DELETE SET NULL;
  END IF;
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

SELECT '033_tables_equipment_extended: OK' AS result;
