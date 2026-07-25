import React from 'react';
import type { AccessLevel } from '@qyou/shared';

interface DocumentMetadataCardProps {
  accessLevel?: AccessLevel;
  retentionDays?: number;
  encrypted?: boolean;
}

export function DocumentMetadataCard({
  accessLevel = 'restricted_practitioner',
  retentionDays = 365,
  encrypted = true,
}: DocumentMetadataCardProps) {
  return (
    <div style={{ padding: '12px 16px', background: '#f1f5f9', borderRadius: '6px', fontSize: '13px' }}>
      <div style={{ fontWeight: 'bold', color: '#334155' }}>Access Level: {accessLevel.replace('_', ' ')}</div>
      <div style={{ color: '#64748b', marginTop: '4px' }}>Retention: {retentionDays} days | Encryption: {encrypted ? 'AES-256 Enabled' : 'None'}</div>
    </div>
  );
}
