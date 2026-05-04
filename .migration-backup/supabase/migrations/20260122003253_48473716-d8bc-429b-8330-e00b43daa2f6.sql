-- Allow agents to upload documents for customers from their bookings
CREATE POLICY "Agents can upload documents for their customers"
ON public.customer_documents
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.booking_passengers bp
    JOIN public.bookings b ON b.id = bp.booking_id
    JOIN public.agents a ON a.id = b.agent_id
    WHERE bp.customer_id = customer_documents.customer_id
    AND a.user_id = auth.uid()
  )
);

-- Allow agents to update documents for customers from their bookings
CREATE POLICY "Agents can update documents for their customers"
ON public.customer_documents
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.booking_passengers bp
    JOIN public.bookings b ON b.id = bp.booking_id
    JOIN public.agents a ON a.id = b.agent_id
    WHERE bp.customer_id = customer_documents.customer_id
    AND a.user_id = auth.uid()
  )
);

-- Allow agents to view documents for customers from their bookings
CREATE POLICY "Agents can view documents for their customers"
ON public.customer_documents
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.booking_passengers bp
    JOIN public.bookings b ON b.id = bp.booking_id
    JOIN public.agents a ON a.id = b.agent_id
    WHERE bp.customer_id = customer_documents.customer_id
    AND a.user_id = auth.uid()
  )
);