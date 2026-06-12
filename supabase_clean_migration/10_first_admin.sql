-- =============================================================================
-- FILE 10: SETUP SUPER ADMIN PERTAMA
-- Vinstour Travel Portal
--
-- Jalankan file ini SETELAH:
--   1. File 01–07 berhasil dijalankan
--   2. Anda membuat akun pertama via Supabase Auth
--      (Authentication → Users → Add User)
--
-- Cara pakai:
--   1. Buka Supabase Dashboard → Authentication → Users
--   2. Copy UUID user yang ingin dijadikan super_admin
--   3. Ganti nilai di bawah ini:
--        SET my.target_email = 'email@anda.com';
--      ATAU ganti langsung UUID di bagian DO block jika tahu UUID-nya
-- =============================================================================

-- =============================================================================
-- LANGKAH 1: Konfirmasi user yang akan dipromosikan
-- Jalankan query ini dulu untuk memastikan user ditemukan
-- =============================================================================
SELECT
  id          AS user_uuid,
  email,
  created_at  AS registered_at,
  raw_user_meta_data->>'full_name' AS full_name
FROM auth.users
ORDER BY created_at ASC
LIMIT 10;
-- Salin UUID dari user yang ingin dijadikan super_admin, lalu lanjut ke Langkah 2.


-- =============================================================================
-- LANGKAH 2: Cek apakah sudah ada super_admin
-- Jika sudah ada, script ini TIDAK akan membuat duplikat
-- =============================================================================
SELECT
  ur.user_id,
  p.email,
  p.full_name,
  ur.role,
  ur.created_at
FROM user_roles ur
JOIN profiles p ON p.id = ur.user_id
WHERE ur.role IN ('super_admin', 'owner')
ORDER BY ur.created_at;
-- Jika tabel di atas sudah berisi baris, Anda sudah punya admin.
-- Lanjutkan ke Langkah 3 hanya jika memang ingin menambah admin baru.


-- =============================================================================
-- LANGKAH 3: Promosikan user menjadi super_admin
--
-- GANTI nilai ini:
--   'admin@vinstour.com'  → email akun yang sudah dibuat di Supabase Auth
-- =============================================================================
DO $$
DECLARE
  v_target_email  TEXT    := 'admin@vinstour.com';  -- ← GANTI INI
  v_user_id       UUID;
  v_existing_role TEXT;
  v_full_name     TEXT;
  v_admin_count   INTEGER;
BEGIN

  -- Ambil UUID user berdasarkan email
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = v_target_email;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION
      'User dengan email "%" tidak ditemukan di Supabase Auth. '
      'Buat akun terlebih dahulu via Authentication → Users → Add User.',
      v_target_email;
  END IF;

  -- Cek apakah user sudah punya role
  SELECT role INTO v_existing_role
  FROM user_roles
  WHERE user_id = v_user_id AND role = 'super_admin';

  IF v_existing_role IS NOT NULL THEN
    RAISE NOTICE
      'User % sudah menjadi super_admin. Tidak ada perubahan.',
      v_target_email;
    RETURN;
  END IF;

  -- Cek jumlah super_admin yang sudah ada
  SELECT COUNT(*) INTO v_admin_count
  FROM user_roles
  WHERE role = 'super_admin';

  IF v_admin_count >= 3 THEN
    RAISE EXCEPTION
      'Sudah ada % super_admin. Untuk keamanan, maksimal 3 super_admin diizinkan. '
      'Hapus salah satu dulu jika perlu, atau gunakan role "owner" untuk admin tambahan.',
      v_admin_count;
  END IF;

  -- Pastikan profile sudah ada (dibuat otomatis oleh trigger handle_new_user)
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = v_user_id) THEN
    -- Buat profile manual jika trigger belum berjalan
    INSERT INTO profiles (id, email, full_name)
    SELECT id, email, COALESCE(raw_user_meta_data->>'full_name', email)
    FROM auth.users WHERE id = v_user_id
    ON CONFLICT (id) DO NOTHING;
  END IF;

  -- Ambil nama untuk pesan konfirmasi
  SELECT full_name INTO v_full_name
  FROM profiles WHERE id = v_user_id;

  -- Promosikan ke super_admin
  INSERT INTO user_roles (user_id, role)
  VALUES (v_user_id, 'super_admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  RAISE NOTICE
    '✅ Berhasil: % (%) sekarang adalah super_admin.',
    COALESCE(v_full_name, v_target_email), v_user_id;

END $$;


-- =============================================================================
-- LANGKAH 4: Verifikasi hasil
-- =============================================================================
SELECT
  ur.user_id,
  p.email,
  p.full_name,
  ur.role,
  ur.created_at AS promoted_at
FROM user_roles ur
JOIN profiles p ON p.id = ur.user_id
WHERE ur.role IN ('super_admin','owner')
ORDER BY ur.created_at;


-- =============================================================================
-- LANGKAH 5 (Opsional): Tambah owner / branch_manager kedua
--
-- Uncomment dan isi email untuk role tambahan:
-- =============================================================================

/*
-- Tambah user sebagai 'owner'
INSERT INTO user_roles (user_id, role)
SELECT id, 'owner'
FROM auth.users
WHERE email = 'owner@vinstour.com'   -- ← GANTI
ON CONFLICT (user_id, role) DO NOTHING;

-- Tambah user sebagai 'branch_manager' di cabang tertentu
INSERT INTO user_roles (user_id, role, branch_id)
SELECT
  u.id,
  'branch_manager',
  b.id
FROM auth.users u
CROSS JOIN branches b
WHERE u.email  = 'manager@vinstour.com'   -- ← GANTI
  AND b.code   = 'JKT'                    -- ← kode cabang (lihat tabel branches)
ON CONFLICT (user_id, role) DO NOTHING;
*/


-- =============================================================================
-- SELESAI — File 10: Setup Super Admin
-- =============================================================================
SELECT 'File 10 — First Admin: selesai. Login dengan akun super_admin Anda.' AS result;
