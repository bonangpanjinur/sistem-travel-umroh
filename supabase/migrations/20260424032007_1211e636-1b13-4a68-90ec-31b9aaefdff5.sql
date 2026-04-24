-- 1. EQUIPMENT_ITEMS — perluasan
ALTER TABLE public.equipment_items
  ADD COLUMN IF NOT EXISTS gender_target text NOT NULL DEFAULT 'unisex' 
    CHECK (gender_target IN ('male','female','child','unisex')),
  ADD COLUMN IF NOT EXISTS has_variants boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS low_stock_threshold integer NOT NULL DEFAULT 5;

-- 2. EQUIPMENT_VARIANTS — tabel baru
CREATE TABLE IF NOT EXISTS public.equipment_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id uuid NOT NULL REFERENCES public.equipment_items(id) ON DELETE CASCADE,
  size text,
  color text,
  sku text,
  stock_good integer NOT NULL DEFAULT 0,
  stock_damaged integer NOT NULL DEFAULT 0,
  low_stock_threshold integer NOT NULL DEFAULT 5,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_equipment_variants_equipment_id 
  ON public.equipment_variants(equipment_id);

ALTER TABLE public.equipment_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Variants viewable by staff"
  ON public.equipment_variants FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'owner') OR
    public.has_role(auth.uid(), 'branch_manager') OR
    public.has_role(auth.uid(), 'operational') OR
    public.has_role(auth.uid(), 'finance') OR
    public.has_role(auth.uid(), 'equipment')
  );

CREATE POLICY "Variants insert by ops admins"
  ON public.equipment_variants FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'owner') OR
    public.has_role(auth.uid(), 'operational') OR
    public.has_role(auth.uid(), 'equipment')
  );

CREATE POLICY "Variants update by ops admins"
  ON public.equipment_variants FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'owner') OR
    public.has_role(auth.uid(), 'operational') OR
    public.has_role(auth.uid(), 'equipment')
  );

CREATE POLICY "Variants delete by ops admins"
  ON public.equipment_variants FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'owner') OR
    public.has_role(auth.uid(), 'operational')
  );

CREATE TRIGGER trg_equipment_variants_updated_at
  BEFORE UPDATE ON public.equipment_variants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. EQUIPMENT_DISTRIBUTIONS — perluasan
ALTER TABLE public.equipment_distributions
  ADD COLUMN IF NOT EXISTS variant_id uuid REFERENCES public.equipment_variants(id),
  ADD COLUMN IF NOT EXISTS delivery_type text 
    CHECK (delivery_type IN ('expedition','company_courier','agent_pickup','customer_pickup')),
  ADD COLUMN IF NOT EXISTS delivery_proof_url text,
  ADD COLUMN IF NOT EXISTS condition_photo_url text,
  ADD COLUMN IF NOT EXISTS delivery_date date,
  ADD COLUMN IF NOT EXISTS tracking_number text,
  ADD COLUMN IF NOT EXISTS expedition_name text,
  ADD COLUMN IF NOT EXISTS cancel_reason text,
  ADD COLUMN IF NOT EXISTS cancel_admin_fee numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS return_condition text 
    CHECK (return_condition IN ('good','damaged','lost')),
  ADD COLUMN IF NOT EXISTS return_notes text,
  ADD COLUMN IF NOT EXISTS return_photo_url text;

-- 4. OFFICE_ASSETS — tabel baru
CREATE TABLE IF NOT EXISTS public.office_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL DEFAULT 'lainnya' 
    CHECK (category IN ('electronics','furniture','vehicle','office_supply','lainnya')),
  size_or_color text,
  quantity integer NOT NULL DEFAULT 1,
  condition text NOT NULL DEFAULT 'good' 
    CHECK (condition IN ('good','damaged','under_repair')),
  location text,
  purchase_date date,
  purchase_price numeric DEFAULT 0,
  notes text,
  photo_url text,
  branch_id uuid REFERENCES public.branches(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.office_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Office assets viewable by staff"
  ON public.office_assets FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'owner') OR
    public.has_role(auth.uid(), 'branch_manager') OR
    public.has_role(auth.uid(), 'operational') OR
    public.has_role(auth.uid(), 'finance')
  );

CREATE POLICY "Office assets insert by ops admins"
  ON public.office_assets FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'owner') OR
    public.has_role(auth.uid(), 'operational')
  );

CREATE POLICY "Office assets update by ops admins"
  ON public.office_assets FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'owner') OR
    public.has_role(auth.uid(), 'operational')
  );

CREATE POLICY "Office assets delete by ops admins"
  ON public.office_assets FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'owner')
  );

CREATE TRIGGER trg_office_assets_updated_at
  BEFORE UPDATE ON public.office_assets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. STORAGE BUCKET — equipment-photos (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('equipment-photos', 'equipment-photos', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Equipment photos read for staff"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'equipment-photos' AND (
      public.has_role(auth.uid(), 'super_admin') OR
      public.has_role(auth.uid(), 'owner') OR
      public.has_role(auth.uid(), 'branch_manager') OR
      public.has_role(auth.uid(), 'operational') OR
      public.has_role(auth.uid(), 'finance') OR
      public.has_role(auth.uid(), 'equipment')
    )
  );

CREATE POLICY "Equipment photos write for staff"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'equipment-photos' AND (
      public.has_role(auth.uid(), 'super_admin') OR
      public.has_role(auth.uid(), 'owner') OR
      public.has_role(auth.uid(), 'operational') OR
      public.has_role(auth.uid(), 'equipment')
    )
  );

CREATE POLICY "Equipment photos update for staff"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'equipment-photos' AND (
      public.has_role(auth.uid(), 'super_admin') OR
      public.has_role(auth.uid(), 'owner') OR
      public.has_role(auth.uid(), 'operational')
    )
  );

CREATE POLICY "Equipment photos delete for staff"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'equipment-photos' AND (
      public.has_role(auth.uid(), 'super_admin') OR
      public.has_role(auth.uid(), 'owner')
    )
  );

-- 6. RPC: bulk_distribute_equipment
CREATE OR REPLACE FUNCTION public.bulk_distribute_equipment(
  p_departure_id uuid,
  p_distributions jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  d jsonb;
  v_qty integer;
  v_variant_id uuid;
  v_equipment_id uuid;
  v_current_stock integer;
BEGIN
  FOR d IN SELECT * FROM jsonb_array_elements(p_distributions)
  LOOP
    v_equipment_id := (d->>'equipment_id')::uuid;
    v_variant_id := NULLIF(d->>'variant_id','')::uuid;
    v_qty := COALESCE((d->>'quantity')::integer, 1);

    IF v_variant_id IS NOT NULL THEN
      SELECT stock_good INTO v_current_stock
      FROM equipment_variants WHERE id = v_variant_id FOR UPDATE;

      IF v_current_stock IS NULL OR v_current_stock < v_qty THEN
        RAISE EXCEPTION 'Stok varian tidak mencukupi (id=%)', v_variant_id;
      END IF;

      UPDATE equipment_variants
        SET stock_good = stock_good - v_qty, updated_at = now()
        WHERE id = v_variant_id;
    ELSE
      SELECT stock_quantity INTO v_current_stock
      FROM equipment_items WHERE id = v_equipment_id FOR UPDATE;

      IF v_current_stock IS NULL OR v_current_stock < v_qty THEN
        RAISE EXCEPTION 'Stok item tidak mencukupi (id=%)', v_equipment_id;
      END IF;

      UPDATE equipment_items
        SET stock_quantity = stock_quantity - v_qty
        WHERE id = v_equipment_id;
    END IF;

    INSERT INTO equipment_distributions (
      equipment_id, variant_id, customer_id, departure_id,
      quantity, status, distributed_by, distributed_at,
      delivery_type, delivery_proof_url, condition_photo_url,
      delivery_date, tracking_number, expedition_name, notes
    ) VALUES (
      v_equipment_id, v_variant_id,
      (d->>'customer_id')::uuid,
      p_departure_id, v_qty, 'distributed',
      auth.uid(), now(),
      NULLIF(d->>'delivery_type',''),
      NULLIF(d->>'delivery_proof_url',''),
      NULLIF(d->>'condition_photo_url',''),
      COALESCE(NULLIF(d->>'delivery_date','')::date, CURRENT_DATE),
      NULLIF(d->>'tracking_number',''),
      NULLIF(d->>'expedition_name',''),
      NULLIF(d->>'notes','')
    );
  END LOOP;
END;
$$;

-- 7. RPC: return_equipment_distribution
CREATE OR REPLACE FUNCTION public.return_equipment_distribution(
  p_distribution_id uuid,
  p_condition text,
  p_admin_fee numeric DEFAULT 0,
  p_notes text DEFAULT NULL,
  p_return_photo_url text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_qty integer;
  v_variant_id uuid;
  v_equipment_id uuid;
BEGIN
  SELECT quantity, variant_id, equipment_id
  INTO v_qty, v_variant_id, v_equipment_id
  FROM equipment_distributions
  WHERE id = p_distribution_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Distribusi tidak ditemukan';
  END IF;

  IF p_condition = 'good' THEN
    IF v_variant_id IS NOT NULL THEN
      UPDATE equipment_variants SET stock_good = stock_good + v_qty, updated_at = now()
        WHERE id = v_variant_id;
    ELSE
      UPDATE equipment_items SET stock_quantity = stock_quantity + v_qty
        WHERE id = v_equipment_id;
    END IF;
  ELSIF p_condition = 'damaged' THEN
    IF v_variant_id IS NOT NULL THEN
      UPDATE equipment_variants SET stock_damaged = stock_damaged + v_qty, updated_at = now()
        WHERE id = v_variant_id;
    END IF;
  END IF;

  UPDATE equipment_distributions
    SET status = 'returned',
        return_condition = p_condition,
        return_notes = p_notes,
        return_photo_url = p_return_photo_url,
        cancel_admin_fee = COALESCE(p_admin_fee, 0),
        returned_at = now()
    WHERE id = p_distribution_id;
END;
$$;

-- 8. RPC: adjust_variant_stock
CREATE OR REPLACE FUNCTION public.adjust_variant_stock(
  p_variant_id uuid,
  p_delta_good integer DEFAULT 0,
  p_delta_damaged integer DEFAULT 0
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE equipment_variants
    SET stock_good = GREATEST(0, stock_good + COALESCE(p_delta_good, 0)),
        stock_damaged = GREATEST(0, stock_damaged + COALESCE(p_delta_damaged, 0)),
        updated_at = now()
    WHERE id = p_variant_id;
END;
$$;

-- 9. RPC: increment_equipment_stock & decrement_equipment_stock (legacy compat)
CREATE OR REPLACE FUNCTION public.increment_equipment_stock(
  item_id uuid, amount integer DEFAULT 1
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE public.equipment_items
    SET stock_quantity = COALESCE(stock_quantity,0) + COALESCE(amount,1)
    WHERE id = item_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.decrement_equipment_stock(
  item_id uuid, amount integer DEFAULT 1
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE public.equipment_items
    SET stock_quantity = GREATEST(0, COALESCE(stock_quantity,0) - COALESCE(amount,1))
    WHERE id = item_id;
END;
$$;

-- 10. Trigger: sync aggregate stock from variants
CREATE OR REPLACE FUNCTION public.sync_equipment_aggregate_stock()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_equipment_id uuid;
  v_total integer;
BEGIN
  v_equipment_id := COALESCE(NEW.equipment_id, OLD.equipment_id);
  SELECT COALESCE(SUM(stock_good),0) INTO v_total
  FROM equipment_variants WHERE equipment_id = v_equipment_id;
  UPDATE equipment_items
    SET stock_quantity = v_total
    WHERE id = v_equipment_id AND has_variants = true;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_equipment_aggregate_stock ON public.equipment_variants;
CREATE TRIGGER trg_sync_equipment_aggregate_stock
  AFTER INSERT OR UPDATE OR DELETE ON public.equipment_variants
  FOR EACH ROW EXECUTE FUNCTION public.sync_equipment_aggregate_stock();