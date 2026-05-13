-- =============================================================================
-- PATCHES ONLY — Untuk Existing Install (sudah ada fase 1-20)
-- Jalankan ini jika database sudah ada tapi belum punya fitur terbaru.
-- Aman di-run ulang (IF NOT EXISTS / CREATE OR REPLACE)
-- =============================================================================


-- ─── 024_store_ecommerce.sql ───────────────────────────────────────────────────────
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


-- ─── 025_store_product_reviews.sql ───────────────────────────────────────────────────────
-- =============================================================================
-- MIGRASI: store_product_reviews — Ulasan & Rating Produk Toko
-- Jamaah dapat memberikan ulasan per produk setelah pesanan berstatus 'delivered'
-- =============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS store_product_reviews (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id     UUID NOT NULL REFERENCES store_orders(id) ON DELETE CASCADE,
  product_id   UUID NOT NULL REFERENCES store_products(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id  UUID REFERENCES customers(id) ON DELETE SET NULL,
  rating       SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment      TEXT,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  admin_reply  TEXT,
  admin_reply_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (order_id, product_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_spr_product_id  ON store_product_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_spr_order_id    ON store_product_reviews(order_id);
CREATE INDEX IF NOT EXISTS idx_spr_user_id     ON store_product_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_spr_is_published ON store_product_reviews(is_published);
CREATE INDEX IF NOT EXISTS idx_spr_rating      ON store_product_reviews(rating);

ALTER TABLE store_product_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customer_insert_review"   ON store_product_reviews;
DROP POLICY IF EXISTS "customer_update_review"   ON store_product_reviews;
DROP POLICY IF EXISTS "customer_read_own_review" ON store_product_reviews;
DROP POLICY IF EXISTS "public_read_reviews"      ON store_product_reviews;
DROP POLICY IF EXISTS "admin_manage_reviews"     ON store_product_reviews;

-- Jamaah bisa submit ulasan untuk pesanan miliknya
CREATE POLICY "customer_insert_review" ON store_product_reviews
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Jamaah bisa edit ulasan miliknya sendiri
CREATE POLICY "customer_update_review" ON store_product_reviews
  FOR UPDATE USING (user_id = auth.uid());

-- Jamaah bisa baca ulasan miliknya
CREATE POLICY "customer_read_own_review" ON store_product_reviews
  FOR SELECT USING (user_id = auth.uid());

-- Publik bisa baca ulasan yang dipublish
CREATE POLICY "public_read_reviews" ON store_product_reviews
  FOR SELECT USING (is_published = TRUE);

-- Admin bisa kelola semua ulasan (moderasi, balas, sembunyikan)
CREATE POLICY "admin_manage_reviews" ON store_product_reviews
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'owner', 'admin', 'marketing')
    )
  );

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'set_spr_updated_at'
      AND tgrelid = 'store_product_reviews'::regclass
  ) THEN
    CREATE TRIGGER set_spr_updated_at
      BEFORE UPDATE ON store_product_reviews
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

SELECT 'store_product_reviews migration completed' AS result;


-- ─── 026_fase21_integration_fixes.sql ───────────────────────────────────────────────────────
-- ═══════════════════════════════════════════════════════════════════════════
-- FASE 21 — Integration Fixes
-- Gap integrasi yang ditemukan dari analisis menyeluruh Mei 2026
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. Tabel customer_notifications ─────────────────────────────────────────
-- Digunakan oleh useNotifications.ts dan useVisaStatusUpdate.ts
CREATE TABLE IF NOT EXISTS customer_notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id     UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  type            TEXT NOT NULL DEFAULT 'general',
  title           TEXT NOT NULL,
  message         TEXT NOT NULL,
  link            TEXT,
  is_read         BOOLEAN NOT NULL DEFAULT FALSE,
  read_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_notif_customer ON customer_notifications(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_notif_unread   ON customer_notifications(customer_id, is_read) WHERE is_read = FALSE;

ALTER TABLE customer_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "jamaah baca notif sendiri" ON customer_notifications;
CREATE POLICY "jamaah baca notif sendiri" ON customer_notifications
  FOR SELECT USING (
    customer_id IN (
      SELECT id FROM customers WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "jamaah update notif sendiri" ON customer_notifications;
CREATE POLICY "jamaah update notif sendiri" ON customer_notifications
  FOR UPDATE USING (
    customer_id IN (
      SELECT id FROM customers WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "admin insert notif" ON customer_notifications;
CREATE POLICY "admin insert notif" ON customer_notifications
  FOR INSERT WITH CHECK (TRUE);

-- ─── 2. Tabel jamaah_checklist ────────────────────────────────────────────────
-- Checklist persiapan jamaah — persistent ke DB, sinkron antar perangkat
CREATE TABLE IF NOT EXISTS jamaah_checklist (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  item_id     TEXT NOT NULL,
  is_checked  BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (customer_id, item_id)
);

CREATE INDEX IF NOT EXISTS idx_jamaah_checklist_customer ON jamaah_checklist(customer_id);

ALTER TABLE jamaah_checklist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "jamaah baca checklist sendiri" ON jamaah_checklist;
CREATE POLICY "jamaah baca checklist sendiri" ON jamaah_checklist
  FOR SELECT USING (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "jamaah upsert checklist sendiri" ON jamaah_checklist;
CREATE POLICY "jamaah upsert checklist sendiri" ON jamaah_checklist
  FOR ALL USING (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "admin baca semua checklist" ON jamaah_checklist;
CREATE POLICY "admin baca semua checklist" ON jamaah_checklist
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','admin','branch_manager','operational')
    )
  );

-- ─── 3. Tabel attendance (Muthawif) ──────────────────────────────────────────
-- Digunakan oleh MuthawifDashboard untuk pencatatan kehadiran jamaah per sesi
CREATE TABLE IF NOT EXISTS attendance (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  departure_id    UUID REFERENCES departures(id) ON DELETE SET NULL,
  customer_id     UUID REFERENCES customers(id) ON DELETE CASCADE,
  session_type    TEXT NOT NULL DEFAULT 'lainnya',
  session_label   TEXT,
  status          TEXT NOT NULL DEFAULT 'hadir' CHECK (status IN ('hadir','absen','terlambat','izin')),
  notes           TEXT,
  recorded_by     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  recorded_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_attendance_departure  ON attendance(departure_id);
CREATE INDEX IF NOT EXISTS idx_attendance_customer   ON attendance(customer_id);
CREATE INDEX IF NOT EXISTS idx_attendance_session    ON attendance(departure_id, session_type, recorded_at);

ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "muthawif bisa insert attendance" ON attendance;
CREATE POLICY "muthawif bisa insert attendance" ON attendance
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','admin','branch_manager','operational')
    )
  );

DROP POLICY IF EXISTS "muthawif bisa baca attendance" ON attendance;
CREATE POLICY "muthawif bisa baca attendance" ON attendance
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','admin','branch_manager','operational')
    )
  );

DROP POLICY IF EXISTS "muthawif bisa update attendance" ON attendance;
CREATE POLICY "muthawif bisa update attendance" ON attendance
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','admin','branch_manager','operational')
    )
  );

-- ─── 4. Tabel visa_status_logs ────────────────────────────────────────────────
-- Log perubahan status visa (digunakan oleh useVisaStatusUpdate.ts)
CREATE TABLE IF NOT EXISTS visa_status_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id  UUID REFERENCES customers(id) ON DELETE CASCADE,
  old_status   TEXT,
  new_status   TEXT NOT NULL,
  notes        TEXT,
  changed_by   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_visa_logs_customer ON visa_status_logs(customer_id);

ALTER TABLE visa_status_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin kelola visa logs" ON visa_status_logs;
CREATE POLICY "admin kelola visa logs" ON visa_status_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','admin','branch_manager','operational')
    )
  );

DROP POLICY IF EXISTS "jamaah baca visa log sendiri" ON visa_status_logs;
CREATE POLICY "jamaah baca visa log sendiri" ON visa_status_logs
  FOR SELECT USING (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  );

-- ─── 5. Tabel room_occupants ──────────────────────────────────────────────────
-- Digunakan oleh RoomingListPageImproved untuk data penghuni kamar
CREATE TABLE IF NOT EXISTS room_occupants (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_assignment_id  UUID NOT NULL REFERENCES room_assignments(id) ON DELETE CASCADE,
  customer_id         UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  bed_number          INT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (room_assignment_id, customer_id)
);

CREATE INDEX IF NOT EXISTS idx_room_occupants_room     ON room_occupants(room_assignment_id);
CREATE INDEX IF NOT EXISTS idx_room_occupants_customer ON room_occupants(customer_id);

ALTER TABLE room_occupants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin kelola room_occupants" ON room_occupants;
CREATE POLICY "admin kelola room_occupants" ON room_occupants
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','admin','branch_manager','operational')
    )
  );

DROP POLICY IF EXISTS "jamaah baca kamar sendiri" ON room_occupants;
CREATE POLICY "jamaah baca kamar sendiri" ON room_occupants
  FOR SELECT USING (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  );

-- ─── 6. Kolom room_number di bookings ────────────────────────────────────────
-- Simpan nomor kamar langsung di booking untuk lookup cepat dari portal jamaah
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'room_number'
  ) THEN
    ALTER TABLE bookings ADD COLUMN room_number TEXT;
  END IF;
END $$;

-- ─── 7. Tabel feedback ────────────────────────────────────────────────────────
-- View alias dari testimonials agar AdminSentimenFeedback bisa pakai kedua nama
-- (sudah difix di kode untuk baca dari testimonials langsung)
-- Tabel feedback ini untuk catatan pengembang jika ada kebutuhan terpisah masa depan
CREATE TABLE IF NOT EXISTS feedback (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id   UUID REFERENCES bookings(id) ON DELETE SET NULL,
  customer_id  UUID REFERENCES customers(id) ON DELETE CASCADE,
  rating       INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment      TEXT,
  aspects      JSONB DEFAULT '[]',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feedback_customer  ON feedback(customer_id);
CREATE INDEX IF NOT EXISTS idx_feedback_booking   ON feedback(booking_id);
CREATE INDEX IF NOT EXISTS idx_feedback_created   ON feedback(created_at);

ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "jamaah insert feedback sendiri" ON feedback;
CREATE POLICY "jamaah insert feedback sendiri" ON feedback
  FOR INSERT WITH CHECK (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "semua baca feedback" ON feedback;
CREATE POLICY "semua baca feedback" ON feedback
  FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "admin kelola feedback" ON feedback;
CREATE POLICY "admin kelola feedback" ON feedback
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','admin','branch_manager')
    )
  );

-- ─── 8. Kolom di testimonials ─────────────────────────────────────────────────
-- Tambah kolom booking_id agar testimonials bisa di-join ke bookings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'testimonials' AND column_name = 'booking_id'
  ) THEN
    ALTER TABLE testimonials ADD COLUMN booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ─── 9. Tabel notifications (untuk admin channel) ────────────────────────────
-- Digunakan oleh useAdminNotifications.ts via realtime channel
-- Jika sudah ada dari fase0, hanya tambahkan kolom yang kurang
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'link'
  ) THEN
    ALTER TABLE notifications ADD COLUMN link TEXT;
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- CATATAN: Jalankan file ini setelah fase0_foundation.sql
-- Urutan: fase0 → fase16 → fase17 → fase18 → fase19 → fase20 → fase21
-- ═══════════════════════════════════════════════════════════════════════════


-- ─── 027_fase22_muthawif_evaluations.sql ───────────────────────────────────────────────────────
-- Fase 22: Tabel penilaian jamaah oleh muthawif
-- Muthawif dapat memberi rating & catatan per jamaah selama keberangkatan

CREATE TABLE IF NOT EXISTS muthawif_jamaah_evaluations (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  muthawif_id   uuid        NOT NULL REFERENCES muthawifs(id) ON DELETE CASCADE,
  departure_id  uuid        NOT NULL REFERENCES departures(id) ON DELETE CASCADE,
  customer_id   uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  booking_id    uuid        REFERENCES bookings(id) ON DELETE SET NULL,
  rating        smallint    NOT NULL CHECK (rating BETWEEN 1 AND 5),
  kategori      text        NOT NULL DEFAULT 'umum'
                            CHECK (kategori IN ('umum','ibadah','kesehatan','disiplin','sosial')),
  catatan       text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),

  UNIQUE (muthawif_id, departure_id, customer_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_mje_departure  ON muthawif_jamaah_evaluations (departure_id);
CREATE INDEX IF NOT EXISTS idx_mje_muthawif   ON muthawif_jamaah_evaluations (muthawif_id);
CREATE INDEX IF NOT EXISTS idx_mje_customer   ON muthawif_jamaah_evaluations (customer_id);

-- RLS
ALTER TABLE muthawif_jamaah_evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "muthawif_eval_select" ON muthawif_jamaah_evaluations
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "muthawif_eval_insert" ON muthawif_jamaah_evaluations
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "muthawif_eval_update" ON muthawif_jamaah_evaluations
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "muthawif_eval_delete" ON muthawif_jamaah_evaluations
  FOR DELETE TO authenticated USING (true);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_mje_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_mje_updated_at
  BEFORE UPDATE ON muthawif_jamaah_evaluations
  FOR EACH ROW EXECUTE FUNCTION update_mje_updated_at();

COMMENT ON TABLE muthawif_jamaah_evaluations IS
  'Penilaian muthawif per jamaah per keberangkatan — rating 1-5 + catatan per kategori';


-- ─── 028_fase23_payments_transaction_id.sql ───────────────────────────────────────────────────────
-- Fase 23: Tambah kolom transaction_id dan payment_type di tabel payments
-- Digunakan untuk menyimpan Midtrans transaction_id pada pembayaran QRIS/online
-- dan jenis pembayaran (dp, cicilan, pelunasan)

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS transaction_id TEXT,
  ADD COLUMN IF NOT EXISTS payment_type   TEXT;

-- Index untuk pencarian cepat berdasarkan transaction_id
CREATE INDEX IF NOT EXISTS idx_payments_transaction_id ON payments (transaction_id);

COMMENT ON COLUMN payments.transaction_id IS 'Midtrans transaction_id untuk pembayaran online (QRIS, VA, GoPay)';
COMMENT ON COLUMN payments.payment_type   IS 'Jenis pembayaran: dp | cicilan | pelunasan';


-- ─── 029_patch_auto_commission_trigger.sql ───────────────────────────────────────────────────────
-- C2: Auto-attribute royalty commission to parent agent
CREATE OR REPLACE FUNCTION public.attribute_commission_to_parent()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_parent_id uuid;
  v_royalty_rate numeric := 0.10; -- 10% of child commission goes to parent
  v_royalty_amount numeric;
BEGIN
  -- Skip if this row is itself a royalty entry (avoid cascading)
  IF NEW.notes IS NOT NULL AND NEW.notes ILIKE '%Royalti Sub Agen%' THEN
    RETURN NEW;
  END IF;

  SELECT parent_agent_id INTO v_parent_id
  FROM public.agents
  WHERE id = NEW.agent_id;

  IF v_parent_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_royalty_amount := ROUND(COALESCE(NEW.commission_amount, 0) * v_royalty_rate, 2);
  IF v_royalty_amount <= 0 THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.agent_commissions (
    agent_id, booking_id, commission_amount, status, notes
  ) VALUES (
    v_parent_id,
    NEW.booking_id,
    v_royalty_amount,
    'pending',
    'Royalti Sub Agen ' || COALESCE(NEW.agent_id::text, '')
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_attribute_commission_to_parent ON public.agent_commissions;
CREATE TRIGGER trg_attribute_commission_to_parent
AFTER INSERT ON public.agent_commissions
FOR EACH ROW
EXECUTE FUNCTION public.attribute_commission_to_parent();

-- ─── 030_patch_store_categories_extra.sql ───────────────────────────────────────────────────────

CREATE TABLE public.store_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.store_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view active categories" ON public.store_categories FOR SELECT USING (is_active = true OR public.is_admin(auth.uid()));
CREATE POLICY "Admins manage categories" ON public.store_categories FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TABLE public.store_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.store_categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  original_price NUMERIC,
  stock INTEGER NOT NULL DEFAULT 0,
  weight_gram INTEGER NOT NULL DEFAULT 0,
  images JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  sold_count INTEGER NOT NULL DEFAULT 0,
  sku TEXT,
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.store_products ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_store_products_category ON public.store_products(category_id);
CREATE INDEX idx_store_products_branch ON public.store_products(branch_id);
CREATE INDEX idx_store_products_active ON public.store_products(is_active);
CREATE POLICY "Public can view active products" ON public.store_products FOR SELECT USING (is_active = true OR public.is_admin(auth.uid()));
CREATE POLICY "Admins manage products" ON public.store_products FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TABLE public.store_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL UNIQUE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  user_id UUID,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_status TEXT NOT NULL DEFAULT 'unpaid',
  subtotal NUMERIC NOT NULL DEFAULT 0,
  shipping_cost NUMERIC NOT NULL DEFAULT 0,
  discount_amount NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  shipping_name TEXT,
  shipping_phone TEXT,
  shipping_address TEXT,
  shipping_city TEXT,
  shipping_province TEXT,
  shipping_postal TEXT,
  notes TEXT,
  payment_proof_url TEXT,
  paid_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.store_orders ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_store_orders_user ON public.store_orders(user_id);
CREATE INDEX idx_store_orders_status ON public.store_orders(status);
CREATE POLICY "Users can view own orders" ON public.store_orders FOR SELECT USING (auth.uid() = user_id OR public.is_admin(auth.uid()));
CREATE POLICY "Users can create own orders" ON public.store_orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own pending orders" ON public.store_orders FOR UPDATE USING (auth.uid() = user_id AND status = 'pending');
CREATE POLICY "Admins manage all orders" ON public.store_orders FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TABLE public.store_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.store_orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.store_products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  product_image TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.store_order_items ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_store_order_items_order ON public.store_order_items(order_id);
CREATE POLICY "View order items via parent" ON public.store_order_items FOR SELECT USING (EXISTS (SELECT 1 FROM public.store_orders o WHERE o.id = order_id AND (o.user_id = auth.uid() OR public.is_admin(auth.uid()))));
CREATE POLICY "Insert order items via own order" ON public.store_order_items FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.store_orders o WHERE o.id = order_id AND o.user_id = auth.uid()));
CREATE POLICY "Admins manage order items" ON public.store_order_items FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TABLE public.store_shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.store_orders(id) ON DELETE CASCADE,
  courier_name TEXT NOT NULL,
  courier_service TEXT,
  tracking_number TEXT,
  shipped_at TIMESTAMPTZ,
  estimated_arrival TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'preparing',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.store_shipments ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_store_shipments_order ON public.store_shipments(order_id);
CREATE POLICY "View shipments via parent" ON public.store_shipments FOR SELECT USING (EXISTS (SELECT 1 FROM public.store_orders o WHERE o.id = order_id AND (o.user_id = auth.uid() OR public.is_admin(auth.uid()))));
CREATE POLICY "Admins manage shipments" ON public.store_shipments FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TABLE public.store_carts (
  user_id UUID PRIMARY KEY,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.store_carts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own cart" ON public.store_carts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.store_order_counters (
  date_key TEXT PRIMARY KEY,
  last_seq INTEGER NOT NULL DEFAULT 0
);
ALTER TABLE public.store_order_counters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read counters" ON public.store_order_counters FOR SELECT USING (public.is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.generate_store_order_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_date_key TEXT := to_char(now(), 'YYMMDD');
  v_seq INTEGER;
BEGIN
  INSERT INTO public.store_order_counters(date_key, last_seq)
  VALUES (v_date_key, 1)
  ON CONFLICT (date_key) DO UPDATE
    SET last_seq = store_order_counters.last_seq + 1
  RETURNING last_seq INTO v_seq;
  RETURN 'ORD' || v_date_key || lpad(v_seq::text, 4, '0');
END;
$$;
GRANT EXECUTE ON FUNCTION public.generate_store_order_number() TO authenticated;

CREATE TRIGGER trg_store_categories_updated BEFORE UPDATE ON public.store_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_store_products_updated BEFORE UPDATE ON public.store_products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_store_orders_updated BEFORE UPDATE ON public.store_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_store_shipments_updated BEFORE UPDATE ON public.store_shipments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ─── 031_patch_push_subscriptions.sql ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id UUID,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON public.push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_customer ON public.push_subscriptions(customer_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_active ON public.push_subscriptions(is_active) WHERE is_active = true;

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own push subscriptions"
  ON public.push_subscriptions
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins view all push subscriptions"
  ON public.push_subscriptions
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.has_role(auth.uid(), 'owner'::app_role)
    OR public.has_role(auth.uid(), 'branch_manager'::app_role)
  );

CREATE TRIGGER trg_push_subscriptions_updated_at
  BEFORE UPDATE ON public.push_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();


-- ─── 032_patch_ibadah_progress.sql ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.ibadah_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ibadah_type TEXT NOT NULL,
  ibadah_date DATE NOT NULL DEFAULT CURRENT_DATE,
  count INTEGER NOT NULL DEFAULT 1,
  target INTEGER,
  notes TEXT,
  completed BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, ibadah_type, ibadah_date)
);

CREATE INDEX IF NOT EXISTS idx_ibadah_progress_user_date ON public.ibadah_progress(user_id, ibadah_date DESC);

ALTER TABLE public.ibadah_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own ibadah progress"
  ON public.ibadah_progress
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_ibadah_progress_updated_at
  BEFORE UPDATE ON public.ibadah_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();


-- ─── 033_patch_push_outbox.sql ───────────────────────────────────────────────────────

-- ============ PUSH OUTBOX ============
CREATE TABLE IF NOT EXISTS public.push_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_ids uuid[] NOT NULL DEFAULT '{}',
  customer_ids uuid[] NOT NULL DEFAULT '{}',
  title text NOT NULL,
  body text NOT NULL,
  type text NOT NULL DEFAULT 'info',
  url text,
  status text NOT NULL DEFAULT 'pending', -- pending|processing|sent|failed
  attempts int NOT NULL DEFAULT 0,
  last_error text,
  scheduled_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_outbox_pending
  ON public.push_outbox (status, scheduled_at)
  WHERE status = 'pending';

ALTER TABLE public.push_outbox ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage push_outbox" ON public.push_outbox;
CREATE POLICY "Admins manage push_outbox"
ON public.push_outbox
FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- ============ HELPER: enqueue ============
CREATE OR REPLACE FUNCTION public.enqueue_push(
  _user_ids uuid[],
  _title text,
  _body text,
  _type text DEFAULT 'info',
  _url text DEFAULT NULL,
  _customer_ids uuid[] DEFAULT '{}'
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_id uuid;
BEGIN
  IF (COALESCE(array_length(_user_ids,1),0) = 0
      AND COALESCE(array_length(_customer_ids,1),0) = 0) THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.push_outbox(user_ids, customer_ids, title, body, type, url)
  VALUES (COALESCE(_user_ids,'{}'), COALESCE(_customer_ids,'{}'), _title, _body, _type, _url)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- ============ TRIGGER: bookings status change ============
CREATE OR REPLACE FUNCTION public.tg_push_booking_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_title text;
  v_body text;
  v_type text := 'info';
BEGIN
  IF NEW.booking_status IS NOT DISTINCT FROM OLD.booking_status THEN
    RETURN NEW;
  END IF;

  SELECT user_id INTO v_user_id FROM public.customers WHERE id = NEW.customer_id;
  IF v_user_id IS NULL THEN RETURN NEW; END IF;

  v_title := 'Status Booking Diperbarui';
  v_body := 'Booking ' || NEW.booking_code || ' kini berstatus: ' || NEW.booking_status;

  IF NEW.booking_status::text = 'confirmed' THEN v_type := 'success';
  ELSIF NEW.booking_status::text IN ('cancelled','refunded') THEN v_type := 'warning';
  END IF;

  PERFORM public.enqueue_push(
    ARRAY[v_user_id], v_title, v_body, v_type,
    '/jamaah/booking/' || NEW.id::text
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS push_booking_status_change ON public.bookings;
CREATE TRIGGER push_booking_status_change
AFTER UPDATE OF booking_status ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.tg_push_booking_status();

-- ============ TRIGGER: payments paid ============
CREATE OR REPLACE FUNCTION public.tg_push_payment_paid()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_booking_code text;
BEGIN
  IF NEW.status::text <> 'paid' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status::text = 'paid' THEN RETURN NEW; END IF;

  SELECT c.user_id, b.booking_code
    INTO v_user_id, v_booking_code
  FROM public.bookings b
  JOIN public.customers c ON c.id = b.customer_id
  WHERE b.id = NEW.booking_id;

  IF v_user_id IS NULL THEN RETURN NEW; END IF;

  PERFORM public.enqueue_push(
    ARRAY[v_user_id],
    'Pembayaran Diterima',
    'Pembayaran Rp ' || to_char(NEW.amount, 'FM999,999,999')
       || ' untuk booking ' || COALESCE(v_booking_code,'') || ' telah diverifikasi.',
    'success',
    '/jamaah/pembayaran'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS push_payment_paid ON public.payments;
CREATE TRIGGER push_payment_paid
AFTER INSERT OR UPDATE OF status ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.tg_push_payment_paid();

-- ============ TRIGGER: store_orders shipped ============
CREATE OR REPLACE FUNCTION public.tg_push_store_order_shipped()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_user_id uuid;
BEGIN
  IF NEW.status <> 'shipped' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'shipped' THEN RETURN NEW; END IF;

  v_user_id := NEW.user_id;
  IF v_user_id IS NULL AND NEW.customer_id IS NOT NULL THEN
    SELECT user_id INTO v_user_id FROM public.customers WHERE id = NEW.customer_id;
  END IF;
  IF v_user_id IS NULL THEN RETURN NEW; END IF;

  PERFORM public.enqueue_push(
    ARRAY[v_user_id],
    'Pesanan Dikirim',
    'Pesanan ' || NEW.order_number || ' telah dikirim. Pantau status pengiriman di portal.',
    'success',
    '/jamaah/orders/' || NEW.id::text
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS push_store_order_shipped ON public.store_orders;
CREATE TRIGGER push_store_order_shipped
AFTER UPDATE OF status ON public.store_orders
FOR EACH ROW EXECUTE FUNCTION public.tg_push_store_order_shipped();

-- ============ H-1 DEPARTURE REMINDER ============
CREATE OR REPLACE FUNCTION public.enqueue_h_minus_one_push()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int := 0;
  r record;
  v_user_ids uuid[];
BEGIN
  FOR r IN
    SELECT d.id, d.departure_date, p.name AS package_name
    FROM public.departures d
    LEFT JOIN public.packages p ON p.id = d.package_id
    WHERE d.departure_date = (CURRENT_DATE + INTERVAL '1 day')::date
      AND COALESCE(d.status::text,'open') NOT IN ('cancelled','closed')
  LOOP
    SELECT COALESCE(array_agg(DISTINCT c.user_id) FILTER (WHERE c.user_id IS NOT NULL), '{}')
      INTO v_user_ids
    FROM public.bookings b
    JOIN public.customers c ON c.id = b.customer_id
    WHERE b.departure_id = r.id
      AND b.booking_status::text NOT IN ('cancelled','refunded');

    IF COALESCE(array_length(v_user_ids,1),0) > 0 THEN
      PERFORM public.enqueue_push(
        v_user_ids,
        'Keberangkatan Besok!',
        'Keberangkatan ' || COALESCE(r.package_name,'Anda')
          || ' dijadwalkan besok (' || to_char(r.departure_date,'DD Mon YYYY')
          || '). Pastikan dokumen & perlengkapan siap.',
        'warning',
        '/jamaah/jadwal'
      );
      v_count := v_count + 1;
    END IF;
  END LOOP;
  RETURN v_count;
END;
$$;


-- ─── 034_patch_audit_logs_policy_fix.sql ───────────────────────────────────────────────────────

-- 1. Tighten audit_logs insert policy
DROP POLICY IF EXISTS "Authenticated can insert audit logs" ON public.audit_logs;
CREATE POLICY "Users can insert their own audit logs"
ON public.audit_logs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- 2. Revoke EXECUTE from public/anon on ALL public schema SECURITY DEFINER functions,
--    re-grant to authenticated. Anon retains only login-flow helpers.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT n.nspname AS schema_name,
           p.proname AS func_name,
           pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = true
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM PUBLIC, anon',
      r.schema_name, r.func_name, r.args);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %I.%I(%s) TO authenticated',
      r.schema_name, r.func_name, r.args);
  END LOOP;
END $$;

-- 3. Re-grant anon access for pre-login functions
GRANT EXECUTE ON FUNCTION public.is_account_locked(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_failed_attempts(text) TO anon;


-- ─── 035_patch_security_revoke_trigger_funcs.sql ───────────────────────────────────────────────────────

-- Revoke EXECUTE on all trigger-returning functions in public schema (these
-- should never be called via API/RPC; they are fired by triggers internally).
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT n.nspname AS schema_name,
           p.proname AS func_name,
           pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    JOIN pg_type t ON t.oid = p.prorettype
    WHERE n.nspname = 'public'
      AND t.typname = 'trigger'
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM PUBLIC, anon, authenticated',
      r.schema_name, r.func_name, r.args);
  END LOOP;
END $$;


-- ─── 036_patch_customer_mahrams_rls.sql ───────────────────────────────────────────────────────

-- ============================================================
-- 1) customer_mahrams
-- ============================================================
CREATE TABLE IF NOT EXISTS public.customer_mahrams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  mahram_name text NOT NULL,
  mahram_relation text NOT NULL CHECK (mahram_relation IN ('suami','istri','ayah','ibu','anak','saudara','paman','kakek','nenek','cucu')),
  mahram_customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS customer_mahrams_customer_id_idx ON public.customer_mahrams(customer_id);
CREATE INDEX IF NOT EXISTS customer_mahrams_mahram_customer_id_idx ON public.customer_mahrams(mahram_customer_id);

ALTER TABLE public.customer_mahrams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage customer mahrams"
  ON public.customer_mahrams FOR ALL
  USING (
    public.has_role(auth.uid(),'super_admin')
    OR public.has_role(auth.uid(),'owner')
    OR public.has_role(auth.uid(),'branch_manager')
    OR public.has_role(auth.uid(),'operational')
    OR public.has_role(auth.uid(),'sales')
  )
  WITH CHECK (
    public.has_role(auth.uid(),'super_admin')
    OR public.has_role(auth.uid(),'owner')
    OR public.has_role(auth.uid(),'branch_manager')
    OR public.has_role(auth.uid(),'operational')
    OR public.has_role(auth.uid(),'sales')
  );

CREATE POLICY "Customers can view own mahrams"
  ON public.customer_mahrams FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.customers c WHERE c.id = customer_mahrams.customer_id AND c.user_id = auth.uid())
  );

CREATE POLICY "Customers can manage own mahrams"
  ON public.customer_mahrams FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.customers c WHERE c.id = customer_mahrams.customer_id AND c.user_id = auth.uid())
  );

CREATE POLICY "Customers can update own mahrams"
  ON public.customer_mahrams FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.customers c WHERE c.id = customer_mahrams.customer_id AND c.user_id = auth.uid())
  );

CREATE POLICY "Customers can delete own mahrams"
  ON public.customer_mahrams FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.customers c WHERE c.id = customer_mahrams.customer_id AND c.user_id = auth.uid())
  );

CREATE TRIGGER update_customer_mahrams_updated_at
  BEFORE UPDATE ON public.customer_mahrams
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 2) customers: district, village
-- ============================================================
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS district text;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS village text;

-- ============================================================
-- 3) store_product_reviews
-- ============================================================
CREATE TABLE IF NOT EXISTS public.store_product_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.store_orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.store_products(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  is_published boolean NOT NULL DEFAULT true,
  admin_reply text,
  admin_reply_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id, product_id, user_id)
);
CREATE INDEX IF NOT EXISTS store_product_reviews_product_id_idx ON public.store_product_reviews(product_id);
CREATE INDEX IF NOT EXISTS store_product_reviews_published_idx ON public.store_product_reviews(is_published);

ALTER TABLE public.store_product_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published reviews"
  ON public.store_product_reviews FOR SELECT
  USING (is_published = true);

CREATE POLICY "Owner can view own reviews"
  ON public.store_product_reviews FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Owner can insert own review"
  ON public.store_product_reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owner can update own review"
  ON public.store_product_reviews FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Staff can manage all reviews"
  ON public.store_product_reviews FOR ALL
  USING (
    public.has_role(auth.uid(),'super_admin')
    OR public.has_role(auth.uid(),'owner')
    OR public.has_role(auth.uid(),'branch_manager')
    OR public.has_role(auth.uid(),'operational')
  )
  WITH CHECK (
    public.has_role(auth.uid(),'super_admin')
    OR public.has_role(auth.uid(),'owner')
    OR public.has_role(auth.uid(),'branch_manager')
    OR public.has_role(auth.uid(),'operational')
  );

CREATE TRIGGER update_store_product_reviews_updated_at
  BEFORE UPDATE ON public.store_product_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ─── 037_patch_referral_policies_fix.sql ───────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Authenticated users manage referral_codes" ON public.referral_codes;

DROP POLICY IF EXISTS "Authenticated users manage referral_usages" ON public.referral_usages;

CREATE POLICY "Admins manage referral_usages"
ON public.referral_usages
FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can view ticket responses" ON public.ticket_responses;

CREATE POLICY "Users can view own ticket responses"
ON public.ticket_responses
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.support_tickets t
    WHERE t.id = ticket_responses.ticket_id
      AND t.user_id = auth.uid()
  )
);


-- ─── 038_patch_storage_upload_policy.sql ───────────────────────────────────────────────────────
-- Tighten storage uploads
DROP POLICY IF EXISTS "Staff and agents can upload customer documents" ON storage.objects;
CREATE POLICY "Staff and agents can upload customer documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'customer-documents'
  AND (
    public.is_admin(auth.uid())
    OR public.has_role(auth.uid(), 'operational'::public.app_role)
    OR public.has_role(auth.uid(), 'sales'::public.app_role)
    OR public.has_role(auth.uid(), 'agent'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.customers c
      WHERE c.user_id = auth.uid()
        AND (storage.foldername(name))[1] = c.id::text
    )
  )
);

DROP POLICY IF EXISTS "Users can upload payment proofs" ON storage.objects;
CREATE POLICY "Users can upload payment proofs"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'payment-proofs'
  AND (
    public.is_admin(auth.uid())
    OR public.has_role(auth.uid(), 'operational'::public.app_role)
    OR public.has_role(auth.uid(), 'sales'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.customers c
      WHERE c.user_id = auth.uid()
        AND (storage.foldername(name))[1] = c.id::text
    )
  )
);

-- Restrict referral_codes public listing to authenticated users only
DROP POLICY IF EXISTS "Anyone can view referral codes for validation" ON public.referral_codes;
CREATE POLICY "Authenticated users can validate referral codes"
ON public.referral_codes
FOR SELECT
TO authenticated
USING (is_active = true);


-- ─── 039_patch_website_settings_layout.sql ───────────────────────────────────────────────────────
-- Add layout/overrides to website_settings
ALTER TABLE public.website_settings
  ADD COLUMN IF NOT EXISTS layout_variant jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS theme_overrides jsonb DEFAULT '{}'::jsonb;

-- Add layout & mood metadata to theme_presets
ALTER TABLE public.theme_presets
  ADD COLUMN IF NOT EXISTS mood text DEFAULT 'light',
  ADD COLUMN IF NOT EXISTS accent_gold text,
  ADD COLUMN IF NOT EXISTS surface_color text,
  ADD COLUMN IF NOT EXISTS radius_style text DEFAULT 'soft',
  ADD COLUMN IF NOT EXISTS density text DEFAULT 'comfortable',
  ADD COLUMN IF NOT EXISTS hero_variant text DEFAULT 'classic',
  ADD COLUMN IF NOT EXISTS cta_variant text DEFAULT 'classic',
  ADD COLUMN IF NOT EXISTS card_style text DEFAULT 'elevated',
  ADD COLUMN IF NOT EXISTS ornament text DEFAULT 'none';

-- Seed 7 themes (idempotent)
INSERT INTO public.theme_presets (slug, name, description, primary_color, secondary_color, accent_color, background_color, foreground_color, heading_font, body_font, mood, accent_gold, surface_color, radius_style, density, hero_variant, cta_variant, card_style, ornament, is_default)
VALUES
  ('classic',    'Classic Professional',  'Layout korporat dengan hero besar, statistik, dan section standar.',                   '142 70% 38%', '45 90% 50%',  '160 65% 32%', '0 0% 100%',  '142 25% 12%', 'Plus Jakarta Sans', 'Inter',                'light', NULL,           '0 0% 98%',     'soft',   'comfortable', 'classic',    'classic',    'elevated', 'none',           true),
  ('modern',     'Modern Minimalist',     'Hero split, layout horizontal lega, CTA card-style bergradasi.',                       '215 90% 50%', '215 30% 25%', '195 90% 45%', '0 0% 100%',  '220 25% 10%', 'Space Grotesk',     'Inter',                'light', NULL,           '215 30% 97%',  'sharp',  'spacious',    'split',      'gradient',   'flat',     'none',           false),
  ('luxury',     'Elegant Luxury',        'Tipografi serif, aksen emas halus, layout asimetris untuk segmen premium.',            '160 50% 22%', '40 75% 55%',  '40 65% 45%',  '40 30% 97%', '160 25% 12%', 'Playfair Display',  'Cormorant Garamond',   'sepia', '40 80% 55%',   '40 25% 94%',   'soft',   'spacious',    'asymmetric', 'serif',      'bordered', 'serif-divider',  false),
  ('islamic',    'Islamic Contemporary',  'Sentuhan ornamen Islami, search widget menonjol, layout dinamis.',
   '162 80% 28%', '45 92% 52%', '162 60% 38%', '0 0% 99%',  '162 30% 12%', 'Amiri',             'Plus Jakarta Sans',    'light', '45 92% 52%',  '162 30% 96%',  'soft',   'comfortable', 'asymmetric', 'islamic',    'glass',    'islamic',        false),
  ('futuristic', 'Futuristic Dark',       'Dark UI elegan dengan aksen neon dan elemen digital.',                                  '180 90% 55%', '280 80% 60%', '160 90% 50%', '230 25% 6%', '0 0% 96%',    'Space Grotesk',     'Inter',                'dark',  '180 90% 55%', '230 20% 10%',  'sharp',  'compact',     'neon',       'neon',       'glass',    'neon',           false),
  ('nature',     'Nature Serenity',       'Palet alam, tipografi serif lembut, bentuk organik menenangkan.',                      '152 35% 30%', '40 35% 60%',  '152 30% 45%', '60 25% 97%', '152 20% 15%', 'Playfair Display',  'Lora',                 'sepia', NULL,           '60 30% 94%',   'pill',   'spacious',    'serene',     'organic',    'flat',     'leaf',           false),
  ('royal',      'Royal Gold',            'Background gelap mewah dengan aksen emas eksklusif untuk layanan VVIP.',                '42 95% 52%',  '0 0% 8%',     '42 80% 45%',  '0 0% 4%',    '42 30% 92%',  'Cinzel',            'Cormorant Garamond',   'dark',  '42 95% 52%',   '0 0% 8%',     'soft',   'spacious',    'royal',      'gold',       'bordered', 'gold-foil',      false)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  primary_color = EXCLUDED.primary_color,
  secondary_color = EXCLUDED.secondary_color,
  accent_color = EXCLUDED.accent_color,
  background_color = EXCLUDED.background_color,
  foreground_color = EXCLUDED.foreground_color,
  heading_font = EXCLUDED.heading_font,
  body_font = EXCLUDED.body_font,
  mood = EXCLUDED.mood,
  accent_gold = EXCLUDED.accent_gold,
  surface_color = EXCLUDED.surface_color,
  radius_style = EXCLUDED.radius_style,
  density = EXCLUDED.density,
  hero_variant = EXCLUDED.hero_variant,
  cta_variant = EXCLUDED.cta_variant,
  card_style = EXCLUDED.card_style,
  ornament = EXCLUDED.ornament;
