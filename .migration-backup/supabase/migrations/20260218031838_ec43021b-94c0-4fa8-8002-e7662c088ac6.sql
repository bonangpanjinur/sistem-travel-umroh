-- 1. Add payment_deadline to bookings if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bookings' AND column_name='payment_deadline') THEN
        ALTER TABLE public.bookings ADD COLUMN payment_deadline timestamp with time zone;
    END IF;
END $$;

-- 2. Create booking_status_history table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.booking_status_history (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    old_status TEXT,
    new_status TEXT NOT NULL,
    old_payment_status TEXT,
    new_payment_status TEXT,
    changed_by UUID REFERENCES auth.users(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for history
ALTER TABLE public.booking_status_history ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist before recreating
DROP POLICY IF EXISTS "Staff can view all status history" ON public.booking_status_history;
DROP POLICY IF EXISTS "Users can view own booking history" ON public.booking_status_history;

CREATE POLICY "Staff can view all status history" 
ON public.booking_status_history FOR SELECT 
USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'finance'::app_role) OR has_role(auth.uid(), 'sales'::app_role) OR has_role(auth.uid(), 'operational'::app_role));

CREATE POLICY "Users can view own booking history" 
ON public.booking_status_history FOR SELECT 
USING (EXISTS (
    SELECT 1 FROM public.bookings b
    JOIN public.customers c ON c.id = b.customer_id
    WHERE b.id = booking_status_history.booking_id AND c.user_id = auth.uid()
));

-- 3. The notifications table already exists, so we just ensure RLS and columns match our needs if necessary
-- Let's just make sure RLS is enabled on it
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own notifications" ON public.notifications;
CREATE POLICY "Users can manage own notifications" 
ON public.notifications FOR ALL 
USING (auth.uid() = user_id);

-- 4. Re-create Function and Trigger to log booking status changes
CREATE OR REPLACE FUNCTION public.log_booking_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.booking_status IS DISTINCT FROM NEW.booking_status) OR (OLD.payment_status IS DISTINCT FROM NEW.payment_status) THEN
        INSERT INTO public.booking_status_history (
            booking_id,
            old_status,
            new_status,
            old_payment_status,
            new_payment_status,
            changed_by,
            created_at
        ) VALUES (
            NEW.id,
            OLD.booking_status,
            NEW.booking_status,
            OLD.payment_status,
            NEW.payment_status,
            auth.uid(),
            now()
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_log_booking_status_change ON public.bookings;
CREATE TRIGGER trigger_log_booking_status_change
AFTER UPDATE ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.log_booking_status_change();

-- 5. Auto-set payment deadline on booking creation
CREATE OR REPLACE FUNCTION public.set_booking_payment_deadline()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.payment_deadline IS NULL THEN
        NEW.payment_deadline := now() + interval '3 days';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_set_booking_payment_deadline ON public.bookings;
CREATE TRIGGER trigger_set_booking_payment_deadline
BEFORE INSERT ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.set_booking_payment_deadline();
