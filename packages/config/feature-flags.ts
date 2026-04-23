export const featureFlagDefinitions = {
  aiSummaries: {
    key: 'aiSummaries',
    env: 'LUMEN_FEATURE_AI_SUMMARIES',
    publicEnv: 'NEXT_PUBLIC_LUMEN_FEATURE_AI_SUMMARIES',
    defaultValue: true,
    owner: 'clinical-intelligence',
    description: 'Controls AI-assisted encounter summarization flows.',
  },
  stellarBilling: {
    key: 'stellarBilling',
    env: 'LUMEN_FEATURE_STELLAR_BILLING',
    publicEnv: 'NEXT_PUBLIC_LUMEN_FEATURE_STELLAR_BILLING',
    defaultValue: true,
    owner: 'payments',
    description: 'Controls Stellar payment and billing workflows.',
  },
  offlineMode: {
    key: 'offlineMode',
    env: 'LUMEN_FEATURE_OFFLINE_MODE',
    publicEnv: 'NEXT_PUBLIC_LUMEN_FEATURE_OFFLINE_MODE',
    defaultValue: false,
    owner: 'mobile-platform',
    description: 'Controls offline-first and queued sync experiences.',
  },
} as const;

export type FeatureFlagKey = keyof typeof featureFlagDefinitions;

export type FeatureFlags = Record<FeatureFlagKey, boolean>;

type EnvReader = (name: string) => string | undefined;

const truthy = new Set(['1', 'true', 'yes', 'on', 'enabled']);
const falsy = new Set(['0', 'false', 'no', 'off', 'disabled']);

export const parseBooleanFlag = (raw: string | undefined, fallback: boolean) => {
  if (typeof raw !== 'string') {
    return fallback;
  }

  const normalized = raw.trim().toLowerCase();
  if (!normalized) {
    return fallback;
  }

  if (truthy.has(normalized)) {
    return true;
  }

  if (falsy.has(normalized)) {
    return false;
  }

  return fallback;
};

const resolveFlagSet = (envReader: EnvReader, keyName: 'env' | 'publicEnv') => {
  const entries = Object.entries(featureFlagDefinitions).map(([key, definition]) => {
    const envName = definition[keyName];
    return [key, parseBooleanFlag(envReader(envName), definition.defaultValue)];
  });

  return Object.fromEntries(entries) as FeatureFlags;
};

export const resolveServerFeatureFlags = (envReader: EnvReader = (name) => process.env[name]) =>
  resolveFlagSet(envReader, 'env');

export const resolvePublicFeatureFlags = (envReader: EnvReader = (name) => process.env[name]) =>
  resolveFlagSet(envReader, 'publicEnv');

export const isFeatureFlagEnabled = (flags: FeatureFlags, key: FeatureFlagKey) => flags[key];
