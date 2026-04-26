import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../app.module';

let app: INestApplication;

export async function createTestApp(): Promise<INestApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  app = moduleFixture.createNestApplication();
  await app.init();
  return app;
}

export async function cleanDatabase(): Promise<void> {
  if (!app) {
    throw new Error('Test app has not been initialised. Call createTestApp() first.');
  }
  // Truncate or drop test collections/tables here.
  // Replace the lines below with actual DB connection cleanup logic.
  // e.g. await connection.synchronize(true) or truncate each entity.
  console.log('[test-harness] cleanDatabase: truncating test data');
}

export async function withTestApp(
  fn: (app: INestApplication) => Promise<void>,
): Promise<void> {
  const testApp = await createTestApp();
  try {
    await fn(testApp);
  } finally {
    await cleanDatabase();
    await testApp.close();
  }
}
