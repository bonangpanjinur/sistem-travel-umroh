-- Enable extension first
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA net;

-- Create function to trigger WhatsApp notification on booking creation
CREATE OR REPLACE FUNCTION trigger_whatsapp_on_booking_created()
RETURNS TRIGGER AS $$
BEGIN
  -- Call the Edge Function to send WhatsApp
  BEGIN
    SELECT
      net.http_post(
        url:='https://' || current_setting('app.supabase_url') || '/functions/v1/send-whatsapp-trigger',
        headers:=jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.supabase_anon_key')
        ),
        body:=jsonb_build_object(
          'event_type', 'booking_created',
          'record_id', NEW.id
        ),
        timeout_milliseconds:=5000
      ) INTO NULL;
  EXCEPTION WHEN OTHERS THEN
    -- Silently fail to not block the main transaction
    NULL;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for booking creation
DROP TRIGGER IF EXISTS whatsapp_booking_created_trigger ON bookings;
CREATE TRIGGER whatsapp_booking_created_trigger
AFTER INSERT ON bookings
FOR EACH ROW
EXECUTE FUNCTION trigger_whatsapp_on_booking_created();

-- Create function to trigger WhatsApp notification on payment verification
CREATE OR REPLACE FUNCTION trigger_whatsapp_on_payment_verified()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger if status changed to 'paid'
  IF NEW.status = 'paid' AND OLD.status != 'paid' THEN
    SELECT
      net.http_post(
        url:='https://' || current_setting('app.supabase_url') || '/functions/v1/send-whatsapp-trigger',
        headers:=jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.supabase_anon_key')
        ),
        body:=jsonb_build_object(
          'event_type', 'payment_verified',
          'record_id', NEW.id
        ),
        timeout_milliseconds:=5000
      ) INTO NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for payment verification
DROP TRIGGER IF EXISTS whatsapp_payment_verified_trigger ON payments;
CREATE TRIGGER whatsapp_payment_verified_trigger
AFTER UPDATE ON payments
FOR EACH ROW
EXECUTE FUNCTION trigger_whatsapp_on_payment_verified();

-- Create function to trigger WhatsApp notification on document rejection
CREATE OR REPLACE FUNCTION trigger_whatsapp_on_document_rejected()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger if status changed to 'rejected'
  IF NEW.status = 'rejected' AND OLD.status != 'rejected' THEN
    SELECT
      net.http_post(
        url:='https://' || current_setting('app.supabase_url') || '/functions/v1/send-whatsapp-trigger',
        headers:=jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.supabase_anon_key')
        ),
        body:=jsonb_build_object(
          'event_type', 'document_rejected',
          'record_id', NEW.id
        ),
        timeout_milliseconds:=5000
      ) INTO NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for document rejection
DROP TRIGGER IF EXISTS whatsapp_document_rejected_trigger ON customer_documents;
CREATE TRIGGER whatsapp_document_rejected_trigger
AFTER UPDATE ON customer_documents
FOR EACH ROW
EXECUTE FUNCTION trigger_whatsapp_on_document_rejected();

-- Create function to trigger WhatsApp notification on commission payment
CREATE OR REPLACE FUNCTION trigger_whatsapp_on_commission_paid()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger if status changed to 'paid'
  IF NEW.status = 'paid' AND OLD.status != 'paid' THEN
    SELECT
      net.http_post(
        url:='https://' || current_setting('app.supabase_url') || '/functions/v1/send-whatsapp-trigger',
        headers:=jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.supabase_anon_key')
        ),
        body:=jsonb_build_object(
          'event_type', 'commission_paid',
          'record_id', NEW.id
        ),
        timeout_milliseconds:=5000
      ) INTO NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for commission payment
DROP TRIGGER IF EXISTS whatsapp_commission_paid_trigger ON agent_commissions;
CREATE TRIGGER whatsapp_commission_paid_trigger
AFTER UPDATE ON agent_commissions
FOR EACH ROW
EXECUTE FUNCTION trigger_whatsapp_on_commission_paid();

-- Add notification type to notifications table if not exists
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS related_record_id UUID;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS related_record_type VARCHAR;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_created_at ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_related_record ON notifications(related_record_type, related_record_id);
