-- =====================================================
-- 0. ENABLE EXTENSION (NON-BLOCKING)
-- =====================================================
DO $$
BEGIN
    BEGIN
        CREATE SCHEMA IF NOT EXISTS net;
        CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA net;
    EXCEPTION WHEN OTHERS THEN
        NULL; -- Ignore if cannot create schema or extension
    END;
END $$;

-- =====================================================
-- 1. FUNCTION: NOTIFY BOOKING CREATED
-- =====================================================
CREATE OR REPLACE FUNCTION public.notify_booking_created()
RETURNS TRIGGER AS $$
DECLARE
  v_url text;
  v_headers jsonb;
  v_body jsonb;
BEGIN
  -- Check if net.http_post exists before calling using dynamic SQL
  IF EXISTS (
    SELECT 1 FROM pg_proc p 
    JOIN pg_namespace n ON p.pronamespace = n.oid 
    WHERE p.proname = 'http_post' AND n.nspname = 'net'
  ) THEN
    BEGIN
      v_url := current_setting('app.supabase_url', true) || '/functions/v1/send-whatsapp-notification';
      v_headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
      );
      v_body := jsonb_build_object(
        'type', 'booking_confirmed',
        'booking_id', NEW.id
      );

      -- Execute using dynamic SQL to avoid "schema net does not exist" during function parsing
      EXECUTE 'SELECT net.http_post(url := $1, headers := $2, body := $3)' 
      USING v_url, v_headers, v_body;

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
  END IF;

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
DECLARE
  v_url text;
  v_headers jsonb;
  v_body jsonb;
BEGIN
  IF NEW.status = 'verified' AND OLD.status != 'verified' THEN
    -- Check if net.http_post exists
    IF EXISTS (
      SELECT 1 FROM pg_proc p 
      JOIN pg_namespace n ON p.pronamespace = n.oid 
      WHERE p.proname = 'http_post' AND n.nspname = 'net'
    ) THEN
      BEGIN
        v_url := current_setting('app.supabase_url', true) || '/functions/v1/send-whatsapp-notification';
        v_headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
        );
        v_body := jsonb_build_object(
          'type', 'payment_received',
          'booking_id', NEW.booking_id
        );

        EXECUTE 'SELECT net.http_post(url := $1, headers := $2, body := $3)' 
        USING v_url, v_headers, v_body;

      EXCEPTION WHEN OTHERS THEN
        NULL; -- Ignore error to prevent transaction failure
      END;
    END IF;
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
DECLARE
  v_url text;
  v_headers jsonb;
  v_body jsonb;
BEGIN
  IF NEW.status = 'in_progress' AND OLD.status != 'in_progress' THEN
    -- Check if net.http_post exists
    IF EXISTS (
      SELECT 1 FROM pg_proc p 
      JOIN pg_namespace n ON p.pronamespace = n.oid 
      WHERE p.proname = 'http_post' AND n.nspname = 'net'
    ) THEN
      BEGIN
        v_url := current_setting('app.supabase_url', true) || '/functions/v1/send-whatsapp-notification';
        v_headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
        );

        -- Reminder
        v_body := jsonb_build_object(
          'type', 'departure_reminder',
          'departure_id', NEW.id
        );
        EXECUTE 'SELECT net.http_post(url := $1, headers := $2, body := $3)' 
        USING v_url, v_headers, v_body;

        -- Welcome
        v_body := jsonb_build_object(
          'type', 'welcome_umrah',
          'departure_id', NEW.id
        );
        EXECUTE 'SELECT net.http_post(url := $1, headers := $2, body := $3)' 
        USING v_url, v_headers, v_body;

      EXCEPTION WHEN OTHERS THEN
        NULL; -- Ignore error to prevent transaction failure
      END;
    END IF;
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
