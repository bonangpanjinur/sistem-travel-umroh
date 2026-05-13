
-- ============================================================
-- STORE: Procurement + Inventory Tracking
-- ============================================================

-- 1. Suppliers
CREATE TABLE IF NOT EXISTS public.store_suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  npwp TEXT,
  payment_terms TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.store_suppliers ENABLE ROW LEVEL SECURITY;

-- 2. PO Counters (monthly bucket)
CREATE TABLE IF NOT EXISTS public.store_po_counters (
  bucket TEXT PRIMARY KEY,        -- format YYMM
  last_seq INT NOT NULL DEFAULT 0
);

ALTER TABLE public.store_po_counters ENABLE ROW LEVEL SECURITY;

-- 3. Purchase Orders
DO $$ BEGIN
  CREATE TYPE public.po_status AS ENUM ('draft','ordered','partial','received','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.store_purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number TEXT UNIQUE NOT NULL,
  supplier_id UUID NOT NULL REFERENCES public.store_suppliers(id) ON DELETE RESTRICT,
  status public.po_status NOT NULL DEFAULT 'draft',
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_date DATE,
  received_date DATE,
  subtotal NUMERIC(14,2) NOT NULL DEFAULT 0,
  tax NUMERIC(14,2) NOT NULL DEFAULT 0,
  shipping_cost NUMERIC(14,2) NOT NULL DEFAULT 0,
  total NUMERIC(14,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.store_purchase_orders ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_po_supplier ON public.store_purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_po_status ON public.store_purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_po_date ON public.store_purchase_orders(order_date DESC);

-- 4. PO Items
CREATE TABLE IF NOT EXISTS public.store_purchase_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id UUID NOT NULL REFERENCES public.store_purchase_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.store_products(id) ON DELETE RESTRICT,
  qty_ordered INT NOT NULL CHECK (qty_ordered > 0),
  qty_received INT NOT NULL DEFAULT 0 CHECK (qty_received >= 0),
  unit_cost NUMERIC(14,2) NOT NULL DEFAULT 0,
  subtotal NUMERIC(14,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.store_purchase_order_items ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_poi_po ON public.store_purchase_order_items(po_id);
CREATE INDEX IF NOT EXISTS idx_poi_product ON public.store_purchase_order_items(product_id);

-- 5. Stock Movements
DO $$ BEGIN
  CREATE TYPE public.stock_movement_type AS ENUM ('purchase_in','sale_out','adjustment','return_in','return_out','opname');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.store_stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.store_products(id) ON DELETE RESTRICT,
  type public.stock_movement_type NOT NULL,
  qty INT NOT NULL,                           -- signed (positive = in, negative = out)
  unit_cost NUMERIC(14,2) NOT NULL DEFAULT 0,
  ref_table TEXT,
  ref_id UUID,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.store_stock_movements ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_movement_product ON public.store_stock_movements(product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_movement_type ON public.store_stock_movements(type);
CREATE UNIQUE INDEX IF NOT EXISTS uq_movement_ref
  ON public.store_stock_movements(ref_table, ref_id, type)
  WHERE ref_table IS NOT NULL AND ref_id IS NOT NULL;

-- 6. Add columns to store_products
ALTER TABLE public.store_products
  ADD COLUMN IF NOT EXISTS current_stock INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS avg_cost NUMERIC(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS min_stock INT NOT NULL DEFAULT 0;

-- 7. Trigger: update product stock & avg_cost on movement
CREATE OR REPLACE FUNCTION public.apply_stock_movement()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_old_stock INT;
  v_old_cost NUMERIC(14,2);
  v_new_stock INT;
  v_new_cost NUMERIC(14,2);
BEGIN
  SELECT current_stock, avg_cost INTO v_old_stock, v_old_cost
    FROM public.store_products WHERE id = NEW.product_id FOR UPDATE;

  v_new_stock := COALESCE(v_old_stock,0) + NEW.qty;

  -- Weighted-avg cost only on inbound purchases
  IF NEW.type = 'purchase_in' AND NEW.qty > 0 AND NEW.unit_cost > 0 THEN
    v_new_cost := ((COALESCE(v_old_stock,0) * COALESCE(v_old_cost,0)) + (NEW.qty * NEW.unit_cost))
                  / NULLIF(v_new_stock,0);
  ELSE
    v_new_cost := v_old_cost;
  END IF;

  UPDATE public.store_products
    SET current_stock = v_new_stock,
        avg_cost = COALESCE(v_new_cost,0),
        updated_at = now()
    WHERE id = NEW.product_id;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_apply_stock_movement ON public.store_stock_movements;
CREATE TRIGGER trg_apply_stock_movement
AFTER INSERT ON public.store_stock_movements
FOR EACH ROW EXECUTE FUNCTION public.apply_stock_movement();

-- 8. Generate PO number
CREATE OR REPLACE FUNCTION public.generate_po_number()
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_bucket TEXT := to_char(now(), 'YYMM');
  v_seq INT;
BEGIN
  INSERT INTO public.store_po_counters(bucket, last_seq) VALUES (v_bucket, 1)
    ON CONFLICT (bucket) DO UPDATE SET last_seq = store_po_counters.last_seq + 1
    RETURNING last_seq INTO v_seq;
  RETURN 'PO-' || v_bucket || '-' || lpad(v_seq::text, 4, '0');
END $$;

-- 9. Receive PO RPC: takes po_id and array of {item_id, qty} JSON
CREATE OR REPLACE FUNCTION public.receive_purchase_order(
  _po_id UUID,
  _items JSONB
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  rec JSONB;
  v_item RECORD;
  v_recv INT;
  v_total_ordered INT;
  v_total_received INT;
  v_user UUID := auth.uid();
BEGIN
  -- AuthZ
  IF NOT (public.has_role(v_user,'super_admin') OR public.has_role(v_user,'owner') OR public.has_role(v_user,'branch_manager')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  FOR rec IN SELECT * FROM jsonb_array_elements(_items) LOOP
    SELECT * INTO v_item FROM public.store_purchase_order_items
      WHERE id = (rec->>'item_id')::uuid AND po_id = _po_id;
    IF NOT FOUND THEN CONTINUE; END IF;

    v_recv := GREATEST(0, (rec->>'qty')::int);
    IF v_recv = 0 THEN CONTINUE; END IF;
    IF v_item.qty_received + v_recv > v_item.qty_ordered THEN
      RAISE EXCEPTION 'qty diterima melebihi qty pesan untuk item %', v_item.id;
    END IF;

    INSERT INTO public.store_stock_movements(product_id, type, qty, unit_cost, ref_table, ref_id, notes, created_by)
      VALUES (v_item.product_id, 'purchase_in', v_recv, v_item.unit_cost, 'store_purchase_order_items', v_item.id, 'Penerimaan PO', v_user);

    UPDATE public.store_purchase_order_items
      SET qty_received = qty_received + v_recv
      WHERE id = v_item.id;
  END LOOP;

  -- Update PO status
  SELECT COALESCE(SUM(qty_ordered),0), COALESCE(SUM(qty_received),0)
    INTO v_total_ordered, v_total_received
    FROM public.store_purchase_order_items WHERE po_id = _po_id;

  UPDATE public.store_purchase_orders
    SET status = CASE
          WHEN v_total_received = 0 THEN status
          WHEN v_total_received >= v_total_ordered THEN 'received'::public.po_status
          ELSE 'partial'::public.po_status
        END,
        received_date = CASE WHEN v_total_received >= v_total_ordered THEN CURRENT_DATE ELSE received_date END,
        updated_at = now()
    WHERE id = _po_id;
END $$;

-- 10. Sale-out trigger when store_orders marked shipped/completed (idempotent)
CREATE OR REPLACE FUNCTION public.apply_store_order_sale_out()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_item RECORD;
BEGIN
  IF NEW.status IN ('shipped','completed','delivered')
     AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    FOR v_item IN
      SELECT product_id, quantity, price
        FROM public.store_order_items
        WHERE order_id = NEW.id
    LOOP
      -- Idempotent via uq_movement_ref
      INSERT INTO public.store_stock_movements(product_id, type, qty, unit_cost, ref_table, ref_id, notes, created_by)
        SELECT v_item.product_id, 'sale_out', -v_item.quantity, COALESCE(p.avg_cost,0), 'store_orders', NEW.id, 'Pengiriman order', NEW.updated_by
          FROM public.store_products p WHERE p.id = v_item.product_id
      ON CONFLICT (ref_table, ref_id, type) DO NOTHING;
    END LOOP;
  END IF;
  RETURN NEW;
END $$;

-- Drop & re-create only if updated_by column exists; otherwise fall back
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='store_orders' AND column_name='status') THEN
    DROP TRIGGER IF EXISTS trg_store_order_sale_out ON public.store_orders;
    CREATE TRIGGER trg_store_order_sale_out
      AFTER UPDATE ON public.store_orders
      FOR EACH ROW EXECUTE FUNCTION public.apply_store_order_sale_out();
  END IF;
END $$;

-- ============================================================
-- RLS Policies
-- ============================================================

-- Helper: admin check
CREATE OR REPLACE FUNCTION public.is_store_admin(_uid UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_uid,'super_admin')
      OR public.has_role(_uid,'owner')
      OR public.has_role(_uid,'branch_manager');
$$;

-- store_suppliers
DROP POLICY IF EXISTS "suppliers_admin_all" ON public.store_suppliers;
CREATE POLICY "suppliers_admin_all" ON public.store_suppliers
  FOR ALL TO authenticated
  USING (public.is_store_admin(auth.uid()))
  WITH CHECK (public.is_store_admin(auth.uid()));

-- store_purchase_orders
DROP POLICY IF EXISTS "po_admin_all" ON public.store_purchase_orders;
CREATE POLICY "po_admin_all" ON public.store_purchase_orders
  FOR ALL TO authenticated
  USING (public.is_store_admin(auth.uid()))
  WITH CHECK (public.is_store_admin(auth.uid()));

-- store_purchase_order_items
DROP POLICY IF EXISTS "poi_admin_all" ON public.store_purchase_order_items;
CREATE POLICY "poi_admin_all" ON public.store_purchase_order_items
  FOR ALL TO authenticated
  USING (public.is_store_admin(auth.uid()))
  WITH CHECK (public.is_store_admin(auth.uid()));

-- store_po_counters (read-only via RPC)
DROP POLICY IF EXISTS "po_counters_admin_read" ON public.store_po_counters;
CREATE POLICY "po_counters_admin_read" ON public.store_po_counters
  FOR SELECT TO authenticated
  USING (public.is_store_admin(auth.uid()));

-- store_stock_movements: admins read+insert; only super_admin delete; no update
DROP POLICY IF EXISTS "movements_admin_select" ON public.store_stock_movements;
CREATE POLICY "movements_admin_select" ON public.store_stock_movements
  FOR SELECT TO authenticated
  USING (public.is_store_admin(auth.uid()));

DROP POLICY IF EXISTS "movements_admin_insert" ON public.store_stock_movements;
CREATE POLICY "movements_admin_insert" ON public.store_stock_movements
  FOR INSERT TO authenticated
  WITH CHECK (public.is_store_admin(auth.uid()));

DROP POLICY IF EXISTS "movements_super_delete" ON public.store_stock_movements;
CREATE POLICY "movements_super_delete" ON public.store_stock_movements
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'super_admin'));

-- Updated-at trigger reuse
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname='set_updated_at_now') THEN
    CREATE FUNCTION public.set_updated_at_now() RETURNS TRIGGER
      LANGUAGE plpgsql AS $f$ BEGIN NEW.updated_at = now(); RETURN NEW; END $f$;
  END IF;
END $$;

DROP TRIGGER IF EXISTS trg_suppliers_updated ON public.store_suppliers;
CREATE TRIGGER trg_suppliers_updated BEFORE UPDATE ON public.store_suppliers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_now();

DROP TRIGGER IF EXISTS trg_po_updated ON public.store_purchase_orders;
CREATE TRIGGER trg_po_updated BEFORE UPDATE ON public.store_purchase_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_now();
