import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PasswordService } from '../src/modules/identity/password.service';
import { bootstrapPlatformAdmin } from '../src/modules/platform/bootstrap';
import { appRoleClient, ownerClient, TEST_PASSWORD } from './helpers';

const owner = ownerClient();
// Exactly as production runs it: the restricted application role, not the schema owner.
const app = appRoleClient();
const passwords = new PasswordService();
const tag = randomUUID().slice(0, 8);
const STRONG = 'A-Long-Throwaway-Password-1';

/** Demote rather than delete: other suites' invitations and audit rows may reference these users. */
async function clearPlatformAdmins() {
  await owner.user.updateMany({
    where: { platformRole: { not: null } },
    data: { platformRole: null },
  });
}

beforeAll(clearPlatformAdmins);
afterAll(async () => {
  await clearPlatformAdmins();
  await app.$disconnect();
  await owner.$disconnect();
});

describe('platform administrator bootstrap', () => {
  it('refuses to touch an existing account, even when no platform administrator exists', async () => {
    const email = `existing.${tag}@lumen.test`;
    const hash = await passwords.hash(TEST_PASSWORD);
    const user = await owner.user.create({
      data: { email, fullName: 'Existing', passwordHash: hash },
    });
    const result = await bootstrapPlatformAdmin(app, passwords, {
      email,
      fullName: 'Someone',
      password: STRONG,
    });
    expect(result).toEqual({ created: false, reason: 'email_in_use' });
    const after = await owner.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(after.platformRole).toBeNull();
    expect(after.passwordHash).toBe(hash);
  });

  it('rejects weak passwords and malformed input before writing anything', async () => {
    await expect(
      bootstrapPlatformAdmin(app, passwords, {
        email: `a.${tag}@lumen.test`,
        fullName: 'A B',
        password: 'short',
      }),
    ).rejects.toThrow(/at least/);
    await expect(
      bootstrapPlatformAdmin(app, passwords, {
        email: 'not-an-email',
        fullName: 'A B',
        password: STRONG,
      }),
    ).rejects.toThrow(/email/);
    expect(await owner.user.count({ where: { platformRole: { not: null } } })).toBe(0);
  });

  it('lets exactly one of several simultaneous runs create the administrator', async () => {
    const run = (n: number) =>
      bootstrapPlatformAdmin(app, passwords, {
        email: `race${n}.${tag}@lumen.test`,
        fullName: `Racer ${n}`,
        password: STRONG,
      });
    const results = await Promise.all([run(1), run(2), run(3)]);
    expect(results.filter((r) => r.created)).toHaveLength(1);
    expect(results.filter((r) => !r.created && r.reason === 'platform_admin_exists')).toHaveLength(
      2,
    );
    expect(await owner.user.count({ where: { platformRole: { not: null } } })).toBe(1);
    await clearPlatformAdmins();
  });

  it('creates the first administrator securely and records an audit event without secrets', async () => {
    const password = 'Another-Long-Password-77';
    const email = `Boss.${tag}@Lumen.test`;
    const result = await bootstrapPlatformAdmin(app, passwords, {
      email,
      fullName: 'Pat Platform',
      password,
    });
    expect(result.created).toBe(true);

    const user = await owner.user.findUniqueOrThrow({ where: { email: email.toLowerCase() } });
    expect(user.platformRole).toBe('PLATFORM_ADMIN');
    expect(user.mustChangePassword).toBe(true);
    expect(user.status).toBe('ACTIVE');
    expect(user.passwordHash).not.toContain(password);
    expect(user.passwordHash.startsWith('$argon2id$')).toBe(true);
    expect(await owner.membership.count({ where: { userId: user.id } })).toBe(0);

    const events = await owner.auditEvent.findMany({
      where: { actorUserId: user.id, action: 'platform.bootstrap' },
    });
    expect(events).toHaveLength(1);
    expect(JSON.stringify(events)).not.toContain(password);
    expect(JSON.stringify(events)).not.toContain(user.passwordHash);
  });

  it('is idempotent: running it again changes nothing', async () => {
    const before = await owner.user.findFirstOrThrow({ where: { platformRole: { not: null } } });
    const again = await bootstrapPlatformAdmin(app, passwords, {
      email: `second.${tag}@lumen.test`,
      fullName: 'Second Admin',
      password: STRONG,
    });
    const sameEmail = await bootstrapPlatformAdmin(app, passwords, {
      email: before.email,
      fullName: 'Overwrite Attempt',
      password: STRONG,
    });
    expect(again).toEqual({ created: false, reason: 'platform_admin_exists' });
    expect(sameEmail).toEqual({ created: false, reason: 'platform_admin_exists' });
    const after = await owner.user.findUniqueOrThrow({ where: { id: before.id } });
    expect(after.passwordHash).toBe(before.passwordHash);
    expect(after.fullName).toBe(before.fullName);
    expect(await owner.user.count({ where: { platformRole: { not: null } } })).toBe(1);
  });
});
