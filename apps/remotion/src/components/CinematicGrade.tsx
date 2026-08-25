import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';

/** Film grain, vignette, bloom veil, and color grade — CSS so headless Chrome stays stable. */
export const CinematicGrade: React.FC<{ lighting?: string }> = ({ lighting }) => {
  const frame = useCurrentFrame();
  const grain = 0.045 + ((frame * 13) % 7) * 0.004;
  const cool = String(lighting || '').includes('cool');
  const warm = String(lighting || '').includes('warm') || String(lighting || '').includes('dramatic');

  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 42%, rgba(0,0,0,0.55) 100%)',
        }}
      />
      <AbsoluteFill
        style={{
          boxShadow: 'inset 0 0 120px rgba(255,255,255,0.08), inset 0 0 220px rgba(124,58,237,0.12)',
          mixBlendMode: 'screen',
          opacity: 0.55,
        }}
      />
      <AbsoluteFill
        style={{
          background: warm
            ? 'linear-gradient(180deg, rgba(251,146,60,0.08), rgba(15,23,42,0.12))'
            : cool
              ? 'linear-gradient(180deg, rgba(34,211,238,0.08), rgba(15,23,42,0.14))'
              : 'linear-gradient(180deg, rgba(129,140,248,0.06), rgba(2,6,23,0.1))',
          mixBlendMode: 'overlay',
        }}
      />
      <AbsoluteFill
        style={{
          opacity: grain,
          backgroundImage:
            'repeating-radial-gradient(circle at 20% 30%, rgba(255,255,255,0.18) 0 1px, transparent 1px 3px)',
          mixBlendMode: 'overlay',
        }}
      />
    </AbsoluteFill>
  );
};
