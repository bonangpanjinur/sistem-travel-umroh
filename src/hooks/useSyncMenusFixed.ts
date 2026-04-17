import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { RECOMMENDED_MENUS } from '@/lib/admin-menu-registry';

/**
 * Manual menu sync (admin-only). Uses `JSONB` parameter signature matching
 * the active backend `bulk_sync_menu_items(_menu_items JSONB)`.
 * NOT called automatically — only via explicit admin action.
 * 
 * The RECOMMENDED_MENUS is now centralized in admin-menu-registry.ts
 * to ensure consistency across the entire application.
 */
export const useSyncMenusFixed = () => {
  const queryClient = useQueryClient();
  const syncMenus = async () => {
    const { data, error } = await supabase.rpc('bulk_sync_menu_items', {
      _menu_items: JSON.stringify(RECOMMENDED_MENUS),
    });
    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ['dynamic-menus'] });
    return data;
  };
  return { syncMenus };
};

/**
 * @deprecated Use RECOMMENDED_MENUS from admin-menu-registry.ts instead
 */
export const RECOMMENDED_MENUS_DEPRECATED = RECOMMENDED_MENUS;
