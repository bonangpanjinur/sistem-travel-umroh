-- Phase 4: Optimasi Laporan & Skalabilitas

-- 1. Materialized View for Financial Summary (Performance Optimization)
-- This replaces the regular view with a materialized one for faster dashboard loading
DROP VIEW IF EXISTS public.v_financial_summary CASCADE;

CREATE MATERIALIZED VIEW public.mv_financial_summary AS
SELECT 
    d.id as departure_id,
    p.name as package_name,
    d.departure_date,
    d.return_date,
    COUNT(DISTINCT b.id) as total_bookings,
    SUM(b.total_pax) as total_pax,
    SUM(b.total_price) as gross_revenue,
    SUM(b.paid_amount) as collected_amount,
    SUM(b.total_price - b.paid_amount) as outstanding_amount,
    COALESCE(SUM(vc.amount), 0) as total_vendor_costs,
    SUM(b.paid_amount) - COALESCE(SUM(vc.amount), 0) as net_profit,
    now() as last_refreshed_at
FROM public.departures d
LEFT JOIN public.packages p ON d.package_id = p.id
LEFT JOIN public.bookings b ON b.departure_id = d.id AND b.booking_status != 'cancelled'
LEFT JOIN public.vendor_costs vc ON vc.departure_id = d.id
GROUP BY d.id, p.name, d.departure_date, d.return_date;

-- Create index for performance
CREATE UNIQUE INDEX idx_mv_financial_summary_departure_id ON public.mv_financial_summary (departure_id);

-- Function to refresh the materialized view
CREATE OR REPLACE FUNCTION public.refresh_financial_summary()
RETURNS trigger AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_financial_summary;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Triggers to refresh the view when data changes
CREATE TRIGGER refresh_financial_summary_on_booking
AFTER INSERT OR UPDATE OR DELETE ON public.bookings
FOR EACH STATEMENT EXECUTE FUNCTION public.refresh_financial_summary();

CREATE TRIGGER refresh_financial_summary_on_departure
AFTER INSERT OR UPDATE OR DELETE ON public.departures
FOR EACH STATEMENT EXECUTE FUNCTION public.refresh_financial_summary();

-- 2. Automated Notifications for Missing Documents & Overdue Payments
-- This function will be called by a cron job or can be triggered by specific events

CREATE OR REPLACE FUNCTION public.check_and_notify_pending_tasks()
RETURNS void AS $$
DECLARE
    rec RECORD;
BEGIN
    -- Notify for missing documents (Jamaah who have bookings but incomplete documents)
    FOR rec IN 
        SELECT DISTINCT c.id, c.full_name, c.user_id, b.booking_code
        FROM public.customers c
        JOIN public.bookings b ON b.customer_id = c.id
        LEFT JOIN public.customer_documents cd ON cd.customer_id = c.id
        WHERE b.booking_status = 'confirmed'
        AND (cd.id IS NULL OR cd.status = 'rejected')
    LOOP
        IF rec.user_id IS NOT NULL THEN
            INSERT INTO public.notifications (user_id, title, message, type, link)
            VALUES (
                rec.user_id,
                'Lengkapi Dokumen Anda',
                'Halo ' || rec.full_name || ', mohon segera lengkapi dokumen untuk booking ' || rec.booking_code || '.',
                'warning',
                '/customer/documents'
            );
        END IF;
    END LOOP;

    -- Notify for overdue payments (AR Aging)
    FOR rec IN 
        SELECT b.id, b.booking_code, b.total_price, b.paid_amount, c.full_name, c.user_id
        FROM public.bookings b
        JOIN public.customers c ON b.customer_id = c.id
        WHERE b.payment_status IN ('pending', 'partial', 'unpaid')
        AND b.booking_status = 'confirmed'
        AND (b.total_price - b.paid_amount) > 0
        AND b.created_at < now() - interval '7 days' -- Example: older than 7 days
    LOOP
        IF rec.user_id IS NOT NULL THEN
            INSERT INTO public.notifications (user_id, title, message, type, link)
            VALUES (
                rec.user_id,
                'Pengingat Pembayaran',
                'Halo ' || rec.full_name || ', Anda memiliki sisa pembayaran untuk booking ' || rec.booking_code || '. Mohon segera selesaikan.',
                'warning',
                '/customer/bookings'
            );
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;
