-- Fix: deleting a departure failed because related operational tables had no ON DELETE rule.
-- equipment_distributions & manasik_schedules belong to a departure -> CASCADE.
-- support_tickets keep history -> SET NULL.
-- bookings remain RESTRICT on purpose (prevent losing customer/payment data).

ALTER TABLE public.equipment_distributions
  DROP CONSTRAINT IF EXISTS equipment_distributions_departure_id_fkey,
  ADD  CONSTRAINT equipment_distributions_departure_id_fkey
       FOREIGN KEY (departure_id) REFERENCES public.departures(id) ON DELETE CASCADE;

ALTER TABLE public.manasik_schedules
  DROP CONSTRAINT IF EXISTS manasik_schedules_departure_id_fkey,
  ADD  CONSTRAINT manasik_schedules_departure_id_fkey
       FOREIGN KEY (departure_id) REFERENCES public.departures(id) ON DELETE CASCADE;

ALTER TABLE public.support_tickets
  DROP CONSTRAINT IF EXISTS support_tickets_departure_id_fkey,
  ADD  CONSTRAINT support_tickets_departure_id_fkey
       FOREIGN KEY (departure_id) REFERENCES public.departures(id) ON DELETE SET NULL;