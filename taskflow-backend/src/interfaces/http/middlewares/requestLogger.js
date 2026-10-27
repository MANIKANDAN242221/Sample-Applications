import { randomUUID } from 'node:crypto';
import { pinoHttp } from 'pino-http';

const REQUEST_ID_PATTERN = /^[\w-]{8,128}$/;

export function createRequestLogger({ logger }) {
  return pinoHttp({
    logger,
    genReqId(req, res) {
      const incoming = req.headers['x-request-id'];
      const id = typeof incoming === 'string' && REQUEST_ID_PATTERN.test(incoming) ? incoming : randomUUID();
      res.setHeader('X-Request-Id', id);
      return id;
    },
    autoLogging: { ignore: (req) => req.url.startsWith('/health') },
    customLogLevel(_req, res, err) {
      if (err || res.statusCode >= 500) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    },
    customSuccessMessage: (req, res, responseTime) =>
      `${req.method} ${req.originalUrl ?? req.url} ${res.statusCode} ${Math.round(responseTime)}ms`,
    customErrorMessage: (req, res) => `${req.method} ${req.originalUrl ?? req.url} ${res.statusCode}`,
    serializers: {
      req: (req) => ({ id: req.id, method: req.method, url: req.url, remoteAddress: req.remoteAddress }),
      res: (res) => ({ statusCode: res.statusCode }),
    },
    customProps: (req) => (req.user ? { userId: req.user.id } : {}),
  });
}
