-- ============================================================
-- Phase 5 — RBAC Improvements & Role Schema Fixes
-- ============================================================
-- Terapkan migration ini setelah phase4-push-visa.sql.
-- Jalankan di Supabase SQL Editor sebagai postgres/service_role.

-- ============================================================
-- 1. Tambah tipe role baru di enum app_role (jika ada enum)
--    Jika role disimpan sebagai text, skip bagian ini.
-- ============================================================

-- Cek apakah ada enum app_role; jika iya tambah nilai baru
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    -- Tambah jamaah jika belum ada
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum
      WHERE enumlabel = 'jamaah'
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')
    ) THEN
      ALTER TYPE app_role ADD VALUE 'jamaah';
      RAISE NOTICE 'Added app_role value: jamaah';
    END IF;
    -- Tambah sub_agent jika belum ada
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum
      WHERE enumlabel = 'sub_agent'
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')
    ) THEN
      ALTER TYPE app_role ADD VALUE 'sub_agent';
      RAISE NOTICE 'Added app_role value: sub_agent';
    END IF;
  ELSE
    RAISE NOTICE 'No app_role enum found — roles are stored as text, skipping enum alter.';
  END IF;
END $$;

-- ============================================================
-- 2. Seed default permissions untuk role baru
-- ============================================================

-- sub_agent: izin yang sama dengan agent (tampilan paket, daftar jamaah sendiri)
INSERT INTO role_permissions (role, permission_key, is_enabled)
SELECT 'sub_agent', permission_key, is_enabled
FROM role_permissions
WHERE role = 'agent'
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp2
    WHERE rp2.role = 'sub_agent' AND rp2.permission_key = role_permissions.permission_key
  )
ON CONFLICT (role, permission_key) DO NOTHING;

-- jamaah: tidak memiliki permission admin, hanya portal pribadi
-- (role_permissions kosong = tidak ada akses ke modul admin sama sekali)
-- Tidak ada INSERT yang diperlukan — portal jamaah dijaga di route level.

-- ============================================================
-- 3. Row Level Security — jamaah dan sub_agent
-- ============================================================

-- Pastikan tabel user_roles mengizinkan jamaah dan sub_agent
-- (tabel ini biasanya menggunakan text/varchar untuk kolom role)

-- Jika ada constraint CHECK pada kolom role di user_roles, update:
DO $$
BEGIN
  -- Coba hapus constraint lama jika ada
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'user_roles'
      AND constraint_name = 'user_roles_role_check'
  ) THEN
    ALTER TABLE user_roles DROP CONSTRAINT user_roles_role_check;
    ALTER TABLE user_roles ADD CONSTRAINT user_roles_role_check
      CHECK (role IN (
        'super_admin','owner','branch_manager','finance','operational',
        'sales','marketing','equipment','agent','sub_agent','customer','jamaah'
      ));
    RAISE NOTICE 'Updated user_roles_role_check constraint to include jamaah and sub_agent.';
  END IF;
END $$;

-- ============================================================
-- 4. RLS Policy — sub_agent bisa lihat jamaah yang mereka daftarkan
-- ============================================================

-- Policy: sub_agent dapat melihat booking dan jamaah yang direferensikan oleh agen induknya
-- (implementasi detail tergantung struktur tabel bookings — contoh dasar di bawah)

-- Contoh: izinkan sub_agent melihat bookings di mana agent_id cocok dengan agen induknya
-- Jika tabel bookings ada:
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'bookings'
  ) THEN
    -- Hapus policy lama jika ada, lalu buat ulang
    DROP POLICY IF EXISTS "sub_agent_view_own_bookings" ON bookings;
    CREATE POLICY "sub_agent_view_own_bookings" ON bookings
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM user_roles ur
          WHERE ur.user_id = auth.uid()
            AND ur.role = 'sub_agent'
        )
        AND agent_id IN (
          -- Sub-agent hanya bisa lihat booking yang mereka atau agen induknya buat
          SELECT agent_profiles.id
          FROM agent_profiles
          WHERE agent_profiles.user_id = auth.uid()
             OR agent_profiles.parent_agent_id IN (
               SELECT agent_profiles2.id FROM agent_profiles agent_profiles2
               WHERE agent_profiles2.user_id = auth.uid()
             )
        )
      );
    RAISE NOTICE 'Created sub_agent_view_own_bookings policy on bookings.';
  END IF;
END $$;

-- ============================================================
-- 5. Perbaiki policy absensi — hanya HR roles yang boleh akses
-- ============================================================

-- Jika ada tabel attendances atau employee_attendances
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'employee_attendances'
  ) THEN
    DROP POLICY IF EXISTS "staff_access_attendances" ON employee_attendances;
    CREATE POLICY "staff_access_attendances" ON employee_attendances
      FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM user_roles ur
          WHERE ur.user_id = auth.uid()
            AND ur.role IN ('super_admin','owner','branch_manager','operational','finance')
        )
      );
    RAISE NOTICE 'Created staff_access_attendances policy.';
  END IF;
END $$;

-- ============================================================
-- 6. Verifikasi role_permissions — hapus warisan agent dari sales
--    (sales sebelumnya mewarisi agent di ROLE_HIERARCHY, kini dipisah)
-- ============================================================

-- Tidak ada perubahan database yang diperlukan untuk ini —
-- perubahan hierarki dilakukan di sisi client (rbac-resolver.ts & permissions.ts).
-- Pastikan role_permissions untuk 'sales' tidak berisi permission yang seharusnya
-- hanya dimiliki agent (misal: agent-specific commission settings).

-- ============================================================
-- 7. Seed role_permissions untuk sub_agent jika tabel kosong
-- ============================================================

-- Jika role_permissions untuk sub_agent masih kosong setelah step 2:
INSERT INTO role_permissions (role, permission_key, is_enabled)
VALUES
  ('sub_agent', 'packages', true),
  ('sub_agent', 'bookings', true)
ON CONFLICT (role, permission_key) DO NOTHING;

-- ============================================================
-- Selesai
-- ============================================================
RAISE NOTICE 'Phase 5 RBAC migration completed successfully.';
