
-- Fix loyalty trigger: reference_id is uuid but we're casting to text
CREATE OR REPLACE FUNCTION public.award_loyalty_points_on_payment()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  points_to_award INTEGER;
  customer_uuid UUID;
BEGIN
  IF NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status != 'paid') THEN
    SELECT customer_id INTO customer_uuid
    FROM bookings WHERE id = NEW.booking_id;
    
    IF customer_uuid IS NOT NULL THEN
      points_to_award := FLOOR(NEW.amount / 100000);
      
      IF points_to_award > 0 THEN
        INSERT INTO loyalty_points (customer_id, current_points, total_earned)
        VALUES (customer_uuid, points_to_award, points_to_award)
        ON CONFLICT (customer_id) 
        DO UPDATE SET 
          current_points = loyalty_points.current_points + points_to_award,
          total_earned = loyalty_points.total_earned + points_to_award,
          tier_level = CASE 
            WHEN loyalty_points.current_points + points_to_award >= 5000 THEN 'platinum'
            WHEN loyalty_points.current_points + points_to_award >= 1000 THEN 'gold'
            ELSE 'silver'
          END,
          updated_at = now();
        
        INSERT INTO loyalty_transactions (customer_id, transaction_type, points_amount, description, reference_id)
        VALUES (customer_uuid, 'EARN', points_to_award, 'Poin dari pembayaran booking', NEW.id);
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Fix auto_assign_lead function - profiles doesn't have branch_id
CREATE OR REPLACE FUNCTION public.auto_assign_lead()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_sales_user_id uuid;
BEGIN
  IF NEW.assigned_to IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT ur.user_id INTO v_sales_user_id
  FROM user_roles ur
  WHERE ur.role = 'sales'
    AND (NEW.branch_id IS NULL OR ur.branch_id = NEW.branch_id OR ur.branch_id IS NULL)
  ORDER BY (
    SELECT COALESCE(MAX(l.updated_at), '1970-01-01'::timestamp)
    FROM leads l
    WHERE l.assigned_to = ur.user_id
  ) ASC
  LIMIT 1;

  IF v_sales_user_id IS NOT NULL THEN
    NEW.assigned_to := v_sales_user_id;
  END IF;

  RETURN NEW;
END;
$function$;
