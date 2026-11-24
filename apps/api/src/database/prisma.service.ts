import { Inject, Injectable, type OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, type Prisma } from '../generated/prisma/client';
import { APP_CONFIG, type AppConfig } from '../config/env';

/** A transaction client already bound to one organisation's row-level-security context. */
export type Tx = Prisma.TransactionClient;

/**
 * Prisma client for the restricted `lumen_app` role.
 *
 * Tenant data is only reachable through {@link PrismaService.tenant}: it opens a transaction
 * and sets `app.current_org_id`, which PostgreSQL row-level-security policies check. Services
 * additionally filter on `organizationId` in every query (defense in depth, docs/adr/0004).
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor(@Inject(APP_CONFIG) config: AppConfig) {
    super({ adapter: new PrismaPg({ connectionString: config.DATABASE_URL }) });
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  tenant<T>(organizationId: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
    return this.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT set_config('app.current_org_id', ${organizationId}, true)`;
        return fn(tx);
      },
      { timeout: 15_000, maxWait: 10_000 },
    );
  }
}
