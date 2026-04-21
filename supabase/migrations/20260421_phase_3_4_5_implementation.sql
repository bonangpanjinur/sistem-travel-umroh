-- Phase 3: Milestone & Deadline Alert Tracker
ALTER TABLE public.departures 
ADD COLUMN IF NOT EXISTS document_deadline DATE,
ADD COLUMN IF NOT EXISTS payment_deadline DATE,
ADD COLUMN IF NOT EXISTS visa_deadline DATE;

-- Phase 4: Equipment Readiness Bar
-- We already have equipment_distributions, but we might need a status per passenger in booking_passengers
-- or just aggregate from equipment_distributions.
-- Let's add a flag to booking_passengers for quick check if needed, 
-- but the proposal says "jamaah_equipment_status" table.
-- Since we have equipment_distributions, we can use that. 
-- However, to track "readiness", we need to know what items are EXPECTED for each passenger.
-- For now, let's add a column to track overall equipment status in booking_passengers for simplicity in this phase.
ALTER TABLE public.booking_passengers
ADD COLUMN IF NOT EXISTS equipment_status VARCHAR(50) DEFAULT 'pending'; -- pending, partial, completed

-- Phase 5: Break-even Indicator
ALTER TABLE public.packages
ADD COLUMN IF NOT EXISTS break_even_pax INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS operational_cost_per_pax DECIMAL(15,2) DEFAULT 0;

ALTER TABLE public.departures
ADD COLUMN IF NOT EXISTS break_even_pax INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS operational_cost_per_pax DECIMAL(15,2) DEFAULT 0;

-- Update RLS for new columns (usually handled by existing policies if they are broad)
-- But let's ensure they are visible to authenticated users
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
