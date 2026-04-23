import dotenv from 'dotenv';
import path from 'path';
import {
  FeatureFlags,
  resolveServerFeatureFlags,
} from './feature-flags';
import {
  getPublicRuntimeConfig,
  PublicRuntimeConfig,
} from './public';
import { workspaceBoundarySummary } from './workspace-boundaries';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

type ConfigDiagnostic = {
  name: string;
  status: 'present' | 'missing' | 'defaulted';
  source: 'env' | 'default';
  valuePreview: string;
};

type ServerConfig = {
  port: number;
  mongoUri: string;
  jwt: {
    accessTokenSecret: string;
    refreshTokenSecret: string;
  };
  stellar: {
    network: string;
    horizonUrl: string;
    platformPublicKey: string;
    platformSecretKey: string;
  };
  gemini: {
    apiKey: string;
    model: string;
  };
  public: PublicRuntimeConfig;
  featureFlags: FeatureFlags;
};

const integerPattern = /^\d+$/;

const getEnv = (name: string) => process.env[name]?.trim();

const requireEnv = (name: string) => {
  const value = getEnv(name);
  if (!value) {
    throw new Error(`[config] Missing required environment variable: ${name}`);
  }

  return value;
};

const optionalEnv = (name: string, fallback = '') => getEnv(name) || fallback;

const parsePort = () => {
  const raw = optionalEnv('API_PORT', '4000');
  if (!integerPattern.test(raw)) {
    throw new Error(`[config] API_PORT must be a whole number. Received: ${raw}`);
  }

  const value = Number(raw);
  if (value < 1 || value > 65535) {
    throw new Error(`[config] API_PORT must be between 1 and 65535. Received: ${value}`);
  }

  return value;
};

const buildDiagnostics = (): ConfigDiagnostic[] => {
  const diagnosticEnv = [
    ['API_PORT', optionalEnv('API_PORT', '4000'), 'default', '4000'],
    ['MONGO_URI', getEnv('MONGO_URI') || '', 'env', ''],
    ['JWT_ACCESS_TOKEN_SECRET', getEnv('JWT_ACCESS_TOKEN_SECRET') || '', 'env', ''],
    ['JWT_REFRESH_TOKEN_SECRET', getEnv('JWT_REFRESH_TOKEN_SECRET') || '', 'env', ''],
    ['STELLAR_NETWORK', optionalEnv('STELLAR_NETWORK', 'testnet'), 'default', 'testnet'],
    [
      'STELLAR_HORIZON_URL',
      optionalEnv('STELLAR_HORIZON_URL', 'https://horizon-testnet.stellar.org'),
      'default',
      'https://horizon-testnet.stellar.org',
    ],
    ['STELLAR_PLATFORM_PUBLIC_KEY', getEnv('STELLAR_PLATFORM_PUBLIC_KEY') || '', 'env', ''],
    ['STELLAR_SECRET_KEY', getEnv('STELLAR_SECRET_KEY') || '', 'env', ''],
    ['GEMINI_API_KEY', getEnv('GEMINI_API_KEY') || '', 'env', ''],
    ['GEMINI_MODEL', optionalEnv('GEMINI_MODEL', 'gemini-1.5-flash'), 'default', 'gemini-1.5-flash'],
    [
      'NEXT_PUBLIC_API_BASE_URL',
      optionalEnv('NEXT_PUBLIC_API_BASE_URL', 'http://localhost:4000/api/v1'),
      'default',
      'http://localhost:4000/api/v1',
    ],
  ] as const;

  return diagnosticEnv.map(([name, value, preferredSource, defaultValue]) => {
    if (!value) {
      return {
        name,
        status: 'missing',
        source: 'env',
        valuePreview: '',
      };
    }

    const isDefaulted = preferredSource === 'default' && value === defaultValue;
    return {
      name,
      status: isDefaulted ? 'defaulted' : 'present',
      source: isDefaulted ? 'default' : 'env',
      valuePreview:
        name.includes('SECRET') || name.includes('KEY')
          ? `${value.slice(0, 4)}***`
          : value,
    };
  });
};

export const getConfigDiagnostics = () => ({
  environment: buildDiagnostics(),
  workspaceBoundaries: workspaceBoundarySummary,
});

export const createServerConfig = (): ServerConfig => ({
  port: parsePort(),
  mongoUri: requireEnv('MONGO_URI'),
  jwt: {
    accessTokenSecret: requireEnv('JWT_ACCESS_TOKEN_SECRET'),
    refreshTokenSecret: requireEnv('JWT_REFRESH_TOKEN_SECRET'),
  },
  stellar: {
    network: optionalEnv('STELLAR_NETWORK', 'testnet').toUpperCase(),
    horizonUrl: optionalEnv('STELLAR_HORIZON_URL', 'https://horizon-testnet.stellar.org'),
    platformPublicKey: optionalEnv('STELLAR_PLATFORM_PUBLIC_KEY'),
    platformSecretKey: optionalEnv('STELLAR_SECRET_KEY'),
  },
  gemini: {
    apiKey: optionalEnv('GEMINI_API_KEY'),
    model: optionalEnv('GEMINI_MODEL', 'gemini-1.5-flash'),
  },
  public: getPublicRuntimeConfig(),
  featureFlags: resolveServerFeatureFlags(getEnv),
});

export const config = createServerConfig();

export { getPublicRuntimeConfig } from './public';
export {
  featureFlagDefinitions,
  isFeatureFlagEnabled,
  parseBooleanFlag,
  resolvePublicFeatureFlags,
  resolveServerFeatureFlags,
} from './feature-flags';
export {
  workspaceBoundaries,
  workspaceBoundaryMap,
  workspaceBoundarySummary,
} from './workspace-boundaries';
export type { FeatureFlagKey, FeatureFlags } from './feature-flags';
export type { PublicRuntimeConfig } from './public';
