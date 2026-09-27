import { Inject, Injectable } from '@nestjs/common';
import type { authConfig, serverConfig } from '@lumen/config';

/**
 * Injection tokens for the raw `@lumen/config` exports.
 *
 * The values themselves are bound in `config.module.ts`; nothing outside that
 * module may import `@lumen/config` directly. Exposing them as tokens (rather
 * than only through `ConfigService`) lets a test override a single value —
 * e.g. `stellarServiceUrl` — without rebuilding the whole service graph.
 */
export const SERVER_CONFIG = Symbol('LUMEN_SERVER_CONFIG');
export const AUTH_CONFIG = Symbol('LUMEN_AUTH_CONFIG');

export type ServerConfig = typeof serverConfig;
export type AuthConfig = typeof authConfig;

/**
 * Thin, typed facade over `@lumen/config`.
 *
 * Deliberately *not* `@nestjs/config`: the whole app already centralises
 * environment parsing in `@lumen/config` (including its own `.env` load), and
 * a second parser would mean two sources of truth for the same variables.
 * This service only makes those already-validated values injectable.
 */
@Injectable()
export class ConfigService {
  constructor(
    @Inject(SERVER_CONFIG) private readonly server: ServerConfig,
    @Inject(AUTH_CONFIG) private readonly auth: AuthConfig,
  ) {}

  // --- server ------------------------------------------------------------
  get apiPort(): number {
    return this.server.apiPort;
  }
  get stellarNetwork(): string {
    return this.server.stellarNetwork;
  }
  get stellarHorizonUrl(): string {
    return this.server.stellarHorizonUrl;
  }
  get internalServiceToken(): string {
    return this.server.internalServiceToken;
  }
  get stellarServiceUrl(): string {
    return this.server.stellarServiceUrl;
  }
  get stellarServicePort(): number {
    return this.server.stellarServicePort;
  }
  get anchorIntervalMs(): number {
    return this.server.anchorIntervalMs;
  }
  get anchorReconcileStaleThresholdMs(): number {
    return this.server.anchorReconcileStaleThresholdMs;
  }
  get public(): ServerConfig['public'] {
    return this.server.public;
  }

  // --- auth --------------------------------------------------------------
  get jwtSecret(): string {
    return this.auth.jwtSecret;
  }
  get accessTokenTtl(): number {
    return this.auth.accessTokenTtl;
  }
  get refreshTokenTtl(): number {
    return this.auth.refreshTokenTtl;
  }
  get bcryptRounds(): number {
    return this.auth.bcryptRounds;
  }
}
