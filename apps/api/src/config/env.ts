import { z } from 'zod';

const booleanString = z.enum(['true', 'false']).transform((v) => v === 'true');

export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    DATABASE_URL: z.string().min(1),
    API_HOST: z.string().default('127.0.0.1'),
    API_PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
    WEB_ORIGINS: z
      .string()
      .default('http://localhost:5173')
      .transform((v) =>
        v
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      ),
    SESSION_COOKIE_NAME: z.string().min(1).default('lh_session'),
    SESSION_COOKIE_SECURE: booleanString.default(false),
    SESSION_IDLE_TIMEOUT_MINUTES: z.coerce.number().int().min(1).default(60),
    SESSION_ABSOLUTE_TIMEOUT_HOURS: z.coerce.number().int().min(1).default(12),
    /** Set when the API runs behind a reverse proxy so client IPs are read from X-Forwarded-For. */
    TRUST_PROXY: booleanString.default(false),
    /** Disable rate limiting only in automated tests. */
    RATE_LIMIT_ENABLED: booleanString.default(true),
    SWAGGER_ENABLED: booleanString.default(true),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === 'production' && !env.SESSION_COOKIE_SECURE) {
      ctx.addIssue({
        code: 'custom',
        path: ['SESSION_COOKIE_SECURE'],
        message: 'Must be true in production (cookies are only sent over HTTPS)',
      });
    }
  });

export type AppConfig = z.output<typeof envSchema>;

export const APP_CONFIG = Symbol('APP_CONFIG');

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const result = envSchema.safeParse(env);
  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${problems}`);
  }
  return result.data;
}
