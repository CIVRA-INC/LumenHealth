import { Injectable, Inject } from '@nestjs/common';
import { DB_CLIENT } from '../db/db.provider';
import { roleAssignments, roles } from '../db/schema';
import { eq, and } from 'drizzle-orm';

@Injectable()
export class RbacService {
  constructor(@Inject(DB_CLIENT) private readonly db: any) {}

  async getUserPermissions(userId: string): Promise<string[]> {
    // Join roleAssignments to roles for the user
    const assignments = await this.db
      .select({
        permissions: roles.permissions,
      })
      .from(roleAssignments)
      .innerJoin(roles, eq(roleAssignments.roleId, roles.id))
      .where(eq(roleAssignments.userId, userId));

    const allPermissions = new Set<string>();
    for (const assignment of assignments) {
      if (assignment.permissions) {
        for (const p of assignment.permissions) {
          allPermissions.add(p);
        }
      }
    }

    return Array.from(allPermissions);
  }
}
