import { UnauthorizedError } from '../../../domain/errors.js';

/**
 * Verifies the Bearer access token, confirms its session has not been revoked and loads the
 * current user (from cache) so role changes and deactivations take effect immediately.
 */
export function createAuthenticate({ tokenService, sessionStore, userService }) {
  return async function authenticate(req, _res, next) {
    const header = req.get('authorization') ?? '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) throw new UnauthorizedError('Missing access token');

    let payload;
    try {
      payload = tokenService.verifyAccessToken(token);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        throw new UnauthorizedError('Access token expired', 'TOKEN_EXPIRED');
      }
      throw new UnauthorizedError('Invalid access token', 'TOKEN_INVALID');
    }

    const [sessionActive, user] = await Promise.all([
      sessionStore.exists(payload.sid),
      userService.getActiveUser(payload.sub),
    ]);
    if (!sessionActive) throw new UnauthorizedError('Session has been revoked', 'SESSION_REVOKED');

    req.user = { id: user.id, email: user.email, name: user.name, role: user.role, sessionId: payload.sid };
    next();
  };
}
