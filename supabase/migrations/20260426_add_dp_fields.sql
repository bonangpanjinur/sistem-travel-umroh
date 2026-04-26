-- Add DP (Down Payment) fields to savings_plans
ALTER TABLE public.savings_plans 
ADD COLUMN IF NOT EXISTS dp_amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS dp_status VARCHAR(20) DEFAULT 'pending' CHECK (dp_status IN ('pending', 'paid', 'verified', 'rejected')),
ADD COLUMN IF NOT EXISTS dp_payment_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS dp_proof_url TEXT;

-- Update CHECK constraint to include new status
ALTER TABLE public.savings_plans 
DROP CONSTRAINT IF EXISTS savings_plans_status_check,
ADD CONSTRAINT savings_plans_status_check CHECK (
  status IN ('active', 'dp_paid', 'completed', 'cancelled', 'converted')
);

-- Add index for dp_status
CREATE INDEX IF NOT EXISTS idx_savings_plans_dp_status ON public.savings_plans(dp_status);