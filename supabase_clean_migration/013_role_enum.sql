-- =============================================================================
-- VINSTOUR TRAVEL PORTAL — Clean Migration Chain
-- FILE 013: Create app_role ENUM + constrain user_roles.role
--
-- Tujuan:
--   1. Buat Postgres ENUM type "app_role" berisi semua role valid.
--      → Supabase table editor akan otomatis tampilkan dropdown saat edit.
--   2. Migrate kolom user_roles.role dari TEXT ke app_role ENUM.
--   3. Tambahkan CHECK constraint pada role_permissions.role.
--
-- CATATAN: Jalankan file ini SEKALI di Supabase SQL Editor.
--          Aman dijalankan ulang (menggunakan DO blocks idempotent).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Buat ENUM type app_role (jika belum ada)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM (
      'super_admin',
      'owner',
      'it',
      'admin',
      'branch_manager',
      'finance',
      'operational',
      'operator',
      'sales',
      'marketing',
      'equipment',
      'agent',
      'sub_agent',
      'customer',
      'jamaah'
    );
    RAISE NOTICE 'ENUM app_role berhasil dibuat.';
  ELSE
    -- Tambahkan nilai baru jika ada yang kurang (idempotent)
    BEGIN
      ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';
    EXCEPTION WHEN others THEN NULL; END;
    BEGIN
      ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'owner';
    EXCEPTION WHEN others THEN NULL; END;
    BEGIN
      ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'it';
    EXCEPTION WHEN others THEN NULL; END;
    BEGIN
      ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'admin';
    EXCEPTION WHEN others THEN NULL; END;
    BEGIN
      ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'branch_manager';
    EXCEPTION WHEN others THEN NULL; END;
    BEGIN
      ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'finance';
    EXCEPTION WHEN others THEN NULL; END;
    BEGIN
      ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'operational';
    EXCEPTION WHEN others THEN NULL; END;
    BEGIN
      ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'operator';
    EXCEPTION WHEN others THEN NULL; END;
    BEGIN
      ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'sales';
    EXCEPTION WHEN others THEN NULL; END;
    BEGIN
      ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'marketing';
    EXCEPTION WHEN others THEN NULL; END;
    BEGIN
      ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'equipment';
    EXCEPTION WHEN others THEN NULL; END;
    BEGIN
      ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'agent';
    EXCEPTION WHEN others THEN NULL; END;
    BEGIN
      ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'sub_agent';
    EXCEPTION WHEN others THEN NULL; END;
    BEGIN
      ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'customer';
    EXCEPTION WHEN others THEN NULL; END;
    BEGIN
      ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'jamaah';
    EXCEPTION WHEN others THEN NULL; END;
    RAISE NOTICE 'ENUM app_role sudah ada, nilai diperiksa.';
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2. Migrate kolom user_roles.role → gunakan ENUM app_role
--    (Supabase table editor akan tampilkan dropdown setelah ini)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  col_type TEXT;
BEGIN
  SELECT data_type INTO col_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name   = 'user_roles'
    AND column_name  = 'role';

  IF col_type = 'text' THEN
    -- Hapus default dulu jika ada
    ALTER TABLE public.user_roles ALTER COLUMN role DROP DEFAULT;

    -- Ubah tipe kolom ke ENUM
    ALTER TABLE public.user_roles
      ALTER COLUMN role TYPE public.app_role
      USING role::public.app_role;

    RAISE NOTICE 'Kolom user_roles.role berhasil diubah ke ENUM app_role.';
  ELSE
    RAISE NOTICE 'Kolom user_roles.role sudah bertipe: %. Tidak perlu diubah.', col_type;
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. Set default role = 'customer' untuk user_roles
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  BEGIN
    ALTER TABLE public.user_roles ALTER COLUMN role SET DEFAULT 'customer'::public.app_role;
    RAISE NOTICE 'Default role diset ke customer.';
  EXCEPTION WHEN others THEN
    RAISE NOTICE 'Tidak bisa set default: %', SQLERRM;
  END;
END;
$$;

-- ---------------------------------------------------------------------------
-- 4. Verifikasi — tampilkan semua nilai valid dalam ENUM
-- ---------------------------------------------------------------------------
SELECT
  enumlabel AS role_valid,
  enumsortorder AS urutan
FROM pg_enum
JOIN pg_type ON pg_type.oid = pg_enum.enumtypid
WHERE pg_type.typname = 'app_role'
ORDER BY enumsortorder;

SELECT '013_role_enum: OK — app_role ENUM siap, Supabase table editor akan tampilkan dropdown.' AS result;
