-- Drop existing function first to avoid conflict
DROP FUNCTION IF EXISTS public.generate_referral_code() CASCADE;

-- Referral system for alumni jamaah
CREATE TABLE IF NOT EXISTS public.referral_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customers(id),
  code VARCHAR(20) NOT NULL UNIQUE,
  commission_rate NUMERIC(5,2) DEFAULT 2.5,
  is_active BOOLEAN DEFAULT true,
  total_referrals INTEGER DEFAULT 0,
  total_commission NUMERIC(15,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Referral usage tracking
CREATE TABLE IF NOT EXISTS public.referral_usages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referral_code_id UUID NOT NULL REFERENCES public.referral_codes(id),
  booking_id UUID NOT NULL REFERENCES public.bookings(id),
  referred_customer_id UUID NOT NULL REFERENCES public.customers(id),
  booking_amount NUMERIC(15,2) NOT NULL,
  commission_amount NUMERIC(15,2) NOT NULL,
  commission_status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  paid_at TIMESTAMP WITH TIME ZONE
);

-- Function to auto-generate referral code (as TRIGGER function)
CREATE OR REPLACE FUNCTION public.generate_referral_code_trigger()
RETURNS TRIGGER AS $$
DECLARE
  new_code VARCHAR(20);
  name_part VARCHAR(6);
BEGIN
  SELECT UPPER(SUBSTRING(REGEXP_REPLACE(c.full_name, '[^a-zA-Z]', '', 'g'), 1, 4))
  INTO name_part
  FROM customers c WHERE c.id = NEW.customer_id;
  
  new_code := name_part || '-' || UPPER(SUBSTRING(NEW.id::text, 1, 6));
  NEW.code := new_code;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_generate_referral_code ON public.referral_codes;
CREATE TRIGGER tr_generate_referral_code
  BEFORE INSERT ON public.referral_codes
  FOR EACH ROW
  WHEN (NEW.code IS NULL)
  EXECUTE FUNCTION public.generate_referral_code_trigger();

-- Function to auto-award loyalty points on payment
CREATE OR REPLACE FUNCTION public.award_loyalty_points_on_payment()
RETURNS TRIGGER AS $$
DECLARE
  points_to_award INTEGER;
  customer_uuid UUID;
BEGIN
  IF NEW.status = 'verified' AND (OLD.status IS NULL OR OLD.status != 'verified') THEN
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

DROP TRIGGER IF EXISTS tr_award_loyalty_points ON public.payments;
CREATE TRIGGER tr_award_loyalty_points
  AFTER INSERT OR UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.award_loyalty_points_on_payment();

-- Enable RLS
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_usages ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Admin full access referral_codes" ON public.referral_codes;
CREATE POLICY "Admin full access referral_codes" ON public.referral_codes FOR ALL USING (true);

DROP POLICY IF EXISTS "Customers view own referral_codes" ON public.referral_codes;
CREATE POLICY "Customers view own referral_codes" ON public.referral_codes
  FOR SELECT USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Admin full access referral_usages" ON public.referral_usages;
CREATE POLICY "Admin full access referral_usages" ON public.referral_usages FOR ALL USING (true);

DROP POLICY IF EXISTS "Referrer view own usages" ON public.referral_usages;
CREATE POLICY "Referrer view own usages" ON public.referral_usages
  FOR SELECT USING (referral_code_id IN (
    SELECT id FROM referral_codes WHERE customer_id IN (
      SELECT id FROM customers WHERE user_id = auth.uid()
    )
  ));