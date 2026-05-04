-- Drop existing foreign key and add new one referencing customers
ALTER TABLE public.departures 
DROP CONSTRAINT IF EXISTS departures_team_leader_id_fkey;

ALTER TABLE public.departures 
ADD CONSTRAINT departures_team_leader_id_fkey 
FOREIGN KEY (team_leader_id) REFERENCES public.customers(id) ON DELETE SET NULL;