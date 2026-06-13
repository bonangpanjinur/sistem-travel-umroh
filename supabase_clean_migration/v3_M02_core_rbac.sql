-- =============================================================================
-- VINSTOUR TRAVEL PORTAL — Master Migration v3
-- FILE M02: Core RBAC — Profiles, Roles, Permissions, Menu Items
-- Depends on: M01_foundation
-- =============================================================================

-- =============================================================================
-- 1. PROFILES — Data profil pengguna (linked ke auth.users)
-- =============================================================================
CREATE TABLE IF NOT EXISTS profiles (
  id              UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name       TEXT,
  email           TEXT,
  phone           TEXT,
  avatar_url      TEXT,
  role            TEXT NOT NULL DEFAULT 'authenticated',
  branch_id       UUID,
  agent_id        UUID,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_role      ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_branch_id ON profiles(branch_id);
CREATE INDEX IF NOT EXISTS idx_profiles_agent_id  ON profiles(agent_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email     ON profiles(email);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own"    ON profiles;
DROP POLICY IF EXISTS "profiles_update_own"    ON profiles;
DROP POLICY IF EXISTS "profiles_admin_all"     ON profiles;

CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (id = auth.uid() OR auth.role() = 'service_role');

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "profiles_admin_all" ON profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('super_admin','owner','admin','branch_manager','hr','it')
    )
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_profiles_updated_at'
    AND tgrelid='profiles'::regclass) THEN
    CREATE TRIGGER set_profiles_updated_at
      BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE ON profiles TO authenticated;


-- =============================================================================
-- 2. USER_ROLES — Tabel many-to-many user ↔ role
-- =============================================================================
CREATE TABLE IF NOT EXISTS user_roles (
  id         UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL,
  branch_id  UUID,
  agent_id   UUID,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT user_roles_user_role_unique UNIQUE (user_id, role, branch_id, agent_id)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id   ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role       ON user_roles(role);
CREATE INDEX IF NOT EXISTS idx_user_roles_branch_id  ON user_roles(branch_id);

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_roles_own_select"  ON user_roles;
DROP POLICY IF EXISTS "user_roles_admin_all"   ON user_roles;

CREATE POLICY "user_roles_own_select" ON user_roles
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "user_roles_admin_all" ON user_roles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('super_admin','owner','admin','it')
    )
  );

GRANT SELECT ON user_roles TO authenticated;


-- =============================================================================
-- 3. PERMISSIONS_LIST — Master daftar izin akses
-- =============================================================================
CREATE TABLE IF NOT EXISTS permissions_list (
  id          UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key         TEXT NOT NULL UNIQUE,
  label       TEXT NOT NULL,
  group_name  TEXT NOT NULL DEFAULT 'Umum',
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE permissions_list ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "permissions_list_read_all"    ON permissions_list;
DROP POLICY IF EXISTS "permissions_list_admin_write" ON permissions_list;

CREATE POLICY "permissions_list_read_all" ON permissions_list
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "permissions_list_admin_write" ON permissions_list
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','it'))
  );

GRANT SELECT ON permissions_list TO authenticated;


-- =============================================================================
-- 4. ROLE_PERMISSIONS — Hak akses tiap role ke fitur tertentu
-- =============================================================================
CREATE TABLE IF NOT EXISTS role_permissions (
  id             UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  role           TEXT NOT NULL,
  permission_key TEXT NOT NULL,
  can_view       BOOLEAN NOT NULL DEFAULT TRUE,
  can_create     BOOLEAN NOT NULL DEFAULT FALSE,
  can_edit       BOOLEAN NOT NULL DEFAULT FALSE,
  can_delete     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (role, permission_key)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role);

ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "role_permissions_read_all"    ON role_permissions;
DROP POLICY IF EXISTS "role_permissions_admin_write" ON role_permissions;

CREATE POLICY "role_permissions_read_all" ON role_permissions
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "role_permissions_admin_write" ON role_permissions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','it'))
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_role_permissions_updated_at'
    AND tgrelid='role_permissions'::regclass) THEN
    CREATE TRIGGER set_role_permissions_updated_at
      BEFORE UPDATE ON role_permissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

GRANT SELECT ON role_permissions TO authenticated;


-- =============================================================================
-- 5. STAFF_INVITATIONS — Undangan staf baru
-- =============================================================================
CREATE TABLE IF NOT EXISTS staff_invitations (
  id           UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email        TEXT NOT NULL,
  role         TEXT NOT NULL,
  branch_id    UUID,
  agent_id     UUID,
  invited_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  token        TEXT NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at   TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at  TIMESTAMPTZ,
  status       TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','accepted','expired','cancelled')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staff_invitations_email  ON staff_invitations(email);
CREATE INDEX IF NOT EXISTS idx_staff_invitations_token  ON staff_invitations(token);
CREATE INDEX IF NOT EXISTS idx_staff_invitations_status ON staff_invitations(status);

ALTER TABLE staff_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_invitations_admin_manage" ON staff_invitations;

CREATE POLICY "staff_invitations_admin_manage" ON staff_invitations
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','admin','branch_manager','hr','it'))
  );

GRANT SELECT, INSERT, UPDATE ON staff_invitations TO authenticated;


-- =============================================================================
-- 6. MENU_ITEMS — Menu navigasi sidebar dinamis
-- =============================================================================
CREATE TABLE IF NOT EXISTS menu_items (
  id                UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_id         UUID REFERENCES menu_items(id) ON DELETE SET NULL,
  label             TEXT NOT NULL,
  icon              TEXT,
  path              TEXT,
  permission_key    TEXT,
  sort_order        INTEGER NOT NULL DEFAULT 0,
  is_visible        BOOLEAN NOT NULL DEFAULT TRUE,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  target_roles      TEXT[] DEFAULT '{}',
  badge_count_query TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_menu_items_parent_id ON menu_items(parent_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_sort      ON menu_items(sort_order);

ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "menu_items_read_all"    ON menu_items;
DROP POLICY IF EXISTS "menu_items_admin_write" ON menu_items;

CREATE POLICY "menu_items_read_all" ON menu_items
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "menu_items_admin_write" ON menu_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','admin','it'))
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_menu_items_updated_at'
    AND tgrelid='menu_items'::regclass) THEN
    CREATE TRIGGER set_menu_items_updated_at
      BEFORE UPDATE ON menu_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

GRANT SELECT ON menu_items TO authenticated;


-- =============================================================================
-- 7. AUDIT_LOGS — Log perubahan data kritis
-- =============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id          UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  table_name  TEXT NOT NULL,
  record_id   UUID,
  old_values  JSONB,
  new_values  JSONB,
  ip_address  TEXT,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id    ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_record_id  ON audit_logs(record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_logs_admin_read" ON audit_logs;
DROP POLICY IF EXISTS "audit_logs_insert"     ON audit_logs;

CREATE POLICY "audit_logs_admin_read" ON audit_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','admin','it'))
  );

CREATE POLICY "audit_logs_insert" ON audit_logs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

GRANT INSERT ON audit_logs TO authenticated;


-- =============================================================================
-- SELESAI — File M02: Core RBAC
-- =============================================================================
SELECT 'v3_M02_core_rbac: OK' AS result;
