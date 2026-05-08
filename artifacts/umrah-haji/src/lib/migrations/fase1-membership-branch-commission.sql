-- ============================================================
-- FASE 1 MIGRATION: Membership System + Branch Commissions
-- Jalankan di Supabase SQL Editor
-- ============================================================

-- 1. Tabel Paket Keanggotaan
CREATE TABLE IF NOT EXISTS membership_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  plan_type TEXT NOT NULL CHECK (plan_type IN ('agent', 'branch')),
  price_yearly NUMERIC(15,2) NOT NULL DEFAULT 0,
  max_sub_agents INTEGER DEFAULT NULL,
  commission_rate NUMERIC(5,2) DEFAULT 0,
  description TEXT,
  features JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed paket agen
INSERT INTO membership_plans (name, plan_type, price_yearly, max_sub_agents, commission_rate, description, features, sort_order) VALUES
  ('Silver', 'agent', 500000, 5, 2, 'Paket dasar untuk agen baru', '["Dashboard portal agen","Website agen dasar","Maksimal 5 sub agen","Komisi 2%"]', 1),
  ('Gold', 'agent', 1500000, 20, 3, 'Paket menengah dengan fitur lengkap', '["Dashboard portal agen","Website agen lengkap","Digital kit promosi","Laporan komisi","Maksimal 20 sub agen","Komisi 3%"]', 2),
  ('Platinum', 'agent', 3000000, NULL, 4, 'Paket premium tanpa batas sub agen', '["Semua fitur Gold","Sub agen tidak terbatas","Priority support","Leaderboard","Komisi 4%"]', 3)
ON CONFLICT DO NOTHING;

-- Seed paket cabang
INSERT INTO membership_plans (name, plan_type, price_yearly, max_sub_agents, commission_rate, description, features, sort_order) VALUES
  ('Reguler', 'branch', 5000000, 50, 1, 'Paket cabang standar', '["Dashboard cabang","Website cabang","Maksimal 50 agen","Komisi cabang 1%"]', 1),
  ('Premium', 'branch', 12000000, NULL, 2, 'Paket cabang premium', '["Semua fitur Reguler","Agen tidak terbatas","CRM & laporan lanjutan","Komisi cabang 2%"]', 2)
ON CONFLICT DO NOTHING;

-- 2. Tabel Keanggotaan Agen
CREATE TABLE IF NOT EXISTS agent_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES membership_plans(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'expired', 'rejected')),
  payment_proof_url TEXT,
  start_date DATE,
  end_date DATE,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_memberships_agent_id ON agent_memberships(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_memberships_status ON agent_memberships(status);

-- 3. Tabel Keanggotaan Cabang
CREATE TABLE IF NOT EXISTS branch_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES membership_plans(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'expired', 'rejected')),
  payment_proof_url TEXT,
  start_date DATE,
  end_date DATE,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_branch_memberships_branch_id ON branch_memberships(branch_id);
CREATE INDEX IF NOT EXISTS idx_branch_memberships_status ON branch_memberships(status);

-- 4. Tabel Komisi Cabang
CREATE TABLE IF NOT EXISTS branch_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  commission_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  commission_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'rejected')),
  notes TEXT,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  payment_reference TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(branch_id, booking_id)
);

CREATE INDEX IF NOT EXISTS idx_branch_commissions_branch_id ON branch_commissions(branch_id);
CREATE INDEX IF NOT EXISTS idx_branch_commissions_status ON branch_commissions(status);

-- 5. Tambah kolom baru ke website_settings jika belum ada
ALTER TABLE website_settings ADD COLUMN IF NOT EXISTS profile_photo_url TEXT;
ALTER TABLE website_settings ADD COLUMN IF NOT EXISTS banner_url TEXT;
ALTER TABLE website_settings ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE website_settings ADD COLUMN IF NOT EXISTS testimonials JSONB DEFAULT '[]';
ALTER TABLE website_settings ADD COLUMN IF NOT EXISTS gallery_urls JSONB DEFAULT '[]';
ALTER TABLE website_settings ADD COLUMN IF NOT EXISTS seo_title TEXT;
ALTER TABLE website_settings ADD COLUMN IF NOT EXISTS seo_description TEXT;
ALTER TABLE website_settings ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;
ALTER TABLE website_settings ADD COLUMN IF NOT EXISTS social_youtube TEXT;
ALTER TABLE website_settings ADD COLUMN IF NOT EXISTS social_tiktok TEXT;
ALTER TABLE website_settings ADD COLUMN IF NOT EXISTS maps_embed_url TEXT;

-- 6. Tambah kolom fee_branch ke packages jika belum ada
ALTER TABLE packages ADD COLUMN IF NOT EXISTS fee_branch NUMERIC(5,2) DEFAULT 0;

-- 7. Function increment view count
CREATE OR REPLACE FUNCTION increment_website_view(p_agent_id UUID DEFAULT NULL, p_branch_id UUID DEFAULT NULL)
RETURNS void AS $$
BEGIN
  IF p_agent_id IS NOT NULL THEN
    UPDATE website_settings SET view_count = COALESCE(view_count, 0) + 1 WHERE agent_id = p_agent_id;
  ELSIF p_branch_id IS NOT NULL THEN
    UPDATE website_settings SET view_count = COALESCE(view_count, 0) + 1 WHERE branch_id = p_branch_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- SELESAI — Semua tabel Fase 1 sudah siap
-- ============================================================
