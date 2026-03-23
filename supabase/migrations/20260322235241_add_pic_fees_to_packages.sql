-- Add fee columns to the packages table
ALTER TABLE public.packages
ADD COLUMN fee_branch NUMERIC DEFAULT 0,
ADD COLUMN fee_agent NUMERIC DEFAULT 0,
ADD COLUMN fee_sub_agent NUMERIC DEFAULT 0,
ADD COLUMN fee_referral NUMERIC DEFAULT 0;

-- Set the new columns to be NOT NULL
ALTER TABLE public.packages
ALTER COLUMN fee_branch SET NOT NULL,
ALTER COLUMN fee_agent SET NOT NULL,
ALTER COLUMN fee_sub_agent SET NOT NULL,
ALTER COLUMN fee_referral SET NOT NULL;
