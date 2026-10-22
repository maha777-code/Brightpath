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
        paddingBottom: 22,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          maxWidth: '86%',
          textAlign: 'center',
          background: 'rgba(15, 23, 42, 0.78)',
          borderRadius: 8,
          padding: '10px 18px',
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
                  marginRight: 6,
                  fontSize: 22,
                  fontWeight: isActive ? 800 : 600,
                  color: isActive ? '#ffffff' : isPast ? '#e2e8f0' : '#94a3b8',
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
              fontSize: 21,
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
