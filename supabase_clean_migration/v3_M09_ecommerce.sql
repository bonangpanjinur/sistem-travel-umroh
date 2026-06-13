-- =============================================================================
-- VINSTOUR TRAVEL PORTAL — Master Migration v3
-- FILE M09: E-Commerce — Toko Online, Produk, Pesanan, Pengiriman, Ulasan
-- Depends on: M01–M05
-- =============================================================================

-- =============================================================================
-- 1. STORE_CATEGORIES — Kategori produk toko
-- =============================================================================
CREATE TABLE IF NOT EXISTS store_categories (
  id          UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT NOT NULL,
  slug        TEXT UNIQUE,
  description TEXT,
  image_url   TEXT,
  parent_id   UUID REFERENCES store_categories(id) ON DELETE SET NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_store_categories_parent_id ON store_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_store_categories_is_active ON store_categories(is_active);
CREATE INDEX IF NOT EXISTS idx_store_categories_slug      ON store_categories(slug);

ALTER TABLE store_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "store_categories_public_read"   ON store_categories;
DROP POLICY IF EXISTS "store_categories_admin_write"   ON store_categories;

CREATE POLICY "store_categories_public_read" ON store_categories
  FOR SELECT USING (is_active = TRUE);

CREATE POLICY "store_categories_admin_write" ON store_categories
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','admin','branch_manager','it'))
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_store_categories_updated_at'
    AND tgrelid='store_categories'::regclass) THEN
    CREATE TRIGGER set_store_categories_updated_at
      BEFORE UPDATE ON store_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

GRANT SELECT ON store_categories TO anon, authenticated;


-- =============================================================================
-- 2. STORE_PRODUCTS — Produk toko
-- =============================================================================
CREATE TABLE IF NOT EXISTS store_products (
  id                UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id       UUID REFERENCES store_categories(id) ON DELETE SET NULL,
  sku               TEXT UNIQUE,
  name              TEXT NOT NULL,
  slug              TEXT UNIQUE,
  description       TEXT,
  short_description TEXT,
  price             NUMERIC(15,2) NOT NULL DEFAULT 0,
  sale_price        NUMERIC(15,2),
  cost_price        NUMERIC(15,2),
  weight_gram       INTEGER,
  stock             INTEGER NOT NULL DEFAULT 0,
  min_order         INTEGER NOT NULL DEFAULT 1,
  max_order         INTEGER,
  images            TEXT[] DEFAULT '{}',
  thumbnail_url     TEXT,
  tags              TEXT[] DEFAULT '{}',
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  is_featured       BOOLEAN NOT NULL DEFAULT FALSE,
  sold_count        INTEGER NOT NULL DEFAULT 0,
  rating_avg        NUMERIC(3,2) DEFAULT 0,
  rating_count      INTEGER NOT NULL DEFAULT 0,
  sort_order        INTEGER NOT NULL DEFAULT 0,
  meta_title        TEXT,
  meta_description  TEXT,
  branch_id         UUID REFERENCES branches(id) ON DELETE SET NULL,
  created_by        UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_store_products_category_id ON store_products(category_id);
CREATE INDEX IF NOT EXISTS idx_store_products_sku         ON store_products(sku);
CREATE INDEX IF NOT EXISTS idx_store_products_slug        ON store_products(slug);
CREATE INDEX IF NOT EXISTS idx_store_products_is_active   ON store_products(is_active);
CREATE INDEX IF NOT EXISTS idx_store_products_is_featured ON store_products(is_featured);

ALTER TABLE store_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "store_products_public_read"   ON store_products;
DROP POLICY IF EXISTS "store_products_auth_read"     ON store_products;
DROP POLICY IF EXISTS "store_products_staff_write"   ON store_products;

CREATE POLICY "store_products_public_read" ON store_products
  FOR SELECT USING (is_active = TRUE);

CREATE POLICY "store_products_auth_read" ON store_products
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "store_products_staff_write" ON store_products
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','admin','branch_manager','it'))
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_store_products_updated_at'
    AND tgrelid='store_products'::regclass) THEN
    CREATE TRIGGER set_store_products_updated_at
      BEFORE UPDATE ON store_products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

GRANT SELECT ON store_products TO anon, authenticated;


-- =============================================================================
-- 3. STORE_PRODUCT_VARIANTS — Varian produk (ukuran, warna, dll)
-- =============================================================================
CREATE TABLE IF NOT EXISTS store_product_variants (
  id           UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id   UUID NOT NULL REFERENCES store_products(id) ON DELETE CASCADE,
  sku          TEXT UNIQUE,
  name         TEXT NOT NULL,
  attributes   JSONB DEFAULT '{}'::JSONB,
  price        NUMERIC(15,2),
  sale_price   NUMERIC(15,2),
  stock        INTEGER NOT NULL DEFAULT 0,
  weight_gram  INTEGER,
  image_url    TEXT,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_store_variants_product_id ON store_product_variants(product_id);

ALTER TABLE store_product_variants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "store_variants_public_read"  ON store_product_variants;
DROP POLICY IF EXISTS "store_variants_staff_write"  ON store_product_variants;

CREATE POLICY "store_variants_public_read" ON store_product_variants
  FOR SELECT USING (is_active = TRUE);

CREATE POLICY "store_variants_staff_write" ON store_product_variants
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','admin','branch_manager','it'))
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_store_variants_updated_at'
    AND tgrelid='store_product_variants'::regclass) THEN
    CREATE TRIGGER set_store_variants_updated_at
      BEFORE UPDATE ON store_product_variants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

GRANT SELECT ON store_product_variants TO anon, authenticated;


-- =============================================================================
-- 4. STORE_ORDERS — Pesanan toko
-- =============================================================================
CREATE TABLE IF NOT EXISTS store_orders (
  id               UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number     TEXT UNIQUE,
  customer_id      UUID REFERENCES customers(id) ON DELETE SET NULL,
  user_id          UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  branch_id        UUID REFERENCES branches(id) ON DELETE SET NULL,
  status           TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','confirmed','processing','shipped','delivered','cancelled','refunded')),
  payment_status   TEXT NOT NULL DEFAULT 'unpaid'
    CHECK (payment_status IN ('unpaid','partial','paid','refunded')),
  total_amount     NUMERIC(15,2) NOT NULL DEFAULT 0,
  paid_amount      NUMERIC(15,2) NOT NULL DEFAULT 0,
  discount_amount  NUMERIC(15,2) NOT NULL DEFAULT 0,
  shipping_cost    NUMERIC(15,2) NOT NULL DEFAULT 0,
  coupon_code      TEXT,
  shipping_name    TEXT,
  shipping_phone   TEXT,
  shipping_address TEXT,
  shipping_city    TEXT,
  shipping_province TEXT,
  shipping_postal  TEXT,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_store_orders_customer_id  ON store_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_store_orders_user_id      ON store_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_store_orders_status       ON store_orders(status);
CREATE INDEX IF NOT EXISTS idx_store_orders_order_number ON store_orders(order_number);
CREATE INDEX IF NOT EXISTS idx_store_orders_created_at   ON store_orders(created_at DESC);

ALTER TABLE store_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "store_orders_staff_manage" ON store_orders;
DROP POLICY IF EXISTS "store_orders_own_manage"   ON store_orders;

CREATE POLICY "store_orders_staff_manage" ON store_orders
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','admin','branch_manager','it'))
  );

CREATE POLICY "store_orders_own_manage" ON store_orders
  FOR ALL USING (
    user_id = auth.uid() OR
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_store_orders_updated_at'
    AND tgrelid='store_orders'::regclass) THEN
    CREATE TRIGGER set_store_orders_updated_at
      BEFORE UPDATE ON store_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

GRANT SELECT, INSERT ON store_orders TO authenticated;


-- =============================================================================
-- 5. STORE_ORDER_ITEMS — Item dalam pesanan toko
-- =============================================================================
CREATE TABLE IF NOT EXISTS store_order_items (
  id           UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id     UUID NOT NULL REFERENCES store_orders(id) ON DELETE CASCADE,
  product_id   UUID NOT NULL REFERENCES store_products(id) ON DELETE RESTRICT,
  variant_id   UUID REFERENCES store_product_variants(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  variant_name TEXT,
  qty          INTEGER NOT NULL DEFAULT 1,
  unit_price   NUMERIC(15,2) NOT NULL DEFAULT 0,
  subtotal     NUMERIC(15,2) GENERATED ALWAYS AS (unit_price * qty) STORED,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_store_order_items_order_id   ON store_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_store_order_items_product_id ON store_order_items(product_id);

ALTER TABLE store_order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "store_order_items_staff_manage" ON store_order_items;
DROP POLICY IF EXISTS "store_order_items_own_read"     ON store_order_items;

CREATE POLICY "store_order_items_staff_manage" ON store_order_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','admin','branch_manager','it'))
  );

CREATE POLICY "store_order_items_own_read" ON store_order_items
  FOR SELECT USING (
    order_id IN (
      SELECT id FROM store_orders
      WHERE user_id = auth.uid() OR
        customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
    )
  );

GRANT SELECT, INSERT ON store_order_items TO authenticated;


-- =============================================================================
-- 6. STORE_ORDER_PAYMENTS — Pembayaran pesanan toko
-- =============================================================================
CREATE TABLE IF NOT EXISTS store_order_payments (
  id              UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id        UUID NOT NULL REFERENCES store_orders(id) ON DELETE CASCADE,
  amount          NUMERIC(15,2) NOT NULL,
  method          TEXT NOT NULL DEFAULT 'transfer'
    CHECK (method IN ('transfer','cash','qris','virtual_account','credit_card','other')),
  proof_url       TEXT,
  status          TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','verified','rejected')),
  verified_by     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  verified_at     TIMESTAMPTZ,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_store_order_payments_order_id ON store_order_payments(order_id);

ALTER TABLE store_order_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "store_order_payments_staff_manage" ON store_order_payments;
DROP POLICY IF EXISTS "store_order_payments_own_add"      ON store_order_payments;

CREATE POLICY "store_order_payments_staff_manage" ON store_order_payments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','admin','branch_manager','finance','it'))
  );

CREATE POLICY "store_order_payments_own_add" ON store_order_payments
  FOR INSERT WITH CHECK (
    order_id IN (
      SELECT id FROM store_orders
      WHERE user_id = auth.uid() OR
        customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
    )
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_store_order_payments_updated_at'
    AND tgrelid='store_order_payments'::regclass) THEN
    CREATE TRIGGER set_store_order_payments_updated_at
      BEFORE UPDATE ON store_order_payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

GRANT SELECT, INSERT ON store_order_payments TO authenticated;


-- =============================================================================
-- 7. STORE_SHIPMENTS — Data pengiriman pesanan
-- =============================================================================
CREATE TABLE IF NOT EXISTS store_shipments (
  id             UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id       UUID NOT NULL REFERENCES store_orders(id) ON DELETE CASCADE,
  courier        TEXT NOT NULL,
  service        TEXT,
  tracking_code  TEXT,
  tracking_url   TEXT,
  status         TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','picked_up','in_transit','delivered','returned','failed')),
  estimated_days INTEGER,
  shipped_at     TIMESTAMPTZ,
  delivered_at   TIMESTAMPTZ,
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_store_shipments_order_id      ON store_shipments(order_id);
CREATE INDEX IF NOT EXISTS idx_store_shipments_tracking_code ON store_shipments(tracking_code);

ALTER TABLE store_shipments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "store_shipments_staff_manage" ON store_shipments;
DROP POLICY IF EXISTS "store_shipments_own_read"     ON store_shipments;

CREATE POLICY "store_shipments_staff_manage" ON store_shipments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','admin','branch_manager','it'))
  );

CREATE POLICY "store_shipments_own_read" ON store_shipments
  FOR SELECT USING (
    order_id IN (
      SELECT id FROM store_orders
      WHERE user_id = auth.uid() OR
        customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
    )
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_store_shipments_updated_at'
    AND tgrelid='store_shipments'::regclass) THEN
    CREATE TRIGGER set_store_shipments_updated_at
      BEFORE UPDATE ON store_shipments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

GRANT SELECT ON store_shipments TO authenticated;


-- =============================================================================
-- 8. STORE_PRODUCT_REVIEWS — Ulasan produk toko
-- =============================================================================
CREATE TABLE IF NOT EXISTS store_product_reviews (
  id              UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id      UUID NOT NULL REFERENCES store_products(id) ON DELETE CASCADE,
  order_id        UUID REFERENCES store_orders(id) ON DELETE SET NULL,
  customer_id     UUID REFERENCES customers(id) ON DELETE SET NULL,
  user_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  rating          INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title           TEXT,
  body            TEXT,
  images          TEXT[] DEFAULT '{}',
  is_verified     BOOLEAN NOT NULL DEFAULT FALSE,
  is_published    BOOLEAN NOT NULL DEFAULT FALSE,
  helpful_count   INTEGER NOT NULL DEFAULT 0,
  reply_text      TEXT,
  replied_at      TIMESTAMPTZ,
  replied_by      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_store_reviews_product_id ON store_product_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_store_reviews_customer_id ON store_product_reviews(customer_id);
CREATE INDEX IF NOT EXISTS idx_store_reviews_rating     ON store_product_reviews(rating);
CREATE INDEX IF NOT EXISTS idx_store_reviews_published  ON store_product_reviews(is_published);

ALTER TABLE store_product_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "store_reviews_public_read"   ON store_product_reviews;
DROP POLICY IF EXISTS "store_reviews_auth_add"      ON store_product_reviews;
DROP POLICY IF EXISTS "store_reviews_staff_manage"  ON store_product_reviews;

CREATE POLICY "store_reviews_public_read" ON store_product_reviews
  FOR SELECT USING (is_published = TRUE);

CREATE POLICY "store_reviews_auth_add" ON store_product_reviews
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "store_reviews_staff_manage" ON store_product_reviews
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','admin','branch_manager','it'))
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_store_reviews_updated_at'
    AND tgrelid='store_product_reviews'::regclass) THEN
    CREATE TRIGGER set_store_reviews_updated_at
      BEFORE UPDATE ON store_product_reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

GRANT SELECT ON store_product_reviews TO anon, authenticated;


-- =============================================================================
-- SELESAI — File M09: E-Commerce
-- =============================================================================
SELECT 'v3_M09_ecommerce: OK' AS result;
