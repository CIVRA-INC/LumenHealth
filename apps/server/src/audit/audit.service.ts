import { Injectable, Inject } from '@nestjs/common';
import { DB_CLIENT } from '../db/db.provider';
import { auditLogs } from '../db/schema';
import { eq, desc } from 'drizzle-orm';

@Injectable()
export class AuditService {
  constructor(@Inject(DB_CLIENT) private readonly db: any) {}

  async logAction(
    orgId: string,
    userId: string,
    action: string,
    resourceType: string,
    resourceId: string,
    details?: any,
  ) {
    await this.db.insert(auditLogs).values({
      orgId,
      userId,
      action,
      resourceType,
      resourceId,
      details: details ? JSON.stringify(details) : null,
    });
  }

  async getLogs(orgId: string, limit: number = 50) {
    return this.db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.orgId, orgId))
      .orderBy(desc(auditLogs.timestamp))
      .limit(limit);
  }
}
