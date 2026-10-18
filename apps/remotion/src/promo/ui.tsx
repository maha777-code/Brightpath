import React from 'react';
import { AbsoluteFill, Html5Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { PAD, alpha, rise, useEnter, usePromo, SPRING } from './theme';

const SFX_FRAMES = {
  pop: 8,
  click1: 3,
  click2: 3,
  click3: 3,
  tick: 3,
  whoosh: 27,
  ding: 42,
  error: 12,
  shimmer: 60,
} as const;

export type SfxName = keyof typeof SFX_FRAMES;

/** Plays one generated sound effect `at` frames into the current scene. */
export function Sfx({ at, name, volume = 1 }: { at: number; name: SfxName; volume?: number }) {
  const { audio } = usePromo();
  if (!audio.soundEffects || audio.soundEffectsVolume <= 0) return null;
  return (
    <Sequence from={Math.round(at)} durationInFrames={SFX_FRAMES[name]} layout="none" name={`sfx: ${name}`}>
      <Html5Audio src={staticFile(`audio/sfx-${name}.wav`)} volume={Math.min(1, volume * audio.soundEffectsVolume)} />
    </Sequence>
  );
}

export function GradientText({ children }: { children: React.ReactNode }) {
  const { colors } = usePromo();
  return (
    <span
      style={{
        backgroundImage: `linear-gradient(90deg, ${colors.primary}, ${colors.accent})`,
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        color: 'transparent',
        paddingBottom: '0.08em',
      }}
    >
      {children}
    </span>
  );
}

export function Chip({ label, delay = 0 }: { label: string; delay?: number }) {
  const { colors } = usePromo();
  const p = useEnter(delay, SPRING.pop);
  return (
    <div
      style={{
        ...rise(p, 20),
        display: 'inline-flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 22px',
        borderRadius: 999,
        border: `1.5px solid ${alpha(colors.primary, 0.45)}`,
        background: alpha(colors.primary, 0.1),
        color: colors.primary,
        fontSize: 28,
        fontWeight: 700,
        letterSpacing: '0.02em',
      }}
    >
      <span style={{ width: 10, height: 10, borderRadius: 99, background: colors.primary }} />
      {label}
    </div>
  );
}

/** Label chip plus a centred headline at the top of the safe area. */
export function SceneHeading({ label, headline }: { label: string; headline: string }) {
  const p = useEnter(6, SPRING.snappy);
  return (
    <div
      style={{
        position: 'absolute',
        top: PAD,
        left: PAD,
        right: PAD,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 22,
        textAlign: 'center',
      }}
    >
      <Chip label={label} />
      <div style={{ ...rise(p, 36), fontSize: 76, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.05 }}>
        {headline}
      </div>
    </div>
  );
}

export function AppWindow({
  width,
  height,
  title,
  delay = 4,
  style,
  children,
}: {
  width: number;
  height: number;
  title: string;
  delay?: number;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  const { colors } = usePromo();
  const p = useEnter(delay, SPRING.soft);
  return (
    <div
      style={{
        width,
        height,
        opacity: p,
        transform: `translateY(${(1 - p) * 80}px) scale(${0.94 + 0.06 * p})`,
        borderRadius: 28,
        border: `1px solid ${alpha('#ffffff', 0.12)}`,
        background: `linear-gradient(160deg, ${alpha('#ffffff', 0.07)}, ${alpha('#ffffff', 0.025)})`,
        boxShadow: `0 40px 120px ${alpha('#000000', 0.55)}, 0 0 0 1px ${alpha(colors.primary, 0.06)}, 0 0 80px ${alpha(colors.primary, 0.08)}`,
        backdropFilter: 'blur(18px)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        ...style,
      }}
    >
      <div
        style={{
          height: 56,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '0 24px',
          borderBottom: `1px solid ${alpha('#ffffff', 0.08)}`,
          background: alpha('#000000', 0.2),
        }}
      >
        {['#f87171', '#fbbf24', '#34d399'].map((c) => (
          <span key={c} style={{ width: 14, height: 14, borderRadius: 99, background: c, opacity: 0.85 }} />
        ))}
        <span style={{ marginLeft: 16, fontSize: 22, fontWeight: 600, color: alpha('#ffffff', 0.6) }}>{title}</span>
      </div>
      <div style={{ flex: 1, position: 'relative', display: 'flex' }}>{children}</div>
    </div>
  );
}

export function CheckIcon({ size = 24, color }: { size?: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

export function CrossIcon({ size = 24, color }: { size?: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={3} strokeLinecap="round">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

/** Persistent animated background shared by every scene. */
export function Backdrop() {
  const { colors } = usePromo();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  return (
    <AbsoluteFill style={{ background: colors.background, overflow: 'hidden' }}>
      <div
        style={{
          position: 'absolute',
          width: 1100,
          height: 1100,
          borderRadius: '50%',
          left: -260 + Math.sin(t * 0.35) * 120,
          top: -420 + Math.cos(t * 0.3) * 80,
          background: `radial-gradient(circle, ${alpha(colors.primary, 0.22)}, transparent 65%)`,
          filter: 'blur(40px)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: 1200,
          height: 1200,
          borderRadius: '50%',
          right: -360 + Math.cos(t * 0.28) * 140,
          bottom: -520 + Math.sin(t * 0.32) * 90,
          background: `radial-gradient(circle, ${alpha(colors.accent, 0.24)}, transparent 65%)`,
          filter: 'blur(40px)',
        }}
      />
      <AbsoluteFill
        style={{
          backgroundImage: `linear-gradient(${alpha('#ffffff', 0.045)} 1px, transparent 1px), linear-gradient(90deg, ${alpha('#ffffff', 0.045)} 1px, transparent 1px)`,
          backgroundSize: '80px 80px',
          backgroundPosition: `0px ${-(t * 12) % 80}px`,
          maskImage: 'radial-gradient(circle at 50% 50%, black 15%, transparent 72%)',
          WebkitMaskImage: 'radial-gradient(circle at 50% 50%, black 15%, transparent 72%)',
        }}
      />
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at center, transparent 55%, ${alpha('#000000', 0.55)})` }} />
    </AbsoluteFill>
  );
}
