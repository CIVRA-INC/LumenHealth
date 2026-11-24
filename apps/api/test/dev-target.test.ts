import { describe, expect, it } from 'vitest';
import { checkDevelopmentTarget, confirmationMatches } from '../prisma/dev-target';

const owner = (db: string, host = 'localhost', port = 5432) =>
  `postgresql://lumen:secret@${host}:${port}/${db}`;
const app = (db: string, host = 'localhost', port = 5432) =>
  `postgresql://lumen_app:secret@${host}:${port}/${db}`;
const check = (migrationUrl?: string, appUrl?: string, nodeEnv?: string) =>
  checkDevelopmentTarget({ migrationUrl, appUrl, nodeEnv });

describe('db:reset target check (runs before anything destructive)', () => {
  it('accepts exactly the local development database, and reports it', () => {
    const t = check(owner('lumenhealth'), app('lumenhealth'));
    expect(t).toMatchObject({
      host: 'localhost',
      port: '5432',
      database: 'lumenhealth',
      user: 'lumen',
    });
    expect(check(owner('lumenhealth', '127.0.0.1'), app('lumenhealth', '127.0.0.1')).host).toBe(
      '127.0.0.1',
    );
  });

  it('refuses every other database name, including the disposable ones', () => {
    for (const db of [
      'lumenhealth_e2e',
      'lumenhealth_visual',
      'lumenhealth_test',
      'postgres',
      'lumenhealth_prod',
      'other',
    ]) {
      expect(() => check(owner(db), app(db)), db).toThrow(/Refusing to reset/);
    }
  });

  it('refuses a database that is not on this machine', () => {
    expect(() =>
      check(owner('lumenhealth', 'db.example.com'), app('lumenhealth', 'db.example.com')),
    ).toThrow(/only a database on this machine/);
  });

  it('refuses production and a missing URL', () => {
    expect(() => check(owner('lumenhealth'), app('lumenhealth'), 'production')).toThrow(
      /production/,
    );
    expect(() => check(undefined, undefined)).toThrow(
      /neither MIGRATION_DATABASE_URL nor DATABASE_URL/,
    );
  });

  it('refuses when the owner URL and the application URL name different databases', () => {
    expect(() => check(owner('lumenhealth'), app('lumenhealth_test'))).toThrow(
      /DATABASE_URL points at/,
    );
    expect(() => check(owner('lumenhealth'), app('lumenhealth', 'localhost', 5433))).toThrow(
      /DATABASE_URL points at/,
    );
  });

  it('proceeds only on the exact database name, never on a blanket yes', () => {
    const t = check(owner('lumenhealth'), app('lumenhealth'));
    expect(confirmationMatches(t, 'lumenhealth')).toBe(true);
    expect(confirmationMatches(t, ' lumenhealth ')).toBe(true);
    for (const typed of [undefined, '', 'y', 'yes', 'true', 'lumenhealth_e2e']) {
      expect(confirmationMatches(t, typed)).toBe(false);
    }
  });
});
