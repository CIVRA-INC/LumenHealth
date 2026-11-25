import { describe, expect, it } from 'vitest';
import { loadConfig } from './env';

const base = { DATABASE_URL: 'postgresql://app@localhost/db' };

describe('environment validation', () => {
  it('applies safe defaults', () => {
    const config = loadConfig({ ...base });
    expect(config.API_PORT).toBe(4000);
    expect(config.SESSION_COOKIE_SECURE).toBe(false);
    expect(config.RATE_LIMIT_ENABLED).toBe(true);
    expect(config.WEB_ORIGINS).toEqual(['http://localhost:5173']);
  });

  it('fails fast and names the missing variable', () => {
    expect(() => loadConfig({})).toThrow(/DATABASE_URL/);
  });

  it('refuses insecure cookies in production', () => {
    expect(() => loadConfig({ ...base, NODE_ENV: 'production' })).toThrow(/SESSION_COOKIE_SECURE/);
    expect(
      loadConfig({ ...base, NODE_ENV: 'production', SESSION_COOKIE_SECURE: 'true' }).NODE_ENV,
    ).toBe('production');
  });

  it('parses a comma-separated origin list', () => {
    expect(
      loadConfig({ ...base, WEB_ORIGINS: 'https://a.example, https://b.example' }).WEB_ORIGINS,
    ).toEqual(['https://a.example', 'https://b.example']);
  });
});

describe('email and invitation configuration', () => {
  const base = {
    NODE_ENV: 'production',
    DATABASE_URL: 'postgresql://x:y@localhost/db',
    SESSION_COOKIE_SECURE: 'true',
    APP_BASE_URL: 'https://app.example.com',
  };

  it('refuses drivers that expose invitation links in production', () => {
    expect(() => loadConfig({ ...base, EMAIL_DRIVER: 'log' })).toThrow(/not allowed in production/);
    expect(() => loadConfig({ ...base, EMAIL_DRIVER: 'memory' })).toThrow(
      /not allowed in production/,
    );
  });

  it('requires an SMTP host for the smtp driver and an https base URL in production', () => {
    expect(() => loadConfig({ ...base, EMAIL_DRIVER: 'smtp' })).toThrow(/SMTP_HOST/);
    expect(() =>
      loadConfig({
        ...base,
        EMAIL_DRIVER: 'smtp',
        SMTP_HOST: 'mail',
        APP_BASE_URL: 'http://app.example.com',
      }),
    ).toThrow(/https/);
    expect(loadConfig({ ...base, EMAIL_DRIVER: 'smtp', SMTP_HOST: 'mail' }).EMAIL_DRIVER).toBe(
      'smtp',
    );
  });
});
