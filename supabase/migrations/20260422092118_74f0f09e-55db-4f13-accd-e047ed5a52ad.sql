-- Audit trail for room assignment changes
CREATE TABLE IF NOT EXISTS public.room_assignment_audit (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  passenger_id UUID NOT NULL REFERENCES public.booking_passengers(id) ON DELETE CASCADE,
  departure_id UUID REFERENCES public.departures(id) ON DELETE SET NULL,
  action TEXT NOT NULL, -- 'pair', 'unpair', 'update_room_number', 'auto_assign'
  old_room_number TEXT,
  new_room_number TEXT,
  old_roommate_id UUID,
  new_roommate_id UUID,
  reason TEXT,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_room_audit_passenger ON public.room_assignment_audit(passenger_id);
CREATE INDEX IF NOT EXISTS idx_room_audit_departure ON public.room_assignment_audit(departure_id);
CREATE INDEX IF NOT EXISTS idx_room_audit_created ON public.room_assignment_audit(created_at DESC);

ALTER TABLE public.room_assignment_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view room assignment audit"
ON public.room_assignment_audit FOR SELECT
USING (public.is_admin(auth.uid()));

CREATE POLICY "Authenticated can insert room assignment audit"
ON public.room_assignment_audit FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND changed_by = auth.uid());
