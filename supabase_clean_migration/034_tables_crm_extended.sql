-- =============================================================================
-- VINSTOUR TRAVEL PORTAL — Clean Migration Chain
-- FILE 034: CRM & Loyalty Extended Tables
--   customer_family_relations, jamaah_qr_codes, jamaah_live_locations,
--   booking_transfers,
--   agent_wallets, agent_wallet_transactions,
--   marketing_campaigns, marketing_materials, marketing_material_downloads,
--   loyalty_transactions, loyalty_rewards, loyalty_point_expiry
-- Run AFTER 033. Idempotent — IF NOT EXISTS throughout.
-- RLS policies: see 039_rls_extended.sql
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. CUSTOMER_FAMILY_RELATIONS — Relasi keluarga antar jamaah
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.customer_family_relations (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id       UUID        NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  related_id        UUID        NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  relation_type     TEXT        NOT NULL
                                CHECK (relation_type IN ('spouse','parent','child','sibling',
                                                          'grandparent','grandchild','in_law','other')),
  is_mahram         BOOLEAN     NOT NULL DEFAULT FALSE,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (customer_id, related_id)
);

ALTER TABLE public.customer_family_relations ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_customer_family_relations_customer_id ON public.customer_family_relations(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_family_relations_related_id  ON public.customer_family_relations(related_id);

-- ---------------------------------------------------------------------------
-- 2. JAMAAH_QR_CODES — QR code untuk check-in & identifikasi jamaah
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.jamaah_qr_codes (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id    UUID        NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  departure_id   UUID        NOT NULL REFERENCES public.departures(id) ON DELETE CASCADE,
  booking_id     UUID        REFERENCES public.bookings(id) ON DELETE SET NULL,
  qr_code        TEXT        NOT NULL UNIQUE,
  qr_url         TEXT,
  qr_image_url   TEXT,
  purpose        TEXT        NOT NULL DEFAULT 'general'
                             CHECK (purpose IN ('general','boarding','hotel','bus','equipment','manasik')),
  is_active      BOOLEAN     NOT NULL DEFAULT TRUE,
  scanned_count  INTEGER     NOT NULL DEFAULT 0,
  last_scanned_at TIMESTAMPTZ,
  expires_at     TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (customer_id, departure_id, purpose)
);

ALTER TABLE public.jamaah_qr_codes ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_jamaah_qr_codes_customer_id  ON public.jamaah_qr_codes(customer_id);
CREATE INDEX IF NOT EXISTS idx_jamaah_qr_codes_departure_id ON public.jamaah_qr_codes(departure_id);

-- ---------------------------------------------------------------------------
-- 3. JAMAAH_LIVE_LOCATIONS — GPS live tracking jamaah
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.jamaah_live_locations (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id   UUID        NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  departure_id  UUID        NOT NULL REFERENCES public.departures(id) ON DELETE CASCADE,
  latitude      NUMERIC     NOT NULL,
  longitude     NUMERIC     NOT NULL,
  accuracy      NUMERIC,
  altitude      NUMERIC,
  speed         NUMERIC,
  heading       NUMERIC,
  location_name TEXT,
  city          TEXT,
  country       TEXT,
  is_sos        BOOLEAN     NOT NULL DEFAULT FALSE,
  battery_level INTEGER,
  device_info   JSONB,
  recorded_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.jamaah_live_locations ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_jamaah_live_locations_customer_id  ON public.jamaah_live_locations(customer_id);
CREATE INDEX IF NOT EXISTS idx_jamaah_live_locations_departure_id ON public.jamaah_live_locations(departure_id);
CREATE INDEX IF NOT EXISTS idx_jamaah_live_locations_recorded_at  ON public.jamaah_live_locations(recorded_at);

-- ---------------------------------------------------------------------------
-- 4. BOOKING_TRANSFERS — Transfer booking antar paket / keberangkatan
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.booking_transfers (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  original_booking_id UUID        NOT NULL REFERENCES public.bookings(id) ON DELETE RESTRICT,
  new_booking_id      UUID        REFERENCES public.bookings(id) ON DELETE SET NULL,
  from_departure_id   UUID        REFERENCES public.departures(id) ON DELETE SET NULL,
  to_departure_id     UUID        REFERENCES public.departures(id) ON DELETE SET NULL,
  from_package_id     UUID        REFERENCES public.packages(id) ON DELETE SET NULL,
  to_package_id       UUID        REFERENCES public.packages(id) ON DELETE SET NULL,
  transfer_reason     TEXT        NOT NULL,
  price_difference    NUMERIC     NOT NULL DEFAULT 0,
  additional_charge   NUMERIC     NOT NULL DEFAULT 0,
  refund_amount       NUMERIC     NOT NULL DEFAULT 0,
  status              TEXT        NOT NULL DEFAULT 'pending'
                                  CHECK (status IN ('pending','approved','rejected','completed','cancelled')),
  requested_by        UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_by         UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at         TIMESTAMPTZ,
  completed_at        TIMESTAMPTZ,
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.booking_transfers ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_booking_transfers_original_booking_id ON public.booking_transfers(original_booking_id);

-- ---------------------------------------------------------------------------
-- 5. AGENT_WALLETS — Dompet digital agen
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agent_wallets (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id       UUID        NOT NULL UNIQUE REFERENCES public.agents(id) ON DELETE CASCADE,
  balance        NUMERIC     NOT NULL DEFAULT 0,
  total_earned   NUMERIC     NOT NULL DEFAULT 0,
  total_withdrawn NUMERIC    NOT NULL DEFAULT 0,
  currency       TEXT        NOT NULL DEFAULT 'IDR',
  is_frozen      BOOLEAN     NOT NULL DEFAULT FALSE,
  frozen_reason  TEXT,
  last_updated   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.agent_wallets ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_agent_wallets_agent_id ON public.agent_wallets(agent_id);

-- ---------------------------------------------------------------------------
-- 6. AGENT_WALLET_TRANSACTIONS — Riwayat transaksi dompet agen
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agent_wallet_transactions (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id        UUID        NOT NULL REFERENCES public.agent_wallets(id) ON DELETE CASCADE,
  agent_id         UUID        NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  type             TEXT        NOT NULL
                               CHECK (type IN ('credit','debit','withdrawal','bonus','adjustment')),
  amount           NUMERIC     NOT NULL,
  balance_before   NUMERIC     NOT NULL,
  balance_after    NUMERIC     NOT NULL,
  reference_type   TEXT,
  reference_id     UUID,
  description      TEXT,
  status           TEXT        NOT NULL DEFAULT 'completed'
                               CHECK (status IN ('pending','completed','failed','reversed')),
  processed_by     UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.agent_wallet_transactions ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_agent_wallet_transactions_wallet_id ON public.agent_wallet_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_agent_wallet_transactions_agent_id  ON public.agent_wallet_transactions(agent_id);

-- ---------------------------------------------------------------------------
-- 7. MARKETING_CAMPAIGNS — Kampanye marketing umum
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.marketing_campaigns (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT        NOT NULL,
  code            TEXT        UNIQUE,
  type            TEXT        NOT NULL DEFAULT 'general'
                              CHECK (type IN ('general','email','social_media','offline',
                                              'referral','partnership','seasonal')),
  status          TEXT        NOT NULL DEFAULT 'draft'
                              CHECK (status IN ('draft','active','paused','completed','cancelled')),
  start_date      DATE,
  end_date        DATE,
  budget          NUMERIC,
  actual_spend    NUMERIC     NOT NULL DEFAULT 0,
  target_audience JSONB,
  goals           TEXT,
  description     TEXT,
  results         JSONB,
  impressions     INTEGER     NOT NULL DEFAULT 0,
  clicks          INTEGER     NOT NULL DEFAULT 0,
  conversions     INTEGER     NOT NULL DEFAULT 0,
  branch_id       UUID        REFERENCES public.branches(id) ON DELETE SET NULL,
  created_by      UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_status ON public.marketing_campaigns(status);

-- ---------------------------------------------------------------------------
-- 8. MARKETING_MATERIALS — Materi promosi / marketing
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.marketing_materials (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id    UUID        REFERENCES public.marketing_campaigns(id) ON DELETE SET NULL,
  title          TEXT        NOT NULL,
  type           TEXT        NOT NULL DEFAULT 'flyer'
                             CHECK (type IN ('flyer','brochure','video','banner','social_post',
                                             'presentation','other')),
  file_url       TEXT,
  thumbnail_url  TEXT,
  description    TEXT,
  is_public      BOOLEAN     NOT NULL DEFAULT FALSE,
  download_count INTEGER     NOT NULL DEFAULT 0,
  created_by     UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.marketing_materials ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 9. MARKETING_MATERIAL_DOWNLOADS — Log download materi marketing
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.marketing_material_downloads (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id  UUID        NOT NULL REFERENCES public.marketing_materials(id) ON DELETE CASCADE,
  agent_id     UUID        REFERENCES public.agents(id) ON DELETE SET NULL,
  downloaded_by UUID       REFERENCES auth.users(id) ON DELETE SET NULL,
  ip_address   TEXT,
  downloaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.marketing_material_downloads ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_marketing_material_downloads_material_id ON public.marketing_material_downloads(material_id);

-- ---------------------------------------------------------------------------
-- 10. LOYALTY_TRANSACTIONS — Riwayat transaksi poin loyalitas
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.loyalty_transactions (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id     UUID        NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  type            TEXT        NOT NULL
                              CHECK (type IN ('earn','redeem','expire','adjust','bonus','transfer')),
  points          INTEGER     NOT NULL,
  balance_before  INTEGER     NOT NULL DEFAULT 0,
  balance_after   INTEGER     NOT NULL DEFAULT 0,
  reference_type  TEXT,
  reference_id    UUID,
  description     TEXT,
  expires_at      TIMESTAMPTZ,
  processed_by    UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_customer_id ON public.loyalty_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_type        ON public.loyalty_transactions(type);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_created_at  ON public.loyalty_transactions(created_at);

-- ---------------------------------------------------------------------------
-- 11. LOYALTY_REWARDS — Katalog hadiah yang bisa ditukar poin
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.loyalty_rewards (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT        NOT NULL,
  description      TEXT,
  photo_url        TEXT,
  reward_type      TEXT        NOT NULL DEFAULT 'voucher'
                               CHECK (reward_type IN ('voucher','discount','merchandise',
                                                       'upgrade','cashback','other')),
  points_required  INTEGER     NOT NULL,
  stock            INTEGER,
  is_limited       BOOLEAN     NOT NULL DEFAULT FALSE,
  valid_from       DATE,
  valid_until      DATE,
  is_active        BOOLEAN     NOT NULL DEFAULT TRUE,
  terms            TEXT,
  sort_order       INTEGER     NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.loyalty_rewards ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 12. LOYALTY_POINT_EXPIRY — Penjadwalan kadaluarsa poin
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.loyalty_point_expiry (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id    UUID        NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  points         INTEGER     NOT NULL,
  earned_at      TIMESTAMPTZ NOT NULL,
  expires_at     TIMESTAMPTZ NOT NULL,
  is_expired     BOOLEAN     NOT NULL DEFAULT FALSE,
  expired_at     TIMESTAMPTZ,
  reference_type TEXT,
  reference_id   UUID,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.loyalty_point_expiry ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_loyalty_point_expiry_customer_id ON public.loyalty_point_expiry(customer_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_point_expiry_expires_at  ON public.loyalty_point_expiry(expires_at);

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

SELECT '034_tables_crm_extended: OK' AS result;
