export type PrismnMobileStage = "development" | "staging" | "production";

export interface PrismnMobileEnvConfig {
  stage: PrismnMobileStage;
  apiBaseUrl: string;
  sentryDsn?: string;
  showStageBadge: boolean;
}

export interface PrismnEnvInput {
  STAGE?: string;
  API_BASE_URL?: string;
  SENTRY_DSN?: string;
}

const STAGES: PrismnMobileStage[] = ["development", "staging", "production"];

export function normalizeApiBaseUrl(value: string): string {
  const trimmed = value.trim().replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(trimmed)) {
    throw new Error("API_BASE_URL must be an absolute http(s) URL");
  }
  return trimmed;
}

export function parseMobileStage(value: string | undefined): PrismnMobileStage {
  const stage = (value ?? "development").trim().toLowerCase() as PrismnMobileStage;
  if (!STAGES.includes(stage)) {
    throw new Error(`Invalid STAGE: ${value}`);
  }
  return stage;
}

export function buildPrismnMobileEnvConfig(input: PrismnEnvInput): PrismnMobileEnvConfig {
  const stage = parseMobileStage(input.STAGE);
  if (!input.API_BASE_URL || !input.API_BASE_URL.trim()) {
    throw new Error("API_BASE_URL is required");
  }
  return {
    stage,
    apiBaseUrl: normalizeApiBaseUrl(input.API_BASE_URL),
    sentryDsn: input.SENTRY_DSN?.trim() || undefined,
    showStageBadge: stage !== "production",
  };
}

export function getPrismnProfileDefaults(profile: "development" | "preview" | "production"): PrismnEnvInput {
  switch (profile) {
    case "development":
      return { STAGE: "development", API_BASE_URL: "http://localhost:4000/api/v1" };
    case "preview":
      return { STAGE: "staging", API_BASE_URL: "https://staging.api.lumenhealth.example/api/v1" };
    case "production":
      return { STAGE: "production", API_BASE_URL: "https://api.lumenhealth.example/api/v1" };
  }
}
