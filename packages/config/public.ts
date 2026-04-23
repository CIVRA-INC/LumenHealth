import {
  FeatureFlags,
  resolvePublicFeatureFlags,
} from './feature-flags';

export type PublicRuntimeConfig = {
  apiBaseUrl: string;
  featureFlags: FeatureFlags;
};

const getEnv = (name: string) => process.env[name]?.trim();

export const getPublicRuntimeConfig = (): PublicRuntimeConfig => ({
  apiBaseUrl: getEnv('NEXT_PUBLIC_API_BASE_URL') || 'http://localhost:4000/api/v1',
  featureFlags: resolvePublicFeatureFlags(getEnv),
});

export const publicConfig = getPublicRuntimeConfig();
