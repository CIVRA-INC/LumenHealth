import 'reflect-metadata';
import { writeFileSync } from 'node:fs';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from '../app.module';
import { buildOpenApi, configureApp } from '../app.factory';
import { loadConfig } from '../config/env';

/** Writes docs/api/openapi.json so API changes show up in review. */
async function main() {
  const config = loadConfig();
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { logger: false });
  configureApp(app, config);
  const document = buildOpenApi(app, config);
  const target = process.argv[2] ?? '../../docs/api/openapi.json';
  writeFileSync(target, `${JSON.stringify(document, null, 2)}\n`);
  await app.close();
  console.log(`OpenAPI document written to ${target}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
