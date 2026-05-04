-- Drop existing function so we can recreate with new signature
DROP FUNCTION IF EXISTS public.bulk_distribute_equipment(uuid, jsonb);
DROP FUNCTION IF EXISTS public.bulk_distribute_equipment(jsonb);

-- Recreate with new signature including departure_id
CREATE OR REPLACE FUNCTION public.bulk_distribute_equipment(p_departure_id uuid, p_distributions jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;