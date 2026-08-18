import React from 'react';
import { AbsoluteFill } from 'remotion';

export const KaraokeSubtitles: React.FC<{
  words: { word: string; start: number; end: number }[];
  currentTime: number;
}> = ({ words, currentTime }) => {
  if (!words?.length) return null;

  const activeIdx = words.findIndex((w) => currentTime >= w.start && currentTime < w.end);
  const windowStart = Math.max(0, (activeIdx >= 0 ? activeIdx : 0) - 4);
  const slice = words.slice(windowStart, windowStart + 12);

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingBottom: 56,
      }}
    >
      <div
        style={{
          maxWidth: '86%',
          textAlign: 'center',
          background: 'rgba(2,6,23,0.62)',
          border: '1px solid rgba(148,163,184,0.25)',
          borderRadius: 16,
          padding: '14px 22px',
          backdropFilter: 'blur(8px)',
        }}
      >
        {slice.map((w, i) => {
          const globalIdx = windowStart + i;
          const isActive = globalIdx === activeIdx;
          const isPast = activeIdx >= 0 && globalIdx < activeIdx;
          return (
            <span
              key={`${w.start}-${i}`}
              style={{
                marginRight: 8,
                fontSize: 28,
                fontWeight: isActive ? 800 : 600,
                color: isActive ? '#ffffff' : isPast ? '#94a3b8' : '#64748b',
                textShadow: isActive ? '0 0 18px rgba(56,189,248,0.55)' : 'none',
                fontFamily: 'Inter, system-ui, sans-serif',
              }}
            >
              {w.word}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
