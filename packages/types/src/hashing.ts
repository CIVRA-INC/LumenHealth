import { createHash } from "node:crypto";
import type { HashableAuditEntry } from "./audit.js";

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
