import pino from 'pino';

const REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers["set-cookie"]',
  '*.password',
  '*.newPassword',
  '*.currentPassword',
  '*.passwordHash',
  '*.accessToken',
  '*.refreshToken',
];

export function createLogger(config) {
  const options = {
    level: config.log.level,
    base: { service: 'taskflow-api', env: config.env },
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: { paths: REDACT_PATHS, censor: '[REDACTED]' },
    serializers: { err: pino.stdSerializers.err },
  };

  if (config.log.pretty) {
    options.transport = {
      target: 'pino-pretty',
      options: { colorize: true, translateTime: 'SYS:standard', ignore: 'pid,hostname,service,env' },
    };
  } else {
    options.formatters = { level: (label) => ({ level: label }) };
  }

  return pino(options);
}
