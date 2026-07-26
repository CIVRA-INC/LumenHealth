import React from 'react';
import type { PatientDemographicRecord, GenderCategory } from '@qyou/shared';
import { patientDemographicRecordSchema } from '@qyou/shared';

interface PatientDemographicsFormProps {
  initialData: PatientDemographicRecord;
  onSubmit: (data: PatientDemographicRecord) => void;
  onCancel: () => void;
}

const genderOptions: { value: GenderCategory; label: string }[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'non_binary', label: 'Non-Binary' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer Not to Say' },
];

export function PatientDemographicsForm({ initialData, onSubmit, onCancel }: PatientDemographicsFormProps) {
  const [formData, setFormData] = React.useState<PatientDemographicRecord>({ ...initialData });
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  function handleChange(field: string, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  function handleContactChange(field: string, value: string) {
    setFormData((prev) => ({
      ...prev,
      emergencyContact: { ...prev.emergencyContact, [field]: value },
    }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[`emergencyContact.${field}`];
      return next;
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = patientDemographicRecordSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const path = issue.path.join('.');
        if (path && !fieldErrors[path]) {
          fieldErrors[path] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return;
    }
    onSubmit(result.data);
  }

  const inputStyle: React.CSSProperties = { width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1', boxSizing: 'border-box' };
  const labelStyle: React.CSSProperties = { display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' };
  const errorStyle: React.CSSProperties = { color: '#dc2626', fontSize: '11px', marginTop: '2px' };

  return (
    <form onSubmit={handleSubmit}>
      <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#1e293b' }}>Edit Demographics</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <div>
          <label style={labelStyle}>First Name</label>
          <input style={inputStyle} value={formData.firstName} onChange={(e) => handleChange('firstName', e.target.value)} />
          {errors.firstName && <div style={errorStyle}>{errors.firstName}</div>}
        </div>
        <div>
          <label style={labelStyle}>Last Name</label>
          <input style={inputStyle} value={formData.lastName} onChange={(e) => handleChange('lastName', e.target.value)} />
          {errors.lastName && <div style={errorStyle}>{errors.lastName}</div>}
        </div>
        <div>
          <label style={labelStyle}>Date of Birth</label>
          <input style={inputStyle} type="date" value={formData.dateOfBirth} onChange={(e) => handleChange('dateOfBirth', e.target.value)} />
          {errors.dateOfBirth && <div style={errorStyle}>{errors.dateOfBirth}</div>}
        </div>
        <div>
          <label style={labelStyle}>Gender</label>
          <select style={inputStyle} value={formData.gender} onChange={(e) => handleChange('gender', e.target.value)}>
            {genderOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          {errors.gender && <div style={errorStyle}>{errors.gender}</div>}
        </div>
        <div>
          <label style={labelStyle}>Blood Type</label>
          <input style={inputStyle} value={formData.bloodType ?? ''} onChange={(e) => handleChange('bloodType', e.target.value)} placeholder="Optional" />
        </div>
      </div>
      <div style={{ marginTop: '12px', padding: '10px', background: '#f8fafc', borderRadius: '6px' }}>
        <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>Emergency Contact</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
          <div>
            <label style={labelStyle}>Name</label>
            <input style={inputStyle} value={formData.emergencyContact.name} onChange={(e) => handleContactChange('name', e.target.value)} />
            {errors['emergencyContact.name'] && <div style={errorStyle}>{errors['emergencyContact.name']}</div>}
          </div>
          <div>
            <label style={labelStyle}>Relationship</label>
            <input style={inputStyle} value={formData.emergencyContact.relationship} onChange={(e) => handleContactChange('relationship', e.target.value)} />
            {errors['emergencyContact.relationship'] && <div style={errorStyle}>{errors['emergencyContact.relationship']}</div>}
          </div>
          <div>
            <label style={labelStyle}>Phone</label>
            <input style={inputStyle} value={formData.emergencyContact.phoneNumber} onChange={(e) => handleContactChange('phoneNumber', e.target.value)} />
            {errors['emergencyContact.phoneNumber'] && <div style={errorStyle}>{errors['emergencyContact.phoneNumber']}</div>}
          </div>
        </div>
      </div>
      <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
        <button type="submit" style={{ padding: '8px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          Save
        </button>
        <button type="button" onClick={onCancel} style={{ padding: '8px 16px', background: '#e2e8f0', color: '#475569', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          Cancel
        </button>
      </div>
    </form>
  );
}
