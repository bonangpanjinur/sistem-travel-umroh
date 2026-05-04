-- Add is_tour_leader field to customers table
ALTER TABLE public.customers 
ADD COLUMN is_tour_leader BOOLEAN DEFAULT false;

-- Add index for faster filtering
CREATE INDEX idx_customers_tour_leader ON public.customers(is_tour_leader) WHERE is_tour_leader = true;