-- Add google_maps_url column to manasik_schedules table
ALTER TABLE public.manasik_schedules ADD COLUMN IF NOT EXISTS google_maps_url TEXT;
