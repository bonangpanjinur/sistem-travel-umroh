-- Add index to coupons table for performance optimization
CREATE INDEX IF NOT EXISTS idx_coupons_created_at ON public.coupons (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_coupons_is_active ON public.coupons (is_active);
CREATE INDEX IF NOT EXISTS idx_coupons_code ON public.coupons (code);
