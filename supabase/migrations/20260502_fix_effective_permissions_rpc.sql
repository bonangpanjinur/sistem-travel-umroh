-- =====================================================
-- Perbaikan RPC get_user_effective_permissions (v2)
-- Deskripsi: Menambahkan DROP FUNCTION untuk menghindari error return type mismatch
-- Tanggal: 2026-05-02
-- =====================================================

-- Hapus fungsi lama terlebih dahulu karena tipe data return berubah
DROP FUNCTION IF EXISTS public.get_user_effective_permissions(UUID);

CREATE OR REPLACE FUNCTION public.get_user_effective_permissions(_user_id UUID)
RETURNS TABLE (
    permission_key VARCHAR(100)
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    -- Ambil permission dari role user
    SELECT DISTINCT rp.permission_key::VARCHAR(100)
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON ur.role = rp.role
    WHERE ur.user_id = _user_id 
      AND rp.is_enabled = true
    
    UNION
    
    -- Ambil permission dari mapping menu role (Phase 5)
    SELECT DISTINCT mi.required_permission::VARCHAR(100)
    FROM public.user_roles ur
    JOIN public.role_menu_mapping rmm ON ur.role = rmm.role
    JOIN public.menu_items mi ON rmm.menu_item_id = mi.id
    WHERE ur.user_id = _user_id 
      AND rmm.is_enabled = true
      AND mi.required_permission IS NOT NULL
    
    UNION
    
    -- Ambil permission dari overrides user (jika ada)
    SELECT DISTINCT upo.permission_key::VARCHAR(100)
    FROM public.user_permissions_overrides upo
    WHERE upo.user_id = _user_id 
      AND upo.is_enabled = true;
END;
$$;

-- Berikan akses ke authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_effective_permissions(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_effective_permissions(UUID) TO service_role;
