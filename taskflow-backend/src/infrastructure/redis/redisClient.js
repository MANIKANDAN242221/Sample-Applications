import Redis from 'ioredis';

export function createRedis({ config, logger }) {
  const redis = new Redis(config.redis.url, {
    keyPrefix: config.redis.keyPrefix,
    maxRetriesPerRequest: 2,
    enableReadyCheck: true,
    connectTimeout: 5_000,
    retryStrategy: (attempt) => Math.min(attempt * 200, 5_000),
  });

  redis.on('ready', () => logger.info('Redis connection ready'));
  redis.on('reconnecting', (delay) => logger.warn({ delay }, 'Redis reconnecting'));
  redis.on('error', (err) => logger.error({ err: { message: err.message } }, 'Redis error'));

  return redis;
}

/** Resolve once the client is ready, reject if it fails to connect within the timeout. */
export function waitForRedis(redis, timeoutMs = 10_000) {
  if (redis.status === 'ready') return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('Timed out connecting to Redis'));
    }, timeoutMs);
    const onReady = () => {
      cleanup();
      resolve();
    };
    const cleanup = () => {
      clearTimeout(timer);
      redis.off('ready', onReady);
    };
    redis.on('ready', onReady);
  });
}
