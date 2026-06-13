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