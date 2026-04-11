// @ts-nocheck
/**
 * Permission Middleware untuk Backend API Validation
 * 
 * Middleware ini memvalidasi permission user sebelum mengeksekusi operasi sensitif
 * pada API endpoints. Digunakan untuk melindungi operasi seperti:
 * - payments.verify
 * - bookings.delete
 * - customers.edit_sensitive
 * - dll
 */

import { Request, Response, NextFunction } from 'express';
import { supabase } from '@/integrations/supabase/client';

// Extend Express Request type untuk menambahkan user info
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        roles: string[];
        branch_id?: string;
      };
      permission?: {
        required: string;
        granted: boolean;
      };
    }
  }
}

/**
 * Interface untuk permission check result
 */
interface PermissionCheckResult {
  granted: boolean;
  reason?: string;
  requiredPermission: string;
  userPermissions: string[];
}

/**
 * Check if user has specific permission
 */
export async function checkPermission(
  userId: string,
  permissionKey: string
): Promise<PermissionCheckResult> {
  try {
    // Call Supabase RPC function to check permission
    const { data, error } = await supabase.rpc('check_permission' as any, {
      _user_id: userId,
      _permission_key: permissionKey
    });

    if (error) {
      console.error('Error checking permission:', error);
      return {
        granted: false,
        reason: 'Gagal memverifikasi permission',
        requiredPermission: permissionKey,
        userPermissions: []
      };
    }

    // Get user permissions for logging
    const { data: userPerms } = await supabase
      .from('role_permissions')
      .select('permission_key')
      .eq('is_enabled', true)
      .in('role', (await getUserRoles(userId)));

    return {
      granted: data === true,
      reason: data === false ? `Anda tidak memiliki izin untuk ${permissionKey}` : undefined,
      requiredPermission: permissionKey,
      userPermissions: userPerms?.map(p => p.permission_key) || []
    };
  } catch (error) {
    console.error('Error in checkPermission:', error);
    return {
      granted: false,
      reason: 'Error checking permission',
      requiredPermission: permissionKey,
      userPermissions: []
    };
  }
}

/**
 * Get user roles from database
 */
async function getUserRoles(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId);

  if (error) {
    console.error('Error getting user roles:', error);
    return [];
  }

  return data?.map(r => r.role) || [];
}

/**
 * Middleware untuk require specific permission
 * 
 * Usage:
 * app.post('/api/payments/:id/verify', 
 *   requirePermission('payments.verify'),
 *   handleVerifyPayment
 * );
 */
export function requirePermission(permissionKey: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get user ID from request (dari JWT token atau session)
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'User tidak terautentikasi'
        });
      }

      // Check permission
      const result = await checkPermission(userId, permissionKey);

      // Store permission check result in request
      req.permission = {
        required: permissionKey,
        granted: result.granted
      };

      if (!result.granted) {
        return res.status(403).json({
          error: 'Forbidden',
          code: 'PERMISSION_DENIED',
          message: result.reason,
          requiredPermission: permissionKey,
          userPermissions: result.userPermissions
        });
      }

      next();
    } catch (error) {
      console.error('Error in requirePermission middleware:', error);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Gagal memverifikasi permission'
      });
    }
  };
}

/**
 * Middleware untuk require multiple permissions (any)
 * 
 * Usage:
 * app.post('/api/bookings/:id/update',
 *   requireAnyPermission(['bookings.edit', 'bookings.approve']),
 *   handleUpdateBooking
 * );
 */
export function requireAnyPermission(permissionKeys: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'User tidak terautentikasi'
        });
      }

      // Check if user has any of the permissions
      const results = await Promise.all(
        permissionKeys.map(key => checkPermission(userId, key))
      );

      const hasAnyPermission = results.some(r => r.granted);

      if (!hasAnyPermission) {
        return res.status(403).json({
          error: 'Forbidden',
          code: 'PERMISSION_DENIED',
          message: `Anda tidak memiliki salah satu dari izin berikut: ${permissionKeys.join(', ')}`,
          requiredPermissions: permissionKeys,
          userPermissions: results[0]?.userPermissions || []
        });
      }

      next();
    } catch (error) {
      console.error('Error in requireAnyPermission middleware:', error);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Gagal memverifikasi permission'
      });
    }
  };
}

/**
 * Middleware untuk require multiple permissions (all)
 * 
 * Usage:
 * app.post('/api/payments/:id/verify-and-refund',
 *   requireAllPermissions(['payments.verify', 'payments.refund']),
 *   handleVerifyAndRefund
 * );
 */
export function requireAllPermissions(permissionKeys: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'User tidak terautentikasi'
        });
      }

      // Check if user has all permissions
      const results = await Promise.all(
        permissionKeys.map(key => checkPermission(userId, key))
      );

      const missingPermissions = results
        .map((r, i) => ({ ...r, key: permissionKeys[i] }))
        .filter(r => !r.granted)
        .map(r => r.key);

      if (missingPermissions.length > 0) {
        return res.status(403).json({
          error: 'Forbidden',
          code: 'PERMISSION_DENIED',
          message: `Anda tidak memiliki izin berikut: ${missingPermissions.join(', ')}`,
          requiredPermissions: permissionKeys,
          missingPermissions,
          userPermissions: results[0]?.userPermissions || []
        });
      }

      next();
    } catch (error) {
      console.error('Error in requireAllPermissions middleware:', error);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Gagal memverifikasi permission'
      });
    }
  };
}

/**
 * Middleware untuk conditional permission check
 * 
 * Usage:
 * app.get('/api/bookings',
 *   conditionalPermission((req) => {
 *     // Check if user is agent, restrict to own bookings
 *     if (req.user?.roles.includes('agent')) {
 *       req.query.agent_id = req.user.id;
 *       return 'bookings.view_own';
 *     }
 *     // Check if user is branch_manager, restrict to branch bookings
 *     if (req.user?.roles.includes('branch_manager')) {
 *       req.query.branch_id = req.user.branch_id;
 *       return 'bookings.view_branch';
 *     }
 *     // Otherwise check for view_all
 *     return 'bookings.view_all';
 *   }),
 *   handleGetBookings
 * );
 */
export function conditionalPermission(
  permissionResolver: (req: Request) => string
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'User tidak terautentikasi'
        });
      }

      // Resolve permission based on request
      const permissionKey = permissionResolver(req);

      // Check permission
      const result = await checkPermission(userId, permissionKey);

      if (!result.granted) {
        return res.status(403).json({
          error: 'Forbidden',
          code: 'PERMISSION_DENIED',
          message: result.reason,
          requiredPermission: permissionKey,
          userPermissions: result.userPermissions
        });
      }

      next();
    } catch (error) {
      console.error('Error in conditionalPermission middleware:', error);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Gagal memverifikasi permission'
      });
    }
  };
}

/**
 * Middleware untuk audit logging sensitive actions
 * 
 * Usage:
 * app.post('/api/payments/:id/verify',
 *   requirePermission('payments.verify'),
 *   auditLog('PAYMENT_VERIFIED', 'payments'),
 *   handleVerifyPayment
 * );
 */
export function auditLog(action: string, resourceType: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      const resourceId = req.params.id;

      // Store audit info in request for later use
      req.audit = {
        action,
        resourceType,
        resourceId,
        userId,
        timestamp: new Date(),
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      };

      // Intercept response to log after successful operation
      const originalJson = res.json.bind(res);
      res.json = function(data: any) {
        // Log successful action
        if (res.statusCode < 400 && userId) {
          logAuditAction(userId, action, resourceType, resourceId, data);
        }
        return originalJson(data);
      };

      next();
    } catch (error) {
      console.error('Error in auditLog middleware:', error);
      next();
    }
  };
}

/**
 * Log audit action to database
 */
async function logAuditAction(
  userId: string,
  action: string,
  resourceType: string,
  resourceId: string,
  data: any
) {
  try {
    const { error } = await supabase.rpc('log_audit_action', {
      _action: action,
      _resource_type: resourceType,
      _resource_id: resourceId,
      _new_values: JSON.stringify(data)
    });

    if (error) {
      console.error('Error logging audit action:', error);
    }
  } catch (error) {
    console.error('Error in logAuditAction:', error);
  }
}

/**
 * Middleware untuk rate limiting sensitive operations
 * 
 * Usage:
 * app.post('/api/payments/:id/verify',
 *   rateLimitSensitiveAction('payments.verify', 10, 60), // 10 requests per 60 seconds
 *   handleVerifyPayment
 * );
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function rateLimitSensitiveAction(
  action: string,
  maxRequests: number,
  windowSeconds: number
) {
  return (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const key = `${userId}:${action}`;
    const now = Date.now();
    const record = rateLimitStore.get(key);

    if (!record || now > record.resetTime) {
      rateLimitStore.set(key, {
        count: 1,
        resetTime: now + windowSeconds * 1000
      });
      return next();
    }

    if (record.count >= maxRequests) {
      return res.status(429).json({
        error: 'Too Many Requests',
        message: `Terlalu banyak permintaan untuk ${action}. Coba lagi dalam ${Math.ceil((record.resetTime - now) / 1000)} detik.`,
        retryAfter: Math.ceil((record.resetTime - now) / 1000)
      });
    }

    record.count++;
    next();
  };
}

// Extend Express Request type untuk audit info
declare global {
  namespace Express {
    interface Request {
      audit?: {
        action: string;
        resourceType: string;
        resourceId: string;
        userId?: string;
        timestamp: Date;
        ipAddress?: string;
        userAgent?: string;
      };
    }
  }
}
