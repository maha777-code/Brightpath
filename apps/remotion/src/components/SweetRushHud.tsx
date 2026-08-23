import React from 'react';
import { AbsoluteFill } from 'remotion';

const PHASE_COLOR: Record<string, string> = {
  CHALLENGE: '#FF5722',
  SIMULATION: '#22d3ee',
  DISCOVERY: '#34d399',
};

export const SweetRushHud: React.FC<{
  topicTitle: string;
  phase?: string;
  pattern?: string;
  progress01: number;
  leftConcept?: string;
  rightConcept?: string;
  badges?: string[];
  takeawayBadge?: string;
  stepLabels?: string[];
}> = ({
  topicTitle,
  phase,
  pattern,
  progress01,
  leftConcept,
  rightConcept,
  badges,
  takeawayBadge,
  stepLabels,
}) => {
  const pill = String(phase || 'CHALLENGE').toUpperCase();
  const accent = PHASE_COLOR[pill] ?? '#818cf8';
  const pct = Math.max(0, Math.min(1, progress01));

  return (
    <AbsoluteFill style={{ pointerEvents: 'none', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div
        style={{
          position: 'absolute',
          top: 20,
          left: 28,
          right: 28,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 16,
        }}
      >
        <div style={{ maxWidth: '72%' }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: 2,
              color: 'rgba(226,232,240,0.72)',
            }}
          >
            SWEETRUSH · {(pattern || 'MICRO-LESSON').toString().replace(/_/g, ' ').toUpperCase()}
          </div>
          <div style={{ fontSize: 28, fontWeight: 850, color: 'white', marginTop: 4, lineHeight: 1.15 }}>
            {topicTitle}
          </div>
        </div>
        <div
          style={{
            padding: '8px 16px',
            borderRadius: 999,
            background: `${accent}33`,
            border: `1.5px solid ${accent}`,
            color: 'white',
            fontWeight: 850,
            fontSize: 13,
            letterSpacing: 1.4,
          }}
        >
          {pill}
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          top: 108,
          left: 28,
          right: 28,
          height: 6,
          borderRadius: 999,
          background: 'rgba(148,163,184,0.25)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${pct * 100}%`,
            height: '100%',
            background: `linear-gradient(90deg, ${accent}, #fbbf24)`,
          }}
        />
      </div>

      {badges && badges.length > 0 ? (
        <div
          style={{
            position: 'absolute',
            top: 128,
            right: 28,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          {badges.slice(0, 4).map((b) => (
            <div
              key={b}
              style={{
                padding: '8px 12px',
                borderRadius: 12,
                background: 'rgba(15,23,42,0.72)',
                border: '1px solid rgba(34,211,238,0.4)',
                color: '#e0f2fe',
                fontSize: 13,
                fontWeight: 750,
                boxShadow: '0 0 18px rgba(34,211,238,0.15)',
              }}
            >
              {b}
            </div>
          ))}
        </div>
      ) : null}

      {(leftConcept || rightConcept) && (
        <div
          style={{
            position: 'absolute',
            top: 168,
            left: 70,
            right: 70,
            display: 'flex',
            justifyContent: 'space-between',
            color: 'white',
            fontWeight: 850,
            fontSize: 22,
            textShadow: '0 3px 10px rgba(0,0,0,0.7)',
          }}
        >
          <span>{leftConcept}</span>
          <span style={{ opacity: 0.55, fontSize: 16, alignSelf: 'center' }}>VS</span>
          <span>{rightConcept}</span>
        </div>
      )}

      {Array.isArray(stepLabels) && stepLabels.length > 0 ? (
        <div
          style={{
            position: 'absolute',
            left: 28,
            top: 200,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          {stepLabels.slice(0, 4).map((label, i) => (
            <div
              key={label}
              style={{
                padding: '7px 12px',
                borderRadius: 10,
                background: 'rgba(15,23,42,0.7)',
                border: '1px solid rgba(251,191,36,0.35)',
                color: '#fde68a',
                fontSize: 13,
                fontWeight: 750,
              }}
            >
              {i + 1}. {label}
            </div>
          ))}
        </div>
      ) : null}

      {takeawayBadge ? (
        <div
          style={{
            position: 'absolute',
            top: 150,
            left: 80,
            right: 80,
            padding: '12px 18px',
            borderRadius: 16,
            background: 'rgba(6,78,59,0.72)',
            border: '1.5px solid #34d399',
            color: '#ecfdf5',
            fontSize: 18,
            fontWeight: 800,
            textAlign: 'center',
            boxShadow: '0 0 24px rgba(52,211,153,0.25)',
          }}
        >
          KEY TAKEAWAY · {takeawayBadge}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
