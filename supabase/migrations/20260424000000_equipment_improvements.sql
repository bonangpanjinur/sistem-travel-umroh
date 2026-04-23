-- Add low_stock_threshold to equipment_items
ALTER TABLE public.equipment_items 
ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER DEFAULT 10;

-- RPC to increment stock atomically
CREATE OR REPLACE FUNCTION public.increment_equipment_stock(item_id UUID, amount INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE public.equipment_items
  SET stock_quantity = COALESCE(stock_quantity, 0) + amount
  WHERE id = item_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC to decrement stock atomically
CREATE OR REPLACE FUNCTION public.decrement_equipment_stock(item_id UUID, amount INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE public.equipment_items
  SET stock_quantity = GREATEST(0, COALESCE(stock_quantity, 0) - amount)
  WHERE id = item_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC for bulk distribution with atomic stock update
CREATE OR REPLACE FUNCTION public.bulk_distribute_equipment(
  p_departure_id UUID,
  p_distributions JSONB -- Array of {equipment_id, customer_id, quantity}
)
RETURNS INTEGER AS $$
DECLARE
  dist_record RECORD;
  inserted_count INTEGER := 0;
BEGIN
  FOR dist_record IN SELECT * FROM jsonb_to_recordset(p_distributions) AS x(equipment_id UUID, customer_id UUID, quantity INTEGER)
  LOOP
    -- Insert distribution
    INSERT INTO public.equipment_distributions (
      equipment_id,
      customer_id,
      departure_id,
      quantity,
      status,
      distributed_at
    ) VALUES (
      dist_record.equipment_id,
      dist_record.customer_id,
      p_departure_id,
      COALESCE(dist_record.quantity, 1),
      'distributed',
      now()
    );
    
    -- Decrement stock
    UPDATE public.equipment_items
    SET stock_quantity = GREATEST(0, COALESCE(stock_quantity, 0) - COALESCE(dist_record.quantity, 1))
    WHERE id = dist_record.equipment_id;
    
    inserted_count := inserted_count + 1;
  END LOOP;
  
  RETURN inserted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
