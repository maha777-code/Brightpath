import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

export type WordTiming = { word: string; start: number; end: number };

type Viseme = 'rest' | 'm' | 'ae' | 'ee' | 'o';

function visemeFromWord(word: string | undefined): Viseme {
  const w = String(word || '').toLowerCase();
  if (!w) return 'rest';
  if (/[mbp]/.test(w[0] || '')) return 'm';
  if (/[ouqw]/.test(w) || /oo|ow|oh/.test(w)) return 'o';
  if (/[iey]/.test(w) || /ee|ea/.test(w)) return 'ee';
  return 'ae';
}

function mouthPath(viseme: Viseme, talking: boolean): string {
  if (!talking || viseme === 'rest') return 'M 42 78 Q 60 82 78 78';
  if (viseme === 'm') return 'M 44 80 L 76 80';
  if (viseme === 'o') return 'M 52 76 Q 60 92 68 76 Q 60 70 52 76';
  if (viseme === 'ee') return 'M 40 79 Q 60 86 80 79';
  return 'M 44 78 Q 60 90 76 78';
}

function poseForGesture(gesture: string, frame: number) {
  const g = String(gesture || 'explaining').toLowerCase().replace(/[\s-]+/g, '_');
  const wave = Math.sin(frame * 0.12);
  if (g === 'questioning') return { tilt: -8, arm: 28 + wave * 6, bounce: 0 };
  if (g === 'excited' || g === 'celebrating' || g === 'eureka') {
    return { tilt: 4, arm: -20 + wave * 10, bounce: Math.abs(Math.sin(frame * 0.18)) * 10 };
  }
  if (g === 'pointing' || g === 'pointing_to_apparatus') return { tilt: 6, arm: -42, bounce: 0 };
  if (g === 'demonstrating') return { tilt: 0, arm: -12 + wave * 8, bounce: 2 };
  return { tilt: wave * 2, arm: 8 + wave * 5, bounce: 0 };
}

export const TeacherAvatar: React.FC<{
  gesture: string;
  teacherName?: string;
  currentTime: number;
  wordTimings?: WordTiming[];
}> = ({ gesture, teacherName = 'Professor Maya', currentTime, wordTimings = [] }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const scale = spring({ frame, fps, config: { damping: 14, mass: 0.7 } });
  const bobbing = Math.sin(frame * 0.08) * 4;
  const pose = poseForGesture(gesture, frame);
  const active = wordTimings.find((w) => currentTime >= w.start && currentTime < w.end);
  const talking = Boolean(active);
  const viseme = visemeFromWord(active?.word);
  const blink = frame % 90 < 4;
  const glow = interpolate(talking ? 1 : 0, [0, 1], [0.35, 0.85]);

  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <div
        style={{
          position: 'absolute',
          right: 22,
          bottom: 108,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          transform: `scale(${scale}) translateY(${bobbing - pose.bounce}px)`,
          zIndex: 30,
        }}
      >
        <div
          style={{
            marginBottom: 8,
            padding: '6px 14px',
            borderRadius: 999,
            background: 'linear-gradient(90deg, #7c3aed, #4f46e5)',
            color: 'white',
            fontWeight: 800,
            fontSize: 11,
            letterSpacing: 1.1,
            border: '1px solid rgba(196,181,253,0.45)',
            boxShadow: `0 8px 24px rgba(124,58,237,${glow})`,
            fontFamily: 'Inter, system-ui, sans-serif',
          }}
        >
          {teacherName} · {String(gesture || 'explaining').replace(/_/g, ' ').toUpperCase()}
        </div>
        <div
          style={{
            width: 168,
            height: 220,
            borderRadius: 22,
            background: 'linear-gradient(180deg, rgba(30,27,75,0.92), rgba(15,23,42,0.92))',
            border: '2px solid rgba(129,140,248,0.55)',
            boxShadow: '0 18px 50px rgba(0,0,0,0.45)',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
          }}
        >
          <svg width="168" height="210" viewBox="0 0 120 150">
            <ellipse cx="60" cy="142" rx="34" ry="8" fill="#312e81" opacity="0.55" />
            <rect x="38" y="108" width="44" height="36" rx="12" fill="#4338ca" />
            <circle cx="42" cy="126" r="9" fill="#c4b5fd" />
            <g transform={`rotate(${pose.arm} 78 118)`}>
              <rect x="74" y="112" width="14" height="36" rx="7" fill="#4338ca" />
              <circle cx="81" cy="150" r="8" fill="#f1c27d" />
            </g>
            <g transform={`rotate(${pose.tilt} 60 70)`}>
              <circle cx="60" cy="68" r="28" fill="#f1c27d" />
              <path d="M 32 62 Q 60 22 88 62" fill="#2e1065" />
              <ellipse cx="60" cy="48" rx="22" ry="10" fill="#1e1b4b" />
              <rect x="36" y="62" width="48" height="6" rx="2" fill="#1e1b4b" opacity="0.85" />
              <circle cx="50" cy="68" r="5" fill="white" />
              <circle cx="70" cy="68" r="5" fill="white" />
              <circle cx="50" cy={blink ? 68 : 69} r={blink ? 0.5 : 2.2} fill="#1e1b4b" />
              <circle cx="70" cy={blink ? 68 : 69} r={blink ? 0.5 : 2.2} fill="#1e1b4b" />
              <path
                d={mouthPath(viseme, talking)}
                fill={viseme === 'o' || viseme === 'ae' ? '#9f1239' : 'none'}
                stroke="#9f1239"
                strokeWidth="2.4"
                strokeLinecap="round"
              />
            </g>
          </svg>
        </div>
      </div>
    </AbsoluteFill>
  );
};
