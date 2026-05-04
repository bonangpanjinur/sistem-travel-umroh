-- Allow agents to update customers associated with their bookings
CREATE POLICY "Agents can update customers from their bookings"
ON public.customers
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.booking_passengers bp
    JOIN public.bookings b ON b.id = bp.booking_id
    JOIN public.agents a ON a.id = b.agent_id
    WHERE bp.customer_id = customers.id
    AND a.user_id = auth.uid()
  )
);

-- Allow agents to view customers from their bookings
CREATE POLICY "Agents can view customers from their bookings"
ON public.customers
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.booking_passengers bp
    JOIN public.bookings b ON b.id = bp.booking_id
    JOIN public.agents a ON a.id = b.agent_id
    WHERE bp.customer_id = customers.id
    AND a.user_id = auth.uid()
  )
);