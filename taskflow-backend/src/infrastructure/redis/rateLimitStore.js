const HIT_SCRIPT = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then
  redis.call('EXPIRE', KEYS[1], tonumber(ARGV[1]))
end
local ttl = redis.call('TTL', KEYS[1])
return { count, ttl }
`;

/**
 * Fixed-window counter shared across all API instances.
 */
export function createRedisRateLimitStore({ redis }) {
  if (!redis.rateLimitHit) {
    redis.defineCommand('rateLimitHit', { numberOfKeys: 1, lua: HIT_SCRIPT });
  }

  return {
    async hit(key, windowSeconds) {
      const [count, ttl] = await redis.rateLimitHit(`ratelimit:${key}`, windowSeconds);
      return { count, resetSeconds: ttl > 0 ? ttl : windowSeconds };
    },
  };
}
