/**
 * User Permissions API Routes
 * 
 * Endpoints untuk mengelola hak akses granular per pengguna.
 * Hanya admin yang dapat mengakses endpoints ini.
 */

import { Router, Request, Response } from 'express';
import { requirePermission } from '@/server/middleware/permissionMiddleware';
import * as userPermissionService from '@/server/services/userPermissionService';

const router = Router();

/**
 * GET /api/user-permissions/all
 * Get all available permissions grouped by category
 * Accessible to: All authenticated users
 */
router.get('/all', async (req: Request, res: Response) => {
  try {
    const permissions = await userPermissionService.getAllPermissions();
    res.json({
      success: true,
      data: permissions
    });
  } catch (error) {
    console.error('Error fetching permissions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch permissions'
    });
  }
});

/**
 * GET /api/user-permissions/:userId
 * Get all permissions for a specific user (including role-based and user-level)
 * Accessible to: Admin or the user themselves
 */
router.get('/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const requesterId = req.user?.id;

    // Check if requester is admin or requesting their own permissions
    if (requesterId !== userId && !req.user?.roles?.includes('super_admin')) {
      return res.status(403).json({
        success: false,
        error: 'Anda tidak memiliki akses untuk melihat permission pengguna lain'
      });
    }

    const permissions = await userPermissionService.getUserAllPermissions(userId);
    res.json({
      success: true,
      data: permissions
    });
  } catch (error) {
    console.error('Error fetching user permissions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user permissions'
    });
  }
});

/**
 * GET /api/user-permissions/:userId/user-level
 * Get user-level permissions only (excluding role-based)
 * Accessible to: Admin only
 */
router.get(
  '/:userId/user-level',
  requirePermission('users.edit'),
  async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const permissions = await userPermissionService.getUserLevelPermissions(userId);

      res.json({
        success: true,
        data: permissions
      });
    } catch (error) {
      console.error('Error fetching user-level permissions:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch user-level permissions'
      });
    }
  }
);

/**
 * GET /api/user-permissions/:userId/audit
 * Get permission audit logs for a specific user
 * Accessible to: Admin only
 */
router.get(
  '/:userId/audit',
  requirePermission('users.edit'),
  async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const limit = parseInt(req.query.limit as string) || 100;

      const auditLogs = await userPermissionService.getUserPermissionAuditLogs(
        userId,
        limit
      );

      res.json({
        success: true,
        data: auditLogs
      });
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch audit logs'
      });
    }
  }
);

/**
 * POST /api/user-permissions/:userId/grant
 * Grant a specific permission to a user
 * Accessible to: Admin only
 * 
 * Body: { permission_key: string }
 */
router.post(
  '/:userId/grant',
  requirePermission('users.edit'),
  async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const { permission_key } = req.body;

      if (!permission_key) {
        return res.status(400).json({
          success: false,
          error: 'permission_key diperlukan'
        });
      }

      const result = await userPermissionService.grantUserPermission(
        userId,
        permission_key
      );

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json({
        success: true,
        message: `Izin ${permission_key} berhasil diberikan kepada pengguna`
      });
    } catch (error) {
      console.error('Error granting permission:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to grant permission'
      });
    }
  }
);

/**
 * POST /api/user-permissions/:userId/revoke
 * Revoke a specific permission from a user
 * Accessible to: Admin only
 * 
 * Body: { permission_key: string }
 */
router.post(
  '/:userId/revoke',
  requirePermission('users.edit'),
  async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const { permission_key } = req.body;

      if (!permission_key) {
        return res.status(400).json({
          success: false,
          error: 'permission_key diperlukan'
        });
      }

      const result = await userPermissionService.revokeUserPermission(
        userId,
        permission_key
      );

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json({
        success: true,
        message: `Izin ${permission_key} berhasil dicabut dari pengguna`
      });
    } catch (error) {
      console.error('Error revoking permission:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to revoke permission'
      });
    }
  }
);

/**
 * POST /api/user-permissions/:userId/bulk-grant
 * Bulk grant permissions to a user
 * Accessible to: Admin only
 * 
 * Body: { permission_keys: string[] }
 */
router.post(
  '/:userId/bulk-grant',
  requirePermission('users.edit'),
  async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const { permission_keys } = req.body;

      if (!Array.isArray(permission_keys) || permission_keys.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'permission_keys harus berupa array yang tidak kosong'
        });
      }

      const result = await userPermissionService.bulkGrantPermissions(
        userId,
        permission_keys
      );

      res.json({
        success: result.success,
        message: `${result.granted} izin berhasil diberikan`,
        error: result.error,
        granted: result.granted
      });
    } catch (error) {
      console.error('Error bulk granting permissions:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to bulk grant permissions'
      });
    }
  }
);

/**
 * POST /api/user-permissions/:userId/bulk-revoke
 * Bulk revoke permissions from a user
 * Accessible to: Admin only
 * 
 * Body: { permission_keys: string[] }
 */
router.post(
  '/:userId/bulk-revoke',
  requirePermission('users.edit'),
  async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const { permission_keys } = req.body;

      if (!Array.isArray(permission_keys) || permission_keys.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'permission_keys harus berupa array yang tidak kosong'
        });
      }

      const result = await userPermissionService.bulkRevokePermissions(
        userId,
        permission_keys
      );

      res.json({
        success: result.success,
        message: `${result.revoked} izin berhasil dicabut`,
        error: result.error,
        revoked: result.revoked
      });
    } catch (error) {
      console.error('Error bulk revoking permissions:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to bulk revoke permissions'
      });
    }
  }
);

/**
 * POST /api/user-permissions/:userId/sync-from-role
 * Sync user permissions from role to user level
 * Useful when transitioning from role-based to user-based permissions
 * Accessible to: Admin only
 */
router.post(
  '/:userId/sync-from-role',
  requirePermission('users.edit'),
  async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const result = await userPermissionService.syncUserPermissionsFromRole(userId);

      res.json({
        success: result.success,
        message: `${result.synced} izin berhasil disinkronkan dari role`,
        error: result.error,
        synced: result.synced
      });
    } catch (error) {
      console.error('Error syncing permissions:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to sync permissions'
      });
    }
  }
);

/**
 * GET /api/user-permissions/:userId/compare
 * Compare user permissions with role permissions
 * Useful for identifying overrides
 * Accessible to: Admin only
 */
router.get(
  '/:userId/compare',
  requirePermission('users.edit'),
  async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const comparison = await userPermissionService.compareUserAndRolePermissions(userId);

      res.json({
        success: true,
        data: comparison
      });
    } catch (error) {
      console.error('Error comparing permissions:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to compare permissions'
      });
    }
  }
);

export default router;
