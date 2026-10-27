import { config } from '../config/env.js';
import { createContainer } from '../container.js';
import { createLogger } from '../infrastructure/logger/logger.js';

const logger = createLogger(config);
let containerPromise;

/**
 * Lazily build the container once per runtime instance and reuse it across warm invocations,
 * so DB / Redis connections are not re-established on every request.
 * Set DB_POOL_MAX to a small value (1-2) when running serverless.
 */
export function getContainer() {
  containerPromise ??= createContainer({ config, logger }).catch((err) => {
    containerPromise = undefined; // allow a retry on the next invocation
    throw err;
  });
  return containerPromise;
}

export { logger };
