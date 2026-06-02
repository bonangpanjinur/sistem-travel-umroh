-- ============================================================
-- FASE 4: Push Subscriptions + Visa Applications Tables
-- Run in Supabase SQL Editor after Fase 1-3 migrations
-- ============================================================

-- 1. Push Subscriptions (browser push notification subscriptions)
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT,
  auth TEXT,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage push subscriptions"
  ON push_subscriptions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'super_admin')
    )
  );

-- Customers can only see their own subscription
CREATE POLICY "Customers can manage own push subscriptions"
  ON push_subscriptions FOR ALL
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()))
  WITH CHECK (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));


-- 2. Visa Applications
CREATE TABLE IF NOT EXISTS visa_applications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  departure_id UUID REFERENCES departures(id) ON DELETE SET NULL,
  visa_type TEXT DEFAULT 'umroh', -- umroh, haji
  passport_number TEXT,
  passport_expiry DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'processing', 'approved', 'rejected')),
  visa_number TEXT,
  visa_expiry DATE,
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE visa_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage visa applications"
  ON visa_applications FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Customers can view own visa applications"
  ON visa_applications FOR SELECT
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_visa_applications_customer ON visa_applications(customer_id);
CREATE INDEX IF NOT EXISTS idx_visa_applications_departure ON visa_applications(departure_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_customer ON push_subscriptions(customer_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_visa_applications_updated_at ON visa_applications;
CREATE TRIGGER update_visa_applications_updated_at
  BEFORE UPDATE ON visa_applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_push_subscriptions_updated_at ON push_subscriptions;
CREATE TRIGGER update_push_subscriptions_updated_at
  BEFORE UPDATE ON push_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
