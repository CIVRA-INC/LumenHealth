import React, { useState } from 'react';

interface DocumentUploadFormProps {
  patientId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const DOC_TYPES = [
  { value: 'lab_result',       label: 'Lab Result' },
  { value: 'prescription',     label: 'Prescription' },
  { value: 'imaging',          label: 'Imaging / Scan' },
  { value: 'discharge_summary',label: 'Discharge Summary' },
  { value: 'consent_form',     label: 'Consent Form' },
  { value: 'other',            label: 'Other' },
];

export function DocumentUploadForm({ patientId, onSuccess, onCancel }: DocumentUploadFormProps) {
  const [file, setFile] = useState<File | null>(null);
  const [docType, setDocType] = useState('other');
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) { setError('Please select a file'); return; }
    setUploading(true); setError(null);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('documentType', docType);
      form.append('description', description);
      const res = await fetch(`/api/patients/${patientId}/documents`, {
        method: 'POST', body: form,
      });
      if (!res.ok) throw new Error(await res.text());
      onSuccess?.();
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">File</label>
        <input type="file" onChange={e => setFile(e.target.files?.[0] || null)}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"/>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Document Type</label>
        <select value={docType} onChange={e => setDocType(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          {DOC_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
          className="w-full border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"/>
      </div>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={uploading}
          className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition">
          {uploading ? 'Uploading...'  : 'Upload'}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel}
            className="px-5 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
export default DocumentUploadForm;
