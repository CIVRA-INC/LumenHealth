import React from 'react';

interface ChartTimelineFilterBarProps {
  onCategoryChange?: (category: string) => void;
}

export function ChartTimelineFilterBar({ onCategoryChange }: ChartTimelineFilterBarProps) {
  return (
    <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
      <button style={{ padding: '6px 12px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
        All Categories
      </button>
      <button style={{ padding: '6px 12px', background: '#e2e8f0', color: '#334155', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
        Consultations
      </button>
      <button style={{ padding: '6px 12px', background: '#e2e8f0', color: '#334155', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
        Lab Results
      </button>
    </div>
  );
}
