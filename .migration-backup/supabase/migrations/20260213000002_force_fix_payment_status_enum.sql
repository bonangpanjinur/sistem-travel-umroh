
-- This migration ensures 'verified' exists in the payment_status enum
-- Since ALTER TYPE ... ADD VALUE cannot be executed inside a transaction block in some versions of Postgres
-- we use a workaround or ensure it's handled.

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'payment_status' AND e.enumlabel = 'verified') THEN
        ALTER TYPE public.payment_status ADD VALUE 'verified' AFTER 'paid';
    END IF;
EXCEPTION
    WHEN duplicate_object THEN
        NULL;
END $$;

-- Also check if 'verified' is needed for the status column in payments table if it uses the same enum
-- In some schemas, payments.status and bookings.payment_status might share the same enum type.

-- Update any existing functions that might be using the old enum values
CREATE OR REPLACE FUNCTION public.award_loyalty_points_on_payment()
RETURNS TRIGGER AS $$
DECLARE
  points_to_award INTEGER;
  customer_uuid UUID;
BEGIN
  -- Check if status is changed to 'paid' or 'verified'
  IF (NEW.status IN ('paid', 'verified')) AND (OLD.status IS NULL OR OLD.status NOT IN ('paid', 'verified')) THEN
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
        VALUES (customer_uuid, 'EARN', points_to_award, 'Poin dari pembayaran booking', NEW.id::text);
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
