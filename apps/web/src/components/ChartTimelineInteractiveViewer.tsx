import React, { useState } from 'react';
import type { TimelineViewMode } from '@qyou/shared';

interface ChartTimelineInteractiveViewerProps {
  patientId: string;
}

export function ChartTimelineInteractiveViewer({ patientId }: ChartTimelineInteractiveViewerProps) {
  const [mode, setMode] = useState<TimelineViewMode>('chronological');

  return (
    <div style={{ padding: '16px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
        <h4 style={{ margin: 0 }}>Timeline Events ({patientId})</h4>
        <select value={mode} onChange={(e) => setMode(e.target.value as TimelineViewMode)} style={{ padding: '4px 8px' }}>
          <option value="chronological">Chronological</option>
          <option value="compact">Compact</option>
          <option value="expanded">Expanded</option>
        </select>
      </div>
      <div style={{ fontSize: '13px', color: '#64748b' }}>Rendering in {mode} view mode.</div>
    </div>
  );
}
