
-- Scheduled Reports table
CREATE TABLE public.scheduled_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  report_type TEXT NOT NULL DEFAULT 'financial', -- financial, operational, marketing, booking_summary
  frequency TEXT NOT NULL DEFAULT 'weekly', -- daily, weekly, monthly
  day_of_week INTEGER DEFAULT 1, -- 0=Sunday, 1=Monday, etc. (for weekly)
  day_of_month INTEGER DEFAULT 1, -- 1-28 (for monthly)
  time_of_day TIME DEFAULT '08:00:00',
  recipients TEXT[] NOT NULL DEFAULT '{}',
  filters JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  last_run_at TIMESTAMP WITH TIME ZONE,
  next_run_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.scheduled_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and finance can manage scheduled reports"
ON public.scheduled_reports FOR ALL
USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'finance'::app_role))
WITH CHECK (is_admin(auth.uid()) OR has_role(auth.uid(), 'finance'::app_role));

-- Scheduled report logs
CREATE TABLE public.scheduled_report_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id UUID NOT NULL REFERENCES public.scheduled_reports(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'success', -- success, failed
  error_message TEXT,
  recipients_sent TEXT[],
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.scheduled_report_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and finance can view report logs"
ON public.scheduled_report_logs FOR SELECT
USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'finance'::app_role));

CREATE POLICY "System can insert report logs"
ON public.scheduled_report_logs FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Offline content table (if not exists)
CREATE TABLE IF NOT EXISTS public.offline_content (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL DEFAULT 'doa',
  title TEXT NOT NULL,
  arabic_text TEXT,
  latin_text TEXT,
  translation TEXT,
  content TEXT,
  audio_url TEXT,
  image_url TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.offline_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active offline content"
ON public.offline_content FOR SELECT
USING (is_active = true OR is_admin(auth.uid()));

CREATE POLICY "Admins can manage offline content"
ON public.offline_content FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_scheduled_reports_updated_at
BEFORE UPDATE ON public.scheduled_reports
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_offline_content_updated_at
BEFORE UPDATE ON public.offline_content
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
