import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { createAuthController } from './interfaces/http/controllers/authController.js';
import { createHealthController } from './interfaces/http/controllers/healthController.js';
import { createProjectController } from './interfaces/http/controllers/projectController.js';
import { createTaskController } from './interfaces/http/controllers/taskController.js';
import { createUserController } from './interfaces/http/controllers/userController.js';
import { createAuthenticate } from './interfaces/http/middlewares/authenticate.js';
import { createErrorHandler, notFoundHandler } from './interfaces/http/middlewares/errorHandler.js';
import { createRateLimiter } from './interfaces/http/middlewares/rateLimit.js';
import { createRequestLogger } from './interfaces/http/middlewares/requestLogger.js';
import { createApiRouter, createHealthRouter } from './interfaces/http/routes/index.js';

export function createApp(container) {
  const { config, logger, services, tokenService, sessionStore, rateLimitStore, db, redis } = container;
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', config.server.trustProxy);
  app.set('etag', false);

  // --- Global middleware ---------------------------------------------------------------
  app.use(createRequestLogger({ logger }));
  app.use(helmet());
  app.use(
    cors({
      origin(origin, callback) {
        // Allow non-browser clients (no Origin header) and whitelisted browser origins.
        callback(null, !origin || config.server.corsOrigins.includes(origin));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Request-Id'],
      exposedHeaders: ['X-Request-Id', 'RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset', 'Retry-After'],
      maxAge: 600,
    }),
  );
  app.use(compression());
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  // --- Dependencies for the HTTP layer -------------------------------------------------
  const authenticate = createAuthenticate({
    tokenService,
    sessionStore,
    userService: services.userService,
  });
  const apiRateLimiter = createRateLimiter({
    store: rateLimitStore,
    logger,
    name: 'api',
    windowSeconds: config.rateLimit.windowSeconds,
    max: config.rateLimit.max,
  });
  const authRateLimiter = createRateLimiter({
    store: rateLimitStore,
    logger,
    name: 'auth',
    windowSeconds: config.rateLimit.windowSeconds,
    max: config.rateLimit.authMax,
  });

  const deps = {
    authenticate,
    authRateLimiter,
    authController: createAuthController({ ...services, config }),
    userController: createUserController(services),
    projectController: createProjectController(services),
    taskController: createTaskController(services),
    healthController: createHealthController({ db, redis }),
  };

  // --- Routes --------------------------------------------------------------------------
  app.use('/health', createHealthRouter(deps));
  app.use(config.server.apiPrefix, apiRateLimiter, createApiRouter(deps));

  app.use(notFoundHandler);
  app.use(createErrorHandler({ logger, exposeStack: !config.isProduction }));

  return app;
}
