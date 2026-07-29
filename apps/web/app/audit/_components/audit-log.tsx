"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AuditAction, AuditEntry, AuditVerifyResponse } from "@lumen/types";
import { useAuthSession } from "../../auth/session-provider";
import { exportAuditLog, fetchAuditLog, verifyAuditEntry } from "../api";

type Status = "loading" | "idle" | "error";
type VerifyState = AuditVerifyResponse | "loading" | "error";
type ExportStatus = "idle" | "exporting" | "success" | "error";

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

/** Date inputs have no time component; use the final millisecond to include the selected day. */
function endOfDay(value: string): string | undefined {
  return value ? `${value}T23:59:59.999Z` : undefined;
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

  const [actionFilter, setActionFilter] = useState<AuditAction | "">("");
  const [actorFilter, setActorFilter] = useState("");
  const [fromFilter, setFromFilter] = useState("");
  const [toFilter, setToFilter] = useState("");

  const [exportStatus, setExportStatus] = useState<ExportStatus>("idle");
  const [exportMessage, setExportMessage] = useState("");
  const latestLoadId = useRef(0);

  const canView = session?.role === "owner" || session?.role === "admin";

  const loadEntries = useCallback(() => {
    if (!session || !canView) return;
    const loadId = ++latestLoadId.current;
    setStatus("loading");
    setErrorMessage("");
    setVerifyResults({});
    setSelectedAuditId(null);

    fetchAuditLog(
      {
        action: actionFilter || undefined,
        actorId: actorFilter || undefined,
        from: fromFilter || undefined,
        to: endOfDay(toFilter),
      },
      session.accessToken,
    )
      .then((result) => {
        if (loadId !== latestLoadId.current) return;
        setEntries(result.entries);
        setTotal(result.total);
        setStatus("idle");
      })
      .catch((err) => {
        if (loadId !== latestLoadId.current) return;
        setErrorMessage(err instanceof Error ? err.message : "Failed to load audit log");
        setStatus("error");
      });
  }, [session, canView, actionFilter, actorFilter, fromFilter, toFilter]);

  useEffect(() => {
    loadEntries();
    // Filters are applied explicitly via the form's submit button, not on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, canView]);

  useEffect(() => {
    if (!session || entries.length === 0) return;
    let cancelled = false;

    entries.forEach((entry) => {
      setVerifyResults((prev) => ({ ...prev, [entry.auditId]: "loading" }));

      verifyAuditEntry(entry.auditId, session.accessToken)
        .then((result) => {
          if (cancelled) return;
          setVerifyResults((prev) => ({ ...prev, [entry.auditId]: result }));
        })
        .catch(() => {
          if (cancelled) return;
          setVerifyResults((prev) => ({ ...prev, [entry.auditId]: "error" }));
        });
    });

    return () => {
      cancelled = true;
    };
  }, [entries, session]);

  const handleExport = useCallback(async () => {
    if (!session) return;
    setExportStatus("exporting");
    setExportMessage("");

    try {
      const bundle = await exportAuditLog(
        { from: fromFilter || undefined, to: endOfDay(toFilter) },
        session.accessToken,
      );

      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `audit-export-${session.clinicId}-${bundle.manifest.generatedAt.slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setExportStatus("success");
      setExportMessage(
        `Downloaded ${bundle.manifest.entryCount} entries, signed and ready for independent verification.`,
      );
    } catch (err) {
      setExportMessage(err instanceof Error ? err.message : "Failed to export audit log");
      setExportStatus("error");
    }
  }, [session, fromFilter, toFilter]);

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
          loadEntries();
        }}
      >
        <label>
          Action
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value as AuditAction | "")}
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
            value={actorFilter}
            onChange={(e) => setActorFilter(e.target.value)}
            placeholder="user-id"
          />
        </label>

        <label>
          From
          <input type="date" value={fromFilter} onChange={(e) => setFromFilter(e.target.value)} />
        </label>

        <label>
          To
          <input type="date" value={toFilter} onChange={(e) => setToFilter(e.target.value)} />
        </label>

        <button type="submit">Apply filters</button>
      </form>

      <div className="auditExport">
        <button type="button" onClick={handleExport} disabled={exportStatus === "exporting"}>
          {exportStatus === "exporting" ? "Preparing export…" : "Export compliance report"}
        </button>
        {exportStatus === "success" && <span className="muted">{exportMessage}</span>}
        {exportStatus === "error" && <span className="muted">{exportMessage}</span>}
      </div>

      {status === "loading" && <p className="authLead">Loading audit log&hellip;</p>}

      {status === "error" && (
        <div className="authStatus">
          <p>{errorMessage}</p>
        </div>
      )}

      {status === "idle" && entries.length === 0 && (
        <p className="authLead">No audit entries match these filters.</p>
      )}

      {status === "idle" && entries.length > 0 && (
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
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedAuditId(entry.auditId)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelectedAuditId(entry.auditId);
                      }
                    }}
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
            <strong>Audit ID:</strong> {selectedEntry.auditId}
          </p>
          <p>
            <strong>Action:</strong> {selectedEntry.action}
          </p>
          <p>
            <strong>Recorded hash:</strong> <code>{selectedEntry.sha256Hash}</code>
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
              ) : selectedVerify.status === "tampered" ? (
                <p className="authLead">
                  Chain-of-custody details are withheld because this record failed verification.
                </p>
              ) : (
                <>
                  <p>
                    <strong>Stellar transaction:</strong>{" "}
                    {selectedVerify.stellarTxHash ? (
                      <a
                        href={`${STELLAR_TESTNET_EXPLORER}/${selectedVerify.stellarTxHash}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {selectedVerify.stellarTxHash}
                      </a>
                    ) : (
                      <span className="muted">&mdash;</span>
                    )}
                  </p>
                  <p>
                    <strong>Merkle root:</strong> <code>{selectedVerify.merkleRoot}</code>
                  </p>
                  <div>
                    <strong>Merkle proof</strong>
                    {selectedEntry.merkleProof && selectedEntry.merkleProof.length > 0 ? (
                      <ol className="merkleProof">
                        {selectedEntry.merkleProof.map((step, index) => (
                          <li key={index}>
                            <span className="merkleProofPosition">{step.position}</span>
                            <code>{step.hash}</code>
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