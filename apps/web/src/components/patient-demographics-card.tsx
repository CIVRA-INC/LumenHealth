import React, { useState } from 'react';
import type { PatientDemographicRecord } from '@qyou/shared';
import { PatientDemographicsForm } from './patient-demographics-form';

interface PatientDemographicsCardProps {
  record: PatientDemographicRecord;
  onSave?: (data: PatientDemographicRecord) => void;
}

const genderLabel: Record<string, string> = {
  male: 'Male',
  female: 'Female',
  non_binary: 'Non-Binary',
  other: 'Other',
  prefer_not_to_say: 'Prefer Not to Say',
};

export function PatientDemographicsCard({ record, onSave }: PatientDemographicsCardProps) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <div style={{ padding: '16px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff' }}>
        <PatientDemographicsForm
          initialData={record}
          onSubmit={(data) => {
            onSave?.(data);
            setEditing(false);
          }}
          onCancel={() => setEditing(false)}
        />
      </div>
    );
  }

  return (
    <div style={{ padding: '16px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h3 style={{ margin: 0, fontSize: '16px', color: '#1e293b' }}>Patient Demographics</h3>
        <button
          onClick={() => setEditing(true)}
          style={{ padding: '6px 12px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}
        >
          Edit
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '14px' }}>
        <div>
          <span style={{ color: '#64748b', fontSize: '12px' }}>First Name</span>
          <div style={{ color: '#1e293b' }}>{record.firstName}</div>
        </div>
        <div>
          <span style={{ color: '#64748b', fontSize: '12px' }}>Last Name</span>
          <div style={{ color: '#1e293b' }}>{record.lastName}</div>
        </div>
        <div>
          <span style={{ color: '#64748b', fontSize: '12px' }}>Date of Birth</span>
          <div style={{ color: '#1e293b' }}>{record.dateOfBirth}</div>
        </div>
        <div>
          <span style={{ color: '#64748b', fontSize: '12px' }}>Gender</span>
          <div style={{ color: '#1e293b' }}>{genderLabel[record.gender] ?? record.gender}</div>
        </div>
        <div>
          <span style={{ color: '#64748b', fontSize: '12px' }}>Blood Type</span>
          <div style={{ color: '#1e293b' }}>{record.bloodType ?? '—'}</div>
        </div>
      </div>
      <div style={{ marginTop: '12px', padding: '10px', background: '#f8fafc', borderRadius: '6px', fontSize: '13px' }}>
        <span style={{ color: '#64748b', fontSize: '12px' }}>Emergency Contact</span>
        <div style={{ color: '#1e293b', marginTop: '4px' }}>
          {record.emergencyContact.name} ({record.emergencyContact.relationship}) — {record.emergencyContact.phoneNumber}
        </div>
      </div>
    </div>
  );
}
