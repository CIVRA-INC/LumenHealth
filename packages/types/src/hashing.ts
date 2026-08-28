import { createHash } from "node:crypto";
import type { HashableAuditEntry } from "./audit.js";

/**
 * Maximum nesting depth and total node count `canonicalize` will process.
 * `before`/`after` on an audit entry are arbitrary caller-supplied objects and
 * `canonicalize` runs on the hot `recordAudit` write path, so an unbounded
 * deeply-nested or enormous object would be an easy CPU/stack DoS vector — the
 * limits reject such input up front (see issue #1027). The bounds are far above
 * any legitimate audit patch.
 */
export const CANONICALIZE_MAX_DEPTH = 64;
export const CANONICALIZE_MAX_NODES = 10_000;

/** Thrown when a value exceeds `CANONICALIZE_MAX_DEPTH` or `CANONICALIZE_MAX_NODES`. */
export class CanonicalizeLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CanonicalizeLimitError";
  }
}

/**
 * Canonicalizes a value into a stable JSON string: object keys are sorted
 * recursively and `undefined` values are dropped (so a field that is
 * `undefined` serializes identically to a field that is missing entirely).
 * Arrays preserve their order. `null` is preserved as-is (distinct from
 * `undefined`/missing).
 *
 * Throws {@link CanonicalizeLimitError} if the value is nested deeper than
 * `CANONICALIZE_MAX_DEPTH` or contains more than `CANONICALIZE_MAX_NODES`
 * nodes.
 */
export function canonicalize(value: unknown): string {
  return stringify(value, 0, { nodes: 0 });
}

function stringify(value: unknown, depth: number, counter: { nodes: number }): string {
  if (depth > CANONICALIZE_MAX_DEPTH) {
    throw new CanonicalizeLimitError(`value exceeds maximum canonicalization depth of ${CANONICALIZE_MAX_DEPTH}`);
  }
  if (++counter.nodes > CANONICALIZE_MAX_NODES) {
    throw new CanonicalizeLimitError(`value exceeds maximum canonicalization size of ${CANONICALIZE_MAX_NODES} nodes`);
  }

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
    return `[${value.map((item) => (item === undefined ? "null" : stringify(item, depth + 1, counter))).join(",")}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

  const body = entries.map(([k, v]) => `${JSON.stringify(k)}:${stringify(v, depth + 1, counter)}`).join(",");
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
