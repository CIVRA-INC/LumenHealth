import { passwordSchema } from '@lumen/contracts';
import type { PrismaClient } from '../../generated/prisma/client';
import type { PasswordService } from '../identity/password.service';

export type BootstrapResult =
  | { created: true; userId: string }
  | { created: false; reason: 'platform_admin_exists' | 'email_in_use' };

/**
 * Creates the FIRST platform administrator, once. It never promotes, resets or overwrites anything:
 *  - if any platform administrator already exists, nothing is written;
 *  - if the email belongs to an existing account, nothing is written (promotion is a separate decision);
 *  - the check and the insert run in one transaction under an advisory lock, so two operators running
 *    the command at the same moment cannot both succeed.
 * The password is hashed with the application's PasswordService and is never logged or audited.
 */
export async function bootstrapPlatformAdmin(
  prisma: PrismaClient,
  passwords: PasswordService,
  input: { email: string; fullName: string; password: string },
): Promise<BootstrapResult> {
  const email = input.email.trim().toLowerCase();
  const fullName = input.fullName.trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('A valid --email is required');
  if (fullName.length < 2) throw new Error('A --name of at least 2 characters is required');
  const parsed = passwordSchema.safeParse(input.password);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? 'Invalid password');
  const passwordHash = await passwords.hash(input.password);

  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('lumenhealth.platform.bootstrap'))`;
    if (await tx.user.findFirst({ where: { platformRole: { not: null } }, select: { id: true } }))
      return { created: false, reason: 'platform_admin_exists' } as const;
    if (await tx.user.findUnique({ where: { email }, select: { id: true } }))
      return { created: false, reason: 'email_in_use' } as const;

    const user = await tx.user.create({
      data: {
        email,
        fullName,
        passwordHash,
        platformRole: 'PLATFORM_ADMIN',
        // The operator chose this password on a command line: it must be replaced at first sign-in.
        mustChangePassword: true,
      },
    });
    await tx.auditEvent.createMany({
      data: [
        {
          organizationId: null,
          actorUserId: user.id,
          action: 'platform.bootstrap',
          resourceType: 'user',
          resourceId: user.id,
          metadata: { platformRole: 'PLATFORM_ADMIN' },
        },
      ],
    });
    return { created: true, userId: user.id } as const;
  });
}
