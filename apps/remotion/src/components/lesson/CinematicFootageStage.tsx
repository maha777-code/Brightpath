import React from 'react';
import { AbsoluteFill, OffthreadVideo, interpolate } from 'remotion';

export type CinematicFootageStageProps = {
  clipUrl: string;
  heading: string;
  chapterTitle?: string;
  progress01: number;
};

export const CinematicFootageStage: React.FC<CinematicFootageStageProps> = ({
  clipUrl,
  heading,
  chapterTitle,
  progress01,
}) => {
  const fade =
    progress01 < 0.08
      ? interpolate(progress01, [0, 0.08], [0, 1], { extrapolateRight: 'clamp' })
      : progress01 > 0.9
        ? interpolate(progress01, [0.9, 1], [1, 0], { extrapolateLeft: 'clamp' })
        : 1;
  const titleOpacity = interpolate(progress01, [0.04, 0.12, 0.28, 0.4], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ backgroundColor: '#05070a' }}>
      <AbsoluteFill style={{ opacity: fade }}>
        <OffthreadVideo
          src={clipUrl}
          muted
          loop
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </AbsoluteFill>
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 46%, rgba(0,0,0,0.38) 100%)',
          pointerEvents: 'none',
        }}
      />
      <AbsoluteFill
        style={{
          background: 'linear-gradient(180deg, rgba(0,0,0,0.28) 0%, transparent 22%, transparent 72%, rgba(0,0,0,0.45) 100%)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 72,
          bottom: 120,
          maxWidth: 1100,
          opacity: titleOpacity,
          color: '#f8fafc',
          fontFamily: 'Inter, system-ui, sans-serif',
        }}
      >
        {chapterTitle ? (
          <div style={{ fontSize: 18, letterSpacing: 3, textTransform: 'uppercase', opacity: 0.8 }}>
            {chapterTitle}
          </div>
        ) : null}
        <div style={{ marginTop: 8, fontSize: 48, fontWeight: 750, letterSpacing: -0.8, lineHeight: 1.1 }}>
          {heading}
        </div>
      </div>
    </AbsoluteFill>
  );
};
