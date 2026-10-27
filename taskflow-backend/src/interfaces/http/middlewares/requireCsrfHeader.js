import { ForbiddenError } from '../../../domain/errors.js';

/**
 * CSRF defence for cookie-authenticated endpoints (refresh / logout).
 * Browsers cannot send a custom header cross-origin without a CORS preflight, which our CORS
 * policy rejects for unknown origins, so requiring it blocks cross-site form/fetch attacks.
 */
export function requireCsrfHeader(req, _res, next) {
  if (req.get('x-requested-with') !== 'XMLHttpRequest') {
    throw new ForbiddenError('Missing X-Requested-With header');
  }
  next();
}
