-- Create function to send WhatsApp notification when booking is created
CREATE OR REPLACE FUNCTION public.notify_booking_created()
RETURNS TRIGGER AS $$
DECLARE
  notification_result json;
BEGIN
  -- Send WhatsApp notification asynchronously via Edge Function
  SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/send-whatsapp-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    ),
    body := jsonb_build_object(
      'type', 'booking_confirmed',
      'booking_id', NEW.id
    )
  ) INTO notification_result;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for booking creation
DROP TRIGGER IF EXISTS trg_notify_booking_created ON public.bookings;
CREATE TRIGGER trg_notify_booking_created
  AFTER INSERT ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_booking_created();

-- Create function to send WhatsApp notification when payment is verified
CREATE OR REPLACE FUNCTION public.notify_payment_verified()
RETURNS TRIGGER AS $$
DECLARE
  notification_result json;
BEGIN
  -- Only notify when status changes to 'verified'
  IF NEW.status = 'verified' AND OLD.status != 'verified' THEN
    SELECT net.http_post(
      url := current_setting('app.supabase_url') || '/functions/v1/send-whatsapp-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.service_role_key')
      ),
      body := jsonb_build_object(
        'type', 'payment_received',
        'booking_id', NEW.booking_id
      )
    ) INTO notification_result;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for payment verification
DROP TRIGGER IF EXISTS trg_notify_payment_verified ON public.payment_proofs;
CREATE TRIGGER trg_notify_payment_verified
  AFTER UPDATE ON public.payment_proofs
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_payment_verified();

-- Create function to send departure reminder (H-3)
CREATE OR REPLACE FUNCTION public.notify_departure_reminder()
RETURNS TRIGGER AS $$
DECLARE
  notification_result json;
BEGIN
  -- Only notify when status changes to 'in_progress' (departure is starting)
  IF NEW.status = 'in_progress' AND OLD.status != 'in_progress' THEN
    SELECT net.http_post(
      url := current_setting('app.supabase_url') || '/functions/v1/send-whatsapp-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.service_role_key')
      ),
      body := jsonb_build_object(
        'type', 'departure_reminder',
        'departure_id', NEW.id
      )
    ) INTO notification_result;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for departure status change
DROP TRIGGER IF EXISTS trg_notify_departure_reminder ON public.departures;
CREATE TRIGGER trg_notify_departure_reminder
  AFTER UPDATE ON public.departures
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_departure_reminder();

-- Create function to send welcome message when departure starts
CREATE OR REPLACE FUNCTION public.notify_welcome_umrah()
RETURNS TRIGGER AS $$
DECLARE
  notification_result json;
BEGIN
  -- Send welcome message when departure status becomes 'in_progress'
  IF NEW.status = 'in_progress' AND OLD.status != 'in_progress' THEN
    SELECT net.http_post(
      url := current_setting('app.supabase_url') || '/functions/v1/send-whatsapp-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.service_role_key')
      ),
      body := jsonb_build_object(
        'type', 'welcome_umrah',
        'departure_id', NEW.id
      )
    ) INTO notification_result;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Note: The welcome_umrah trigger uses the same departure trigger
-- You can combine them or create separate ones based on your needs

-- Create a table to store WhatsApp notification logs for debugging
CREATE TABLE IF NOT EXISTS public.whatsapp_notification_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  
  notification_type text NOT NULL,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  departure_id uuid REFERENCES public.departures(id) ON DELETE SET NULL,
  
  status text DEFAULT 'pending', -- 'pending', 'sent', 'failed'
  error_message text,
  
  request_body jsonb,
  response_body jsonb
);

-- Create index for tracking
CREATE INDEX idx_whatsapp_notification_logs_type ON public.whatsapp_notification_logs(notification_type);
CREATE INDEX idx_whatsapp_notification_logs_status ON public.whatsapp_notification_logs(status);
CREATE INDEX idx_whatsapp_notification_logs_created ON public.whatsapp_notification_logs(created_at);

-- Enable RLS
ALTER TABLE public.whatsapp_notification_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policy - only admins can view
CREATE POLICY "Only admins can view WhatsApp notification logs"
  ON public.whatsapp_notification_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'owner', 'marketing')
    )
  );
