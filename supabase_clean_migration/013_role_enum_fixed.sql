-- =============================================================================
-- VINSTOUR TRAVEL PORTAL — Clean Migration Chain
-- FILE 013 (FIXED): Konversi user_roles.role dari TEXT ke ENUM app_role
--
-- ROOT CAUSE dua error sebelumnya:
-- ① "operator does not exist: app_role = text"
--    → CHECK constraint lama berisi literal text ('admin'::text, dll.)
--      PostgreSQL tidak bisa evaluasi setelah tipe berubah ke ENUM.
--      SOLUSI: DROP CHECK constraint sebelum ALTER TYPE.
--
-- ② "cannot alter type of a column used in a policy definition"
--    → Ada policy (ON user_roles maupun tabel lain) yang memblok ALTER TYPE.
--      Pencarian '%user_roles%' di pg_get_expr TIDAK cukup karena:
--      (a) Policy ON user_roles yang pakai USING (role = '...') tidak
--          menyebut 'user_roles' di ekspresinya sendiri.
--      (b) Policy di tabel lain bisa pakai alias atau schema prefix
--          yang lolos dari LIKE sederhana.
--      SOLUSI: Drop SEMUA policy ON user_roles (tanpa filter ekspresi) +
--              drop semua policy di tabel lain yang ekspresinya mengandung
--              'user_roles' dengan berbagai variasi penulisan.
--
-- Aman dijalankan ulang (idempotent).
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- STEP 1 — Buat ENUM app_role jika belum ada
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type
    WHERE typname = 'app_role'
      AND typnamespace = 'public'::regnamespace
  ) THEN
    CREATE TYPE public.app_role AS ENUM (
      'super_admin', 'owner', 'it', 'admin', 'branch_manager',
      'finance', 'operational', 'operator', 'sales', 'marketing',
      'equipment', 'agent', 'sub_agent', 'customer', 'jamaah'
    );
    RAISE NOTICE 'STEP 1: ENUM app_role dibuat.';
  ELSE
    RAISE NOTICE 'STEP 1: ENUM app_role sudah ada, lanjut.';
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- STEP 2 — Cek apakah konversi diperlukan
--           Jika kolom sudah ENUM, lewati semua ALTER DDL.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_col_type TEXT;
BEGIN
  SELECT udt_name INTO v_col_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name   = 'user_roles'
    AND column_name  = 'role';

  IF v_col_type = 'app_role' THEN
    RAISE NOTICE 'STEP 2: user_roles.role sudah bertipe app_role. Tidak ada yang perlu diubah.';
    RETURN; -- keluar dari DO block ini, STEP 3-6 di luar juga aman karena sudah idempotent
  ELSIF v_col_type IS NULL THEN
    RAISE NOTICE 'STEP 2: Tabel atau kolom user_roles.role tidak ditemukan, lewati.';
    RETURN;
  ELSE
    RAISE NOTICE 'STEP 2: user_roles.role saat ini bertipe %. Akan dikonversi ke app_role.', v_col_type;
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- STEP 3 — DROP semua RLS policy yang memblok ALTER TYPE
--
-- 3a. SEMUA policy ON tabel user_roles sendiri
--     (policy dengan USING (role = '...') tidak menyebut 'user_roles'
--      di teks ekspresinya → lolos dari LIKE, harus di-drop by table name)
-- 3b. Policy di tabel lain yang ekspresinya MENGANDUNG 'user_roles'
--     dengan berbagai variasi: 'user_roles', '"user_roles"', 'public.user_roles'
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  rec         RECORD;
  saved_json  JSONB := '[]'::JSONB;
  policy_rec  JSONB;
  roles_str   TEXT;
  cmd_str     TEXT;
  perm_str    TEXT;
  create_sql  TEXT;
BEGIN
  -- Kumpulkan semua policy yang perlu di-drop
  FOR rec IN
    SELECT
      n.nspname                                     AS schemaname,
      c.relname                                     AS tablename,
      p.polname                                     AS policyname,
      p.polpermissive                               AS permissive,
      p.polcmd                                      AS cmd,
      p.polroles                                    AS roles,
      pg_get_expr(p.polqual,      p.polrelid, TRUE) AS qual,
      pg_get_expr(p.polwithcheck, p.polrelid, TRUE) AS withcheck
    FROM pg_policy    p
    JOIN pg_class     c ON c.oid = p.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND (
        -- 3a: Policy langsung ON user_roles (apapun ekspresinya)
        c.relname = 'user_roles'
        -- 3b: Ekspresi mengandung 'user_roles' dalam berbagai bentuk
        OR pg_get_expr(p.polqual,      p.polrelid, TRUE) ~* 'user_roles'
        OR pg_get_expr(p.polwithcheck, p.polrelid, TRUE) ~* 'user_roles'
      )
  LOOP
    -- Bangun roles string
    IF rec.roles IS NULL OR rec.roles = '{0}' OR array_length(rec.roles, 1) IS NULL THEN
      roles_str := 'PUBLIC';
    ELSE
      SELECT string_agg(r.rolname, ', ')
      INTO roles_str
      FROM unnest(rec.roles) AS rid
      JOIN pg_roles r ON r.oid = rid;
      IF roles_str IS NULL OR roles_str = '' THEN
        roles_str := 'PUBLIC';
      END IF;
    END IF;

    cmd_str := CASE rec.cmd
      WHEN 'r' THEN 'SELECT'
      WHEN 'a' THEN 'INSERT'
      WHEN 'w' THEN 'UPDATE'
      WHEN 'd' THEN 'DELETE'
      ELSE 'ALL'
    END;

    perm_str := CASE WHEN rec.permissive THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END;

    -- Simpan definisi untuk recreate
    policy_rec := jsonb_build_object(
      'schema',    rec.schemaname,
      'table',     rec.tablename,
      'name',      rec.policyname,
      'cmd',       cmd_str,
      'perm',      perm_str,
      'roles',     roles_str,
      'qual',      rec.qual,
      'withcheck', rec.withcheck
    );
    saved_json := saved_json || jsonb_build_array(policy_rec);

    -- DROP policy
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON %I.%I',
      rec.policyname, rec.schemaname, rec.tablename
    );
    RAISE NOTICE 'STEP 3: Dropped policy "%" ON %.%',
      rec.policyname, rec.schemaname, rec.tablename;
  END LOOP;

  -- Simpan daftar policy ke tabel sementara untuk recreate di step 5
  CREATE TEMP TABLE IF NOT EXISTS _saved_policies (
    id      SERIAL PRIMARY KEY,
    payload JSONB NOT NULL
  );
  TRUNCATE _saved_policies;

  INSERT INTO _saved_policies (payload)
  SELECT jsonb_array_elements(saved_json);

  RAISE NOTICE 'STEP 3: % policy disimpan untuk di-recreate.', (SELECT count(*) FROM _saved_policies);
END;
$$;

-- ---------------------------------------------------------------------------
-- STEP 4 — DROP CHECK constraint pada user_roles.role
--
-- INI PENYEBAB UTAMA "operator does not exist: app_role = text".
-- Constraint berisi: role IN ('admin'::text, 'super_admin'::text, ...)
-- Setelah ALTER TYPE ke ENUM, PostgreSQL mencoba evaluasi
-- app_role = text → tidak ada operator → error.
-- Setelah konversi, ENUM sendiri sudah membatasi nilai valid → constraint redundan.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.user_roles'::regclass
      AND contype  = 'c'
  LOOP
    EXECUTE format(
      'ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS %I',
      rec.conname
    );
    RAISE NOTICE 'STEP 4: Dropped CHECK constraint "%".', rec.conname;
  END LOOP;
END;
$$;

-- ---------------------------------------------------------------------------
-- STEP 5 — DROP DEFAULT pada user_roles.role (jika ada)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_default TEXT;
BEGIN
  SELECT column_default INTO v_default
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name   = 'user_roles'
    AND column_name  = 'role';

  IF v_default IS NOT NULL THEN
    ALTER TABLE public.user_roles ALTER COLUMN role DROP DEFAULT;
    RAISE NOTICE 'STEP 5: Dropped DEFAULT "%".', v_default;
  ELSE
    RAISE NOTICE 'STEP 5: Tidak ada DEFAULT pada user_roles.role.';
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- STEP 6 — DROP index partial yang menyebut kolom role (jika ada)
--           Index biasa pada role tidak masalah, tapi partial index dengan
--           WHERE role = '...' (text) akan error setelah tipe berubah.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename  = 'user_roles'
      AND indexdef   ILIKE '%WHERE%role%'   -- hanya partial index
  LOOP
    EXECUTE format('DROP INDEX IF EXISTS public.%I', rec.indexname);
    RAISE NOTICE 'STEP 6: Dropped partial index "%": %', rec.indexname, rec.indexdef;
  END LOOP;
END;
$$;

-- ---------------------------------------------------------------------------
-- STEP 7 — ALTER COLUMN role: TEXT → ENUM app_role
--           Hanya dijalankan jika kolom masih TEXT
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_udt TEXT;
BEGIN
  SELECT udt_name INTO v_udt
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name   = 'user_roles'
    AND column_name  = 'role';

  IF v_udt = 'app_role' THEN
    RAISE NOTICE 'STEP 7: Sudah bertipe app_role, lewati.';
    RETURN;
  END IF;

  -- Pastikan semua nilai yang ada di data memang valid di ENUM
  -- (nilai di luar ENUM akan menyebabkan ERROR di sini → perlu dibersihkan sebelumnya)
  IF EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE role NOT IN (
      'super_admin','owner','it','admin','branch_manager',
      'finance','operational','operator','sales','marketing',
      'equipment','agent','sub_agent','customer','jamaah'
    )
  ) THEN
    RAISE EXCEPTION 'STEP 7 GAGAL: Ada nilai role di data yang tidak ada di ENUM app_role. '
      'Jalankan query berikut untuk melihat: '
      'SELECT DISTINCT role FROM public.user_roles WHERE role NOT IN (''super_admin'',''owner'',''it'',''admin'','
      '''branch_manager'',''finance'',''operational'',''operator'',''sales'',''marketing'','
      '''equipment'',''agent'',''sub_agent'',''customer'',''jamaah'');';
  END IF;

  ALTER TABLE public.user_roles
    ALTER COLUMN role TYPE public.app_role
    USING role::text::public.app_role;

  RAISE NOTICE 'STEP 7: user_roles.role berhasil dikonversi ke app_role ENUM.';
END;
$$;

-- ---------------------------------------------------------------------------
-- STEP 8 — Tambahkan DEFAULT baru (opsional) dan NOT NULL (sudah ada)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  -- user_roles biasanya TIDAK punya default (role harus selalu di-set eksplisit)
  -- Jika ingin default:
  -- ALTER TABLE public.user_roles ALTER COLUMN role SET DEFAULT 'customer'::public.app_role;
  RAISE NOTICE 'STEP 8: Tidak menambahkan DEFAULT (role harus di-set eksplisit saat insert).';
END;
$$;

-- ---------------------------------------------------------------------------
-- STEP 9 — Recreate semua policy yang tadi di-drop
--
-- Khusus untuk policy yang ekspresinya mengandung perbandingan
-- role = '...'text atau role IN (ARRAY['...'::text, ...]):
-- pg_get_expr menyimpan ekspresi ASLI saat policy dibuat.
-- Setelah ALTER TYPE ke ENUM, literal 'admin' dalam ekspresi akan otomatis
-- di-resolve sebagai unknown → di-cast ke app_role oleh parser.
-- Namun jika ekspresi sudah mengandung ::text cast eksplisit, kita perlu
-- mengganti dengan ::public.app_role.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  rec        RECORD;
  qual       TEXT;
  withcheck  TEXT;
  create_sql TEXT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables
                 WHERE table_name = '_saved_policies') THEN
    RAISE NOTICE 'STEP 9: Tidak ada tabel _saved_policies, lewati.';
    RETURN;
  END IF;

  FOR rec IN SELECT payload FROM _saved_policies ORDER BY id
  LOOP
    qual      := rec.payload->>'qual';
    withcheck := rec.payload->>'withcheck';

    -- Ganti ::text cast pada perbandingan role di user_roles agar kompatibel dengan ENUM
    -- Pattern: (role)::text = 'nilai'::text  →  role = 'nilai'::public.app_role
    -- Pattern: role = ANY(ARRAY['a'::text,...])  →  role = ANY(ARRAY['a'::app_role,...])
    IF qual IS NOT NULL THEN
      qual := regexp_replace(
        qual,
        E'\\(role\\)::text\\s*=\\s*''([^'']+)''::text',
        'role = ''\1''::public.app_role',
        'g'
      );
      qual := regexp_replace(
        qual,
        E'''([^'']+)''::text(\\s*,|\\s*\\))',
        '''\1''::public.app_role\2',
        'g'
      );
    END IF;

    IF withcheck IS NOT NULL THEN
      withcheck := regexp_replace(
        withcheck,
        E'\\(role\\)::text\\s*=\\s*''([^'']+)''::text',
        'role = ''\1''::public.app_role',
        'g'
      );
    END IF;

    -- Bangun CREATE POLICY
    create_sql := format(
      'CREATE POLICY %I ON %I.%I AS %s FOR %s TO %s',
      rec.payload->>'name',
      rec.payload->>'schema',
      rec.payload->>'table',
      rec.payload->>'perm',
      rec.payload->>'cmd',
      rec.payload->>'roles'
    );
    IF qual IS NOT NULL THEN
      create_sql := create_sql || format(' USING (%s)', qual);
    END IF;
    IF withcheck IS NOT NULL THEN
      create_sql := create_sql || format(' WITH CHECK (%s)', withcheck);
    END IF;

    BEGIN
      EXECUTE create_sql;
      RAISE NOTICE 'STEP 9: Recreated policy "%" ON %.%',
        rec.payload->>'name', rec.payload->>'schema', rec.payload->>'table';
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'STEP 9 WARNING: Gagal recreate policy "%": %',
        rec.payload->>'name', SQLERRM;
      RAISE WARNING 'SQL yang gagal: %', left(create_sql, 300);
    END;
  END LOOP;
END;
$$;

-- ---------------------------------------------------------------------------
-- STEP 10 — Recreate ulang policy yang DIKETAHUI referensi user_roles.role
--           secara eksplisit dengan cast ENUM yang benar.
--
--           Ini sebagai FALLBACK / OVERRIDE jika pg_get_expr di step 9
--           tidak ter-patch dengan sempurna (misalnya packages_admin_manage
--           atau policy lain yang punya ekspresi kompleks).
--           DROP IF EXISTS + CREATE agar idempotent.
-- ---------------------------------------------------------------------------

-- user_roles_select (ON user_roles — USING tanpa referensi langsung ke column role)
DROP POLICY IF EXISTS "user_roles_select" ON public.user_roles;
DO $$ BEGIN
  CREATE POLICY "user_roles_select" ON public.user_roles
    FOR SELECT TO authenticated
    USING (
      user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.role IN ('super_admin','admin')
      )
    );
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'STEP 10: Gagal recreate user_roles_select: %', SQLERRM;
END; $$;

-- user_roles_admin (ON user_roles)
DROP POLICY IF EXISTS "user_roles_admin" ON public.user_roles;
DO $$ BEGIN
  CREATE POLICY "user_roles_admin" ON public.user_roles
    FOR ALL TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.role IN ('super_admin','admin')
      )
    );
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'STEP 10: Gagal recreate user_roles_admin: %', SQLERRM;
END; $$;

-- packages_admin_manage — policy yang muncul di error log sebelumnya.
-- Jika policy ini sudah ter-recreate oleh step 9, DROP IF EXISTS + CREATE ini
-- hanya overwrite dengan versi yang sudah benar.
-- Sesuaikan definisi USING sesuai kebutuhan bisnis Anda.
DROP POLICY IF EXISTS "packages_admin_manage" ON public.packages;
DO $$ BEGIN
  CREATE POLICY "packages_admin_manage" ON public.packages
    FOR ALL TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
          AND ur.role = ANY(ARRAY[
            'super_admin'::public.app_role,
            'owner'::public.app_role,
            'admin'::public.app_role,
            'branch_manager'::public.app_role,
            'marketing'::public.app_role,
            'operator'::public.app_role
          ])
      )
    );
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'STEP 10: Gagal recreate packages_admin_manage: %', SQLERRM;
END; $$;

-- ---------------------------------------------------------------------------
-- STEP 11 — Cleanup tabel sementara
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS _saved_policies;

-- ---------------------------------------------------------------------------
-- STEP 12 — Verifikasi hasil akhir
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_type TEXT;
  v_enum_count INTEGER;
BEGIN
  SELECT udt_name INTO v_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name   = 'user_roles'
    AND column_name  = 'role';

  SELECT count(*) INTO v_enum_count
  FROM pg_enum e
  JOIN pg_type t ON t.oid = e.enumtypid
  WHERE t.typname = 'app_role';

  RAISE NOTICE '=== VERIFIKASI ===';
  RAISE NOTICE 'Tipe user_roles.role sekarang: %', v_type;
  RAISE NOTICE 'Jumlah nilai ENUM app_role: %', v_enum_count;

  IF v_type = 'app_role' THEN
    RAISE NOTICE 'STATUS: BERHASIL — user_roles.role sudah ENUM app_role.';
  ELSE
    RAISE WARNING 'STATUS: PERIKSA — tipe masih %. Cek NOTICE di atas.', v_type;
  END IF;
END;
$$;

-- Tampilkan semua nilai ENUM untuk konfirmasi
SELECT
  enumlabel        AS role_valid,
  enumsortorder    AS urutan
FROM pg_enum e
JOIN pg_type t ON t.oid = e.enumtypid
WHERE t.typname = 'app_role'
ORDER BY enumsortorder;

-- Tampilkan semua policy yang sekarang aktif di user_roles
SELECT
  polname                                      AS policy_name,
  CASE polcmd
    WHEN 'r' THEN 'SELECT' WHEN 'a' THEN 'INSERT'
    WHEN 'w' THEN 'UPDATE' WHEN 'd' THEN 'DELETE'
    ELSE 'ALL'
  END                                          AS cmd,
  pg_get_expr(polqual,      polrelid, TRUE)   AS using_expr,
  pg_get_expr(polwithcheck, polrelid, TRUE)   AS with_check_expr
FROM pg_policy
WHERE polrelid = 'public.user_roles'::regclass
ORDER BY polname;

SELECT
  '013_role_enum_fixed: SELESAI' AS result,
  'user_roles.role = app_role ENUM, semua policy telah di-recreate.' AS keterangan;

COMMIT;
