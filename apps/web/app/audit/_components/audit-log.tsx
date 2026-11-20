"use client";

import { useCallback, useEffect, useState } from "react";
import type { AuditAction, AuditEntry, AuditVerifyResponse } from "@lumen/types";
import { useAuthSession } from "../../auth/session-provider";
import { CopyButton } from "../../components/copy-button";
import { fetchAuditLog, verifyAuditEntry } from "../api";
import { useAuditExport } from "../use-audit-export";

type Status = "loading" | "idle" | "error";
type VerifyState = AuditVerifyResponse | "loading" | "error";

/** Filter inputs. `draft` follows the form; `applied` is what the table shows and what Export uses. */
type AuditFilters = { action: AuditAction | ""; actor: string; from: string; to: string };
const NO_FILTERS: AuditFilters = { action: "", actor: "", from: "", to: "" };

const AUDIT_ACTIONS: AuditAction[] = [
  "staff.invited",
  "staff.invitation_accepted",
  "staff.invitation_revoked",
  "staff.role_changed",
  "staff.deactivated",
  "staff.reactivated",
  "clinic.updated",
  "clinic.archived",
  "auth.password_reset_requested",
  "auth.password_reset_completed",
  "batch.anchored",
];

const STELLAR_TESTNET_EXPLORER = "https://stellar.expert/explorer/testnet/tx";

function isResolvedVerify(state: VerifyState | undefined): state is AuditVerifyResponse {
  return typeof state === "object" && state !== null;
}

function VerificationBadge({ state }: { state: VerifyState | undefined }) {
  if (!state || state === "loading") {
    return <span className="verifyBadge verifyBadge--pending">Checking&hellip;</span>;
  }
  if (state === "error") {
    return <span className="verifyBadge verifyBadge--unknown">Unable to check</span>;
  }
  if (state.status === "verified") {
    return <span className="verifyBadge verifyBadge--verified">Anchored &amp; Verified</span>;
  }
  if (state.status === "unanchored") {
    return <span className="verifyBadge verifyBadge--unanchored">Pending Anchor</span>;
  }
  return <span className="verifyBadge verifyBadge--tampered">&#9888; Tampered</span>;
}

export function AuditLog() {
  const { session } = useAuthSession();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<Status>(session ? "loading" : "idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [verifyResults, setVerifyResults] = useState<Record<string, VerifyState>>({});
  const [selectedAuditId, setSelectedAuditId] = useState<string | null>(null);
  // "idle" alone cannot mean "loaded": the first hydration render has no session, so the empty
  // state would flash before the first request even starts (#1498).
  const [hasLoaded, setHasLoaded] = useState(false);

  const [draftFilters, setDraftFilters] = useState<AuditFilters>(NO_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<AuditFilters>(NO_FILTERS);

  const { status: exportStatus, message: exportMessage, exportLog } = useAuditExport(session);

  const canView = session?.role === "owner" || session?.role === "admin";

  const loadEntries = useCallback(
    (filters: AuditFilters) => {
    if (!session || !canView) return;
    setStatus("loading");
    setErrorMessage("");
    setVerifyResults({});
    setSelectedAuditId(null);

    fetchAuditLog(
      {
        action: filters.action || undefined,
        actorId: filters.actor || undefined,
        from: filters.from || undefined,
        to: filters.to || undefined,
      },
      session.accessToken,
    )
      .then((result) => {
        setEntries(result.entries);
        setTotal(result.total);
        setHasLoaded(true);
        setStatus("idle");
      })
      .catch((err) => {
        setErrorMessage(err instanceof Error ? err.message : "Failed to load audit log");
        setStatus("error");
      });
    },
    [session, canView],
  );

  useEffect(() => {
    loadEntries(appliedFilters);
    // Filters are applied explicitly via the form's submit button, not on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, canView]);

  useEffect(() => {
    if (!session || entries.length === 0) return;
    // One controller per batch: replacing the table or unmounting aborts every outstanding verify request.
    const controller = new AbortController();

    entries.forEach((entry) => {
      setVerifyResults((prev) => ({ ...prev, [entry.auditId]: "loading" }));

      verifyAuditEntry(entry.auditId, session.accessToken, { signal: controller.signal })
        .then((result) => {
          setVerifyResults((prev) => ({ ...prev, [entry.auditId]: result }));
        })
        .catch((err: unknown) => {
          if (isAbortError(err)) return;
          setVerifyResults((prev) => ({ ...prev, [entry.auditId]: "error" }));
        });
    });

    return () => controller.abort();
  }, [entries, session]);

  // Export uses the *applied* range, so it always matches the table the user is looking at.
  const handleExport = useCallback(() => {
    void exportLog({ from: appliedFilters.from || undefined, to: appliedFilters.to || undefined });
  }, [exportLog, appliedFilters]);

  if (!session) {
    return <p className="authLead">Sign in to view the audit log.</p>;
  }

  if (!canView) {
    return <p className="authLead">Only owners and admins can view the audit log.</p>;
  }

  const selectedEntry = entries.find((e) => e.auditId === selectedAuditId) ?? null;
  const selectedVerify = selectedAuditId ? verifyResults[selectedAuditId] : undefined;
  const selectedIsTampered = isResolvedVerify(selectedVerify) && selectedVerify.status === "tampered";

  return (
    <div className="auditLog">
      <form
        className="auditFilters"
        onSubmit={(e) => {
          e.preventDefault();
          setAppliedFilters(draftFilters);
          loadEntries(draftFilters);
        }}
      >
        <label>
          Action
          <select
            value={draftFilters.action}
            onChange={(e) => setDraftFilters((f) => ({ ...f, action: e.target.value as AuditAction | "" }))}
          >
            <option value="">All actions</option>
            {AUDIT_ACTIONS.map((action) => (
              <option key={action} value={action}>
                {action}
              </option>
            ))}
          </select>
        </label>

        <label>
          Actor ID
          <input
            type="text"
            value={draftFilters.actor}
            onChange={(e) => setDraftFilters((f) => ({ ...f, actor: e.target.value }))}
            placeholder="user-id"
          />
        </label>

        <label>
          From
          <input
            type="date"
            value={draftFilters.from}
            onChange={(e) => setDraftFilters((f) => ({ ...f, from: e.target.value }))}
          />
        </label>

        <label>
          To
          <input
            type="date"
            value={draftFilters.to}
            onChange={(e) => setDraftFilters((f) => ({ ...f, to: e.target.value }))}
          />
        </label>

        <button type="submit">Apply filters</button>
      </form>

      <div className="auditExport">
        <button type="button" onClick={handleExport} disabled={exportStatus === "exporting"}>
          {exportStatus === "exporting" ? "Preparing export…" : "Export compliance report"}
        </button>
        {exportStatus === "success" && <span className="muted">{exportMessage}</span>}
        {exportStatus === "error" && <span className="muted">{exportMessage}</span>}
        <p className="muted" data-testid="export-scope">
          Export covers: {appliedFilters.from ? `from ${appliedFilters.from}` : "from the beginning"}{" "}
          {appliedFilters.to ? `to ${appliedFilters.to}` : "to now"}. Action and actor filters are not part of
          exports.
        </p>
      </div>

      {(status === "loading" || (status === "idle" && !hasLoaded)) && (
        <p className="authLead">Loading audit log&hellip;</p>
      )}

      {status === "error" && (
        <div className="authStatus">
          <p>{errorMessage}</p>
        </div>
      )}

      {status === "idle" && hasLoaded && entries.length === 0 && (
        <p className="authLead">No audit entries match these filters.</p>
      )}

      {status === "idle" && hasLoaded && entries.length > 0 && (
        <>
          <table className="auditTable">
            <thead>
              <tr>
                <th>Date</th>
                <th>Action</th>
                <th>Actor</th>
                <th>Target</th>
                <th>Verification</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => {
                const verifyState = verifyResults[entry.auditId];
                const isTampered = isResolvedVerify(verifyState) && verifyState.status === "tampered";
                return (
                  <tr
                    key={entry.auditId}
                    className={isTampered ? "auditRow auditRow--tampered" : "auditRow"}
                    onClick={() => setSelectedAuditId(entry.auditId)}
                  >
                    <td>{new Date(entry.createdAt).toLocaleString()}</td>
                    <td>{entry.action}</td>
                    <td>{entry.actorId}</td>
                    <td>{entry.targetId ?? <span className="muted">&mdash;</span>}</td>
                    <td>
                      <VerificationBadge state={verifyState} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="muted">{total} total entries</p>
        </>
      )}

      {selectedEntry && (
        <div className={selectedIsTampered ? "auditDetail auditDetail--tampered" : "auditDetail"}>
          <div className="auditDetailHeader">
            <h2>Chain of custody</h2>
            <button type="button" className="secondary" onClick={() => setSelectedAuditId(null)}>
              Close
            </button>
          </div>

          <p>
            <strong>Audit ID:</strong> {selectedEntry.auditId}{" "}
            <CopyButton value={selectedEntry.auditId} label="Copy audit ID" />
          </p>
          <p>
            <strong>Action:</strong> {selectedEntry.action}
          </p>
          <p>
            <strong>Recorded hash:</strong> <code>{selectedEntry.sha256Hash}</code>{" "}
            <CopyButton value={selectedEntry.sha256Hash} label="Copy recorded hash" />
          </p>

          {!selectedVerify || selectedVerify === "loading" ? (
            <p className="authLead">Checking verification status&hellip;</p>
          ) : selectedVerify === "error" ? (
            <div className="authStatus">
              <p>Unable to reach the verification service.</p>
            </div>
          ) : (
            <>
              <p>
                <strong>Status:</strong> <VerificationBadge state={selectedVerify} />
              </p>
              {selectedVerify.reason && <p className="muted">{selectedVerify.reason}</p>}

              {selectedVerify.status === "unanchored" ? (
                <p className="authLead">
                  This entry hasn&apos;t been included in a Stellar anchor batch yet.
                </p>
              ) : (
                <>
                  <p>
                    <strong>Anchored:</strong>{" "}
                    {selectedVerify.anchorMode === "immediate" ? (
                      <span className="anchorModeBadge anchorModeBadge--immediate">
                        Immediately (critical action)
                      </span>
                    ) : (
                      <span className="anchorModeBadge anchorModeBadge--batched">Routine batch</span>
                    )}
                  </p>
                  <p>
                    <strong>Stellar transaction:</strong>{" "}
                    {selectedVerify.stellarTxHash ? (
                      <>
                        <a
                          href={`${STELLAR_TESTNET_EXPLORER}/${selectedVerify.stellarTxHash}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {selectedVerify.stellarTxHash}
                        </a>{" "}
                        <CopyButton value={selectedVerify.stellarTxHash} label="Copy Stellar transaction hash" />
                      </>
                    ) : (
                      <span className="muted">&mdash;</span>
                    )}
                  </p>
                  <p>
                    <strong>Merkle root:</strong> <code>{selectedVerify.merkleRoot}</code>
                    {selectedVerify.merkleRoot ? (
                      <>
                        {" "}
                        <CopyButton value={selectedVerify.merkleRoot} label="Copy Merkle root" />
                      </>
                    ) : null}
                  </p>
                  <div>
                    <strong>Merkle proof</strong>
                    {selectedEntry.merkleProof && selectedEntry.merkleProof.length > 0 ? (
                      <ol className="merkleProof">
                        {selectedEntry.merkleProof.map((step, index) => (
                          <li key={index}>
                            <span className="merkleProofPosition">{step.position}</span>
                            <code>{step.hash}</code>{" "}
                            <CopyButton value={step.hash} label={`Copy proof step ${index + 1} hash`} />
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <p className="muted">
                        This entry was the sole leaf in its batch (no sibling hashes needed).
                      </p>
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
