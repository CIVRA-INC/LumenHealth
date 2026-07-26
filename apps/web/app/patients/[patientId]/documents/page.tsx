"use client";

import React, { useState, useEffect } from "react";
import type { PatientDocument, DocumentCategory } from "@qyou/shared";
import { PatientDocumentList } from "../../../../src/components/patient-document-list";
import { PatientDocumentUpload } from "../../../../src/components/patient-document-upload";
import {
  listPatientDocuments,
  uploadPatientDocument,
  deletePatientDocument,
} from "./api";

interface PatientDocumentsPageProps {
  patientId: string;
  token: string;
}

export default function PatientDocumentsPage({ patientId, token }: PatientDocumentsPageProps) {
  const [documents, setDocuments] = useState<PatientDocument[]>([]);
  const [filterCategory, setFilterCategory] = useState<DocumentCategory | "all">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDocuments = async () => {
    setLoading(true);
    setError(null);
    try {
      const docs = await listPatientDocuments(patientId, token);
      setDocuments(docs);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load documents");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [patientId]);

  const handleUpload = async (payload: {
    title: string;
    category: DocumentCategory;
    attachment: { fileName: string; fileSizeBytes: number; mimeType: string; checksum: string };
    notes?: string;
  }) => {
    try {
      await uploadPatientDocument(patientId, payload, token);
      await fetchDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    }
  };

  const handleDelete = async (documentId: string) => {
    try {
      await deletePatientDocument(patientId, documentId, token);
      await fetchDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const filteredDocuments =
    filterCategory === "all"
      ? documents
      : documents.filter((doc) => doc.category === filterCategory);

  return (
    <main style={{ maxWidth: "960px", margin: "0 auto", padding: "24px" }}>
      <h1 style={{ fontSize: "22px", fontWeight: 600, color: "#0f172a", marginBottom: "8px" }}>
        Patient Documents
      </h1>
      <p style={{ fontSize: "14px", color: "#64748b", marginBottom: "20px" }}>
        Manage and upload documents for this patient.
      </p>

      {error && (
        <div
          style={{
            padding: "10px 14px",
            marginBottom: "16px",
            background: "#fee2e2",
            color: "#b91c1c",
            borderRadius: "6px",
            fontSize: "13px",
          }}
        >
          {error}
        </div>
      )}

      <div style={{ marginBottom: "16px", display: "flex", gap: "12px", alignItems: "center" }}>
        <label style={{ fontSize: "13px", color: "#475569" }}>Filter by category:</label>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value as DocumentCategory | "all")}
          style={{
            padding: "6px 10px",
            borderRadius: "4px",
            border: "1px solid #cbd5e1",
            fontSize: "13px",
          }}
        >
          <option value="all">All</option>
          <option value="lab_report">Lab Report</option>
          <option value="prescription">Prescription</option>
          <option value="imaging">Imaging</option>
          <option value="discharge_summary">Discharge Summary</option>
          <option value="other">Other</option>
        </select>
      </div>

      {loading ? (
        <div style={{ padding: "24px", textAlign: "center", color: "#64748b" }}>Loading...</div>
      ) : (
        <PatientDocumentList documents={filteredDocuments} onDelete={handleDelete} />
      )}

      <div style={{ marginTop: "24px" }}>
        <PatientDocumentUpload patientId={patientId} onUpload={handleUpload} />
      </div>
    </main>
  );
}
