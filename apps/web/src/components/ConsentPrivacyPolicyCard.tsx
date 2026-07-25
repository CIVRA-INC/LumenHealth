import React from 'react';

interface ConsentPrivacyPolicyCardProps {
  policyVersion?: string;
  allowSharing?: boolean;
}

export function ConsentPrivacyPolicyCard({
  policyVersion = 'v1.0.0',
  allowSharing = false,
}: ConsentPrivacyPolicyCardProps) {
  return (
    <div style={{ padding: '16px', background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: '8px' }}>
      <h4 style={{ margin: '0 0 8px 0', color: '#6b21a8' }}>Privacy Policy {policyVersion}</h4>
      <div style={{ fontSize: '13px', color: '#581c87' }}>
        Third-Party Data Sharing: <strong>{allowSharing ? 'Enabled' : 'Disabled'}</strong>
      </div>
    </div>
  );
}
