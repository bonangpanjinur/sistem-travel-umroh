
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
