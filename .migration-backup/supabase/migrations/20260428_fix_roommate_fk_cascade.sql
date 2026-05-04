-- Fix roommate_id foreign key constraint to allow deletion
-- Drop the existing foreign key constraint and recreate it with ON DELETE SET NULL

-- First, drop the existing constraint
ALTER TABLE public.booking_passengers 
DROP CONSTRAINT IF EXISTS booking_passengers_roommate_id_fkey;

-- Recreate the constraint with ON DELETE SET NULL
ALTER TABLE public.booking_passengers 
ADD CONSTRAINT booking_passengers_roommate_id_fkey 
FOREIGN KEY (roommate_id) 
REFERENCES public.booking_passengers(id) 
ON DELETE SET NULL;

-- Verify the constraint was created
SELECT constraint_name, table_name, column_name 
FROM information_schema.key_column_usage 
WHERE table_name = 'booking_passengers' AND column_name = 'roommate_id';
