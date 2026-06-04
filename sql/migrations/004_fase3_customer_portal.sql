-- ============================================================
-- FASE 3 MIGRATION: Customer Portal (Portal Jamaah)
-- Jalankan di Supabase SQL Editor
-- ============================================================

-- 1. Tabel customer_accounts: link auth.users → customers + atribusi agen/cabang
CREATE TABLE IF NOT EXISTS customer_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  referred_by_agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  referred_by_branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  agent_slug TEXT,
  branch_slug TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_accounts_user_id ON customer_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_accounts_customer_id ON customer_accounts(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_accounts_agent_id ON customer_accounts(referred_by_agent_id);

-- 2. Notifikasi untuk jamaah
CREATE TABLE IF NOT EXISTS customer_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  type TEXT DEFAULT 'info' CHECK (type IN ('info','success','warning','error')),
  link TEXT,
  icon TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_notif_customer_id ON customer_notifications(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_notif_is_read ON customer_notifications(is_read);

-- 3. Feedback jamaah per booking
CREATE TABLE IF NOT EXISTS booking_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE UNIQUE NOT NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  review TEXT,
  aspects JSONB DEFAULT '{}',
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Tambah kolom referred_by ke bookings jika belum ada
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS referral_source TEXT DEFAULT 'direct'
  CHECK (referral_source IN ('direct','agent_website','branch_website','referral','whatsapp','instagram','facebook','other'));

-- 5. Function: buat customer_account otomatis saat user baru register
-- (dipanggil dari frontend setelah register)
CREATE OR REPLACE FUNCTION create_customer_account(
  p_user_id UUID,
  p_agent_id UUID DEFAULT NULL,
  p_branch_id UUID DEFAULT NULL,
  p_agent_slug TEXT DEFAULT NULL,
  p_branch_slug TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_account_id UUID;
BEGIN
  INSERT INTO customer_accounts (user_id, referred_by_agent_id, referred_by_branch_id, agent_slug, branch_slug)
  VALUES (p_user_id, p_agent_id, p_branch_id, p_agent_slug, p_branch_slug)
  ON CONFLICT (user_id) DO UPDATE SET
    referred_by_agent_id = COALESCE(customer_accounts.referred_by_agent_id, EXCLUDED.referred_by_agent_id),
    referred_by_branch_id = COALESCE(customer_accounts.referred_by_branch_id, EXCLUDED.referred_by_branch_id),
    agent_slug = COALESCE(customer_accounts.agent_slug, EXCLUDED.agent_slug),
    branch_slug = COALESCE(customer_accounts.branch_slug, EXCLUDED.branch_slug),
    updated_at = now()
  RETURNING id INTO v_account_id;
  RETURN v_account_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. RLS Policies untuk customer_accounts
ALTER TABLE customer_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "customer_accounts_own" ON customer_accounts
  FOR ALL USING (auth.uid() = user_id);

ALTER TABLE customer_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "customer_notif_own" ON customer_notifications
  FOR SELECT USING (
    customer_id IN (
      SELECT id FROM customers WHERE user_id = auth.uid()
    )
  );

ALTER TABLE booking_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "booking_feedback_own" ON booking_feedback
  FOR ALL USING (
    customer_id IN (
      SELECT id FROM customers WHERE user_id = auth.uid()
    )
  );

-- ============================================================
-- SELESAI — Fase 3: Customer portal tables siap
-- ============================================================
