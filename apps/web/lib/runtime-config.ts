type RuntimeFeatureFlags = {
  aiSummaries: boolean;
  stellarBilling: boolean;
  offlineMode: boolean;
};

type RuntimeConfig = {
  apiBaseUrl: string;
  featureFlags: RuntimeFeatureFlags;
};

declare global {
  interface Window {
    __LUMEN_RUNTIME_CONFIG__?: RuntimeConfig;
  }
}

const fallbackConfig: RuntimeConfig = {
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api/v1',
  featureFlags: {
    aiSummaries: true,
    stellarBilling: true,
    offlineMode: false,
  },
};

export const getRuntimeConfig = (): RuntimeConfig => {
  if (typeof window === 'undefined') {
    return fallbackConfig;
  }

  return window.__LUMEN_RUNTIME_CONFIG__ ?? fallbackConfig;
};

export const getApiBaseUrl = () => getRuntimeConfig().apiBaseUrl;

export const getFeatureFlags = () => getRuntimeConfig().featureFlags;

export const isFeatureEnabled = (key: keyof RuntimeFeatureFlags) => getFeatureFlags()[key];
