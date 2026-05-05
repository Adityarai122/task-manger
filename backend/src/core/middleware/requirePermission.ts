import type { RequestHandler } from 'express';
import { ForbiddenError, UnauthorizedError } from '@/core/errors/AppError';
import type { PermissionKey } from '@/core/constants/permissions';

/** Requires the JWT to carry exactly this permission. */
export const requirePermission =
  (key: PermissionKey): RequestHandler =>
  (req, _res, next) => {
    if (!req.user) throw new UnauthorizedError('Authentication required');
    if (!req.user.permissions.includes(key)) {
      throw new ForbiddenError(`Missing permission: ${key}`);
    }
    next();
  };

/** Requires the JWT to carry at least one of the listed permissions. */
export const requireAnyPermission =
  (keys: PermissionKey[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.user) throw new UnauthorizedError('Authentication required');
    const has = keys.some((k) => req.user.permissions.includes(k));
    if (!has) {
      throw new ForbiddenError(`Missing permission: one of [${keys.join(', ')}]`);
    }
    next();
  };
