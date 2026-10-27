import { TooManyRequestsError } from '../../../domain/errors.js';

/**
 * Distributed fixed-window rate limiter. Fails open if the store is unavailable so a Redis
 * outage does not take the API down.
 */
export function createRateLimiter({ store, logger, name, windowSeconds, max, keyBy = (req) => req.ip }) {
  return async function rateLimit(req, res, next) {
    let result;
    try {
      result = await store.hit(`${name}:${keyBy(req)}`, windowSeconds);
    } catch (err) {
      logger.warn({ err: { message: err.message }, limiter: name }, 'Rate limiter unavailable; allowing request');
      return next();
    }

    const remaining = Math.max(0, max - result.count);
    res.set({
      'RateLimit-Limit': String(max),
      'RateLimit-Remaining': String(remaining),
      'RateLimit-Reset': String(result.resetSeconds),
    });

    if (result.count > max) {
      res.set('Retry-After', String(result.resetSeconds));
      throw new TooManyRequestsError(undefined, result.resetSeconds);
    }
    next();
  };
}
