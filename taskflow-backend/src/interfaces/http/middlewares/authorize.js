import { ForbiddenError, UnauthorizedError } from '../../../domain/errors.js';
import { hasPermission } from '../../../domain/roles.js';

/**
 * Route-level RBAC guard. The user must hold *every* listed permission.
 * Usage: router.get('/users', authenticate, authorize(PERMISSIONS.USERS_READ), handler)
 */
export function authorize(...permissions) {
  return function authorizeMiddleware(req, _res, next) {
    if (!req.user) throw new UnauthorizedError();
    const missing = permissions.filter((p) => !hasPermission(req.user.role, p));
    if (missing.length) throw new ForbiddenError();
    next();
  };
}
