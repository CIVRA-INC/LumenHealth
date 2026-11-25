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
    /**
     * Public origin of the web app; invitation links are built from it (never from request headers).
     * Optional so an existing deployment still boots: without it, invitations are created but reported undelivered.
     */
    APP_BASE_URL: z.url().optional(),
    INVITATION_TTL_HOURS: z.coerce.number().int().min(1).max(720).default(168),
    /**
     * How invitation email is delivered. `smtp` for production; `log` prints the link to the server log and
     * is refused in production; `memory` keeps messages in-process for automated tests; `disabled` sends
     * nothing and every invitation is reported as undelivered.
     */
    EMAIL_DRIVER: z.enum(['smtp', 'log', 'memory', 'disabled']).default('disabled'),
    EMAIL_FROM: z.string().min(3).default('LumenHealth <no-reply@localhost>'),
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
    SMTP_SECURE: booleanString.default(false),
    SMTP_USER: z.string().optional(),
    SMTP_PASSWORD: z.string().optional(),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === 'production' && !env.SESSION_COOKIE_SECURE) {
      ctx.addIssue({
        code: 'custom',
        path: ['SESSION_COOKIE_SECURE'],
        message: 'Must be true in production (cookies are only sent over HTTPS)',
      });
    }
    if (env.EMAIL_DRIVER === 'smtp' && !env.SMTP_HOST) {
      ctx.addIssue({
        code: 'custom',
        path: ['SMTP_HOST'],
        message: 'Required when EMAIL_DRIVER=smtp',
      });
    }
    if (
      env.NODE_ENV === 'production' &&
      (env.EMAIL_DRIVER === 'log' || env.EMAIL_DRIVER === 'memory')
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['EMAIL_DRIVER'],
        message: 'log and memory drivers expose invitation links and are not allowed in production',
      });
    }
    if (
      env.NODE_ENV === 'production' &&
      env.APP_BASE_URL &&
      new URL(env.APP_BASE_URL).protocol !== 'https:'
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['APP_BASE_URL'],
        message: 'Must be an https URL in production',
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
