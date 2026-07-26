"use client";

import React from "react";
import type { PatientDocument, DocumentCategory } from "@qyou/shared";

interface PatientDocumentListProps {
  documents: PatientDocument[];
  onDelete?: (documentId: string) => void;
}

const CATEGORY_LABELS: Record<DocumentCategory, string> = {
  lab_report: "Lab Report",
  prescription: "Prescription",
  imaging: "Imaging",
  discharge_summary: "Discharge Summary",
  other: "Other",
};

export function PatientDocumentList({ documents, onDelete }: PatientDocumentListProps) {
  if (documents.length === 0) {
    return (
      <div style={{ padding: "24px", textAlign: "center", color: "#64748b" }}>
        No documents found.
      </div>
    );
  }

  return (
    <div style={{ width: "100%" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
        <thead>
          <tr style={{ borderBottom: "2px solid #e2e8f0", textAlign: "left" }}>
            <th style={{ padding: "10px 12px", color: "#475569" }}>Title</th>
            <th style={{ padding: "10px 12px", color: "#475569" }}>Category</th>
            <th style={{ padding: "10px 12px", color: "#475569" }}>Uploaded</th>
            <th style={{ padding: "10px 12px", color: "#475569" }}>File</th>
            <th style={{ padding: "10px 12px", color: "#475569" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {documents.map((doc) => (
            <tr
              key={doc.id}
              style={{ borderBottom: "1px solid #f1f5f9", transition: "background 0.15s" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <td style={{ padding: "10px 12px", fontWeight: 500, color: "#0f172a" }}>
                {doc.title}
              </td>
              <td style={{ padding: "10px 12px" }}>
                <span
                  style={{
                    display: "inline-block",
                    padding: "2px 8px",
                    borderRadius: "4px",
                    fontSize: "12px",
                    fontWeight: 500,
                    background: "#eff6ff",
                    color: "#1d4ed8",
                  }}
                >
                  {CATEGORY_LABELS[doc.category]}
                </span>
              </td>
              <td style={{ padding: "10px 12px", color: "#64748b" }}>
                {new Date(doc.uploadedAt).toLocaleDateString()}
              </td>
              <td style={{ padding: "10px 12px", color: "#64748b", fontSize: "13px" }}>
                {doc.attachment.fileName}
              </td>
              <td style={{ padding: "10px 12px" }}>
                {onDelete && (
                  <button
                    onClick={() => onDelete(doc.id)}
                    style={{
                      padding: "4px 10px",
                      fontSize: "12px",
                      background: "#fee2e2",
                      color: "#b91c1c",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                    }}
                  >
                    Delete
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
