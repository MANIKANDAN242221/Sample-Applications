import { createAuthService } from './application/services/authService.js';
import { createProjectService } from './application/services/projectService.js';
import { createTaskService } from './application/services/taskService.js';
import { createUserService } from './application/services/userService.js';
import { createDatabase } from './infrastructure/database/postgres.js';
import { createCacheService } from './infrastructure/redis/cacheService.js';
import { createRedisRateLimitStore } from './infrastructure/redis/rateLimitStore.js';
import { createRedis, waitForRedis } from './infrastructure/redis/redisClient.js';
import { createSessionStore } from './infrastructure/redis/sessionStore.js';
import { createProjectRepository } from './infrastructure/repositories/projectRepository.js';
import { createTaskRepository } from './infrastructure/repositories/taskRepository.js';
import { createUserRepository } from './infrastructure/repositories/userRepository.js';
import { createPasswordHasher } from './infrastructure/security/passwordHasher.js';
import { createTokenService } from './infrastructure/security/tokenService.js';

/**
 * Composition root: the only place where concrete implementations are wired together.
 * Every other module receives its dependencies as arguments, which keeps layers decoupled
 * and makes them trivially testable with fakes.
 */
export async function createContainer({ config, logger }) {
  const db = createDatabase({ config, logger });
  const redis = createRedis({ config, logger });

  await Promise.all([db.ping(), waitForRedis(redis)]);
  logger.info('Connected to PostgreSQL and Redis');

  const cache = createCacheService({ redis, logger, defaultTtlSeconds: config.cache.ttlSeconds });
  const sessionStore = createSessionStore({ redis, refreshTtlSeconds: config.jwt.refreshTtlSeconds });
  const rateLimitStore = createRedisRateLimitStore({ redis });
  const tokenService = createTokenService({ config });
  const passwordHasher = createPasswordHasher({ rounds: config.security.bcryptRounds });

  const userRepository = createUserRepository({ db });
  const projectRepository = createProjectRepository({ db });
  const taskRepository = createTaskRepository({ db });

  const userService = createUserService({ userRepository, sessionStore, cache, logger });
  const authService = createAuthService({
    userRepository,
    userService,
    passwordHasher,
    tokenService,
    sessionStore,
    logger,
  });
  const projectService = createProjectService({ db, projectRepository, userRepository, cache, logger });
  const taskService = createTaskService({ taskRepository, projectRepository, projectService, cache });

  return {
    config,
    logger,
    db,
    redis,
    tokenService,
    sessionStore,
    rateLimitStore,
    repositories: { userRepository, projectRepository, taskRepository },
    services: { authService, userService, projectService, taskService },

    async close() {
      await Promise.allSettled([db.close(), redis.quit()]);
      logger.info('Connections closed');
    },
  };
}
