import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';

export type MathFormulaOverlayProps = {
  formula?: string;
  subtitle?: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
};

/** 2D LaTeX/text plaque — readable equations over 3D axes / scatter. */
export const MathFormulaOverlay: React.FC<MathFormulaOverlayProps> = ({
  formula,
  subtitle,
  xAxisLabel,
  yAxisLabel,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const opacity = interpolate(t, [0, 0.45], [0, 1], { extrapolateRight: 'clamp' });
  if (!formula && !subtitle) return null;

  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      {formula ? (
        <div
          style={{
            position: 'absolute',
            left: 36,
            top: 108,
            maxWidth: 640,
            opacity,
            padding: '14px 18px',
            borderRadius: 16,
            background: 'linear-gradient(135deg, rgba(15,23,42,0.88), rgba(30,27,75,0.78))',
            border: '1px solid rgba(125,211,252,0.45)',
            boxShadow: '0 12px 40px rgba(2,6,23,0.55)',
            color: '#e0f2fe',
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontSize: 26,
            lineHeight: 1.35,
            letterSpacing: 0.2,
          }}
        >
          {formula}
        </div>
      ) : null}
      {subtitle ? (
        <div
          style={{
            position: 'absolute',
            left: 36,
            top: formula ? 188 : 108,
            maxWidth: 560,
            opacity: opacity * 0.95,
            color: '#cbd5e1',
            fontSize: 16,
            fontFamily: 'Inter, system-ui, sans-serif',
          }}
        >
          {subtitle}
        </div>
      ) : null}
      {xAxisLabel ? (
        <div
          style={{
            position: 'absolute',
            right: 88,
            bottom: 132,
            color: '#7dd3fc',
            fontSize: 18,
            fontFamily: 'Inter, system-ui, sans-serif',
            opacity,
          }}
        >
          {xAxisLabel}
        </div>
      ) : null}
      {yAxisLabel ? (
        <div
          style={{
            position: 'absolute',
            right: 56,
            top: 210,
            color: '#fde68a',
            fontSize: 18,
            fontFamily: 'Inter, system-ui, sans-serif',
            opacity,
          }}
        >
          {yAxisLabel}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
