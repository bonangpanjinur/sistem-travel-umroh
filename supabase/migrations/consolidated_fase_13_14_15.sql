-- =============================================================================
-- MIGRASI KONSOLIDASI — FASE 11, 12, 13, 14, 15
-- Vinstour Travel Portal — Umroh/Haji Management System
-- Jalankan satu kali di Supabase SQL Editor
-- =============================================================================

-- ============================================
-- FASE 12 — CRM Pipeline Agen
-- ============================================

CREATE TABLE IF NOT EXISTS agent_leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  stage TEXT NOT NULL DEFAULT 'baru'
    CHECK (stage IN ('baru', 'dihubungi', 'tertarik', 'negosiasi', 'booking')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS agent_leads_agent_id_idx ON agent_leads(agent_id);
CREATE INDEX IF NOT EXISTS agent_leads_stage_idx ON agent_leads(stage);

ALTER TABLE agent_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agents_manage_own_leads" ON agent_leads;
CREATE POLICY "agents_manage_own_leads" ON agent_leads
  FOR ALL USING (
    agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "admin_manage_all_leads" ON agent_leads;
CREATE POLICY "admin_manage_all_leads" ON agent_leads
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'owner', 'admin', 'branch_manager')
    )
  );

-- ============================================
-- FASE 13 — Panel Cabang Mandiri
-- ============================================

-- Tabel permintaan diskon dari agen ke manajer cabang
CREATE TABLE IF NOT EXISTS discount_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  discount_amount NUMERIC(15, 2),
  discount_pct NUMERIC(5, 2),
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS discount_requests_branch_id_idx ON discount_requests(branch_id);
CREATE INDEX IF NOT EXISTS discount_requests_agent_id_idx ON discount_requests(agent_id);
CREATE INDEX IF NOT EXISTS discount_requests_status_idx ON discount_requests(status);

ALTER TABLE discount_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agents_create_discount_requests" ON discount_requests;
CREATE POLICY "agents_create_discount_requests" ON discount_requests
  FOR INSERT WITH CHECK (
    agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "agents_view_own_requests" ON discount_requests;
CREATE POLICY "agents_view_own_requests" ON discount_requests
  FOR SELECT USING (
    agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "branch_managers_manage_requests" ON discount_requests;
CREATE POLICY "branch_managers_manage_requests" ON discount_requests
  FOR ALL USING (
    branch_id IN (
      SELECT id FROM branches WHERE manager_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'owner', 'admin')
    )
  );

-- Kolom manager_user_id di branches (jika belum ada)
ALTER TABLE branches ADD COLUMN IF NOT EXISTS manager_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS branches_manager_user_id_idx ON branches(manager_user_id);

-- ============================================
-- FASE 14 — Live Chat & Konversi Publik
-- ============================================

-- Tabel lead dari chat widget publik
CREATE TABLE IF NOT EXISTS chat_leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  source TEXT DEFAULT 'chat_widget'
    CHECK (source IN ('chat_widget', 'lead_form', 'whatsapp', 'landing_page')),
  message TEXT,
  tenant_id UUID,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'converted', 'lost')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS chat_leads_tenant_id_idx ON chat_leads(tenant_id);
CREATE INDEX IF NOT EXISTS chat_leads_status_idx ON chat_leads(status);
CREATE INDEX IF NOT EXISTS chat_leads_created_at_idx ON chat_leads(created_at DESC);

ALTER TABLE chat_leads ENABLE ROW LEVEL SECURITY;

-- Siapa pun bisa insert (form publik)
DROP POLICY IF EXISTS "anyone_insert_chat_leads" ON chat_leads;
CREATE POLICY "anyone_insert_chat_leads" ON chat_leads
  FOR INSERT WITH CHECK (true);

-- Admin & branch manager bisa lihat & kelola
DROP POLICY IF EXISTS "staff_manage_chat_leads" ON chat_leads;
CREATE POLICY "staff_manage_chat_leads" ON chat_leads
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'owner', 'admin', 'branch_manager', 'sales', 'marketing')
    )
  );

-- ============================================
-- FASE 15 — Manasik Digital & Review Publik
-- ============================================

-- Jadwal sesi manasik
CREATE TABLE IF NOT EXISTS manasik_schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT DEFAULT 'umum'
    CHECK (type IN ('fiqih', 'doa', 'persiapan', 'praktik', 'kesehatan', 'umum')),
  scheduled_date DATE NOT NULL,
  time TEXT,
  location TEXT,
  description TEXT,
  video_url TEXT,
  material_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS manasik_schedules_branch_id_idx ON manasik_schedules(branch_id);
CREATE INDEX IF NOT EXISTS manasik_schedules_date_idx ON manasik_schedules(scheduled_date);

ALTER TABLE manasik_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_manage_manasik_schedules" ON manasik_schedules;
CREATE POLICY "staff_manage_manasik_schedules" ON manasik_schedules
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'owner', 'admin', 'branch_manager', 'operational')
    )
  );

DROP POLICY IF EXISTS "jamaah_view_manasik_schedules" ON manasik_schedules;
CREATE POLICY "jamaah_view_manasik_schedules" ON manasik_schedules
  FOR SELECT USING (
    is_active = TRUE AND (
      branch_id IN (
        SELECT branch_id FROM customers WHERE user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = auth.uid()
          AND role IN ('super_admin', 'owner', 'admin')
      )
    )
  );

-- Konfirmasi kehadiran manasik oleh jamaah
CREATE TABLE IF NOT EXISTS manasik_attendance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  schedule_id UUID NOT NULL REFERENCES manasik_schedules(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  confirmed_at TIMESTAMPTZ DEFAULT NOW(),
  attended BOOLEAN,
  notes TEXT,
  UNIQUE(schedule_id, customer_id)
);

CREATE INDEX IF NOT EXISTS manasik_attendance_schedule_id_idx ON manasik_attendance(schedule_id);
CREATE INDEX IF NOT EXISTS manasik_attendance_customer_id_idx ON manasik_attendance(customer_id);

ALTER TABLE manasik_attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "jamaah_manage_own_attendance" ON manasik_attendance;
CREATE POLICY "jamaah_manage_own_attendance" ON manasik_attendance
  FOR ALL USING (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "staff_view_all_attendance" ON manasik_attendance;
CREATE POLICY "staff_view_all_attendance" ON manasik_attendance
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'owner', 'admin', 'branch_manager', 'operational')
    )
  );

-- Review publik per paket
CREATE TABLE IF NOT EXISTS package_reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  package_id UUID NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  is_public BOOLEAN DEFAULT TRUE,
  admin_reply TEXT,
  admin_reply_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(package_id, customer_id)
);

CREATE INDEX IF NOT EXISTS package_reviews_package_id_idx ON package_reviews(package_id);
CREATE INDEX IF NOT EXISTS package_reviews_is_public_idx ON package_reviews(is_public);
CREATE INDEX IF NOT EXISTS package_reviews_rating_idx ON package_reviews(rating);

ALTER TABLE package_reviews ENABLE ROW LEVEL SECURITY;

-- Siapa pun (termasuk anonymous) bisa baca review publik
DROP POLICY IF EXISTS "anyone_view_public_reviews" ON package_reviews;
CREATE POLICY "anyone_view_public_reviews" ON package_reviews
  FOR SELECT USING (is_public = TRUE);

-- Jamaah bisa tulis & edit review sendiri
DROP POLICY IF EXISTS "jamaah_manage_own_reviews" ON package_reviews;
CREATE POLICY "jamaah_manage_own_reviews" ON package_reviews
  FOR ALL USING (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  );

-- Admin bisa moderasi semua review
DROP POLICY IF EXISTS "admin_moderate_reviews" ON package_reviews;
CREATE POLICY "admin_moderate_reviews" ON package_reviews
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'owner', 'admin')
    )
  );

-- =============================================================================
-- TRIGGER: updated_at otomatis
-- =============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'agent_leads', 'discount_requests', 'chat_leads',
    'manasik_schedules', 'manasik_attendance', 'package_reviews'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger
      WHERE tgname = 'set_' || t || '_updated_at'
        AND tgrelid = t::regclass
    ) THEN
      EXECUTE format(
        'CREATE TRIGGER set_%s_updated_at
         BEFORE UPDATE ON %s
         FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
        t, t
      );
    END IF;
  END LOOP;
END;
$$;

-- =============================================================================
-- SEED: Menu Item "Leads Chat Widget" (Fase 14)
-- =============================================================================
INSERT INTO menu_items (key, label, path, icon, group_name, sort_order, required_permission, is_visible)
VALUES (
  'chat-leads',
  'Leads Chat Widget',
  '/admin/chat-leads',
  'MessageCircle',
  'Penjualan',
  206,
  'chat-leads',
  true
)
ON CONFLICT (key) DO UPDATE SET
  label               = EXCLUDED.label,
  path                = EXCLUDED.path,
  icon                = EXCLUDED.icon,
  group_name          = EXCLUDED.group_name,
  sort_order          = EXCLUDED.sort_order,
  required_permission = EXCLUDED.required_permission,
  is_visible          = EXCLUDED.is_visible;

-- Seed role_permissions agar 'chat-leads' langsung terlihat di sidebar
INSERT INTO role_permissions (role, permission_key)
SELECT unnest(ARRAY['super_admin','owner','branch_manager','sales','marketing']),
       'chat-leads'
ON CONFLICT DO NOTHING;

-- =============================================================================
-- SELESAI — Jalankan di Supabase Dashboard → SQL Editor
-- =============================================================================
