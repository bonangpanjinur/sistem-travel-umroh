import type { Request, Response, NextFunction } from 'express';
import { validateApiKey, isSupabaseConfigured } from '../lib/supabase.js';

declare global {
  namespace Express {
    interface Request {
      apiPermissions?: string[];
    }
  }
}

export function requireApiKey(requiredPermission?: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!isSupabaseConfigured()) {
      next();
      return;
    }

    const rawKey = (req.headers['x-api-key'] as string) || '';

    if (!rawKey) {
      res.status(401).json({ error: 'Missing X-API-Key header' });
      return;
    }

    const { valid, permissions } = await validateApiKey(rawKey);

    if (!valid) {
      res.status(401).json({ error: 'Invalid or revoked API key' });
      return;
    }

    if (requiredPermission && !permissions.includes(requiredPermission)) {
      res.status(403).json({ error: `Permission '${requiredPermission}' required` });
      return;
    }

    req.apiPermissions = permissions;
    next();
  };
}
