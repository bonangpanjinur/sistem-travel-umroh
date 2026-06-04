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
