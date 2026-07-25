import React from 'react';

interface ChartTimelineFeedProps {
  patientId: string;
}

export function ChartTimelineFeed({ patientId }: ChartTimelineFeedProps) {
  return (
    <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px' }}>
      <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#0f172a' }}>Patient Chart Timeline</h3>
      <div style={{ borderLeft: '2px solid #cbd5e1', paddingLeft: '16px' }}>
        <div style={{ marginBottom: '16px' }}>
          <span style={{ fontSize: '12px', color: '#64748b' }}>Jul 25, 2026</span>
          <h5 style={{ margin: '4px 0', fontSize: '14px', color: '#1e293b' }}>Annual Health Checkup</h5>
          <p style={{ margin: 0, fontSize: '13px', color: '#475569' }}>Routine vitals recorded. All parameters within normal ranges.</p>
        </div>
      </div>
    </div>
  );
}
