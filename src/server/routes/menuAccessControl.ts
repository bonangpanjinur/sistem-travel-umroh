/**
 * Menu Access Control API Routes
 * 
 * Endpoints untuk mengelola akses menu dinamis berdasarkan role dan user permissions
 * Implementasi sistem hak akses dinamis yang fleksibel
 */

import { Router, Request, Response, NextFunction } from 'express';
import { supabase } from '@/integrations/supabase/client';
import { requirePermission, auditLog } from '@/server/middleware/permissionMiddleware';

const router = Router();

/**
 * GET /api/menu/accessible
 * 
 * Mendapatkan daftar menu yang dapat diakses oleh user saat ini
 * Menggunakan RPC function get_user_accessible_menus untuk resolusi permission
 */
router.get('/accessible', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User tidak terautentikasi'
      });
    }

    // Call RPC function to get accessible menus
    const { data: menus, error } = await supabase.rpc('get_user_accessible_menus', {
      _user_id: userId
    });

    if (error) {
      console.error('Error fetching accessible menus:', error);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Gagal mengambil daftar menu'
      });
    }

    // Filter only menus with access
    const accessibleMenus = menus
      .filter((m: any) => m.has_access)
      .map((m: any) => ({
        id: m.id,
        key: m.key,
        label: m.label,
        path: m.path,
        icon: m.icon,
        group_name: m.group_name,
        sort_order: m.sort_order,
        required_permission: m.required_permission
      }));

    // Group by group_name
    const groupedMenus = accessibleMenus.reduce((acc: any, menu: any) => {
      if (!acc[menu.group_name]) {
        acc[menu.group_name] = [];
      }
      acc[menu.group_name].push(menu);
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        menus: accessibleMenus,
        grouped: groupedMenus,
        total: accessibleMenus.length
      }
    });
  } catch (error) {
    console.error('Error in GET /api/menu/accessible:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Terjadi kesalahan saat memproses permintaan'
    });
  }
});

/**
 * GET /api/menu/all
 * 
 * Mendapatkan daftar semua menu dengan status akses untuk user saat ini
 * Berguna untuk debugging dan admin panel
 */
router.get('/all', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User tidak terautentikasi'
      });
    }

    // Call RPC function to get all menus with access status
    const { data: menus, error } = await supabase.rpc('get_user_accessible_menus', {
      _user_id: userId
    });

    if (error) {
      console.error('Error fetching all menus:', error);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Gagal mengambil daftar menu'
      });
    }

    // Group by group_name
    const groupedMenus = menus.reduce((acc: any, menu: any) => {
      if (!acc[menu.group_name]) {
        acc[menu.group_name] = [];
      }
      acc[menu.group_name].push({
        id: menu.id,
        key: menu.key,
        label: menu.label,
        path: menu.path,
        icon: menu.icon,
        sort_order: menu.sort_order,
        required_permission: menu.required_permission,
        has_access: menu.has_access
      });
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        menus,
        grouped: groupedMenus,
        total: menus.length,
        accessible_count: menus.filter((m: any) => m.has_access).length
      }
    });
  } catch (error) {
    console.error('Error in GET /api/menu/all:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Terjadi kesalahan saat memproses permintaan'
    });
  }
});

/**
 * POST /api/menu/sync
 * 
 * Sinkronisasi menu items dari frontend ke database
 * Hanya admin yang dapat melakukan ini
 * 
 * Request body:
 * {
 *   "menus": [
 *     {
 *       "key": "dashboard",
 *       "label": "Dashboard",
 *       "path": "/admin",
 *       "icon": "LayoutDashboard",
 *       "group_name": "Overview",
 *       "sort_order": 10,
 *       "required_permission": "dashboard.view"
 *     }
 *   ]
 * }
 */
router.post(
  '/sync',
  requirePermission('settings.manage'),
  auditLog('MENU_SYNC', 'menu_items'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { menus } = req.body;

      if (!Array.isArray(menus) || menus.length === 0) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Harus menyediakan array menus yang tidak kosong'
        });
      }

      // Validate each menu item
      for (const menu of menus) {
        if (!menu.key || !menu.label || !menu.path || !menu.group_name || !menu.required_permission) {
          return res.status(400).json({
            error: 'Bad Request',
            message: 'Setiap menu harus memiliki: key, label, path, group_name, required_permission'
          });
        }
      }

      // Call RPC function to bulk sync menus
      const { data: result, error } = await supabase.rpc('bulk_sync_menu_items', {
        _menu_items: JSON.stringify(menus)
      });

      if (error) {
        console.error('Error syncing menu items:', error);
        return res.status(500).json({
          error: 'Internal Server Error',
          message: 'Gagal menyinkronisasi menu items'
        });
      }

      res.json({
        success: true,
        message: `${result[0].synced_count} menu berhasil disinkronisasi, ${result[0].failed_count} gagal`,
        data: {
          synced_count: result[0].synced_count,
          failed_count: result[0].failed_count
        }
      });
    } catch (error) {
      console.error('Error in POST /api/menu/sync:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Terjadi kesalahan saat memproses permintaan'
      });
    }
  }
);

/**
 * GET /api/menu/:key
 * 
 * Mendapatkan detail menu item spesifik
 */
router.get('/:key', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { key } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User tidak terautentikasi'
      });
    }

    // Get menu item
    const { data: menu, error: menuError } = await supabase
      .from('menu_items')
      .select('*')
      .eq('key', key)
      .single();

    if (menuError) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Menu tidak ditemukan'
      });
    }

    // Check user permission
    const { data: hasAccess, error: permError } = await supabase.rpc('get_user_effective_permission', {
      _user_id: userId,
      _permission_key: menu.required_permission
    });

    if (permError) {
      console.error('Error checking permission:', permError);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Gagal memverifikasi akses'
      });
    }

    if (!hasAccess) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Anda tidak memiliki akses ke menu ini',
        required_permission: menu.required_permission
      });
    }

    res.json({
      success: true,
      data: menu
    });
  } catch (error) {
    console.error('Error in GET /api/menu/:key:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Terjadi kesalahan saat memproses permintaan'
    });
  }
});

/**
 * POST /api/menu/check-access
 * 
 * Memverifikasi akses ke menu tertentu
 * 
 * Request body:
 * {
 *   "menu_keys": ["dashboard", "bookings", "payments"]
 * }
 */
router.post('/check-access', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { menu_keys } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User tidak terautentikasi'
      });
    }

    if (!Array.isArray(menu_keys) || menu_keys.length === 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Harus menyediakan array menu_keys yang tidak kosong'
      });
    }

    // Get menu items
    const { data: menus, error: menusError } = await supabase
      .from('menu_items')
      .select('*')
      .in('key', menu_keys);

    if (menusError) {
      console.error('Error fetching menus:', menusError);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Gagal mengambil data menu'
      });
    }

    // Check access for each menu
    const accessResults = await Promise.all(
      menus.map(async (menu: any) => {
        const { data: hasAccess, error } = await supabase.rpc('get_user_effective_permission', {
          _user_id: userId,
          _permission_key: menu.required_permission
        });

        return {
          menu_key: menu.key,
          menu_label: menu.label,
          required_permission: menu.required_permission,
          has_access: hasAccess || false
        };
      })
    );

    res.json({
      success: true,
      data: accessResults
    });
  } catch (error) {
    console.error('Error in POST /api/menu/check-access:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Terjadi kesalahan saat memproses permintaan'
    });
  }
});

export default router;
