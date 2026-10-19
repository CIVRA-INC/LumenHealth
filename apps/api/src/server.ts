import { NestFactory } from '@nestjs/core';
import { RequestMethod } from '@nestjs/common';
import { ExpressAdapter } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import { serverConfig } from '@lumen/config';
import { createGlobalValidationPipe } from './shared/validation/global-validation.pipe.js';
import { app as expressApp } from './app.js';
import { closeDb, connectDb, readDbConfig } from './shared/db/connection.js';

async function bootstrap() {
  // Refuse to start when a configured database is unreachable.
  const dbConfig = readDbConfig();
  if (dbConfig) await connectDb(dbConfig);

  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(expressApp)
  );
  // Everything the public API exposes lives under /api/v1, with two deliberate
  // exceptions that must keep their original, un-prefixed paths:
  //
  //   /internal/audit — service-to-service surface consumed by
  //                      apps/stellar-service. Deliberately outside the
  //                      versioned public API, so it is never routed through
  //                      the public gateway.
  //   /health         — polled by uptime checks and container probes at the
  //                      root path.
  //
  // Both exclusions are matched against the full controller+method path, so
  // `internal/audit/(.*)` covers `unanchored` and `anchor-result`.
  app.setGlobalPrefix('api/v1', {
    exclude: [
      { path: 'health', method: RequestMethod.GET },
      { path: 'health/ready', method: RequestMethod.GET },
      { path: 'internal/audit/(.*)', method: RequestMethod.ALL },
    ],
  });
  app.enableCors();

  // One validation default for every controller: unknown properties are
  // stripped and then rejected, and handlers receive a real DTO instance.
  app.useGlobalPipes(createGlobalValidationPipe());

  await app.init();

  app.enableShutdownHooks();
  process.once('SIGTERM', () => void closeDb());
  process.once('SIGINT', () => void closeDb());

  expressApp.listen(serverConfig.apiPort, () => {
    console.log(`LumenHealth API running on http://localhost:${serverConfig.apiPort}`);
  });
}

bootstrap();
