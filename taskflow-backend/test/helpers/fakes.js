import pino from 'pino';
import { ROTATE_RESULT } from '../../src/infrastructure/redis/sessionStore.js';

export const silentLogger = pino({ level: 'silent' });

export const testConfig = {
  env: 'test',
  isProduction: false,
  isTest: true,
  server: { port: 0, apiPrefix: '/api/v1', trustProxy: 0, corsOrigins: ['http://localhost:5173'] },
  log: { level: 'silent', pretty: false },
  jwt: {
    accessSecret: 'test-access-secret-that-is-at-least-32-chars',
    refreshSecret: 'test-refresh-secret-that-is-at-least-32-chars',
    accessTtlSeconds: 900,
    refreshTtlSeconds: 3600,
    issuer: 'taskflow-test',
    audience: 'taskflow-test-client',
  },
  cookie: { refreshName: 'tf_refresh', secure: false, sameSite: 'lax' },
  security: { bcryptRounds: 10 },
  rateLimit: { windowSeconds: 60, max: 1000, authMax: 3 },
  cache: { ttlSeconds: 60 },
};

/** In-memory equivalent of the Redis session store (same rotation semantics). */
export function createFakeSessionStore() {
  const sessions = new Map();
  return {
    sessions,
    async create(sid, data) {
      sessions.set(sid, { ...data });
    },
    async exists(sid) {
      return sessions.has(sid);
    },
    async rotate(sid, presented, next) {
      const s = sessions.get(sid);
      if (!s) return ROTATE_RESULT.NOT_FOUND;
      if (s.jti !== presented) {
        sessions.delete(sid);
        return ROTATE_RESULT.REUSE_DETECTED;
      }
      s.prevJti = s.jti;
      s.jti = next;
      return ROTATE_RESULT.ROTATED;
    },
    async revoke(sid) {
      sessions.delete(sid);
    },
    async revokeAllForUser(userId) {
      for (const [sid, s] of sessions) if (s.userId === userId) sessions.delete(sid);
    },
  };
}

export function createMemoryRateLimitStore() {
  const counts = new Map();
  return {
    async hit(key, windowSeconds) {
      const count = (counts.get(key) ?? 0) + 1;
      counts.set(key, count);
      return { count, resetSeconds: windowSeconds };
    },
  };
}
