import { createHash } from "node:crypto";
import type { AuditEntry, HashableAuditEntry } from "./audit.js";

/**
 * Canonicalizes a value into a stable JSON string: object keys are sorted
 * recursively and `undefined` values are dropped (so a field that is
 * `undefined` serializes identically to a field that is missing entirely).
 * Arrays preserve their order. `null` is preserved as-is (distinct from
 * `undefined`/missing).
 */
export function canonicalize(value: unknown): string {
  return stringify(value);
}

function stringify(value: unknown): string {
  if (value === undefined) {
    // Callers at the top level get the literal string "undefined" from
    // JSON.stringify(undefined); canonicalize() should never be called with
    // undefined as the root value in practice, but keep this defined.
    return "undefined";
  }

  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => (item === undefined ? "null" : stringify(item))).join(",")}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

  const body = entries.map(([k, v]) => `${JSON.stringify(k)}:${stringify(v)}`).join(",");
  return `{${body}}`;
}

/**
 * Computes a deterministic SHA-256 hex digest over the canonical
 * serialization of `value`.
 */
export function sha256Hash(value: unknown): string {
  return createHash("sha256").update(canonicalize(value)).digest("hex");
}

/**
 * Derives the deterministic `sha256Hash` for an `AuditEntry`, hashing every
 * field except `sha256Hash` itself.
 */
export function hashAuditEntry(entry: HashableAuditEntry): string {
  return sha256Hash(entry);
}

/**
 * Computes the manifest `entriesDigest` for an export: SHA-256 over the canonical list of
 * `{ auditId, sha256Hash }` pairs, sorted by `auditId` with plain code-unit comparison.
 *
 * Deliberately not `localeCompare`: ICU collation differs between hosts, Node builds and `LANG`
 * settings, which would make an export signed on one machine fail digest validation on another.
 * For lowercase ASCII UUIDs the order (and therefore the digest) is unchanged, so existing
 * bundles still verify.
 */
export function computeEntriesDigest(entries: readonly Pick<AuditEntry, "auditId" | "sha256Hash">[]): string {
  const sorted = entries
    .map((entry) => ({ auditId: entry.auditId, sha256Hash: entry.sha256Hash }))
    .sort((a, b) => (a.auditId < b.auditId ? -1 : a.auditId > b.auditId ? 1 : 0));
  return sha256Hash(sorted);
}
