import { createApp } from './app.js';
import { config } from './config/env.js';
import { createContainer } from './container.js';
import { createLogger } from './infrastructure/logger/logger.js';

const SHUTDOWN_TIMEOUT_MS = 15_000;

const logger = createLogger(config);

async function main() {
  const container = await createContainer({ config, logger });
  const app = createApp(container);

  const server = app.listen(config.server.port, () => {
    logger.info(
      { port: config.server.port, env: config.env, pid: process.pid },
      `API listening on http://localhost:${config.server.port}${config.server.apiPrefix}`,
    );
  });

  // Keep-alive must exceed the load balancer idle timeout to avoid sporadic 502s.
  server.keepAliveTimeout = 65_000;
  server.headersTimeout = 66_000;

  let shuttingDown = false;
  async function shutdown(signal, exitCode = 0) {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, 'Shutting down gracefully');

    const forceExit = setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);
    forceExit.unref();

    server.close(async (err) => {
      if (err) logger.error({ err }, 'Error closing HTTP server');
      await container.close();
      process.exit(exitCode);
    });
    server.closeIdleConnections();
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('unhandledRejection', (reason) => {
    logger.error({ err: reason }, 'Unhandled promise rejection');
    shutdown('unhandledRejection', 1);
  });
  process.on('uncaughtException', (err) => {
    logger.fatal({ err }, 'Uncaught exception');
    shutdown('uncaughtException', 1);
  });
}

main().catch((err) => {
  logger.fatal({ err }, 'Failed to start server');
  process.exit(1);
});
