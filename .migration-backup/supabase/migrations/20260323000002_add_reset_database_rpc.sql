-- RPC function to reset database (delete all bookings and related data)
-- Only accessible by super_admin

CREATE OR REPLACE FUNCTION public.reset_database(confirm_text TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_id UUID := auth.uid();
    is_authorized BOOLEAN;
    deleted_bookings_count INTEGER;
    deleted_payments_count INTEGER;
    deleted_leads_count INTEGER;
BEGIN
    -- 1. Security Check: Must be super_admin only
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = current_user_id 
        AND role = 'super_admin'
    ) INTO is_authorized;

    IF NOT is_authorized THEN
        RAISE EXCEPTION 'Unauthorized: Only super_admin can reset the database';
    END IF;

    -- 2. Confirmation Check: Must provide exact confirmation text
    IF confirm_text != 'RESET DATABASE SEKARANG' THEN
        RAISE EXCEPTION 'Invalid confirmation text';
    END IF;

    -- 3. Perform Deletions in correct order to respect foreign keys
    -- Delete Payments first
    DELETE FROM public.payments;
    GET DIAGNOSTICS deleted_payments_count = ROW_COUNT;

    -- Delete Booking Passengers
    DELETE FROM public.booking_passengers;

    -- Delete Agent Commissions
    DELETE FROM public.agent_commissions;

    -- Delete Bookings
    DELETE FROM public.bookings;
    GET DIAGNOSTICS deleted_bookings_count = ROW_COUNT;

    -- Delete Leads
    DELETE FROM public.leads;
    GET DIAGNOSTICS deleted_leads_count = ROW_COUNT;

    -- Reset booked_count in departures
    UPDATE public.departures SET booked_count = 0;

    -- 4. Return summary
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Database has been reset successfully',
        'details', jsonb_build_object(
            'bookings_deleted', deleted_bookings_count,
            'payments_deleted', deleted_payments_count,
            'leads_deleted', deleted_leads_count
        )
    );
END;
$$;

-- Grant access to authenticated users (security check is inside the function)
-- Note: This is a destructive operation, only super_admin can execute
GRANT EXECUTE ON FUNCTION public.reset_database(TEXT) TO authenticated;
