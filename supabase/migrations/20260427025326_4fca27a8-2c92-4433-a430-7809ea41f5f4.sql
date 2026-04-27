-- Fix: function sync_role_permissions_to_users(app_role) tidak ada
-- Buat fungsi stub agar trigger handle_role_permissions_change yang
-- memanggilnya tidak gagal. Jika trigger belum ada, tidak masalah.

CREATE OR REPLACE FUNCTION public.sync_role_permissions_to_users(_role public.app_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Sistem permissions sudah resolve secara dinamis lewat:
  --   check_user_permission() dan get_user_effective_permissions()
  -- yang menggabungkan role_permissions + user_permissions saat dibaca.
  -- Jadi tidak perlu materialisasi/sync ke tabel user_permissions.
  -- Stub ini hanya untuk kompatibilitas trigger lama.
  RAISE NOTICE 'sync_role_permissions_to_users(%) - no-op (resolved dynamically)', _role;
END;
$$;

-- Hapus trigger lama yang tidak kita butuhkan lagi (jika ada).
DROP TRIGGER IF EXISTS handle_role_permissions_change_trigger ON public.role_permissions;
DROP FUNCTION IF EXISTS public.handle_role_permissions_change() CASCADE;