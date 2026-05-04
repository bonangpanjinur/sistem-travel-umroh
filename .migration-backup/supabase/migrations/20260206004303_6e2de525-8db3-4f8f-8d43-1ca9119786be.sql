-- Add missing columns to existing referral_codes table
ALTER TABLE public.referral_codes 
  ADD COLUMN IF NOT EXISTS commission_rate NUMERIC(5,2) DEFAULT 2.5;

-- Rename total_bonus_earned to total_commission for consistency
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'referral_codes' 
             AND column_name = 'total_bonus_earned') THEN
    ALTER TABLE public.referral_codes RENAME COLUMN total_bonus_earned TO total_commission;
  END IF;
END $$;