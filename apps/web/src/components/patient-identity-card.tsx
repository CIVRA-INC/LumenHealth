import React from 'react';
import type { PatientIdentity } from '@qyou/shared';

interface PatientIdentityCardProps {
  patient: PatientIdentity;
}

export function PatientIdentityCard({ patient }: PatientIdentityCardProps) {
  const statusColor =
    patient.status === 'active'
      ? '#15803d'
      : patient.status === 'deceased'
        ? '#b91c1c'
        : patient.status === 'pending_verification'
          ? '#b45309'
          : '#64748b';

  return (
    <div style={{ padding: '16px 20px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#0f172a' }}>
            {patient.firstName} {patient.lastName}
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>MRN: {patient.mrn}</p>
        </div>
        <span
          style={{
            padding: '4px 10px',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: 'bold',
            color: statusColor,
            background: statusColor + '14',
          }}
        >
          {patient.status.replace('_', ' ').toUpperCase()}
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '13px', color: '#334155' }}>
        <div>
          <span style={{ color: '#64748b' }}>Date of Birth: </span>
          {patient.dateOfBirth}
        </div>
        <div>
          <span style={{ color: '#64748b' }}>Gender: </span>
          {patient.gender.replace('_', ' ')}
        </div>
      </div>
    </div>
  );
}
