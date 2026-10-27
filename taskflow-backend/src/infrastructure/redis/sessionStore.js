/**
 * Refresh-token sessions stored in Redis.
 *
 * Each login creates a session (sid). The refresh token carries the sid and a jti; every refresh
 * rotates the jti atomically (Lua). Presenting an old jti is treated as token theft and revokes the
 * session, except within a short grace window to tolerate concurrent refreshes from several tabs.
 */
const ROTATE_SCRIPT = `
local raw = redis.call('GET', KEYS[1])
if not raw then return 0 end
local s = cjson.decode(raw)
local now = tonumber(ARGV[3])
local grace = tonumber(ARGV[5])
local isCurrent = s.jti == ARGV[1]
local isRecentPrevious = s.prevJti == ARGV[1] and (now - tonumber(s.rotatedAt or 0)) <= grace
if isCurrent or isRecentPrevious then
  s.prevJti = s.jti
  s.jti = ARGV[2]
  s.rotatedAt = now
  redis.call('SET', KEYS[1], cjson.encode(s), 'EX', tonumber(ARGV[4]))
  return 1
end
redis.call('DEL', KEYS[1])
return -1
`;

export const ROTATE_RESULT = Object.freeze({ ROTATED: 1, NOT_FOUND: 0, REUSE_DETECTED: -1 });

export function createSessionStore({ redis, refreshTtlSeconds, reuseGraceMs = 10_000 }) {
  if (!redis.rotateSession) {
    redis.defineCommand('rotateSession', { numberOfKeys: 1, lua: ROTATE_SCRIPT });
  }

  const sessionKey = (sid) => `session:${sid}`;
  const userSessionsKey = (userId) => `user-sessions:${userId}`;

  return {
    async create(sessionId, { userId, jti, userAgent, ip }) {
      const data = { userId, jti, userAgent, ip, createdAt: Date.now() };
      await redis
        .multi()
        .set(sessionKey(sessionId), JSON.stringify(data), 'EX', refreshTtlSeconds)
        .sadd(userSessionsKey(userId), sessionId)
        .expire(userSessionsKey(userId), refreshTtlSeconds)
        .exec();
    },

    async exists(sessionId) {
      return (await redis.exists(sessionKey(sessionId))) === 1;
    },

    /** @returns {Promise<1|0|-1>} see ROTATE_RESULT */
    async rotate(sessionId, presentedJti, nextJti) {
      return redis.rotateSession(
        sessionKey(sessionId),
        presentedJti,
        nextJti,
        Date.now(),
        refreshTtlSeconds,
        reuseGraceMs,
      );
    },

    async revoke(sessionId, userId) {
      await redis.multi().del(sessionKey(sessionId)).srem(userSessionsKey(userId), sessionId).exec();
    },

    async revokeAllForUser(userId) {
      const sessionIds = await redis.smembers(userSessionsKey(userId));
      const tx = redis.multi();
      for (const sid of sessionIds) tx.del(sessionKey(sid));
      tx.del(userSessionsKey(userId));
      await tx.exec();
    },
  };
}
