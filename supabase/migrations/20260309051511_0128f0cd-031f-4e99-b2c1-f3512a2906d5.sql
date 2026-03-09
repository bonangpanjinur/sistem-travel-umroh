ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS is_manual boolean DEFAULT false;
ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS manual_reason text;