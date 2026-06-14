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

-- Backfill any columns missing because the table existed in an older state.
-- NOTE: available_qty must be added LAST — it depends on the other qty columns.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='equipment_items' AND column_name='description') THEN
    ALTER TABLE public.equipment_items ADD COLUMN description TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='equipment_items' AND column_name='sku') THEN
    ALTER TABLE public.equipment_items ADD COLUMN sku TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='equipment_items' AND column_name='stock_qty') THEN
    ALTER TABLE public.equipment_items ADD COLUMN stock_qty INTEGER NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='equipment_items' AND column_name='distributed_qty') THEN
    ALTER TABLE public.equipment_items ADD COLUMN distributed_qty INTEGER NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='equipment_items' AND column_name='returned_qty') THEN
    ALTER TABLE public.equipment_items ADD COLUMN returned_qty INTEGER NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='equipment_items' AND column_name='unit_cost') THEN
    ALTER TABLE public.equipment_items ADD COLUMN unit_cost NUMERIC NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='equipment_items' AND column_name='photo_url') THEN
    ALTER TABLE public.equipment_items ADD COLUMN photo_url TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='equipment_items' AND column_name='is_active') THEN
    ALTER TABLE public.equipment_items ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='equipment_items' AND column_name='updated_at') THEN
    ALTER TABLE public.equipment_items ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  END IF;

  -- available_qty is a generated column — must come after all referenced columns exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='equipment_items' AND column_name='available_qty') THEN
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
  distributed_by          UUID,
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

-- Backfill any columns missing because the table existed in an older state.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='equipment_distributions' AND column_name='equipment_item_id') THEN
    ALTER TABLE public.equipment_distributions
      ADD COLUMN equipment_item_id UUID NOT NULL REFERENCES public.equipment_items(id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='equipment_distributions' AND column_name='booking_passenger_id') THEN
    ALTER TABLE public.equipment_distributions
      ADD COLUMN booking_passenger_id UUID REFERENCES public.booking_passengers(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='equipment_distributions' AND column_name='departure_id') THEN
    ALTER TABLE public.equipment_distributions
      ADD COLUMN departure_id UUID REFERENCES public.departures(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='equipment_distributions' AND column_name='quantity') THEN
    ALTER TABLE public.equipment_distributions ADD COLUMN quantity INTEGER NOT NULL DEFAULT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='equipment_distributions' AND column_name='distributed_at') THEN
    ALTER TABLE public.equipment_distributions ADD COLUMN distributed_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='equipment_distributions' AND column_name='distributed_by') THEN
    ALTER TABLE public.equipment_distributions ADD COLUMN distributed_by UUID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='equipment_distributions' AND column_name='received_at') THEN
    ALTER TABLE public.equipment_distributions ADD COLUMN received_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='equipment_distributions' AND column_name='received_by_signature') THEN
    ALTER TABLE public.equipment_distributions ADD COLUMN received_by_signature TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='equipment_distributions' AND column_name='returned_at') THEN
    ALTER TABLE public.equipment_distributions ADD COLUMN returned_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='equipment_distributions' AND column_name='return_condition') THEN
    ALTER TABLE public.equipment_distributions ADD COLUMN return_condition TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='equipment_distributions' AND column_name='notes') THEN
    ALTER TABLE public.equipment_distributions ADD COLUMN notes TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='equipment_distributions' AND column_name='status') THEN
    ALTER TABLE public.equipment_distributions ADD COLUMN status TEXT NOT NULL DEFAULT 'pending';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='equipment_distributions' AND column_name='photo_url') THEN
    ALTER TABLE public.equipment_distributions ADD COLUMN photo_url TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='equipment_distributions' AND column_name='updated_at') THEN
    ALTER TABLE public.equipment_distributions ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  END IF;
END
$$;

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

-- Backfill any columns missing because the table existed in an older state.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='baggage_reference_items' AND column_name='package_id') THEN
    ALTER TABLE public.baggage_reference_items
      ADD COLUMN package_id UUID REFERENCES public.packages(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='baggage_reference_items' AND column_name='departure_id') THEN
    ALTER TABLE public.baggage_reference_items
      ADD COLUMN departure_id UUID REFERENCES public.departures(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='baggage_reference_items' AND column_name='item_name') THEN
    ALTER TABLE public.baggage_reference_items ADD COLUMN item_name TEXT NOT NULL DEFAULT '';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='baggage_reference_items' AND column_name='is_allowed') THEN
    ALTER TABLE public.baggage_reference_items ADD COLUMN is_allowed BOOLEAN NOT NULL DEFAULT TRUE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='baggage_reference_items' AND column_name='max_weight_kg') THEN
    ALTER TABLE public.baggage_reference_items ADD COLUMN max_weight_kg NUMERIC;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='baggage_reference_items' AND column_name='notes') THEN
    ALTER TABLE public.baggage_reference_items ADD COLUMN notes TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='baggage_reference_items' AND column_name='sort_order') THEN
    ALTER TABLE public.baggage_reference_items ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;
  END IF;
END
$$;

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

-- Backfill any columns missing because the table existed in an older state.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='package_type_equipment' AND column_name='package_type') THEN
    ALTER TABLE public.package_type_equipment ADD COLUMN package_type TEXT NOT NULL DEFAULT 'umroh';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='package_type_equipment' AND column_name='equipment_item_id') THEN
    ALTER TABLE public.package_type_equipment
      ADD COLUMN equipment_item_id UUID NOT NULL REFERENCES public.equipment_items(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='package_type_equipment' AND column_name='is_mandatory') THEN
    ALTER TABLE public.package_type_equipment ADD COLUMN is_mandatory BOOLEAN NOT NULL DEFAULT TRUE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='package_type_equipment' AND column_name='notes') THEN
    ALTER TABLE public.package_type_equipment ADD COLUMN notes TEXT;
  END IF;
END
$$;
