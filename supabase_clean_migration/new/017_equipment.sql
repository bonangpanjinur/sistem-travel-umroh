-- =============================================================================
-- VINSTOUR TRAVEL PORTAL — Clean Migration v2
-- FILE 017: Equipment & Baggage Tables
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. EQUIPMENT_ITEMS — Inventaris perlengkapan jamaah
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.equipment_items (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT        NOT NULL,
  category         TEXT        NOT NULL DEFAULT 'lainnya'
                               CHECK (category IN ('koper','seragam','gelang','mukena',
                                                    'sajadah','tas','perlengkapan_ibadah','lainnya')),
  description      TEXT,
  sku              TEXT        UNIQUE,
  stock_qty        INTEGER     NOT NULL DEFAULT 0,
  distributed_qty  INTEGER     NOT NULL DEFAULT 0,
  returned_qty     INTEGER     NOT NULL DEFAULT 0,
  available_qty    INTEGER     GENERATED ALWAYS AS
                               (GREATEST(0, stock_qty - distributed_qty + returned_qty)) STORED,
  unit_cost        NUMERIC     NOT NULL DEFAULT 0,
  photo_url        TEXT,
  is_active        BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.equipment_items ENABLE ROW LEVEL SECURITY;

-- Add generated column if the table already existed without it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'equipment_items'
      AND column_name  = 'available_qty'
  ) THEN
    ALTER TABLE public.equipment_items
      ADD COLUMN available_qty INTEGER
        GENERATED ALWAYS AS (GREATEST(0, stock_qty - distributed_qty + returned_qty)) STORED;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_equipment_items_category
  ON public.equipment_items(category, is_active);

COMMENT ON COLUMN public.equipment_items.available_qty IS
  'Computed: stock_qty - distributed_qty + returned_qty (read-only)';

-- ---------------------------------------------------------------------------
-- 2. EQUIPMENT_DISTRIBUTIONS — Distribusi perlengkapan ke jamaah
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.equipment_distributions (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_item_id       UUID        NOT NULL REFERENCES public.equipment_items(id) ON DELETE RESTRICT,
  booking_passenger_id    UUID        REFERENCES public.booking_passengers(id) ON DELETE SET NULL,
  departure_id            UUID        REFERENCES public.departures(id) ON DELETE SET NULL,
  quantity                INTEGER     NOT NULL DEFAULT 1 CHECK (quantity > 0),
  distributed_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  distributed_by          UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  received_at             TIMESTAMPTZ,
  received_by_signature   TEXT,
  returned_at             TIMESTAMPTZ,
  return_condition        TEXT        CHECK (return_condition IN ('good','damaged','lost')),
  notes                   TEXT,
  status                  TEXT        NOT NULL DEFAULT 'pending'
                                      CHECK (status IN ('pending','distributed','received',
                                                         'returned','lost')),
  photo_url               TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.equipment_distributions ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_equip_dist_item
  ON public.equipment_distributions(equipment_item_id);
CREATE INDEX IF NOT EXISTS idx_equip_dist_departure
  ON public.equipment_distributions(departure_id);
CREATE INDEX IF NOT EXISTS idx_equip_dist_passenger
  ON public.equipment_distributions(booking_passenger_id);

-- ---------------------------------------------------------------------------
-- 3. BAGGAGE_REFERENCE_ITEMS — Referensi item bagasi per paket
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.baggage_reference_items (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id   UUID        REFERENCES public.packages(id) ON DELETE CASCADE,
  departure_id UUID        REFERENCES public.departures(id) ON DELETE CASCADE,
  item_name    TEXT        NOT NULL,
  is_allowed   BOOLEAN     NOT NULL DEFAULT TRUE,
  max_weight_kg NUMERIC,
  notes        TEXT,
  sort_order   INTEGER     NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.baggage_reference_items ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 4. PACKAGE_TYPE_EQUIPMENT — Equipment wajib per tipe paket
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.package_type_equipment (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  package_type     TEXT        NOT NULL CHECK (package_type IN ('umroh','haji','wisata','haji_plus')),
  equipment_item_id UUID       NOT NULL REFERENCES public.equipment_items(id) ON DELETE CASCADE,
  is_mandatory     BOOLEAN     NOT NULL DEFAULT TRUE,
  notes            TEXT,
  UNIQUE (package_type, equipment_item_id)
);

ALTER TABLE public.package_type_equipment ENABLE ROW LEVEL SECURITY;
