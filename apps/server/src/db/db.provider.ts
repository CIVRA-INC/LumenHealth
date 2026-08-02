import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import { ConfigService } from '@nestjs/config';

export const DB_CLIENT = 'DB_CLIENT';

export const dbProvider = {
  provide: DB_CLIENT,
  useFactory: (configService: ConfigService) => {
    const connectionString =
      configService.get<string>('DATABASE_URL') ||
      'postgresql://lumen:password@localhost:5432/lumenhealth';
    const pool = new Pool({
      connectionString,
    });
    return drizzle(pool, { schema });
  },
  inject: [ConfigService],
};
