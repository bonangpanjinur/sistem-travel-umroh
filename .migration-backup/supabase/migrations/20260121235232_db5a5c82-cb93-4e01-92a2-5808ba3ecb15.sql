-- 1. Add 'tabungan' to package_type enum
ALTER TYPE public.package_type ADD VALUE IF NOT EXISTS 'tabungan';

-- 2. Create savings_plans table for tabungan package subscriptions
CREATE TABLE public.savings_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  package_id UUID NOT NULL REFERENCES public.packages(id) ON DELETE CASCADE,
  target_amount NUMERIC NOT NULL,
  monthly_amount NUMERIC NOT NULL,
  tenor_months INTEGER NOT NULL DEFAULT 12,
  paid_amount NUMERIC DEFAULT 0,
  remaining_amount NUMERIC GENERATED ALWAYS AS (target_amount - paid_amount) STORED,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  target_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled', 'converted')),
  converted_booking_id UUID REFERENCES public.bookings(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create savings_payments table for tracking installments
CREATE TABLE public.savings_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  savings_plan_id UUID NOT NULL REFERENCES public.savings_plans(id) ON DELETE CASCADE,
  payment_code VARCHAR(50) NOT NULL UNIQUE,
  amount NUMERIC NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method VARCHAR(50),
  bank_name VARCHAR(100),
  account_name VARCHAR(100),
  proof_url TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Enable RLS
ALTER TABLE public.savings_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.savings_payments ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for savings_plans
CREATE POLICY "Admins can manage savings plans" ON public.savings_plans
  FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Users can view own savings plans" ON public.savings_plans
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM customers 
      WHERE customers.id = savings_plans.customer_id 
      AND customers.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create savings plans" ON public.savings_plans
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM customers 
      WHERE customers.id = savings_plans.customer_id 
      AND customers.user_id = auth.uid()
    )
  );

-- 6. RLS Policies for savings_payments
CREATE POLICY "Admins can manage savings payments" ON public.savings_payments
  FOR ALL USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'finance'::app_role));

CREATE POLICY "Users can view own savings payments" ON public.savings_payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM savings_plans sp
      JOIN customers c ON c.id = sp.customer_id
      WHERE sp.id = savings_payments.savings_plan_id
      AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create savings payments" ON public.savings_payments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM savings_plans sp
      JOIN customers c ON c.id = sp.customer_id
      WHERE sp.id = savings_payments.savings_plan_id
      AND c.user_id = auth.uid()
    )
  );

-- 7. Create trigger for updated_at
CREATE TRIGGER update_savings_plans_updated_at
  BEFORE UPDATE ON public.savings_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 8. Generate payment code function for savings
CREATE OR REPLACE FUNCTION public.generate_savings_payment_code()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    new_code := 'SAV' || TO_CHAR(NOW(), 'YYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
    SELECT EXISTS(SELECT 1 FROM public.savings_payments WHERE payment_code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  RETURN new_code;
END;
$$;

-- 9. Create indexes for performance
CREATE INDEX idx_savings_plans_customer ON public.savings_plans(customer_id);
CREATE INDEX idx_savings_plans_package ON public.savings_plans(package_id);
CREATE INDEX idx_savings_plans_status ON public.savings_plans(status);
CREATE INDEX idx_savings_payments_plan ON public.savings_payments(savings_plan_id);
CREATE INDEX idx_savings_payments_status ON public.savings_payments(status);