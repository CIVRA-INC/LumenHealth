import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import { serverConfig } from '@lumen/config';
import { app as expressApp } from './app.js';

async function bootstrap() {
  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(expressApp)
  );
  app.setGlobalPrefix('api/v1');
  app.enableCors();
  
  await app.init();
  
  expressApp.listen(serverConfig.apiPort, () => {
    console.log(`LumenHealth API running on http://localhost:${serverConfig.apiPort}`);
  });
}

bootstrap();
