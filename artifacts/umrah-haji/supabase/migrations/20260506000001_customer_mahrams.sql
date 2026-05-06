-- Migration: Add customer_mahrams table for multiple mahrams per jamaah
-- Each jamaah (especially female) can have multiple mahrams

CREATE TABLE IF NOT EXISTS public.customer_mahrams (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  mahram_name text NOT NULL,
  mahram_relation text NOT NULL CHECK (mahram_relation IN ('suami','istri','ayah','ibu','anak','saudara','paman','kakek','nenek','cucu')),
  mahram_customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS customer_mahrams_customer_id_idx ON public.customer_mahrams(customer_id);
CREATE INDEX IF NOT EXISTS customer_mahrams_mahram_customer_id_idx ON public.customer_mahrams(mahram_customer_id);

ALTER TABLE public.customer_mahrams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all authenticated operations on customer_mahrams"
  ON public.customer_mahrams
  FOR ALL
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE public.customer_mahrams IS 'Multiple mahram (family escort) relationships per customer/jamaah';
COMMENT ON COLUMN public.customer_mahrams.mahram_customer_id IS 'Optional: link to the mahram as a customer record in the system';
COMMENT ON COLUMN public.customer_mahrams.mahram_relation IS 'Relation type: suami, istri, ayah, ibu, anak, saudara, paman, kakek, nenek, cucu';
