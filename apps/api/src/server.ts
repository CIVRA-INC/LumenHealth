import { NestFactory } from '@nestjs/core';
import { RequestMethod } from '@nestjs/common';
import { ExpressAdapter } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import { ConfigService } from './shared/config/config.service.js';
import { app as expressApp } from './app.js';

async function bootstrap() {
  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(expressApp)
  );
  // `/health` is polled by uptime checks at the root path and `/internal/audit`
  // is the service-to-service surface consumed by apps/stellar-service. Both
  // sit outside the versioned public API, so both are excluded here.
  app.setGlobalPrefix('api/v1', {
    exclude: [
      { path: 'health', method: RequestMethod.GET },
      { path: 'internal/audit/(.*)', method: RequestMethod.ALL },
    ],
  });
  app.enableCors();

  const { apiPort } = app.get(ConfigService);

  await app.init();

  expressApp.listen(apiPort, () => {
    console.log(`LumenHealth API running on http://localhost:${apiPort}`);
  });
}

bootstrap();
