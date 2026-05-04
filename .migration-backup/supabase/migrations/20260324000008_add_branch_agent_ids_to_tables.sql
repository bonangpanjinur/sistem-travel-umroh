-- Add branch_id and created_by_agent_id to relevant tables for RLS

-- Add created_by_agent_id to public.customers
ALTER TABLE public.customers
ADD COLUMN created_by_agent_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add branch_id to public.payments
ALTER TABLE public.payments
ADD COLUMN branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL;

-- Add branch_id to public.customer_documents
ALTER TABLE public.customer_documents
ADD COLUMN branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL;

-- Add branch_id to public.booking_passengers
ALTER TABLE public.booking_passengers
ADD COLUMN branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL;

-- Populate existing data for new columns

-- Populate customers.created_by_agent_id from their first booking's agent_id
UPDATE public.customers c
SET created_by_agent_id = (SELECT b.agent_id FROM public.bookings b WHERE b.customer_id = c.id AND b.agent_id IS NOT NULL ORDER BY b.created_at ASC LIMIT 1)
WHERE c.created_by_agent_id IS NULL;

-- Populate payments.branch_id from bookings.branch_id
UPDATE public.payments p
SET branch_id = b.branch_id
FROM public.bookings b
WHERE p.booking_id = b.id AND p.branch_id IS NULL;

-- Populate customer_documents.branch_id from customers.branch_id
UPDATE public.customer_documents cd
SET branch_id = c.branch_id
FROM public.customers c
WHERE cd.customer_id = c.id AND cd.branch_id IS NULL;

-- Populate booking_passengers.branch_id from bookings.branch_id
UPDATE public.booking_passengers bp
SET branch_id = b.branch_id
FROM public.bookings b
WHERE bp.booking_id = b.id AND bp.branch_id IS NULL;

-- Add RLS policies for new columns (These will be refined in Phase 2)

-- Policy for customers.created_by_agent_id
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agents can view customers they created" ON public.customers
FOR SELECT USING (created_by_agent_id = auth.uid());

-- Policy for payments.branch_id
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Branch staff can view payments in their branch" ON public.payments
FOR SELECT USING (branch_id = public.get_user_branch_id(auth.uid()));

-- Policy for customer_documents.branch_id
ALTER TABLE public.customer_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Branch staff can view customer documents in their branch" ON public.customer_documents
FOR SELECT USING (branch_id = public.get_user_branch_id(auth.uid()));

-- Policy for booking_passengers.branch_id
ALTER TABLE public.booking_passengers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Branch staff can view booking passengers in their branch" ON public.booking_passengers
FOR SELECT USING (branch_id = public.get_user_branch_id(auth.uid()));
