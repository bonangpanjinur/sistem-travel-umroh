-- =============================================================================
-- v2_P01 — ALTER: Core Tables (profiles, branches, agents)
-- Modul : Auth & Organisasi
-- Aman  : IF NOT EXISTS di semua ADD COLUMN
-- Tidak : DROP TABLE, TRUNCATE, DELETE
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. PROFILES — Kolom baru dari migration 062, 087, 095
-- ---------------------------------------------------------------------------
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS jabatan        TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS joined_at      DATE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS session_version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS totp_secret    TEXT;

-- Pastikan index session_version ada (untuk invalidasi sesi)
CREATE INDEX IF NOT EXISTS idx_profiles_session_version ON profiles(session_version);

-- ---------------------------------------------------------------------------
-- 2. USER_ROLES — Tambah nilai peran baru jika belum ada di CHECK
-- ---------------------------------------------------------------------------
-- Catatan: ALTER TABLE ... ALTER COLUMN ... mengubah CHECK constraint
-- Di Neon/Postgres kita perlu DROP dan ADD constraint baru
DO $$
BEGIN
  -- Drop old CHECK constraint if it exists with old role list
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname LIKE 'user_roles_role_check'
      AND conrelid = 'user_roles'::regclass
  ) THEN
    ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check;
  END IF;

  -- Add updated CHECK constraint (idempotent via DROP IF EXISTS above)
  ALTER TABLE user_roles
    ADD CONSTRAINT user_roles_role_check CHECK (role IN (
      'super_admin','owner','admin','branch_manager','finance',
      'operational','sales','marketing','hr','equipment',
      'agent','sub_agent','customer','jamaah','visa_officer','it'
    ));
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'user_roles role check update: %', SQLERRM;
END $$;

-- ---------------------------------------------------------------------------
-- 3. BRANCHES — Tambah commission_rate (via 071)
-- ---------------------------------------------------------------------------
ALTER TABLE branches ADD COLUMN IF NOT EXISTS commission_rate NUMERIC(5,2) DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_branches_city ON branches(city);

-- ---------------------------------------------------------------------------
-- 4. AGENTS — Kolom baru dari migration 062 dan 23
-- ---------------------------------------------------------------------------
ALTER TABLE agents ADD COLUMN IF NOT EXISTS status
  TEXT NOT NULL DEFAULT 'active';
ALTER TABLE agents ADD COLUMN IF NOT EXISTS ktp_number             TEXT;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS ktp_url                TEXT;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS npwp                   TEXT;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS bank_name              TEXT;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS bank_account_number    TEXT;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS bank_account_name      TEXT;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS membership_tier
  TEXT NOT NULL DEFAULT 'bronze';
ALTER TABLE agents ADD COLUMN IF NOT EXISTS membership_tier_updated_at TIMESTAMPTZ;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS total_confirmed_bookings INTEGER NOT NULL DEFAULT 0;

-- CHECK constraint status agents
DO $$
BEGIN
  ALTER TABLE agents DROP CONSTRAINT IF EXISTS agents_status_check;
  ALTER TABLE agents ADD CONSTRAINT agents_status_check
    CHECK (status IN ('pending','active','suspended','inactive'));
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'agents status check: %', SQLERRM;
END $$;

-- CHECK constraint membership_tier
DO $$
BEGIN
  ALTER TABLE agents DROP CONSTRAINT IF EXISTS agents_membership_tier_check;
  ALTER TABLE agents ADD CONSTRAINT agents_membership_tier_check
    CHECK (membership_tier IN ('bronze','silver','gold','platinum'));
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'agents membership_tier check: %', SQLERRM;
END $$;

CREATE INDEX IF NOT EXISTS idx_agents_status          ON agents(status);
CREATE INDEX IF NOT EXISTS idx_agents_membership_tier ON agents(membership_tier);

-- ---------------------------------------------------------------------------
-- 5. EMPLOYEES — Kolom tambahan dari migration 012
-- ---------------------------------------------------------------------------
ALTER TABLE employees ADD COLUMN IF NOT EXISTS basic_salary        NUMERIC(15,2) DEFAULT 0;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS allowances          JSONB DEFAULT '{}';
ALTER TABLE employees ADD COLUMN IF NOT EXISTS bank_name           TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS bank_account_number TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS bank_account_name   TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS tax_id              TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS npwp                TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS nik                 TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS bpjs_kes_number     TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS bpjs_tk_number      TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS face_descriptor     TEXT;

CREATE INDEX IF NOT EXISTS idx_employees_department  ON employees(department);
CREATE INDEX IF NOT EXISTS idx_employees_employee_code ON employees(employee_code);

-- ---------------------------------------------------------------------------
-- 6. MUTHAWIFS — Kolom tambahan
-- ---------------------------------------------------------------------------
ALTER TABLE muthawifs ADD COLUMN IF NOT EXISTS gender        TEXT CHECK (gender IN ('L','P'));
ALTER TABLE muthawifs ADD COLUMN IF NOT EXISTS nik           TEXT;
ALTER TABLE muthawifs ADD COLUMN IF NOT EXISTS passport_number TEXT;
ALTER TABLE muthawifs ADD COLUMN IF NOT EXISTS join_date     DATE;

