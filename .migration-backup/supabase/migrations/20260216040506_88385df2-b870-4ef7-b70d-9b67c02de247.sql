
-- Create document_counters table for sequential document numbering
CREATE TABLE public.document_counters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_type TEXT NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  last_number INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(document_type, year, month)
);

-- Enable RLS
ALTER TABLE public.document_counters ENABLE ROW LEVEL SECURITY;

-- Admin-only access
CREATE POLICY "Admins can manage document counters"
ON public.document_counters
FOR ALL
USING (public.is_admin(auth.uid()));

-- Function to get next document number
CREATE OR REPLACE FUNCTION public.get_next_document_number(
  p_document_type TEXT,
  p_prefix TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_year INTEGER;
  v_month INTEGER;
  v_next_number INTEGER;
  v_result TEXT;
BEGIN
  v_year := EXTRACT(YEAR FROM NOW())::INTEGER;
  v_month := EXTRACT(MONTH FROM NOW())::INTEGER;

  INSERT INTO public.document_counters (document_type, year, month, last_number)
  VALUES (p_document_type, v_year, v_month, 1)
  ON CONFLICT (document_type, year, month)
  DO UPDATE SET 
    last_number = document_counters.last_number + 1,
    updated_at = now()
  RETURNING last_number INTO v_next_number;

  v_result := LPAD(v_next_number::TEXT, 3, '0') || '/' || p_prefix || '/UHT/' || LPAD(v_month::TEXT, 2, '0') || '/' || v_year;
  
  RETURN v_result;
END;
$$;
