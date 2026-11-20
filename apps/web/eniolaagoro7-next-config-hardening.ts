export interface Eniolaagoro7PublicEnvShape {
  NEXT_PUBLIC_API_BASE_URL?: string;
}

export function validateEniolaagoro7RequiredPublicEnv(env: Eniolaagoro7PublicEnvShape): { ok: true } | { ok: false; missing: string[] } {
  const missing: string[] = [];
  if (!env.NEXT_PUBLIC_API_BASE_URL || !env.NEXT_PUBLIC_API_BASE_URL.trim()) {
    missing.push("NEXT_PUBLIC_API_BASE_URL");
  }
  return missing.length ? { ok: false, missing } : { ok: true };
}

export function buildEniolaagoro7HardenedNextConfig<T extends Record<string, unknown>>(base: T): T & { poweredByHeader: false } {
  const validation = validateEniolaagoro7RequiredPublicEnv({ NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL });
  if (!validation.ok) {
    throw new Error(`Missing required public env: ${validation.missing.join(", ")}`);
  }
  return { ...base, poweredByHeader: false };
}
