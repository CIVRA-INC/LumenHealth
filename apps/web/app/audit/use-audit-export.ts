"use client";

import { useCallback, useState } from "react";
import type { AuthSession } from "@lumen/types";
import { downloadJson } from "../../lib/download";
import { exportAuditLog, type AuditExportFilters } from "./api";

export type ExportStatus = "idle" | "exporting" | "success" | "error";

/** Fetches a signed compliance export for the signed-in clinic and saves it as a JSON file. */
export function useAuditExport(session: AuthSession | null) {
  const [status, setStatus] = useState<ExportStatus>("idle");
  const [message, setMessage] = useState("");

  const exportLog = useCallback(
    async (filters: AuditExportFilters) => {
      if (!session) return;
      setStatus("exporting");
      setMessage("");

      try {
        const bundle = await exportAuditLog(filters, session.accessToken);
        downloadJson(`audit-export-${session.clinicId}-${bundle.manifest.generatedAt.slice(0, 10)}.json`, bundle);
        setStatus("success");
        setMessage(`Downloaded ${bundle.manifest.entryCount} entries, signed and ready for independent verification.`);
      } catch (err) {
        setMessage(err instanceof Error ? err.message : "Failed to export audit log");
        setStatus("error");
      }
    },
    [session],
  );

  return { status, message, exportLog };
}
