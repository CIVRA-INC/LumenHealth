"use client";

import { useCallback, useRef, useState } from "react";
import type { AuditExportBundle, AuditExportVerifyReport } from "@lumen/types";
import { verifyExportBundle } from "../api";

type Status = "idle" | "reading" | "verifying" | "done" | "error";

function parseBundle(raw: string): AuditExportBundle {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("That file isn't valid JSON.");
  }

  const b = parsed as Partial<AuditExportBundle>;
  if (
    !b ||
    typeof b !== "object" ||
    typeof b.signature !== "string" ||
    typeof b.signingPublicKey !== "string" ||
    !Array.isArray(b.entries) ||
    !b.manifest
  ) {
    throw new Error("That file doesn't look like a LumenHealth compliance export bundle.");
  }

  return parsed as AuditExportBundle;
}

export function VerifyExportPortal() {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [fileName, setFileName] = useState("");
  const [report, setReport] = useState<AuditExportVerifyReport | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const runVerification = useCallback((file: File) => {
    setStatus("reading");
    setErrorMessage("");
    setReport(null);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const bundle = parseBundle(String(reader.result));
        setStatus("verifying");
        verifyExportBundle(bundle)
          .then((result) => {
            setReport(result);
            setStatus("done");
          })
          .catch((err: unknown) => {
            setErrorMessage(err instanceof Error ? err.message : "Verification request failed.");
            setStatus("error");
          });
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : "Could not read that file.");
        setStatus("error");
      }
    };
    reader.onerror = () => {
      setErrorMessage("Could not read that file.");
      setStatus("error");
    };
    reader.readAsText(file);
  }, []);

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) runVerification(file);
    },
    [runVerification],
  );

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const file = event.dataTransfer.files?.[0];
      if (file) runVerification(file);
    },
    [runVerification],
  );

  const reset = useCallback(() => {
    setStatus("idle");
    setErrorMessage("");
    setReport(null);
    setFileName("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const isBusy = status === "reading" || status === "verifying";

  return (
    <div className="verifyPortal">
      <div
        className="verifyDropzone"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        data-testid="verify-dropzone"
      >
        <p className="verifyDropzoneLead">
          Drop a LumenHealth compliance export bundle here, or choose a file.
        </p>
        <p className="authLead">
          Verification runs entirely against public Stellar testnet state — no LumenHealth account
          or login is required.
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          onChange={handleFileChange}
          disabled={isBusy}
          aria-label="Compliance export bundle file"
        />
      </div>

      {fileName ? <p className="verifyFileName">File: {fileName}</p> : null}

      {isBusy ? <p role="status">{status === "reading" ? "Reading file…" : "Verifying against Stellar…"}</p> : null}

      {status === "error" ? (
        <p className="formError" role="alert">
          {errorMessage}
        </p>
      ) : null}

      {status === "done" && report ? <VerificationReportView report={report} onReset={reset} /> : null}
    </div>
  );
}

function VerificationReportView({
  report,
  onReset,
}: {
  report: AuditExportVerifyReport;
  onReset: () => void;
}) {
  return (
    <div className={`verifyReport ${report.ok ? "verifyReport--ok" : "verifyReport--failed"}`}>
      <div className="verifyReportHeader">
        <h2>{report.ok ? "Verified — no tampering detected" : "Verification failed"}</h2>
        <button type="button" onClick={onReset}>
          Check another file
        </button>
      </div>

      <dl className="verifySummary">
        <div>
          <dt>Clinic</dt>
          <dd>{report.clinicId}</dd>
        </div>
        <div>
          <dt>Manifest signature</dt>
          <dd>{report.signatureValid ? "Valid" : "Invalid"}</dd>
        </div>
        <div>
          <dt>Entries digest</dt>
          <dd>{report.entriesDigestValid ? "Matches" : "Mismatch"}</dd>
        </div>
        <div>
          <dt>Entries</dt>
          <dd>
            {report.verifiedCount} verified, {report.unanchoredCount} unanchored, {report.tamperedCount}{" "}
            tampered ({report.results.length} total)
          </dd>
        </div>
      </dl>

      <table className="auditTable">
        <thead>
          <tr>
            <th>Audit ID</th>
            <th>Action</th>
            <th>Status</th>
            <th>Reason</th>
          </tr>
        </thead>
        <tbody>
          {report.results.map((result) => (
            <tr key={result.auditId} className={result.status === "tampered" ? "auditRow--tampered" : undefined}>
              <td>{result.auditId}</td>
              <td>{result.action}</td>
              <td>
                <span className={`verifyBadge verifyBadge--${badgeVariant(result.status)}`}>
                  {badgeLabel(result.status)}
                </span>
              </td>
              <td>{result.reason ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function badgeVariant(status: string): string {
  if (status === "verified") return "verified";
  if (status === "unanchored") return "unanchored";
  return "tampered";
}

function badgeLabel(status: string): string {
  if (status === "verified") return "Verified";
  if (status === "unanchored") return "Pending Anchor";
  return "Tampered";
}
