import React from 'react';

interface PatientConsentFormModalProps {
  isOpen: boolean;
  onClose?: () => void;
}

export function PatientConsentFormModal({ isOpen, onClose }: PatientConsentFormModalProps) {
  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#ffffff', padding: '24px', borderRadius: '8px', maxWidth: '480px', width: '100%' }}>
        <h3 style={{ margin: '0 0 12px 0' }}>Patient Consent & Privacy Form</h3>
        <p style={{ fontSize: '13px', color: '#475569' }}>Please review and configure your privacy settings before signing.</p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
          <button onClick={onClose} style={{ padding: '6px 12px', background: '#e2e8f0', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            Cancel
          </button>
          <button style={{ padding: '6px 12px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            Sign & Submit
          </button>
        </div>
      </div>
    </div>
  );
}
