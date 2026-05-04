-- Add roommate pairing columns to booking_passengers table
ALTER TABLE public.booking_passengers 
ADD COLUMN IF NOT EXISTS room_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS roommate_id UUID REFERENCES public.booking_passengers(id);

-- Create index for faster roommate lookups
CREATE INDEX IF NOT EXISTS idx_booking_passengers_roommate ON public.booking_passengers(roommate_id);
CREATE INDEX IF NOT EXISTS idx_booking_passengers_room_preference ON public.booking_passengers(room_preference);