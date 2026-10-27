/**
 * Read-through JSON cache on Redis. Cache failures are logged and swallowed so that a Redis
 * outage degrades performance instead of availability.
 */
export function createCacheService({ redis, logger, defaultTtlSeconds }) {
  const key = (k) => `cache:${k}`;

  async function get(k) {
    try {
      const raw = await redis.get(key(k));
      return raw === null ? null : JSON.parse(raw);
    } catch (err) {
      logger.warn({ err: { message: err.message }, key: k }, 'Cache get failed');
      return null;
    }
  }

  async function set(k, value, ttlSeconds = defaultTtlSeconds) {
    try {
      await redis.set(key(k), JSON.stringify(value), 'EX', ttlSeconds);
    } catch (err) {
      logger.warn({ err: { message: err.message }, key: k }, 'Cache set failed');
    }
  }

  async function del(...keys) {
    if (!keys.length) return;
    try {
      await redis.del(...keys.map(key));
    } catch (err) {
      logger.warn({ err: { message: err.message }, keys }, 'Cache delete failed');
    }
  }

  /** Return the cached value or compute, store and return it. Null results are not cached. */
  async function wrap(k, loader, ttlSeconds = defaultTtlSeconds) {
    const cached = await get(k);
    if (cached !== null) return cached;
    const value = await loader();
    if (value !== null && value !== undefined) await set(k, value, ttlSeconds);
    return value;
  }

  return { get, set, del, wrap };
}

export const cacheKeys = Object.freeze({
  user: (id) => `user:${id}`,
  project: (id) => `project:${id}`,
  userTaskStats: (id) => `user-task-stats:${id}`,
});
