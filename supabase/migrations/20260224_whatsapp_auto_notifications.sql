-- =====================================================
-- 0. ENABLE EXTENSION
-- =====================================================
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA net;

-- =====================================================
-- 1. FUNCTION: NOTIFY BOOKING CREATED
-- =====================================================
CREATE OR REPLACE FUNCTION public.notify_booking_created()
RETURNS TRIGGER AS $$
DECLARE
  notification_result json;
BEGIN
  BEGIN
    PERFORM net.http_post(
      url := current_setting('app.supabase_url', true) || '/functions/v1/send-whatsapp-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
      ),
      body := jsonb_build_object(
        'type', 'booking_confirmed',
        'booking_id', NEW.id
      )
    );
  EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail the booking creation
    INSERT INTO public.whatsapp_notification_logs (
      notification_type,
      booking_id,
      status,
      error_message
    ) VALUES (
      'booking_confirmed',
      NEW.id,
      'failed',
      SQLERRM
    );
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger
DROP TRIGGER IF EXISTS trg_notify_booking_created ON public.bookings;
CREATE TRIGGER trg_notify_booking_created
AFTER INSERT ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.notify_booking_created();


-- =====================================================
-- 2. FUNCTION: PAYMENT VERIFIED
-- =====================================================
CREATE OR REPLACE FUNCTION public.notify_payment_verified()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'verified' AND OLD.status != 'verified' THEN
    PERFORM net.http_post(
      url := current_setting('app.supabase_url', true) || '/functions/v1/send-whatsapp-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
      ),
      body := jsonb_build_object(
        'type', 'payment_received',
        'booking_id', NEW.booking_id
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger (SAFE: hanya dibuat kalau tabel ada)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'payment_proofs'
  ) THEN

    DROP TRIGGER IF EXISTS trg_notify_payment_verified ON public.payment_proofs;

    CREATE TRIGGER trg_notify_payment_verified
    AFTER UPDATE ON public.payment_proofs
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_payment_verified();

  END IF;
END $$;


-- =====================================================
-- 3. FUNCTION: DEPARTURE REMINDER + WELCOME (DIGABUNG)
-- =====================================================
CREATE OR REPLACE FUNCTION public.notify_departure_events()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'in_progress' AND OLD.status != 'in_progress' THEN

    -- Reminder
    PERFORM net.http_post(
      url := current_setting('app.supabase_url', true) || '/functions/v1/send-whatsapp-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
      ),
      body := jsonb_build_object(
        'type', 'departure_reminder',
        'departure_id', NEW.id
      )
    );

    -- Welcome
    PERFORM net.http_post(
      url := current_setting('app.supabase_url', true) || '/functions/v1/send-whatsapp-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
      ),
      body := jsonb_build_object(
        'type', 'welcome_umrah',
        'departure_id', NEW.id
      )
    );

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger
DROP TRIGGER IF EXISTS trg_notify_departure_events ON public.departures;
CREATE TRIGGER trg_notify_departure_events
AFTER UPDATE ON public.departures
FOR EACH ROW
EXECUTE FUNCTION public.notify_departure_events();


-- =====================================================
-- 4. TABLE: WHATSAPP LOGS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.whatsapp_notification_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),

  notification_type text NOT NULL,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  departure_id uuid REFERENCES public.departures(id) ON DELETE SET NULL,

  status text DEFAULT 'pending',
  error_message text,

  request_body jsonb,
  response_body jsonb
);

-- INDEX
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_type 
ON public.whatsapp_notification_logs(notification_type);

CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_status 
ON public.whatsapp_notification_logs(status);

CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_created 
ON public.whatsapp_notification_logs(created_at);

-- =====================================================
-- 5. RLS
-- =====================================================
ALTER TABLE public.whatsapp_notification_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Only admins can view WhatsApp notification logs" 
ON public.whatsapp_notification_logs;

CREATE POLICY "Only admins can view WhatsApp notification logs"
ON public.whatsapp_notification_logs
FOR SELECT
USING (
  is_admin(auth.uid()) 
  OR has_role(auth.uid(), 'marketing'::app_role)
);
