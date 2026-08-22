import React from 'react';
import { AbsoluteFill } from 'remotion';

export const InteractiveUIOverlay: React.FC<{
  topicTitle: string;
  phase?: string;
  leftLabel?: string;
  rightLabel?: string;
  keyTakeaway?: string;
  stepLabels?: string[];
  archetype?: string;
}> = ({
  topicTitle,
  phase,
  leftLabel,
  rightLabel,
  keyTakeaway,
  stepLabels,
  archetype,
}) => {
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <div
        style={{
          position: 'absolute',
          top: 24,
          left: 32,
          right: 32,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 16,
        }}
      >
        <div style={{ color: 'white', fontFamily: 'Inter, system-ui, sans-serif', maxWidth: '70%' }}>
          <div style={{ fontSize: 13, opacity: 0.75, fontWeight: 700, letterSpacing: 1.2 }}>
            SWEETRUSH · {(archetype ?? 'concept').toUpperCase()} LESSON
          </div>
          <div style={{ fontSize: 30, fontWeight: 800, marginTop: 4, lineHeight: 1.15 }}>
            {topicTitle}
          </div>
          {phase ? (
            <div
              style={{
                marginTop: 10,
                display: 'inline-block',
                padding: '6px 12px',
                borderRadius: 999,
                background: 'rgba(99,102,241,0.35)',
                border: '1px solid rgba(165,180,252,0.5)',
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              {phase}
            </div>
          ) : null}
        </div>
      </div>

      {/* Comparison labels */}
      {(leftLabel || rightLabel) && (
        <div
          style={{
            position: 'absolute',
            top: 160,
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'space-around',
            padding: '0 80px',
            color: 'white',
            fontFamily: 'Inter, system-ui, sans-serif',
            fontWeight: 800,
            fontSize: 22,
            textShadow: '0 2px 8px rgba(0,0,0,0.65)',
          }}
        >
          <span>{leftLabel}</span>
          <span>{rightLabel}</span>
        </div>
      )}

      {/* Process step chips */}
      {Array.isArray(stepLabels) && stepLabels.length > 0 ? (
        <div
          style={{
            position: 'absolute',
            bottom: 120,
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
            gap: 12,
          }}
        >
          {stepLabels.slice(0, 4).map((label) => (
            <div
              key={label}
              style={{
                padding: '8px 14px',
                borderRadius: 12,
                background: 'rgba(15,23,42,0.72)',
                border: '1px solid rgba(148,163,184,0.45)',
                color: '#e2e8f0',
                fontSize: 14,
                fontWeight: 700,
                fontFamily: 'Inter, system-ui, sans-serif',
              }}
            >
              {label}
            </div>
          ))}
        </div>
      ) : null}

      {keyTakeaway ? (
        <div
          style={{
            position: 'absolute',
            bottom: 96,
            left: 48,
            right: 48,
            padding: '14px 18px',
            borderRadius: 16,
            background: 'rgba(6,78,59,0.55)',
            border: '1px solid rgba(52,211,153,0.45)',
            color: '#ecfdf5',
            fontSize: 18,
            fontWeight: 700,
            fontFamily: 'Inter, system-ui, sans-serif',
            textAlign: 'center',
          }}
        >
          {keyTakeaway}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
