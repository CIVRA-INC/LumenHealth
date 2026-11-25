import type { OrgUserView } from '@lumen/contracts';
import type { Prisma } from '../../generated/prisma/client';

/** Membership shape shared by the administration and staff endpoints. */
export type MembershipWithUser = Prisma.MembershipGetPayload<{
  include: { user: true; branches: { include: { branch: true } } };
}>;

/** Never expose credentials or internal ids other than the membership/user ids. */
export function toOrgUserView(m: MembershipWithUser): OrgUserView {
  return {
    membershipId: m.id,
    userId: m.userId,
    email: m.user.email,
    fullName: m.user.fullName,
    role: m.role,
    status: m.status,
    branches: m.branches.map((b) => ({ id: b.branchId, name: b.branch.name })),
    lastLoginAt: m.user.lastLoginAt?.toISOString() ?? null,
  };
}
