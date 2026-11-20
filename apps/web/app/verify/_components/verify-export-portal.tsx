"use client";

import { useCallback, useRef, useState } from "react";
import type { AuditExportBundle, AuditExportVerifyReport } from "@lumen/types";
import { CopyButton } from "../../components/copy-button";
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
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Refs, not state: handlers must see "busy" immediately, not after the next render (#1507).
  const busyRef = useRef(false);
  const runIdRef = useRef(0);
  // The file behind the last attempt, so "Try again" can re-run it without re-picking (#1508).
  const lastFileRef = useRef<File | null>(null);

  const runVerification = useCallback((file: File) => {
    // Each run owns an id; completions from a superseded run are ignored so they can never
    // overwrite newer state or pair a report with the wrong file name.
    const runId = ++runIdRef.current;
    const isCurrent = () => runIdRef.current === runId;
    busyRef.current = true;
    lastFileRef.current = file;

    setStatus("reading");
    setErrorMessage("");
    setReport(null);
    setFileName(file.name);

    const fail = (message: string) => {
      busyRef.current = false;
      setErrorMessage(message);
      setStatus("error");
    };

    const reader = new FileReader();
    reader.onload = () => {
      if (!isCurrent()) return;
      try {
        const bundle = parseBundle(String(reader.result));
        setStatus("verifying");
        verifyExportBundle(bundle)
          .then((result) => {
            if (!isCurrent()) return;
            busyRef.current = false;
            setReport(result);
            setStatus("done");
          })
          .catch((err: unknown) => {
            if (!isCurrent()) return;
            fail(err instanceof Error ? err.message : "Verification request failed.");
          });
      } catch (err) {
        fail(err instanceof Error ? err.message : "Could not read that file.");
      }
    };
    reader.onerror = () => {
      if (!isCurrent()) return;
      fail("Could not read that file.");
    };
    reader.readAsText(file);
  }, []);

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const input = event.target;
      const file = input.files?.[0];
      // Clear the input so choosing the same file again fires another change event.
      input.value = "";
      if (file && !busyRef.current) runVerification(file);
    },
    [runVerification],
  );

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = busyRef.current ? "none" : "copy";
    if (!busyRef.current) setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => setIsDragging(false), []);

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDragging(false);
      // A second drop mid-verification would race the first one's result.
      if (busyRef.current) return;
      const file = event.dataTransfer.files?.[0];
      if (file) runVerification(file);
    },
    [runVerification],
  );

  const reset = useCallback(() => {
    runIdRef.current += 1;
    busyRef.current = false;
    lastFileRef.current = null;
    setStatus("idle");
    setErrorMessage("");
    setReport(null);
    setFileName("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const retry = useCallback(() => {
    const file = lastFileRef.current;
    if (file) runVerification(file);
    else reset();
  }, [runVerification, reset]);

  const isBusy = status === "reading" || status === "verifying";

  return (
    <div className="verifyPortal">
      <div
        className={isDragging ? "verifyDropzone verifyDropzone--active" : "verifyDropzone"}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
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
        <div>
          <p className="formError" role="alert">
            {errorMessage}
          </p>
          <button type="button" onClick={retry}>
            Try again
          </button>
        </div>
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
  // An empty bundle verifies "ok" vacuously; never present that as reassurance (#1509).
  const isEmpty = report.results.length === 0;
  const headline = isEmpty
    ? "Nothing to verify"
    : report.ok
      ? "Verified — no tampering detected"
      : "Verification failed";
  const variant = isEmpty ? "empty" : report.ok ? "ok" : "failed";

  return (
    <div className={`verifyReport verifyReport--${variant}`}>
      <div className="verifyReportHeader">
        {/* Live region so assistive tech announces the verdict when verification finishes. */}
        <div role="status" aria-live="polite">
          <h2>{headline}</h2>
          {isEmpty ? <p>This bundle contains no entries, so there was nothing to verify.</p> : null}
        </div>
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
          {isEmpty ? (
            <tr>
              <td colSpan={4}>No entries in this bundle.</td>
            </tr>
          ) : null}
          {report.results.map((result) => (
            <tr key={result.auditId} className={result.status === "tampered" ? "auditRow--tampered" : undefined}>
              <td>
                {result.auditId} <CopyButton value={result.auditId} label={`Copy audit ID ${result.auditId}`} />
              </td>
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
