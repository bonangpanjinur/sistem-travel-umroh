import type { Request, Response, NextFunction } from 'express';
import { validateApiKey } from '../lib/supabase.js';

declare global {
  namespace Express {
    interface Request {
      apiPermissions?: string[];
    }
  }
}

export function requireApiKey(requiredPermission?: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const rawKey = (req.headers['x-api-key'] as string) || '';

    // If no API key header present, allow through (API keys are optional guard)
    if (!rawKey) {
      next();
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
