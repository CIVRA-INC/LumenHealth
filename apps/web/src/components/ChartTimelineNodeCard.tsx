import React from 'react';

interface ChartTimelineNodeCardProps {
  heading?: string;
  eventType?: string;
  recordedAt?: string;
}

export function ChartTimelineNodeCard({
  heading = 'Laboratory Result Recorded',
  eventType = 'lab_test',
  recordedAt = '2026-07-25',
}: ChartTimelineNodeCardProps) {
  return (
    <div style={{ padding: '12px', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#ffffff', marginBottom: '8px' }}>
      <div style={{ fontWeight: 'bold', color: '#1e293b' }}>{heading}</div>
      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
        Type: {eventType} | Date: {recordedAt}
      </div>
    </div>
  );
}
