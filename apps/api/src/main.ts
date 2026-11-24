import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { configureApp, setupSwagger } from './app.factory';
import { loadConfig } from './config/env';

async function bootstrap() {
  const config = loadConfig();
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });
  configureApp(app, config);
  setupSwagger(app, config);
  await app.listen(config.API_PORT, config.API_HOST);
  app.get(Logger).log(`LumenHealth API listening on http://${config.API_HOST}:${config.API_PORT}`);
}

bootstrap().catch((error: unknown) => {
  // The logger may not exist yet if configuration is invalid.
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
