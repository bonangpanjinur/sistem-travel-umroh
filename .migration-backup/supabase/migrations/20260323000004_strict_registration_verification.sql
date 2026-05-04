-- Add RPC for strict verification of registration data
CREATE OR REPLACE FUNCTION public.validate_registration_context(
  p_pic_source TEXT,
  p_branch_id UUID DEFAULT NULL,
  p_agent_id UUID DEFAULT NULL,
  p_referral_code TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
  v_is_valid BOOLEAN := FALSE;
  v_error_message TEXT := '';
  v_resolved_branch_id UUID := p_branch_id;
  v_resolved_agent_id UUID := p_agent_id;
  v_resolved_referral_id UUID := NULL;
  v_metadata JSONB := '{}'::jsonb;
BEGIN
  -- 1. Validate based on source
  IF p_pic_source = 'pusat' THEN
    v_is_valid := TRUE;
    v_metadata := jsonb_build_object('name', 'Kantor Pusat');
    
  ELSIF p_pic_source = 'cabang' THEN
    IF p_branch_id IS NULL THEN
      v_error_message := 'Kantor cabang harus dipilih';
    ELSE
      SELECT jsonb_build_object('name', name, 'city', city)
      INTO v_metadata
      FROM public.branches
      WHERE id = p_branch_id AND is_active = TRUE;
      
      IF v_metadata IS NULL THEN
        v_error_message := 'Kantor cabang tidak ditemukan atau tidak aktif';
      ELSE
        v_is_valid := TRUE;
      END IF;
    END IF;
    
  ELSIF p_pic_source = 'agen' THEN
    IF p_agent_id IS NULL THEN
      v_error_message := 'Agen travel harus dipilih';
    ELSE
      -- Resolve agent and their branch
      SELECT 
        a.branch_id,
        jsonb_build_object('name', a.company_name, 'code', a.agent_code, 'branch_name', b.name)
      INTO v_resolved_branch_id, v_metadata
      FROM public.agents a
      LEFT JOIN public.branches b ON a.branch_id = b.id
      WHERE a.id = p_agent_id AND a.is_active = TRUE;
      
      IF v_metadata IS NULL THEN
        v_error_message := 'Agen travel tidak ditemukan atau tidak aktif';
      ELSE
        v_is_valid := TRUE;
      END IF;
    END IF;
    
  ELSIF p_pic_source = 'referral' THEN
    IF p_referral_code IS NULL OR p_referral_code = '' THEN
      v_error_message := 'Kode referral harus diisi';
    ELSE
      -- Resolve referral code
      SELECT 
        rc.id,
        jsonb_build_object('name', c.full_name, 'code', rc.code)
      INTO v_resolved_referral_id, v_metadata
      FROM public.referral_codes rc
      JOIN public.customers c ON rc.customer_id = c.id
      WHERE rc.code = p_referral_code AND rc.is_active = TRUE;
      
      IF v_resolved_referral_id IS NULL THEN
        v_error_message := 'Kode referral tidak valid atau tidak aktif';
      ELSE
        v_is_valid := TRUE;
      END IF;
    END IF;
    
  ELSE
    v_error_message := 'Sumber pendaftaran tidak valid';
  END IF;

  -- Build response
  v_result := jsonb_build_object(
    'is_valid', v_is_valid,
    'error_message', v_error_message,
    'resolved_branch_id', v_resolved_branch_id,
    'resolved_agent_id', v_resolved_agent_id,
    'resolved_referral_id', v_resolved_referral_id,
    'metadata', v_metadata
  );

  RETURN v_result;
END;
$$;

-- Fix referral_usages schema if it's inconsistent with the code
-- Based on my analysis, the code expects 'used_by_booking_id' but migration uses 'booking_id'
-- Let's make it consistent and ensure all necessary columns exist.
DO $$ 
BEGIN
    -- Ensure referral_usages table exists with correct columns
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'referral_usages') THEN
        CREATE TABLE public.referral_usages (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            referral_code_id UUID REFERENCES public.referral_codes(id) NOT NULL,
            booking_id UUID REFERENCES public.bookings(id) NOT NULL,
            referred_customer_id UUID REFERENCES public.customers(id) NOT NULL,
            booking_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
            commission_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
            commission_status VARCHAR(20) DEFAULT 'pending',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
            paid_at TIMESTAMP WITH TIME ZONE
        );
    END IF;
END $$;
