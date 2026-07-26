"use client";

import React, { useState } from "react";
import type { DocumentCategory } from "@qyou/shared";

interface PatientDocumentUploadProps {
  patientId: string;
  onUpload?: (payload: {
    title: string;
    category: DocumentCategory;
    attachment: { fileName: string; fileSizeBytes: number; mimeType: string; checksum: string };
    notes?: string;
  }) => void;
}

export function PatientDocumentUpload({ patientId, onUpload }: PatientDocumentUploadProps) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<DocumentCategory>("lab_report");
  const [notes, setNotes] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState(0);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      setFileSize(file.size);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !fileName) return;

    onUpload?.({
      title,
      category,
      attachment: {
        fileName,
        fileSizeBytes: fileSize,
        mimeType: "application/octet-stream",
        checksum: "",
      },
      notes: notes || undefined,
    });

    setTitle("");
    setNotes("");
    setFileName("");
    setFileSize(0);
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        padding: "16px",
        border: "1px dashed #cbd5e1",
        borderRadius: "8px",
        background: "#f8fafc",
      }}
    >
      <h4 style={{ margin: "0 0 12px 0", fontSize: "14px", color: "#1e293b" }}>
        Upload Patient Document
      </h4>
      <input
        type="text"
        placeholder="Document Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        style={{
          width: "100%",
          padding: "8px",
          marginBottom: "8px",
          borderRadius: "4px",
          border: "1px solid #cbd5e1",
          boxSizing: "border-box",
        }}
      />
      <select
        value={category}
        onChange={(e) => setCategory(e.target.value as DocumentCategory)}
        style={{
          width: "100%",
          padding: "8px",
          marginBottom: "8px",
          borderRadius: "4px",
          border: "1px solid #cbd5e1",
          boxSizing: "border-box",
        }}
      >
        <option value="lab_report">Lab Report</option>
        <option value="prescription">Prescription</option>
        <option value="imaging">Imaging</option>
        <option value="discharge_summary">Discharge Summary</option>
        <option value="other">Other</option>
      </select>
      <textarea
        placeholder="Notes (optional)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={3}
        style={{
          width: "100%",
          padding: "8px",
          marginBottom: "8px",
          borderRadius: "4px",
          border: "1px solid #cbd5e1",
          boxSizing: "border-box",
          resize: "vertical",
        }}
      />
      <input
        type="file"
        onChange={handleFileChange}
        style={{ marginBottom: "12px", fontSize: "13px" }}
      />
      <br />
      <button
        type="submit"
        disabled={!title || !fileName}
        style={{
          padding: "8px 16px",
          background: title && fileName ? "#2563eb" : "#94a3b8",
          color: "#fff",
          border: "none",
          borderRadius: "4px",
          cursor: title && fileName ? "pointer" : "not-allowed",
        }}
      >
        Upload Document
      </button>
    </form>
  );
}
