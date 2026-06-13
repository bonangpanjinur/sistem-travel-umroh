-- =============================================================================
-- VINSTOUR TRAVEL PORTAL — Clean Migration Chain
-- FILE 013: Create app_role ENUM + constrain user_roles.role
--
-- REVISI: Fix error "cannot alter type of a column used in a policy definition"
-- Solusi: Simpan definisi semua policy yang referensi user_roles, drop policy,
--         ganti tipe kolom ke ENUM, recreate semua policy otomatis.
--
-- Aman dijalankan ulang (idempotent).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Buat ENUM type app_role (jika belum ada)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role' AND typnamespace = 'public'::regnamespace) THEN
    CREATE TYPE public.app_role AS ENUM (
      'super_admin', 'owner', 'it', 'admin', 'branch_manager',
      'finance', 'operational', 'operator', 'sales', 'marketing',
      'equipment', 'agent', 'sub_agent', 'customer', 'jamaah'
    );
    RAISE NOTICE 'ENUM app_role berhasil dibuat.';
  ELSE
    -- Tambahkan nilai baru jika ada yang kurang (ALTER TYPE ADD VALUE tidak bisa di dalam transaksi,
    -- tapi di luar DO block bisa — kita lewati jika sudah ada)
    RAISE NOTICE 'ENUM app_role sudah ada, lanjut.';
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2. Simpan definisi semua RLS policy yang referensi user_roles,
--    drop policy tersebut, ubah tipe kolom, recreate policy.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  rec            RECORD;
  col_type       TEXT;
  cmd_str        TEXT;
  roles_str      TEXT;
  permissive_str TEXT;
  create_sql     TEXT;
  saved_policies TEXT[] := '{}';
BEGIN
  -- Cek tipe kolom saat ini
  SELECT data_type INTO col_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name   = 'user_roles'
    AND column_name  = 'role';

  IF col_type <> 'text' THEN
    RAISE NOTICE 'Kolom user_roles.role sudah bukan TEXT (tipe: %). Tidak perlu diubah.', col_type;
    RETURN;
  END IF;

  -- Kumpulkan dan DROP semua policy yang menggunakan user_roles (semua schema public)
  FOR rec IN
    SELECT
      n.nspname                                      AS schemaname,
      c.relname                                      AS tablename,
      p.polname                                      AS policyname,
      p.polpermissive                                AS permissive,
      p.polcmd                                       AS cmd,
      p.polroles                                     AS roles,
      pg_get_expr(p.polqual,      p.polrelid, TRUE)  AS qual,
      pg_get_expr(p.polwithcheck, p.polrelid, TRUE)  AS withcheck
    FROM pg_policy    p
    JOIN pg_class     c ON c.oid = p.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND (
        pg_get_expr(p.polqual,      p.polrelid, TRUE) LIKE '%user_roles%'
        OR
        pg_get_expr(p.polwithcheck, p.polrelid, TRUE) LIKE '%user_roles%'
      )
  LOOP
    -- Map cmd byte ke keyword SQL
    cmd_str := CASE rec.cmd
      WHEN 'r' THEN 'SELECT'
      WHEN 'a' THEN 'INSERT'
      WHEN 'w' THEN 'UPDATE'
      WHEN 'd' THEN 'DELETE'
      ELSE 'ALL'
    END;

    permissive_str := CASE WHEN rec.permissive THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END;

    -- Bangun daftar role (biasanya {public} atau {authenticated})
    IF rec.roles = '{0}' OR rec.roles IS NULL THEN
      roles_str := 'public';
    ELSE
      SELECT string_agg(r.rolname, ', ')
      INTO roles_str
      FROM unnest(rec.roles) AS rid
      JOIN pg_roles r ON r.oid = rid;
      IF roles_str IS NULL THEN roles_str := 'public'; END IF;
    END IF;

    -- Bangun CREATE POLICY SQL untuk recreate nanti
    create_sql := format(
      'CREATE POLICY %I ON %I.%I AS %s FOR %s TO %s',
      rec.policyname, rec.schemaname, rec.tablename,
      permissive_str, cmd_str, roles_str
    );
    IF rec.qual IS NOT NULL THEN
      create_sql := create_sql || format(' USING (%s)', rec.qual);
    END IF;
    IF rec.withcheck IS NOT NULL THEN
      create_sql := create_sql || format(' WITH CHECK (%s)', rec.withcheck);
    END IF;

    saved_policies := array_append(saved_policies, create_sql);

    -- DROP policy
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', rec.policyname, rec.schemaname, rec.tablename);
    RAISE NOTICE 'Dropped policy: % on %.%', rec.policyname, rec.schemaname, rec.tablename;
  END LOOP;

  -- Hapus default dulu
  ALTER TABLE public.user_roles ALTER COLUMN role DROP DEFAULT;

  -- Ubah tipe kolom ke ENUM
  ALTER TABLE public.user_roles
    ALTER COLUMN role TYPE public.app_role
    USING role::public.app_role;

  RAISE NOTICE 'Kolom user_roles.role berhasil diubah ke ENUM app_role.';

  -- Set default kembali
  ALTER TABLE public.user_roles ALTER COLUMN role SET DEFAULT 'customer'::public.app_role;

  -- Recreate semua policy yang tadi di-drop
  FOREACH create_sql IN ARRAY saved_policies LOOP
    BEGIN
      EXECUTE create_sql;
      RAISE NOTICE 'Recreated policy: %', left(create_sql, 120);
    EXCEPTION WHEN others THEN
      RAISE WARNING 'Gagal recreate policy: % — Error: %', left(create_sql, 120), SQLERRM;
    END;
  END LOOP;

END;
$$;

-- ---------------------------------------------------------------------------
-- 3. Verifikasi — tampilkan semua nilai ENUM dan kondisi kolom
-- ---------------------------------------------------------------------------
SELECT
  enumlabel  AS role_valid,
  enumsortorder AS urutan
FROM pg_enum
JOIN pg_type ON pg_type.oid = pg_enum.enumtypid
WHERE pg_type.typname = 'app_role'
ORDER BY enumsortorder;

-- Konfirmasi tipe kolom user_roles.role sekarang
SELECT
  column_name,
  udt_name AS type_name,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'user_roles'
  AND column_name  = 'role';

SELECT '013_role_enum: OK — app_role ENUM siap, Supabase table editor akan tampilkan dropdown.' AS result;
