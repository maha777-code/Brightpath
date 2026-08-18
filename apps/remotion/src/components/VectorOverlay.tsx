import React from 'react';
import { AbsoluteFill } from 'remotion';

export const VectorOverlay: React.FC<{
  labels: string[];
  temperature: number;
  animationType: string;
}> = ({ labels, temperature, animationType }) => {
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      {/* Force / energy callouts */}
      <svg width="1280" height="720" style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="#fbbf24" />
          </marker>
        </defs>
        <line
          x1="220"
          y1="480"
          x2="360"
          y2="360"
          stroke="#fbbf24"
          strokeWidth="3"
          markerEnd="url(#arrow)"
          opacity={0.85}
        />
        <text x="180" y="510" fill="#fde68a" fontSize="18" fontFamily="Inter, sans-serif" fontWeight="700">
          Force / Motion
        </text>
        <line
          x1="980"
          y1="200"
          x2="860"
          y2="280"
          stroke="#67e8f9"
          strokeWidth="3"
          markerEnd="url(#arrow)"
          opacity={0.8}
        />
        <text x="900" y="180" fill="#a5f3fc" fontSize="18" fontFamily="Inter, sans-serif" fontWeight="700">
          {animationType}
        </text>
      </svg>

      <div style={{ position: 'absolute', right: 36, top: 120, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {labels.slice(0, 4).map((label) => (
          <div
            key={label}
            style={{
              background: 'rgba(15,23,42,0.72)',
              border: '1px solid rgba(56,189,248,0.35)',
              color: '#e0f2fe',
              borderRadius: 12,
              padding: '8px 14px',
              fontWeight: 700,
              fontSize: 16,
              fontFamily: 'Inter, system-ui, sans-serif',
            }}
          >
            {label}
          </div>
        ))}
        <div
          style={{
            background: 'rgba(127,29,29,0.55)',
            border: '1px solid rgba(251,113,133,0.45)',
            color: '#fecdd3',
            borderRadius: 12,
            padding: '8px 14px',
            fontWeight: 700,
            fontSize: 15,
          }}
        >
          T = {temperature}°C
        </div>
      </div>
    </AbsoluteFill>
  );
};
