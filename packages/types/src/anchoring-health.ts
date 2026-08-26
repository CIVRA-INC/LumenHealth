/**
 * Operational health of the anchoring pipeline itself — distinct from
 * per-entry verification status (`AuditVerifyResponse`). Answers "is the
 * mechanism that anchors audit entries actually working right now?" rather
 * than "was this one entry anchored correctly?".
 */
export type AnchoringHealthReport = {
  /** ISO timestamp of the last scheduled or reconciliation tick that completed without throwing. Null before the first tick. */
  lastSuccessfulTickAt: string | null;
  /** ISO timestamp of the last tick that actually anchored a batch (as opposed to finding nothing to anchor). Null if none yet. */
  lastAnchorAt: string | null;
  /** Consecutive batch-attempt failures since the last successful tick. Resets to 0 on any successful tick. */
  consecutiveFailureCount: number;
  /** Audit entries currently unanchored. */
  unanchoredCount: number;
  /** Age, in ms, of the oldest currently-unanchored entry. Null when nothing is unanchored. */
  oldestUnanchoredAgeMs: number | null;
  /** Anchor results that succeeded on-chain but are still waiting to be persisted back to apps/api. */
  pendingPersistCount: number;
  checkedAt: string;
};
