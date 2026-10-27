import { randomUUID } from 'node:crypto';
import { ConflictError, ForbiddenError, UnauthorizedError } from '../../domain/errors.js';
import { permissionsForRole, ROLES } from '../../domain/roles.js';
import { PG_ERROR } from '../../infrastructure/database/sqlHelpers.js';
import { ROTATE_RESULT } from '../../infrastructure/redis/sessionStore.js';

export function toAuthUser(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    permissions: permissionsForRole(user.role),
  };
}

export function createAuthService({
  userRepository,
  userService,
  passwordHasher,
  tokenService,
  sessionStore,
  logger,
}) {
  async function startSession(user, meta) {
    const sessionId = randomUUID();
    const refresh = tokenService.signRefreshToken(user.id, sessionId);
    await sessionStore.create(sessionId, {
      userId: user.id,
      jti: refresh.jti,
      userAgent: meta.userAgent?.slice(0, 256),
      ip: meta.ip,
    });
    const access = tokenService.signAccessToken(user, sessionId);
    return {
      user: toAuthUser(user),
      accessToken: access.token,
      expiresIn: access.expiresIn,
      refreshToken: refresh.token,
      refreshExpiresIn: refresh.expiresIn,
    };
  }

  function decodeRefreshToken(token, options) {
    if (!token) throw new UnauthorizedError('Refresh token missing');
    try {
      return tokenService.verifyRefreshToken(token, options);
    } catch {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }
  }

  return {
    async register({ email, name, password }, meta) {
      const passwordHash = await passwordHasher.hash(password);
      let user;
      try {
        user = await userRepository.create({ email, name, passwordHash, role: ROLES.MEMBER });
      } catch (err) {
        if (err.code === PG_ERROR.UNIQUE_VIOLATION) {
          throw new ConflictError('An account with this email already exists');
        }
        throw err;
      }
      logger.info({ userId: user.id }, 'User registered');
      return startSession(user, meta);
    },

    async login({ email, password }, meta) {
      const record = await userRepository.findByEmailWithPassword(email);
      const valid = await passwordHasher.compare(password, record?.passwordHash);
      if (!record || !valid) {
        logger.warn({ email, ip: meta.ip }, 'Failed login attempt');
        throw new UnauthorizedError('Invalid email or password');
      }
      if (!record.isActive) throw new ForbiddenError('This account has been disabled');

      const { passwordHash: _omit, ...user } = record;
      await userRepository.touchLastLogin(user.id);
      logger.info({ userId: user.id }, 'User logged in');
      return startSession(user, meta);
    },

    async refresh(refreshToken) {
      const payload = decodeRefreshToken(refreshToken);
      const next = tokenService.signRefreshToken(payload.sub, payload.sid);
      const result = await sessionStore.rotate(payload.sid, payload.jti, next.jti);

      if (result === ROTATE_RESULT.NOT_FOUND) throw new UnauthorizedError('Session expired');
      if (result === ROTATE_RESULT.REUSE_DETECTED) {
        logger.warn({ userId: payload.sub, sessionId: payload.sid }, 'Refresh token reuse detected');
        throw new UnauthorizedError('Session revoked');
      }

      let user;
      try {
        user = await userService.getActiveUser(payload.sub);
      } catch (err) {
        await sessionStore.revoke(payload.sid, payload.sub);
        throw err;
      }

      const access = tokenService.signAccessToken(user, payload.sid);
      return {
        user: toAuthUser(user),
        accessToken: access.token,
        expiresIn: access.expiresIn,
        refreshToken: next.token,
        refreshExpiresIn: next.expiresIn,
      };
    },

    /** Revoke the session behind a refresh token. Never throws for bad tokens (idempotent logout). */
    async logout(refreshToken) {
      if (!refreshToken) return;
      try {
        const payload = decodeRefreshToken(refreshToken, { ignoreExpiration: true });
        await sessionStore.revoke(payload.sid, payload.sub);
      } catch (err) {
        logger.debug({ err: { message: err.message } }, 'Logout with invalid refresh token');
      }
    },

    async logoutAll(userId) {
      await sessionStore.revokeAllForUser(userId);
      logger.info({ userId }, 'All sessions revoked');
    },

    async changePassword(userId, { currentPassword, newPassword }) {
      const hash = await userRepository.findPasswordHash(userId);
      if (!(await passwordHasher.compare(currentPassword, hash))) {
        throw new UnauthorizedError('Current password is incorrect');
      }
      await userRepository.updatePassword(userId, await passwordHasher.hash(newPassword));
      await sessionStore.revokeAllForUser(userId);
      logger.info({ userId }, 'Password changed; sessions revoked');
    },
  };
}
