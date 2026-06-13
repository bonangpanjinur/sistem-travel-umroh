-- =============================================================================
-- AUDIT: Semua objek yang mereferensikan user_roles.role
-- Jalankan di Supabase SQL Editor sebelum migrasi 013 untuk memetakan
-- semua dependency yang akan menyebabkan ALTER TYPE gagal.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. RLS Policies yang mereferensikan user_roles.role
--    Mencakup: (a) policy ON tabel user_roles itu sendiri,
--              (b) policy di tabel lain yang subquery-nya menyebut user_roles
-- ---------------------------------------------------------------------------
SELECT
  '1_RLS_POLICIES'                                           AS kategori,
  n.nspname                                                  AS schema,
  c.relname                                                  AS tabel,
  p.polname                                                  AS nama_policy,
  CASE p.polcmd
    WHEN 'r' THEN 'SELECT' WHEN 'a' THEN 'INSERT'
    WHEN 'w' THEN 'UPDATE' WHEN 'd' THEN 'DELETE'
    ELSE 'ALL'
  END                                                        AS cmd,
  CASE WHEN p.polpermissive THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END AS jenis,
  pg_get_expr(p.polqual,      p.polrelid, TRUE)              AS using_expr,
  pg_get_expr(p.polwithcheck, p.polrelid, TRUE)              AS with_check_expr
FROM pg_policy    p
JOIN pg_class     c ON c.oid = p.polrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND (
    c.relname = 'user_roles'                                              -- (a) policy langsung di tabel user_roles
    OR pg_get_expr(p.polqual,      p.polrelid, TRUE) LIKE '%user_roles%' -- (b) ekspresi referensi user_roles
    OR pg_get_expr(p.polwithcheck, p.polrelid, TRUE) LIKE '%user_roles%'
  )
ORDER BY c.relname, p.polname;

-- ---------------------------------------------------------------------------
-- 2. Views yang mereferensikan user_roles atau kolom role-nya
-- ---------------------------------------------------------------------------
SELECT
  '2_VIEWS'                       AS kategori,
  n.nspname                       AS schema,
  c.relname                       AS nama_view,
  pg_get_viewdef(c.oid, TRUE)     AS definisi
FROM pg_class     c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind  = 'v'
  AND n.nspname  = 'public'
  AND pg_get_viewdef(c.oid, TRUE) ILIKE '%user_roles%'
ORDER BY c.relname;

-- ---------------------------------------------------------------------------
-- 3. Functions / Stored Procedures yang mereferensikan user_roles
-- ---------------------------------------------------------------------------
SELECT
  '3_FUNCTIONS'                         AS kategori,
  n.nspname                             AS schema,
  p.proname                             AS nama_fungsi,
  pg_get_function_identity_arguments(p.oid) AS argumen,
  left(pg_get_functiondef(p.oid), 500)  AS definisi_awal
FROM pg_proc      p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname  = 'public'
  AND pg_get_functiondef(p.oid) ILIKE '%user_roles%'
ORDER BY p.proname;

-- ---------------------------------------------------------------------------
-- 4. Triggers pada tabel user_roles
-- ---------------------------------------------------------------------------
SELECT
  '4_TRIGGERS'            AS kategori,
  trigger_schema          AS schema,
  event_object_table      AS tabel,
  trigger_name            AS nama_trigger,
  event_manipulation      AS event,
  action_timing           AS timing,
  action_statement        AS aksi
FROM information_schema.triggers
WHERE trigger_schema     = 'public'
  AND event_object_table = 'user_roles'
ORDER BY trigger_name;

-- ---------------------------------------------------------------------------
-- 5. CHECK Constraints yang menggunakan kolom role pada user_roles
--    INI PENYEBAB UTAMA ERROR: operator does not exist: app_role = text
-- ---------------------------------------------------------------------------
SELECT
  '5_CHECK_CONSTRAINTS'               AS kategori,
  conrelid::regclass                  AS tabel,
  conname                             AS nama_constraint,
  contype                             AS tipe,
  pg_get_constraintdef(oid, TRUE)     AS definisi
FROM pg_constraint
WHERE conrelid = 'public.user_roles'::regclass
  AND contype  = 'c'
ORDER BY conname;

-- ---------------------------------------------------------------------------
-- 5b. Juga cek CHECK pada role_permissions.role dan profiles.role
--     (tabel lain yang punya kolom role bertipe TEXT)
-- ---------------------------------------------------------------------------
SELECT
  '5b_CHECK_OTHER_ROLE_COLS'          AS kategori,
  conrelid::regclass                  AS tabel,
  conname                             AS nama_constraint,
  pg_get_constraintdef(oid, TRUE)     AS definisi
FROM pg_constraint
WHERE conrelid IN (
  'public.role_permissions'::regclass,
  'public.profiles'::regclass,
  'public.staff_invitations'::regclass
)
  AND contype = 'c'
  AND pg_get_constraintdef(oid, TRUE) ILIKE '%role%'
ORDER BY conrelid::regclass::text, conname;

-- ---------------------------------------------------------------------------
-- 6. Default expression pada user_roles.role
-- ---------------------------------------------------------------------------
SELECT
  '6_COLUMN_DEFAULT'    AS kategori,
  table_name,
  column_name,
  data_type,
  udt_name              AS udt,
  column_default,
  is_nullable,
  is_generated
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'user_roles'
  AND column_name  = 'role';

-- ---------------------------------------------------------------------------
-- 7. Generated columns yang menggunakan role (PostgreSQL 12+)
-- ---------------------------------------------------------------------------
SELECT
  '7_GENERATED_COLUMNS'   AS kategori,
  table_name,
  column_name,
  generation_expression,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'user_roles'
  AND is_generated <> 'NEVER';

-- ---------------------------------------------------------------------------
-- 8. Semua index pada tabel user_roles
--    Partial index yang pakai kolom role juga memblok ALTER TYPE
-- ---------------------------------------------------------------------------
SELECT
  '8_INDEXES'   AS kategori,
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename  = 'user_roles'
ORDER BY indexname;

-- ---------------------------------------------------------------------------
-- 9. Semua ekspresi CHECK di schema public yang membandingkan *::app_role
--    atau role dengan text literal (berpotensi error setelah ALTER TYPE)
-- ---------------------------------------------------------------------------
SELECT
  '9_ROLE_COMPARISONS'            AS kategori,
  conrelid::regclass              AS tabel,
  conname                         AS nama_constraint,
  pg_get_constraintdef(oid, TRUE) AS ekspresi
FROM pg_constraint
WHERE conrelid::regclass::text LIKE 'public.%'
  AND contype = 'c'
  AND (
    pg_get_constraintdef(oid, TRUE) ILIKE '%role%'
    OR pg_get_constraintdef(oid, TRUE) ILIKE '%app_role%'
  )
ORDER BY conrelid::regclass::text, conname;

-- ---------------------------------------------------------------------------
-- 10. Ringkasan: semua pg_depend yang terikat pada kolom role di user_roles
--     Ini menampilkan SEMUA objek PostgreSQL yang bergantung pada kolom tsb.
-- ---------------------------------------------------------------------------
SELECT
  '10_PG_DEPEND'              AS kategori,
  dep.deptype,
  cls.relname                 AS objek_dependen,
  dep.classid::regclass       AS kelas_catalog,
  dep.objid,
  dep.objsubid,
  ref.relname                 AS tabel_direferensi,
  dep.refobjsubid             AS kolom_no
FROM pg_depend     dep
JOIN pg_class      ref ON ref.oid = dep.refobjid
JOIN pg_attribute  att ON att.attrelid = dep.refobjid
                      AND att.attnum    = dep.refobjsubid
LEFT JOIN pg_class cls ON cls.oid = dep.objid
WHERE dep.refobjid  = 'public.user_roles'::regclass
  AND att.attname   = 'role'
  AND dep.refobjsubid > 0
ORDER BY dep.deptype, cls.relname;

SELECT '=== AUDIT SELESAI ===' AS info,
       'Jalankan 013_role_enum_fixed.sql setelah audit ini.' AS langkah_berikutnya;
