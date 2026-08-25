import React from 'react';
import { AbsoluteFill } from 'remotion';

export const KaraokeSubtitles: React.FC<{
  words: { word: string; start: number; end: number }[];
  currentTime: number;
  fallbackText?: string;
}> = ({ words, currentTime, fallbackText }) => {
  const hasWords = Boolean(words?.length);

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingBottom: 28,
        paddingRight: 196,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          width: '88%',
          textAlign: 'center',
          background: 'rgba(8, 15, 30, 0.62)',
          border: '1px solid rgba(34, 211, 238, 0.32)',
          borderRadius: 18,
          padding: '16px 24px',
          backdropFilter: 'blur(14px)',
          boxShadow: '0 10px 40px rgba(0,0,0,0.35)',
        }}
      >
        {hasWords ? (
          words.map((w, i) => {
            const isActive = currentTime >= w.start && currentTime < w.end;
            const isPast = currentTime >= w.end;
            return (
              <span
                key={`${w.start}-${i}`}
                style={{
                  marginRight: 7,
                  fontSize: 24,
                  fontWeight: isActive ? 850 : 600,
                  color: isActive ? '#ffffff' : isPast ? '#94a3b8' : '#64748b',
                  textShadow: isActive ? '0 0 18px rgba(34,211,238,0.65)' : 'none',
                  fontFamily: 'Inter, system-ui, sans-serif',
                }}
              >
                {w.word}
              </span>
            );
          })
        ) : (
          <span
            style={{
              fontSize: 22,
              fontWeight: 650,
              color: 'white',
              fontFamily: 'Inter, system-ui, sans-serif',
              lineHeight: 1.35,
            }}
          >
            {fallbackText}
          </span>
        )}
      </div>
    </AbsoluteFill>
  );
};
