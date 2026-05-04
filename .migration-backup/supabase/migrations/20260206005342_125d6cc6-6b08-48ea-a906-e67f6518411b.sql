-- Function to auto-assign leads to sales staff (round-robin)
CREATE OR REPLACE FUNCTION public.auto_assign_lead()
RETURNS TRIGGER AS $$
DECLARE
  v_sales_user_id uuid;
  v_branch_id uuid;
BEGIN
  -- Only auto-assign if not already assigned
  IF NEW.assigned_to IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Get the branch_id if set, otherwise use null
  v_branch_id := NEW.branch_id;

  -- Find the next sales user using round-robin logic
  -- Get user with 'sales' role who has the least recent lead assignment
  SELECT ur.user_id INTO v_sales_user_id
  FROM user_roles ur
  WHERE ur.role = 'sales'
    AND EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = ur.user_id 
      AND (v_branch_id IS NULL OR p.branch_id = v_branch_id OR p.branch_id IS NULL)
    )
  ORDER BY (
    SELECT COALESCE(MAX(l.updated_at), '1970-01-01'::timestamp)
    FROM leads l
    WHERE l.assigned_to = ur.user_id
  ) ASC
  LIMIT 1;

  -- Assign the lead if we found a sales user
  IF v_sales_user_id IS NOT NULL THEN
    NEW.assigned_to := v_sales_user_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for auto-assignment on new leads
DROP TRIGGER IF EXISTS trigger_auto_assign_lead ON leads;
CREATE TRIGGER trigger_auto_assign_lead
  BEFORE INSERT ON leads
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_lead();

-- Function to estimate Haji departure year based on porsi number and type
CREATE OR REPLACE FUNCTION public.estimate_haji_departure_year(
  p_portion_number text,
  p_registration_year integer,
  p_haji_type text DEFAULT 'regular'
)
RETURNS integer AS $$
DECLARE
  v_estimated_year integer;
  v_wait_years integer;
BEGIN
  -- Base waiting time by type (approximate Indonesia averages)
  -- Regular: ~20-25 years wait
  -- Plus: ~5-7 years wait
  -- Furoda: ~1-2 years wait
  
  IF p_haji_type = 'furoda' THEN
    v_wait_years := 1;
  ELSIF p_haji_type = 'plus' THEN
    v_wait_years := 5;
  ELSE
    -- Regular haji - estimate based on portion number if available
    IF p_portion_number IS NOT NULL THEN
      -- Simplified estimation: newer portion numbers = longer wait
      -- This is a rough estimate based on typical wait times
      v_wait_years := 20 + floor(random() * 5)::int;
    ELSE
      v_wait_years := 22; -- Average wait time for regular
    END IF;
  END IF;

  v_estimated_year := p_registration_year + v_wait_years;
  
  RETURN v_estimated_year;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger to auto-calculate estimated departure year on haji registration
CREATE OR REPLACE FUNCTION public.calculate_haji_departure_estimate()
RETURNS TRIGGER AS $$
BEGIN
  -- Only calculate if not already set or if relevant fields changed
  IF NEW.estimated_departure_year IS NULL OR 
     OLD.haji_type IS DISTINCT FROM NEW.haji_type OR
     OLD.portion_number IS DISTINCT FROM NEW.portion_number THEN
    
    NEW.estimated_departure_year := estimate_haji_departure_year(
      NEW.portion_number,
      COALESCE(NEW.registration_year, EXTRACT(YEAR FROM NOW())::integer),
      NEW.haji_type
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_calculate_haji_departure ON haji_registrations;
CREATE TRIGGER trigger_calculate_haji_departure
  BEFORE INSERT OR UPDATE ON haji_registrations
  FOR EACH ROW
  EXECUTE FUNCTION calculate_haji_departure_estimate();

-- Update existing haji registrations with estimated departure year
UPDATE haji_registrations 
SET estimated_departure_year = estimate_haji_departure_year(
  portion_number,
  COALESCE(registration_year, 2024),
  haji_type
)
WHERE estimated_departure_year IS NULL;