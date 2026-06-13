-- =============================================================================
-- v2_P11 — Store, Marketing, Settings, Loyalty, Wallets, Referral, QR
-- Modul : E-Commerce & Pertumbuhan
-- Aman  : CREATE TABLE IF NOT EXISTS
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. STORE CATEGORIES & PRODUCTS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS store_categories (
  id         UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  name       TEXT    NOT NULL,
  slug       TEXT    UNIQUE,
  icon       TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active  BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO store_categories (name, slug, sort_order) VALUES
  ('Perlengkapan Umroh', 'perlengkapan-umroh', 1),
  ('Busana Muslim',      'busana-muslim',       2),
  ('Oleh-oleh',          'oleh-oleh',           3),
  ('Aksesoris',          'aksesoris',           4)
ON CONFLICT (slug) DO NOTHING;

CREATE TABLE IF NOT EXISTS store_products (
  id               UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id      UUID    REFERENCES store_categories(id) ON DELETE SET NULL,
  branch_id        UUID    REFERENCES branches(id) ON DELETE SET NULL,
  sku              TEXT    UNIQUE,
  name             TEXT    NOT NULL,
  description      TEXT,
  price            NUMERIC(15,2) NOT NULL DEFAULT 0,
  sale_price       NUMERIC(15,2),
  stock            INTEGER NOT NULL DEFAULT 0,
  weight_gram      INTEGER DEFAULT 0,
  thumbnail_url    TEXT,
  gallery_urls     JSONB   DEFAULT '[]',
  is_active        BOOLEAN DEFAULT TRUE,
  is_featured      BOOLEAN DEFAULT FALSE,
  attributes       JSONB   DEFAULT '{}',
  sold_count       INTEGER DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sp_category_id ON store_products(category_id);
CREATE INDEX IF NOT EXISTS idx_sp_is_active   ON store_products(is_active);

ALTER TABLE store_products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sp_admin_manage" ON store_products;
DROP POLICY IF EXISTS "sp_public_read"  ON store_products;

CREATE POLICY "sp_admin_manage" ON store_products
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','equipment','operational'))
  );

CREATE POLICY "sp_public_read" ON store_products
  FOR SELECT USING (is_active = TRUE);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_sp_updated_at'
    AND tgrelid='store_products'::regclass) THEN
    CREATE TRIGGER set_sp_updated_at
      BEFORE UPDATE ON store_products
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2. STORE ORDERS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS store_orders (
  id             UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number   TEXT    NOT NULL UNIQUE,
  customer_id    UUID    REFERENCES customers(id) ON DELETE SET NULL,
  user_id        UUID    REFERENCES auth.users(id) ON DELETE SET NULL,
  branch_id      UUID    REFERENCES branches(id) ON DELETE SET NULL,
  status         TEXT    NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending','confirmed','packed','shipped','delivered','cancelled','refunded')),
  subtotal       NUMERIC(15,2) NOT NULL DEFAULT 0,
  shipping_cost  NUMERIC(15,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_amount   NUMERIC(15,2) NOT NULL DEFAULT 0,
  payment_status TEXT    DEFAULT 'unpaid'
                         CHECK (payment_status IN ('unpaid','partially_paid','paid','refunded')),
  shipping_address JSONB DEFAULT '{}',
  courier        TEXT,
  tracking_number TEXT,
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_so_customer_id ON store_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_so_status      ON store_orders(status);
CREATE INDEX IF NOT EXISTS idx_so_created_at  ON store_orders(created_at DESC);

ALTER TABLE store_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "so_admin_manage" ON store_orders;
DROP POLICY IF EXISTS "so_own_read"     ON store_orders;

CREATE POLICY "so_admin_manage" ON store_orders
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','equipment','operational'))
  );

CREATE POLICY "so_own_read" ON store_orders
  FOR SELECT USING (user_id = auth.uid());

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_so_updated_at'
    AND tgrelid='store_orders'::regclass) THEN
    CREATE TRIGGER set_so_updated_at
      BEFORE UPDATE ON store_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS store_order_items (
  id           UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id     UUID    NOT NULL REFERENCES store_orders(id) ON DELETE CASCADE,
  product_id   UUID    REFERENCES store_products(id) ON DELETE SET NULL,
  product_name TEXT    NOT NULL,
  sku          TEXT,
  quantity     INTEGER NOT NULL DEFAULT 1,
  unit_price   NUMERIC(15,2) NOT NULL DEFAULT 0,
  subtotal     NUMERIC(15,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  attributes   JSONB   DEFAULT '{}',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_soi_order_id ON store_order_items(order_id);

-- ---------------------------------------------------------------------------
-- 3. SETTINGS & KONFIGURASI
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS app_settings (
  key         TEXT    PRIMARY KEY,
  value       TEXT    NOT NULL,
  description TEXT,
  is_public   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "app_settings_admin_manage"  ON app_settings;
DROP POLICY IF EXISTS "app_settings_public_read"   ON app_settings;

CREATE POLICY "app_settings_admin_manage" ON app_settings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin'))
  );

CREATE POLICY "app_settings_public_read" ON app_settings
  FOR SELECT USING (is_public = TRUE);

CREATE TABLE IF NOT EXISTS website_settings (
  id                UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id         UUID    UNIQUE REFERENCES branches(id) ON DELETE CASCADE,
  slug              TEXT    UNIQUE,
  title             TEXT,
  tagline           TEXT,
  profile_photo_url TEXT,
  banner_url        TEXT,
  bio               TEXT,
  testimonials      JSONB   DEFAULT '[]',
  gallery_urls      JSONB   DEFAULT '[]',
  seo_title         TEXT,
  seo_description   TEXT,
  view_count        INTEGER DEFAULT 0,
  social_facebook   TEXT,
  social_instagram  TEXT,
  social_youtube    TEXT,
  social_tiktok     TEXT,
  maps_embed_url    TEXT,
  chat_bubble_color TEXT    NOT NULL DEFAULT 'violet',
  layout_variant    JSONB   DEFAULT '{}',
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ws_branch_id ON website_settings(branch_id);
CREATE INDEX IF NOT EXISTS idx_ws_slug      ON website_settings(slug);

ALTER TABLE website_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ws_admin_manage"  ON website_settings;
DROP POLICY IF EXISTS "ws_public_read"   ON website_settings;

CREATE POLICY "ws_admin_manage" ON website_settings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','branch_manager','marketing'))
  );

CREATE POLICY "ws_public_read" ON website_settings
  FOR SELECT USING (TRUE);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_ws_updated_at'
    AND tgrelid='website_settings'::regclass) THEN
    CREATE TRIGGER set_ws_updated_at
      BEFORE UPDATE ON website_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS banners (
  id         UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  title      TEXT    NOT NULL,
  subtitle   TEXT,
  image_url  TEXT,
  link_url   TEXT,
  link_text  TEXT,
  position   TEXT    DEFAULT 'home_hero',
  is_active  BOOLEAN DEFAULT TRUE,
  starts_at  TIMESTAMPTZ,
  ends_at    TIMESTAMPTZ,
  branch_id  UUID    REFERENCES branches(id) ON DELETE SET NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_banners_is_active ON banners(is_active);

CREATE TABLE IF NOT EXISTS coupons (
  id             UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  code           TEXT    NOT NULL UNIQUE,
  name           TEXT    NOT NULL,
  discount_type  TEXT    NOT NULL CHECK (discount_type IN ('percentage','fixed')),
  discount_value NUMERIC(15,2) NOT NULL DEFAULT 0,
  min_purchase   NUMERIC(15,2) DEFAULT 0,
  max_discount   NUMERIC(15,2),
  quota          INTEGER DEFAULT 1,
  used_count     INTEGER DEFAULT 0,
  is_active      BOOLEAN DEFAULT TRUE,
  valid_from     DATE,
  valid_until    DATE,
  created_by     UUID    REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "coupons_admin_manage"  ON coupons;
DROP POLICY IF EXISTS "coupons_public_read"   ON coupons;

CREATE POLICY "coupons_admin_manage" ON coupons
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','marketing'))
  );

CREATE POLICY "coupons_public_read" ON coupons
  FOR SELECT USING (is_active = TRUE AND CURRENT_DATE BETWEEN valid_from AND valid_until);

-- ---------------------------------------------------------------------------
-- 4. LOYALTY PROGRAM — TABEL BARU
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS loyalty_rewards (
  id           UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id  UUID    NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  total_points INTEGER NOT NULL DEFAULT 0,
  tier         TEXT    DEFAULT 'bronze'
                       CHECK (tier IN ('bronze','silver','gold','platinum')),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (customer_id)
);
CREATE INDEX IF NOT EXISTS idx_lr_customer_id ON loyalty_rewards(customer_id);

ALTER TABLE loyalty_rewards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "loyalty_staff_manage"  ON loyalty_rewards;
DROP POLICY IF EXISTS "loyalty_own_read"      ON loyalty_rewards;

CREATE POLICY "loyalty_staff_manage" ON loyalty_rewards
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','sales','marketing'))
  );

CREATE POLICY "loyalty_own_read" ON loyalty_rewards
  FOR SELECT USING (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  );

CREATE TABLE IF NOT EXISTS loyalty_transactions (
  id            UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id   UUID    NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  type          TEXT    NOT NULL CHECK (type IN ('earn','redeem','expire','bonus')),
  points        INTEGER NOT NULL DEFAULT 0,
  balance_after INTEGER NOT NULL DEFAULT 0,
  description   TEXT    NOT NULL,
  reference_id  UUID,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_lt_customer_id ON loyalty_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_lt_created_at  ON loyalty_transactions(created_at DESC);

ALTER TABLE loyalty_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "lt_staff_manage"  ON loyalty_transactions;
DROP POLICY IF EXISTS "lt_own_read"      ON loyalty_transactions;

CREATE POLICY "lt_staff_manage" ON loyalty_transactions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','sales'))
  );

CREATE POLICY "lt_own_read" ON loyalty_transactions
  FOR SELECT USING (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- 5. AGENT WALLETS — TABEL BARU
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS agent_wallets (
  id         UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id   UUID    NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  balance    NUMERIC(15,2) NOT NULL DEFAULT 0,
  currency   TEXT    DEFAULT 'IDR',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (agent_id)
);

ALTER TABLE agent_wallets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "aw_admin_manage"  ON agent_wallets;
DROP POLICY IF EXISTS "aw_own_read"      ON agent_wallets;

CREATE POLICY "aw_admin_manage" ON agent_wallets
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','finance'))
  );

CREATE POLICY "aw_own_read" ON agent_wallets
  FOR SELECT USING (
    agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_aw_updated_at'
    AND tgrelid='agent_wallets'::regclass) THEN
    CREATE TRIGGER set_aw_updated_at
      BEFORE UPDATE ON agent_wallets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS agent_wallet_transactions (
  id             UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_id      UUID    NOT NULL REFERENCES agent_wallets(id) ON DELETE CASCADE,
  type           TEXT    NOT NULL CHECK (type IN ('credit','debit')),
  amount         NUMERIC(15,2) NOT NULL DEFAULT 0,
  balance_after  NUMERIC(15,2) NOT NULL DEFAULT 0,
  description    TEXT    NOT NULL,
  reference_id   UUID,
  reference_type TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_awt_wallet_id  ON agent_wallet_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_awt_created_at ON agent_wallet_transactions(created_at DESC);

ALTER TABLE agent_wallet_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "awt_admin_manage"  ON agent_wallet_transactions;
DROP POLICY IF EXISTS "awt_own_read"      ON agent_wallet_transactions;

CREATE POLICY "awt_admin_manage" ON agent_wallet_transactions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','finance'))
  );

CREATE POLICY "awt_own_read" ON agent_wallet_transactions
  FOR SELECT USING (
    wallet_id IN (
      SELECT id FROM agent_wallets WHERE agent_id IN (
        SELECT id FROM agents WHERE user_id = auth.uid()
      )
    )
  );

-- ---------------------------------------------------------------------------
-- 6. JAMAAH QR CODES — TABEL BARU
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS jamaah_qr_codes (
  id           UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id  UUID    NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  departure_id UUID    REFERENCES departures(id) ON DELETE SET NULL,
  qr_token     TEXT    NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  qr_type      TEXT    DEFAULT 'identity'
                       CHECK (qr_type IN ('identity','checkin','emergency','document')),
  expires_at   TIMESTAMPTZ,
  is_active    BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_qr_customer_id  ON jamaah_qr_codes(customer_id);
CREATE INDEX IF NOT EXISTS idx_qr_departure_id ON jamaah_qr_codes(departure_id);
CREATE INDEX IF NOT EXISTS idx_qr_token        ON jamaah_qr_codes(qr_token);

ALTER TABLE jamaah_qr_codes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "qr_staff_manage"  ON jamaah_qr_codes;
DROP POLICY IF EXISTS "qr_own_read"      ON jamaah_qr_codes;
DROP POLICY IF EXISTS "qr_public_verify" ON jamaah_qr_codes;

CREATE POLICY "qr_staff_manage" ON jamaah_qr_codes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','operational'))
  );

CREATE POLICY "qr_own_read" ON jamaah_qr_codes
  FOR SELECT USING (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  );

CREATE POLICY "qr_public_verify" ON jamaah_qr_codes
  FOR SELECT USING (is_active = TRUE);

-- ---------------------------------------------------------------------------
-- 7. REFERRAL CODES & USAGES — TABEL BARU
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS referral_codes (
  id             UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  code           TEXT    NOT NULL UNIQUE,
  customer_id    UUID    REFERENCES customers(id) ON DELETE CASCADE,
  agent_id       UUID    REFERENCES agents(id)   ON DELETE CASCADE,
  discount_type  TEXT    DEFAULT 'percentage'
                         CHECK (discount_type IN ('percentage','fixed')),
  discount_value NUMERIC(5,2) DEFAULT 0,
  usage_limit    INTEGER DEFAULT 0,
  used_count     INTEGER DEFAULT 0,
  is_active      BOOLEAN DEFAULT TRUE,
  expires_at     TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rc_customer_id ON referral_codes(customer_id);
CREATE INDEX IF NOT EXISTS idx_rc_agent_id    ON referral_codes(agent_id);

CREATE TABLE IF NOT EXISTS referral_usages (
  id               UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  referral_code_id UUID    NOT NULL REFERENCES referral_codes(id) ON DELETE CASCADE,
  booking_id       UUID    REFERENCES bookings(id) ON DELETE SET NULL,
  customer_id      UUID    REFERENCES customers(id) ON DELETE CASCADE,
  discount_given   NUMERIC(15,2) DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ru_code_id     ON referral_usages(referral_code_id);
CREATE INDEX IF NOT EXISTS idx_ru_customer_id ON referral_usages(customer_id);

ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rc_staff_manage"  ON referral_codes;
DROP POLICY IF EXISTS "rc_own_read"      ON referral_codes;

CREATE POLICY "rc_staff_manage" ON referral_codes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','marketing','sales'))
  );

CREATE POLICY "rc_own_read" ON referral_codes
  FOR SELECT USING (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
    OR agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- 8. MEDIA_GALLERY
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS media_gallery (
  id            UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  type          TEXT    NOT NULL DEFAULT 'general'
                        CHECK (type IN ('hotel','package','departure','general')),
  media_type    TEXT    DEFAULT 'image' CHECK (media_type IN ('image','video')),
  title         TEXT,
  description   TEXT,
  media_url     TEXT    NOT NULL,
  thumbnail_url TEXT,
  hotel_id      UUID    REFERENCES hotels(id)     ON DELETE SET NULL,
  package_id    UUID    REFERENCES packages(id)   ON DELETE SET NULL,
  departure_id  UUID    REFERENCES departures(id) ON DELETE SET NULL,
  sort_order    INTEGER DEFAULT 0,
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mg_type        ON media_gallery(type);
CREATE INDEX IF NOT EXISTS idx_mg_package_id  ON media_gallery(package_id);
CREATE INDEX IF NOT EXISTS idx_mg_hotel_id    ON media_gallery(hotel_id);

ALTER TABLE media_gallery ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mg_admin_manage"  ON media_gallery;
DROP POLICY IF EXISTS "mg_public_read"   ON media_gallery;

CREATE POLICY "mg_admin_manage" ON media_gallery
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','marketing','operational'))
  );

CREATE POLICY "mg_public_read" ON media_gallery
  FOR SELECT USING (is_active = TRUE);

