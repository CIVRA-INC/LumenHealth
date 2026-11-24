import { VersioningType } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import type { AppConfig } from './config/env';

/** Applies the middleware and conventions shared by the server and the integration tests. */
export function configureApp(app: NestExpressApplication, config: AppConfig): void {
  app.useLogger(app.get(Logger));
  if (config.TRUST_PROXY) app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(
    helmet({
      // The API only serves JSON (and the Swagger UI in non-production environments).
      contentSecurityPolicy: config.SWAGGER_ENABLED ? false : undefined,
      crossOriginResourcePolicy: { policy: 'same-site' },
    }),
  );
  app.use(cookieParser());
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI });
  app.enableShutdownHooks();
}

export function buildOpenApi(app: NestExpressApplication, config: AppConfig) {
  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('LumenHealth API')
      .setDescription(
        'Versioned REST API. Authenticate with POST /api/v1/auth/login; the session is an HttpOnly cookie.',
      )
      .setVersion('1.0')
      .addCookieAuth(config.SESSION_COOKIE_NAME)
      .build(),
  );
  return document;
}

export function setupSwagger(app: NestExpressApplication, config: AppConfig): void {
  if (!config.SWAGGER_ENABLED) return;
  SwaggerModule.setup('api/docs', app, buildOpenApi(app, config));
}
