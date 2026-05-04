-- =====================================================
-- FIX: Security Definer View (v_financial_summary)
-- Add explicit SECURITY INVOKER to respect RLS
-- =====================================================

DROP VIEW IF EXISTS public.v_financial_summary;
CREATE VIEW public.v_financial_summary
WITH (security_invoker=true) AS
SELECT 
    d.id as departure_id,
    p.name as package_name,
    d.departure_date,
    d.return_date,
    d.quota,
    d.booked_count,
    COALESCE(SUM(b.total_price), 0) as total_revenue,
    COALESCE(SUM(b.paid_amount), 0) as collected_amount,
    COALESCE(SUM(b.remaining_amount), 0) as outstanding_amount,
    COALESCE(SUM(vc.amount), 0) as total_vendor_costs,
    COALESCE(SUM(b.paid_amount), 0) - COALESCE(SUM(vc.amount), 0) as net_profit
FROM public.departures d
LEFT JOIN public.packages p ON d.package_id = p.id
LEFT JOIN public.bookings b ON b.departure_id = d.id
LEFT JOIN public.vendor_costs vc ON vc.departure_id = d.id
GROUP BY d.id, p.name, d.departure_date, d.return_date, d.quota, d.booked_count;