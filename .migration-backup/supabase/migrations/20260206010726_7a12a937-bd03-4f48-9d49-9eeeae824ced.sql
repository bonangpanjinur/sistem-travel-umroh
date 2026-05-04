-- Create table for jamaah live locations
CREATE TABLE public.jamaah_live_locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  departure_id UUID REFERENCES public.departures(id) ON DELETE SET NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  accuracy DOUBLE PRECISION,
  speed DOUBLE PRECISION,
  heading DOUBLE PRECISION,
  is_sharing BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(customer_id, departure_id)
);

-- Enable RLS
ALTER TABLE public.jamaah_live_locations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can manage their own location
CREATE POLICY "Users can manage own location"
ON public.jamaah_live_locations
FOR ALL
USING (
  customer_id IN (
    SELECT id FROM public.customers WHERE user_id = auth.uid()
  )
);

-- Policy: Admin can view all locations for operational purposes
CREATE POLICY "Admin can view all locations"
ON public.jamaah_live_locations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('super_admin', 'owner', 'branch_manager')
  )
);

-- Enable realtime for live location updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.jamaah_live_locations;

-- Add trigger for updated_at
CREATE TRIGGER update_jamaah_live_locations_updated_at
BEFORE UPDATE ON public.jamaah_live_locations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();