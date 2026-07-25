import React from 'react';

interface PatientConsentStatusBadgeProps {
  status?: 'granted' | 'revoked' | 'pending';
  scopeName?: string;
}

export function PatientConsentStatusBadge({
  status = 'granted',
  scopeName = 'Medical History',
}: PatientConsentStatusBadgeProps) {
  const isGranted = status === 'granted';
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', background: isGranted ? '#dcfce7' : '#fee2e2', borderRadius: '4px' }}>
      <span style={{ fontSize: '12px', fontWeight: 'bold', color: isGranted ? '#15803d' : '#b91c1c' }}>
        {scopeName}: {status.toUpperCase()}
      </span>
    </div>
  );
}
