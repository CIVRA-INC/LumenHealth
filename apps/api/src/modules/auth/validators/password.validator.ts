import { createHash } from "node:crypto";
import { incrementMetric } from "../services/metrics.service.js";
import { authLogger } from "../../../shared/logger/index.js";

export type PasswordPolicyConfig = {
  minLength: number;
  requireUpper: boolean;
  requireNumber: boolean;
};

export const defaultPasswordPolicy: PasswordPolicyConfig = {
  minLength: 8,
  requireUpper: false,
  requireNumber: false,
};

export function validatePassword(
  password: string,
  cfg: PasswordPolicyConfig = defaultPasswordPolicy
): string | null {
  if (password.length < cfg.minLength) return `password must be at least ${cfg.minLength} characters`;
  if (cfg.requireUpper && !/[A-Z]/.test(password)) return "password must include an uppercase letter";
  if (cfg.requireNumber && !/[0-9]/.test(password)) return "password must include a number";
  return null;
}

// ─── Breached-password screening ────────────────────────────────────────────
//
// Known-breached passwords are rejected on password reset (and by
// `validatePasswordWithBreaches`, the combined helper the register path must
// use when the registration endpoint returns). The online check uses the
// Have I Been Pwned *range* API (k-anonymity): only the first 5 hex chars of
// the password's SHA-1 leave the process, the full digest never does. With a
// timeout, a degraded offline fallback (bundled corpus of the most common
// breached passwords) and fail-open behaviour: a third-party outage must
// never block a legitimate password reset. See docs/auth-threat-model.md T8.

export const BREACHED_PASSWORD_MESSAGE =
  "password appears in known breached-password lists; choose a different password";

/** Default budget for the online range check before it degrades offline. */
export const BREACH_CHECK_TIMEOUT_MS = 2000;

export type FetchLike = (
  url: string,
  init?: { signal?: AbortSignal; headers?: Record<string, string> }
) => Promise<{ ok: boolean; status: number; text(): Promise<string> }>;

export type BreachCheckOptions = {
  /** Injection point for tests; defaults to the ambient `fetch`. */
  fetchImpl?: FetchLike;
  /** Online-check timeout in ms (default {@link BREACH_CHECK_TIMEOUT_MS}). */
  timeoutMs?: number;
  /** Offline fallback corpus (exact match), overridable for tests. */
  offlineCorpus?: readonly string[];
};

export type BreachCheckOutcome = {
  /** True when the password must be rejected. */
  breached: boolean;
  /** Where the verdict came from. */
  source: "range-api" | "offline-corpus" | "none";
  /** True when the online range check could not complete (outage/timeout). */
  degraded: boolean;
};

/**
 * Offline fallback: the passwords that dominate credential-stuffing
 * wordlists, checked locally only when the range API is unreachable. Exact
 * match, deliberately small — it is a backstop, not a substitute for the
 * online corpus.
 */
const OFFLINE_FALLBACK_CORPUS: readonly string[] = [
  "123456",
  "123456789",
  "password",
  "qwerty",
  "12345678",
  "111111",
  "12345",
  "1234567",
  "123123",
  "1234567890",
  "000000",
  "qwerty123",
  "1q2w3e4r",
  "abc123",
  "iloveyou",
  "admin",
  "welcome",
  "monkey",
  "dragon",
  "letmein",
  "football",
  "baseball",
  "sunshine",
  "princess",
  "shadow",
  "superman",
  "trustno1",
  "passw0rd",
  "master",
  "hello",
  "freedom",
  "whatever",
  "qazwsx",
  "starwars",
  "zaq12wsx",
  "121212",
  "7777777",
  "123qwe",
  "harley",
  "password1",
  "password123",
  "welcome1",
  "admin123",
  "root",
  "toor",
  "login",
  "pass",
  "batman",
  "hunter",
  "ranger",
  "buster",
  "soccer",
  "hockey",
  "george",
  "charlie",
  "andrew",
  "michelle",
  "jessica",
  "pepper",
  "daniel",
  "access",
  "joshua",
  "maggie",
  "silver",
  "william",
  "dallas",
  "yankees",
  "mustang",
  "austin",
  "thomas",
  "robert",
  "matrix",
  "donald",
  "qwertyuiop",
  "asdfghjkl",
  "zxcvbnm",
  "1qaz2wsx",
  "q1w2e3r4",
  "test",
  "guest",
  "changeme",
  "default",
  "secret",
  "summer",
  "winter",
  "spring",
];

function sha1Upper(password: string): string {
  return createHash("sha1").update(password, "utf8").digest("hex").toUpperCase();
}

type RangeCheckResult = "hit" | "miss" | "unavailable";

async function checkRangeApi(
  password: string,
  opts: BreachCheckOptions
): Promise<RangeCheckResult> {
  const fetchImpl: FetchLike = opts.fetchImpl ?? globalThis.fetch;
  const timeoutMs = opts.timeoutMs ?? BREACH_CHECK_TIMEOUT_MS;
  const digest = sha1Upper(password);
  const prefix = digest.slice(0, 5);
  const suffix = digest.slice(5);

  const controller = new AbortController();
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      controller.abort();
      reject(new Error(`breach range check timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  // The race rejects on timeout even if the fetch implementation ignores the
  // abort signal, and the pre-handled catch keeps a late fetch rejection from
  // ever surfacing as an unhandled rejection.
  const fetchPromise = fetchImpl(`https://api.pwnedpasswords.com/range/${prefix}`, {
    signal: controller.signal,
    headers: { "Add-Padding": "true" },
  });
  fetchPromise.catch(() => undefined);

  try {
    const res = await Promise.race([fetchPromise, timeoutPromise]);
    if (!res.ok) return "unavailable";
    const body = await res.text();
    for (const line of body.split("\n")) {
      const hitSuffix = line.split(":")[0];
      if (hitSuffix !== undefined && hitSuffix.trim().toUpperCase() === suffix) return "hit";
    }
    return "miss";
  } catch {
    return "unavailable";
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Check `password` against the breached-password corpus. Never throws and
 * never blocks on the network: outage and timeout degrade to the offline
 * corpus and then fail open (with a metric and a warn log), so a third-party
 * outage cannot break password reset.
 */
export async function checkPasswordBreached(
  password: string,
  opts: BreachCheckOptions = {}
): Promise<BreachCheckOutcome> {
  const result = await checkRangeApi(password, opts);

  if (result === "hit") {
    incrementMetric("auth_password_breach_rejected_total");
    authLogger.warn("auth.password_breach.rejected", { meta: { source: "range-api" } });
    return { breached: true, source: "range-api", degraded: false };
  }
  if (result === "miss") {
    return { breached: false, source: "none", degraded: false };
  }

  // Online check unavailable: degrade to the bundled corpus, then fail open.
  incrementMetric("auth_password_breach_check_degraded_total");
  authLogger.warn("auth.password_breach.check_degraded", {
    meta: { reason: "range_api_unreachable" },
  });
  const corpus = opts.offlineCorpus ?? OFFLINE_FALLBACK_CORPUS;
  if (corpus.includes(password)) {
    incrementMetric("auth_password_breach_rejected_total");
    authLogger.warn("auth.password_breach.rejected", { meta: { source: "offline-corpus" } });
    return { breached: true, source: "offline-corpus", degraded: true };
  }
  return { breached: false, source: "none", degraded: true };
}

/**
 * Policy validation plus breached-password screening in one call — the entry
 * point the registration path must use when the register endpoint lands.
 * Policy failures short-circuit before any network call.
 */
export async function validatePasswordWithBreaches(
  password: string,
  cfg: PasswordPolicyConfig = defaultPasswordPolicy,
  opts: BreachCheckOptions = {}
): Promise<string | null> {
  const policyError = validatePassword(password, cfg);
  if (policyError) return policyError;
  const outcome = await checkPasswordBreached(password, opts);
  return outcome.breached ? BREACHED_PASSWORD_MESSAGE : null;
}
