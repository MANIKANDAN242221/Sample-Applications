import 'dotenv/config';
import { z } from 'zod';

const bool = (defaultValue) =>
  z
    .enum(['true', 'false'])
    .default(defaultValue)
    .transform((value) => value === 'true');

const int = (defaultValue) => z.coerce.number().int().nonnegative().default(defaultValue);

const schema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: int(4000),
    API_PREFIX: z.string().startsWith('/').default('/api/v1'),
    TRUST_PROXY: int(0),
    CORS_ORIGINS: z.string().default('http://localhost:5173'),

    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
    LOG_PRETTY: bool('false'),

    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
    DB_POOL_MAX: z.coerce.number().int().positive().default(10),
    DB_SSL: bool('false'),
    DB_SSL_REJECT_UNAUTHORIZED: bool('true'),
    DB_STATEMENT_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),

    REDIS_URL: z.string().min(1).default('redis://localhost:6379'),
    REDIS_KEY_PREFIX: z.string().default('taskflow:'),

    JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
    JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
    JWT_ACCESS_TTL_SECONDS: z.coerce.number().int().positive().default(900),
    JWT_REFRESH_TTL_SECONDS: z.coerce.number().int().positive().default(604_800),
    JWT_ISSUER: z.string().default('taskflow-api'),
    JWT_AUDIENCE: z.string().default('taskflow-client'),

    REFRESH_COOKIE_NAME: z.string().default('tf_refresh'),
    COOKIE_SECURE: bool('false'),
    COOKIE_SAMESITE: z.enum(['strict', 'lax', 'none']).default('lax'),

    BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),
    RATE_LIMIT_WINDOW_SECONDS: z.coerce.number().int().positive().default(60),
    RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),
    AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),
    CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(300),
  })
  .refine((env) => env.JWT_ACCESS_SECRET !== env.JWT_REFRESH_SECRET, {
    message: 'JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must differ',
    path: ['JWT_REFRESH_SECRET'],
  })
  .refine((env) => env.COOKIE_SAMESITE !== 'none' || env.COOKIE_SECURE, {
    message: 'COOKIE_SAMESITE=none requires COOKIE_SECURE=true',
    path: ['COOKIE_SECURE'],
  });

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
  throw new Error(`Invalid environment configuration:\n${issues}`);
}

const env = parsed.data;

export const config = Object.freeze({
  env: env.NODE_ENV,
  isProduction: env.NODE_ENV === 'production',
  isTest: env.NODE_ENV === 'test',
  server: {
    port: env.PORT,
    apiPrefix: env.API_PREFIX,
    trustProxy: env.TRUST_PROXY,
    corsOrigins: env.CORS_ORIGINS.split(',')
      .map((o) => o.trim())
      .filter(Boolean),
  },
  log: { level: env.LOG_LEVEL, pretty: env.LOG_PRETTY },
  db: {
    url: env.DATABASE_URL,
    poolMax: env.DB_POOL_MAX,
    ssl: env.DB_SSL ? { rejectUnauthorized: env.DB_SSL_REJECT_UNAUTHORIZED } : false,
    statementTimeoutMs: env.DB_STATEMENT_TIMEOUT_MS,
  },
  redis: { url: env.REDIS_URL, keyPrefix: env.REDIS_KEY_PREFIX },
  jwt: {
    accessSecret: env.JWT_ACCESS_SECRET,
    refreshSecret: env.JWT_REFRESH_SECRET,
    accessTtlSeconds: env.JWT_ACCESS_TTL_SECONDS,
    refreshTtlSeconds: env.JWT_REFRESH_TTL_SECONDS,
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
  },
  cookie: {
    refreshName: env.REFRESH_COOKIE_NAME,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAMESITE,
  },
  security: { bcryptRounds: env.BCRYPT_ROUNDS },
  rateLimit: {
    windowSeconds: env.RATE_LIMIT_WINDOW_SECONDS,
    max: env.RATE_LIMIT_MAX,
    authMax: env.AUTH_RATE_LIMIT_MAX,
  },
  cache: { ttlSeconds: env.CACHE_TTL_SECONDS },
});
