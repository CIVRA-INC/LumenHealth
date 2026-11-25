import { join } from 'node:path';
import { defineConfig } from 'prisma/config';

// Prisma 7 no longer loads .env automatically. Load the repository-level file when present.
try {
  process.loadEnvFile(join(process.cwd(), '../../.env'));
} catch {
  // Environment is provided by the shell or CI.
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: {
    // Migrations run as the schema owner. The API connects separately as the restricted role.
    url: process.env.MIGRATION_DATABASE_URL ?? process.env.DATABASE_URL ?? '',
  },
});
