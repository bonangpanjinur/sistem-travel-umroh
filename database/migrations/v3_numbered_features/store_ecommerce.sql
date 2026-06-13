-- =============================================================================
-- MIGRASI STORE / TOKO E-COMMERCE — Vinstour Travel Portal
-- Meliputi: store_categories, store_products, store_orders, store_order_items, store_shipments
-- =============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 1. KATEGORI PRODUK TOKO
-- =============================================================================
CREATE TABLE IF NOT EXISTS store_categories (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  description TEXT,
  image_url   TEXT,
  is_active   BOOLEAN DEFAULT TRUE,
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_store_categories_active ON store_categories(is_active);
CREATE INDEX IF NOT EXISTS idx_store_categories_slug   ON store_categories(slug);

ALTER TABLE store_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_manage_store_categories" ON store_categories;
DROP POLICY IF EXISTS "public_read_store_categories"  ON store_categories;
CREATE POLICY "admin_manage_store_categories" ON store_categories
  FOR ALL USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin','owner','admin','marketing')));
CREATE POLICY "public_read_store_categories" ON store_categories
  FOR SELECT USING (is_active = TRUE);

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_store_categories_updated_at' AND tgrelid='store_categories'::regclass) THEN
  CREATE TRIGGER set_store_categories_updated_at BEFORE UPDATE ON store_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
END IF; END $$;

INSERT INTO store_categories (name, slug, description, sort_order) VALUES
  ('Perlengkapan Ibadah', 'perlengkapan-ibadah', 'Peralatan sholat, Al-Quran, tasbih dan lainnya', 1),
  ('Pakaian Ihram',       'pakaian-ihram',       'Kain ihram pria dan mukena wanita berkualitas', 2),
  ('Koper & Tas',         'koper-tas',            'Koper, tas kabin, dan tas ransel untuk perjalanan', 3),
  ('Kesehatan & Vitamin', 'kesehatan-vitamin',    'Suplemen, obat-obatan, dan kebutuhan kesehatan jamaah', 4),
  ('Buku & Panduan',      'buku-panduan',         'Buku doa, panduan manasik, dan literatur islami', 5),
  ('Souvenir',            'souvenir',             'Oleh-oleh dan souvenir dari Tanah Suci', 6)
ON CONFLICT (slug) DO NOTHING;

-- =============================================================================
-- 2. PRODUK TOKO
-- =============================================================================
CREATE TABLE IF NOT EXISTS store_products (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id    UUID REFERENCES store_categories(id) ON DELETE SET NULL,
  name           TEXT NOT NULL,
  slug           TEXT NOT NULL UNIQUE,
  description    TEXT,
  price          NUMERIC(15,2) NOT NULL DEFAULT 0,
  original_price NUMERIC(15,2),
  stock          INTEGER NOT NULL DEFAULT 0,
  weight_gram    INTEGER DEFAULT 0,
  images         JSONB DEFAULT '[]',
  is_active      BOOLEAN DEFAULT TRUE,
  is_featured    BOOLEAN DEFAULT FALSE,
  sold_count     INTEGER DEFAULT 0,
  sku            TEXT,
  branch_id      UUID REFERENCES branches(id) ON DELETE SET NULL,
  created_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_store_products_category  ON store_products(category_id);
CREATE INDEX IF NOT EXISTS idx_store_products_active    ON store_products(is_active);
CREATE INDEX IF NOT EXISTS idx_store_products_featured  ON store_products(is_featured);
CREATE INDEX IF NOT EXISTS idx_store_products_slug      ON store_products(slug);

ALTER TABLE store_products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_manage_store_products" ON store_products;
DROP POLICY IF EXISTS "public_read_store_products"  ON store_products;
CREATE POLICY "admin_manage_store_products" ON store_products
  FOR ALL USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin','owner','admin','marketing','operational')));
CREATE POLICY "public_read_store_products" ON store_products
  FOR SELECT USING (is_active = TRUE);

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_store_products_updated_at' AND tgrelid='store_products'::regclass) THEN
  CREATE TRIGGER set_store_products_updated_at BEFORE UPDATE ON store_products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
END IF; END $$;

-- =============================================================================
-- 3. PESANAN TOKO
-- =============================================================================
CREATE TABLE IF NOT EXISTS store_orders (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number     TEXT NOT NULL UNIQUE,
  customer_id      UUID REFERENCES customers(id) ON DELETE SET NULL,
  user_id          UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status           TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','confirmed','processing','shipped','delivered','cancelled','refunded')),
  payment_status   TEXT NOT NULL DEFAULT 'unpaid'
    CHECK (payment_status IN ('unpaid','paid','refunded')),
  subtotal         NUMERIC(15,2) NOT NULL DEFAULT 0,
  shipping_cost    NUMERIC(15,2) NOT NULL DEFAULT 0,
  discount_amount  NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_amount     NUMERIC(15,2) NOT NULL DEFAULT 0,
  shipping_name    TEXT,
  shipping_phone   TEXT,
  shipping_address TEXT,
  shipping_city    TEXT,
  shipping_province TEXT,
  shipping_postal  TEXT,
  notes            TEXT,
  payment_proof_url TEXT,
  paid_at          TIMESTAMPTZ,
  confirmed_at     TIMESTAMPTZ,
  confirmed_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  branch_id        UUID REFERENCES branches(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_store_orders_customer_id    ON store_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_store_orders_status         ON store_orders(status);
CREATE INDEX IF NOT EXISTS idx_store_orders_payment_status ON store_orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_store_orders_order_number   ON store_orders(order_number);
CREATE INDEX IF NOT EXISTS idx_store_orders_created_at     ON store_orders(created_at DESC);

ALTER TABLE store_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "customer_read_own_store_orders"   ON store_orders;
DROP POLICY IF EXISTS "customer_insert_store_orders"     ON store_orders;
DROP POLICY IF EXISTS "customer_update_own_store_orders" ON store_orders;
DROP POLICY IF EXISTS "admin_manage_store_orders"        ON store_orders;

CREATE POLICY "customer_read_own_store_orders" ON store_orders
  FOR SELECT USING (user_id = auth.uid() OR customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));
CREATE POLICY "customer_insert_store_orders" ON store_orders
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "customer_update_own_store_orders" ON store_orders
  FOR UPDATE USING (user_id = auth.uid() AND status = 'pending');
CREATE POLICY "admin_manage_store_orders" ON store_orders
  FOR ALL USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin','owner','admin','operational','finance')));

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_store_orders_updated_at' AND tgrelid='store_orders'::regclass) THEN
  CREATE TRIGGER set_store_orders_updated_at BEFORE UPDATE ON store_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
END IF; END $$;

-- Function generate order number
CREATE OR REPLACE FUNCTION generate_store_order_number()
RETURNS TEXT AS $$
DECLARE v_number TEXT;
BEGIN
  v_number := 'TK-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 99999 + 1)::TEXT, 5, '0');
  WHILE EXISTS (SELECT 1 FROM store_orders WHERE order_number = v_number) LOOP
    v_number := 'TK-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 99999 + 1)::TEXT, 5, '0');
  END LOOP;
  RETURN v_number;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 4. ITEM PESANAN
-- =============================================================================
CREATE TABLE IF NOT EXISTS store_order_items (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id    UUID NOT NULL REFERENCES store_orders(id) ON DELETE CASCADE,
  product_id  UUID NOT NULL REFERENCES store_products(id) ON DELETE RESTRICT,
  product_name TEXT NOT NULL,
  product_image TEXT,
  quantity    INTEGER NOT NULL DEFAULT 1,
  unit_price  NUMERIC(15,2) NOT NULL,
  subtotal    NUMERIC(15,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_store_order_items_order_id   ON store_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_store_order_items_product_id ON store_order_items(product_id);

ALTER TABLE store_order_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "customer_read_own_order_items" ON store_order_items;
DROP POLICY IF EXISTS "customer_insert_order_items"   ON store_order_items;
DROP POLICY IF EXISTS "admin_manage_order_items"      ON store_order_items;

CREATE POLICY "customer_read_own_order_items" ON store_order_items
  FOR SELECT USING (order_id IN (SELECT id FROM store_orders WHERE user_id = auth.uid() OR customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())));
CREATE POLICY "customer_insert_order_items" ON store_order_items
  FOR INSERT WITH CHECK (order_id IN (SELECT id FROM store_orders WHERE user_id = auth.uid()));
CREATE POLICY "admin_manage_order_items" ON store_order_items
  FOR ALL USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin','owner','admin','operational','finance')));

-- =============================================================================
-- 5. PENGIRIMAN / TRACKING
-- =============================================================================
CREATE TABLE IF NOT EXISTS store_shipments (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id        UUID NOT NULL REFERENCES store_orders(id) ON DELETE CASCADE UNIQUE,
  courier_name    TEXT NOT NULL,
  courier_service TEXT,
  tracking_number TEXT,
  shipped_at      TIMESTAMPTZ,
  estimated_arrival DATE,
  delivered_at    TIMESTAMPTZ,
  status          TEXT NOT NULL DEFAULT 'preparing'
    CHECK (status IN ('preparing','picked_up','in_transit','out_for_delivery','delivered','failed','returned')),
  notes           TEXT,
  created_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_store_shipments_order_id        ON store_shipments(order_id);
CREATE INDEX IF NOT EXISTS idx_store_shipments_tracking_number ON store_shipments(tracking_number);
CREATE INDEX IF NOT EXISTS idx_store_shipments_status          ON store_shipments(status);

ALTER TABLE store_shipments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "customer_read_own_shipment" ON store_shipments;
DROP POLICY IF EXISTS "admin_manage_shipments"     ON store_shipments;

CREATE POLICY "customer_read_own_shipment" ON store_shipments
  FOR SELECT USING (order_id IN (SELECT id FROM store_orders WHERE user_id = auth.uid() OR customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())));
CREATE POLICY "admin_manage_shipments" ON store_shipments
  FOR ALL USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin','owner','admin','operational')));

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_store_shipments_updated_at' AND tgrelid='store_shipments'::regclass) THEN
  CREATE TRIGGER set_store_shipments_updated_at BEFORE UPDATE ON store_shipments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
END IF; END $$;

-- =============================================================================
-- 6. MENU ITEMS untuk Toko
-- =============================================================================
INSERT INTO menu_items (key, label, path, icon, group_name, sort_order, required_permission, is_visible) VALUES
  ('store',            'Toko Online',      '/admin/store',            'ShoppingBag',  'Penjualan', 210, 'store',            true),
  ('store-products',   'Produk Toko',      '/admin/store/products',   'Package',      'Penjualan', 211, 'store-products',   true),
  ('store-orders',     'Pesanan Toko',     '/admin/store/orders',     'ShoppingCart', 'Penjualan', 212, 'store-orders',     true),
  ('store-categories', 'Kategori Produk',  '/admin/store/categories', 'Tag',          'Penjualan', 213, 'store-categories', true)
ON CONFLICT (key) DO UPDATE SET
  label = EXCLUDED.label, path = EXCLUDED.path, icon = EXCLUDED.icon,
  group_name = EXCLUDED.group_name, sort_order = EXCLUDED.sort_order,
  required_permission = EXCLUDED.required_permission, is_visible = EXCLUDED.is_visible;

INSERT INTO role_permissions (role, permission_key)
SELECT r.role, p.perm
FROM (VALUES ('super_admin'),('owner'),('admin'),('marketing'),('operational')) AS r(role)
CROSS JOIN (VALUES ('store'),('store-products'),('store-orders'),('store-categories')) AS p(perm)
ON CONFLICT DO NOTHING;

-- =============================================================================
-- SELESAI — Store E-Commerce migration completed
-- =============================================================================
SELECT 'Store E-Commerce migration completed' AS result;
