import React from 'react';
import {
  AbsoluteFill,
  Easing,
  Html5Audio,
  Img,
  Sequence,
  interpolate,
  random,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import '../promo/fonts';
import { PROMO_FONT } from '../promo/fonts';
import { PromoProvider, SPRING, alpha, clamp, defaultPromoProps, rise, useEnter, type PromoProps } from '../promo/theme';
import { AppWindow, Backdrop, CheckIcon, Sfx } from '../promo/ui';

const FPS = 30;
const XFADE = 12;

const CYAN = '#22D3EE';
const VIOLET = '#8B5CF6';
const AMBER = '#FBBF24';
const EMERALD = '#34D399';
const ROSE = '#FB7185';
const INK = '#F8FAFC';
const MUTED = '#94A3B8';

const SCENES = [
  { id: 'hook', seconds: 4 },
  { id: 'attach', seconds: 5 },
  { id: 'choose', seconds: 4 },
  { id: 'play', seconds: 14 },
  { id: 'formats', seconds: 6 },
  { id: 'export', seconds: 3 },
  { id: 'cta', seconds: 4 },
] as const;

export const GAMIFIED_ACTIVITY_FILM = {
  id: 'MindVaultGamifiedActivity',
  fps: FPS,
  width: 1920,
  height: 1080,
  durationInFrames: SCENES.reduce((sum, s) => sum + s.seconds, 0) * FPS,
};

const filmProps: PromoProps = {
  ...defaultPromoProps,
  colors: { primary: CYAN, accent: VIOLET, background: '#04060F', text: INK },
};

const ease = Easing.bezier(0.22, 1, 0.36, 1);
const inOut = Easing.bezier(0.65, 0, 0.35, 1);

function ramp(frame: number, from: number, to: number, easing = ease) {
  return interpolate(frame, [from, to], [0, 1], { ...clamp, easing });
}

function Label({ children, color = CYAN, delay = 0 }: { children: React.ReactNode; color?: string; delay?: number }) {
  const p = useEnter(delay, SPRING.pop);
  return (
    <div
      style={{
        ...rise(p, 18),
        display: 'inline-flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 22px',
        borderRadius: 999,
        border: `1.5px solid ${alpha(color, 0.5)}`,
        background: alpha(color, 0.1),
        color,
        fontSize: 24,
        fontWeight: 800,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
      }}
    >
      <span style={{ width: 9, height: 9, borderRadius: 99, background: color, boxShadow: `0 0 14px ${color}` }} />
      {children}
    </div>
  );
}

/** Headline whose words rise in one after another. */
function Words({ text, delay = 0, size = 84, gradient }: { text: string; delay?: number; size?: number; gradient?: [string, string] }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div style={{ fontSize: size, fontWeight: 850, letterSpacing: '-0.035em', lineHeight: 1.05, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: `0 ${size * 0.26}px` }}>
      {text.split(' ').map((word, i) => {
        const p = spring({ frame: frame - delay - i * 3, fps, config: SPRING.snappy });
        return (
          <span key={`${word}-${i}`} style={{ display: 'inline-block', overflow: 'hidden', paddingBottom: '0.1em' }}>
            <span
              style={{
                display: 'inline-block',
                transform: `translateY(${(1 - p) * 110}%) rotate(${(1 - p) * 6}deg)`,
                ...(gradient
                  ? { backgroundImage: `linear-gradient(90deg, ${gradient[0]}, ${gradient[1]})`, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }
                  : {}),
              }}
            >
              {word}
            </span>
          </span>
        );
      })}
    </div>
  );
}

function Heading({ label, title, color, top = 70 }: { label: string; title: string; color?: string; top?: number }) {
  return (
    <div style={{ position: 'absolute', top, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, textAlign: 'center' }}>
      <Label color={color}>{label}</Label>
      <Words text={title} delay={4} size={70} />
    </div>
  );
}

function Burst({ x, y, at, count = 26, colors = [CYAN, VIOLET, AMBER, EMERALD], spread = 420, seed = 'b' }: { x: number; y: number; at: number; count?: number; colors?: string[]; spread?: number; seed?: string }) {
  const frame = useCurrentFrame();
  const t = frame - at;
  if (t < 0 || t > 50) return null;
  return (
    <>
      {Array.from({ length: count }, (_, i) => {
        const angle = random(`${seed}-a-${i}`) * Math.PI * 2;
        const dist = (0.35 + random(`${seed}-d-${i}`) * 0.65) * spread;
        const p = interpolate(t, [0, 40], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
        const size = 8 + random(`${seed}-s-${i}`) * 14;
        const square = i % 3 === 0;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x + Math.cos(angle) * dist * p - size / 2,
              top: y + Math.sin(angle) * dist * p + 120 * p * p - size / 2,
              width: size,
              height: square ? size : size * 0.45,
              borderRadius: square ? 3 : 99,
              background: colors[i % colors.length],
              opacity: interpolate(t, [0, 6, 36, 50], [0, 1, 1, 0], clamp),
              transform: `rotate(${p * 540 * (i % 2 ? 1 : -1)}deg)`,
              boxShadow: `0 0 12px ${alpha(colors[i % colors.length], 0.7)}`,
            }}
          />
        );
      })}
    </>
  );
}

function Cursor({ path, pressAt }: { path: { f: number; x: number; y: number }[]; pressAt: number[] }) {
  const frame = useCurrentFrame();
  const fs = path.map((p) => p.f);
  const x = interpolate(frame, fs, path.map((p) => p.x), { ...clamp, easing: inOut });
  const y = interpolate(frame, fs, path.map((p) => p.y), { ...clamp, easing: inOut });
  const press = pressAt.reduce((acc, at) => Math.max(acc, interpolate(frame, [at - 3, at, at + 6], [0, 1, 0], clamp)), 0);
  const opacity = interpolate(frame, [path[0].f, path[0].f + 8], [0, 1], clamp);
  return (
    <div style={{ position: 'absolute', left: x, top: y, opacity, transform: `scale(${1 - press * 0.18})`, transformOrigin: '6px 4px', zIndex: 50 }}>
      {pressAt.map((at) => {
        const r = interpolate(frame, [at, at + 18], [0, 1], clamp);
        if (frame < at || r >= 1) return null;
        return (
          <div key={at} style={{ position: 'absolute', left: 6 - 40 * r, top: 4 - 40 * r, width: 80 * r, height: 80 * r, borderRadius: 99, border: `3px solid ${alpha(AMBER, 1 - r)}` }} />
        );
      })}
      <svg width="44" height="44" viewBox="0 0 24 24" style={{ filter: 'drop-shadow(0 6px 14px rgba(0,0,0,0.6))' }}>
        <path d="M4 2.5l15 8.2-6.6 1.7 3.9 7.1-2.7 1.5-3.9-7.1-4.7 4.9z" fill="#fff" stroke="#0f172a" strokeWidth="1.2" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

/* ───────────────────────── 1 · Hook ───────────────────────── */

function HookScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const strike = ramp(frame, 34, 48, inOut);
  const drop = ramp(frame, 50, 64, Easing.in(Easing.cubic));
  const slam = spring({ frame: frame - 58, fps, config: { damping: 9, stiffness: 260, mass: 0.7 } });
  const shake = frame >= 58 && frame < 72 ? Math.sin(frame * 3.1) * (72 - frame) * 1.1 : 0;
  const sheen = interpolate(frame, [70, 110], [-40, 140], clamp);
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', transform: `translate(${shake}px, ${shake * 0.4}px)` }}>
      <Sfx at={36} name="tick" volume={0.7} />
      <Sfx at={58} name="pop" volume={1} />
      <Sfx at={60} name="shimmer" volume={0.5} />
      <div style={{ position: 'absolute', top: 360, opacity: 1 - drop, transform: `translateY(${drop * 140}px) rotate(${drop * -4}deg)`, filter: `grayscale(${strike})` }}>
        <div style={{ position: 'relative' }}>
          <Words text="Worksheets get skipped." size={104} />
          <div style={{ position: 'absolute', left: -12, right: -12, top: '52%', height: 12, borderRadius: 99, background: ROSE, transformOrigin: 'left center', transform: `scaleX(${strike}) rotate(-2deg)`, boxShadow: `0 0 24px ${alpha(ROSE, 0.7)}` }} />
        </div>
      </div>
      <div style={{ position: 'absolute', top: 430, opacity: Math.min(1, slam * 1.4), transform: `scale(${2.2 - 1.2 * slam})` }}>
        <div
          style={{
            fontSize: 168,
            fontWeight: 900,
            letterSpacing: '-0.05em',
            backgroundImage: `linear-gradient(100deg, ${CYAN} 0%, ${VIOLET} 45%, ${AMBER} 100%)`,
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
            position: 'relative',
          }}
        >
          Games get played.
          <span
            style={{
              position: 'absolute',
              inset: 0,
              background: `linear-gradient(100deg, transparent ${sheen - 12}%, rgba(255,255,255,0.85) ${sheen}%, transparent ${sheen + 12}%)`,
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            Games get played.
          </span>
        </div>
      </div>
      <Burst x={960} y={540} at={58} count={40} spread={760} seed="hook" />
    </AbsoluteFill>
  );
}

/* ───────────────────────── 2 · Attach ───────────────────────── */

const INSIGHTS: { title: string; items: string[]; color: string }[] = [
  { title: 'Key terms', items: ['Chlorophyll', 'Stomata', 'Glucose'], color: CYAN },
  { title: 'Objectives', items: ['Explain how plants make food'], color: VIOLET },
  { title: 'Misconceptions', items: ['“Plants get food from soil”'], color: ROSE },
];

function AttachScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const drop = spring({ frame: frame - 6, fps, config: { damping: 13, stiffness: 120, mass: 0.9 } });
  const scan = interpolate(frame, [32, 80], [0, 1], { ...clamp, easing: inOut });
  const scanning = frame >= 30 && frame <= 84;
  const docX = 300;
  const docY = 250;
  return (
    <AbsoluteFill>
      <Heading label="Step 1 · Attach your unit" title="Drop in a PDF, Doc or slides." />
      <Sfx at={8} name="whoosh" volume={0.5} />
      <Sfx at={32} name="shimmer" volume={0.35} />
      {[92, 104, 116].map((at) => <Sfx key={at} at={at} name="pop" volume={0.6} />)}

      <div
        style={{
          position: 'absolute',
          left: docX,
          top: docY + 40,
          width: 520,
          height: 680,
          borderRadius: 22,
          background: 'linear-gradient(180deg, #ffffff, #e2e8f0)',
          boxShadow: `0 50px 120px rgba(0,0,0,0.6), 0 0 ${scanning ? 90 : 0}px ${alpha(CYAN, 0.45)}`,
          transform: `translateY(${(1 - drop) * -700}px) rotate(${(1 - drop) * -18 + Math.sin(frame / 22) * 1.2}deg)`,
          overflow: 'hidden',
          padding: 44,
          color: '#0f172a',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ background: '#ef4444', color: '#fff', fontWeight: 900, fontSize: 22, padding: '6px 12px', borderRadius: 8 }}>PDF</span>
          <span style={{ fontSize: 20, fontWeight: 700, color: '#64748b' }}>Class 8 · Science</span>
        </div>
        <div style={{ marginTop: 26, fontSize: 40, fontWeight: 900, letterSpacing: '-0.02em', lineHeight: 1.1 }}>Photosynthesis</div>
        <div style={{ marginTop: 26, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {Array.from({ length: 13 }, (_, i) => {
            const lineY = 0.18 + i * 0.062;
            const lit = scan > lineY && scan < lineY + 0.22;
            const keyLine = i === 2 || i === 5 || i === 9;
            return (
              <div
                key={i}
                style={{
                  height: 14,
                  width: `${[92, 80, 96, 70, 88, 94, 62, 90, 84, 76, 95, 68, 58][i]}%`,
                  borderRadius: 99,
                  background: keyLine && scan > lineY ? alpha(i === 9 ? ROSE : i === 5 ? VIOLET : CYAN, 0.75) : lit ? '#94a3b8' : '#cbd5e1',
                  transition: 'none',
                }}
              />
            );
          })}
        </div>
        {scanning ? (
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: `${scan * 100}%`,
              height: 120,
              marginTop: -100,
              background: `linear-gradient(180deg, transparent, ${alpha(CYAN, 0.35)} 80%, ${CYAN})`,
              borderBottom: `3px solid ${CYAN}`,
              boxShadow: `0 6px 30px ${CYAN}`,
            }}
          />
        ) : null}
      </div>

      <div style={{ position: 'absolute', left: 940, top: 300, width: 700, display: 'flex', flexDirection: 'column', gap: 28 }}>
        {INSIGHTS.map((group, g) => {
          const at = 86 + g * 12;
          const p = spring({ frame: frame - at, fps, config: SPRING.pop });
          const fromX = docX + 260 - 940;
          return (
            <div
              key={group.title}
              style={{
                opacity: Math.min(1, p * 1.5),
                transform: `translate(${(1 - p) * fromX}px, ${(1 - p) * 120}px) scale(${0.5 + 0.5 * p})`,
                borderRadius: 24,
                border: `1.5px solid ${alpha(group.color, 0.45)}`,
                background: `linear-gradient(135deg, ${alpha(group.color, 0.16)}, ${alpha('#ffffff', 0.03)})`,
                padding: '24px 30px',
                boxShadow: `0 20px 60px rgba(0,0,0,0.4), 0 0 40px ${alpha(group.color, 0.12)}`,
              }}
            >
              <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: group.color }}>{group.title}</div>
              <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                {group.items.map((item) => (
                  <span key={item} style={{ fontSize: 32, fontWeight: 750, color: INK, background: alpha('#000000', 0.25), padding: '8px 18px', borderRadius: 14 }}>
                    {item}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}

/* ───────────────────────── 3 · Choose ───────────────────────── */

const FORMATS = [
  { title: 'Digital Escape Room', sub: 'Playable HTML', icon: '🔐', color: AMBER },
  { title: 'Choose Your Own Adventure', sub: 'Google Docs / Slides', icon: '🧭', color: VIOLET },
  { title: 'XP & Skill-Tree Challenge', sub: 'Choice board', icon: '🏆', color: EMERALD },
];

function ChooseScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const picked = frame >= 52;
  const pickPulse = spring({ frame: frame - 52, fps, config: SPRING.pop });
  const btn = spring({ frame: frame - 60, fps, config: SPRING.pop });
  const btnPress = interpolate(frame, [86, 90, 98], [0, 1, 0], clamp);
  const cardW = 470;
  const gap = 46;
  const left0 = (1920 - (cardW * 3 + gap * 2)) / 2;
  return (
    <AbsoluteFill>
      <Heading label="Step 2 · Choose a format" title="Pick the game. MindVault builds it." color={AMBER} />
      <Sfx at={8} name="whoosh" volume={0.4} />
      <Sfx at={52} name="click2" volume={0.9} />
      <Sfx at={90} name="click3" volume={0.9} />
      <Sfx at={92} name="shimmer" volume={0.4} />
      {FORMATS.map((f, i) => {
        const p = spring({ frame: frame - 10 - i * 5, fps, config: { damping: 14, stiffness: 140, mass: 0.8 } });
        const selected = i === 0 && picked;
        const dim = picked && i !== 0;
        const fan = (i - 1) * 14 * (1 - p);
        return (
          <div
            key={f.title}
            style={{
              position: 'absolute',
              left: left0 + i * (cardW + gap),
              top: 360,
              width: cardW,
              height: 360,
              borderRadius: 30,
              padding: 40,
              background: selected ? `linear-gradient(160deg, ${alpha(f.color, 0.28)}, ${alpha('#0b1020', 0.9)})` : `linear-gradient(160deg, ${alpha('#ffffff', 0.08)}, ${alpha('#ffffff', 0.02)})`,
              border: `2px solid ${selected ? f.color : alpha('#ffffff', 0.12)}`,
              boxShadow: selected ? `0 0 0 ${8 * pickPulse}px ${alpha(f.color, 0.18)}, 0 30px 90px ${alpha(f.color, 0.3)}` : '0 30px 80px rgba(0,0,0,0.45)',
              opacity: p * (dim ? 0.4 : 1),
              transform: `translateY(${(1 - p) * 400}px) rotate(${fan}deg) scale(${selected ? 1 + 0.05 * pickPulse : dim ? 0.95 : 1})`,
              display: 'flex',
              flexDirection: 'column',
              gap: 18,
            }}
          >
            <div style={{ fontSize: 74 }}>{f.icon}</div>
            <div style={{ fontSize: 40, fontWeight: 850, letterSpacing: '-0.02em', lineHeight: 1.1 }}>{f.title}</div>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: f.color }}>{f.sub}</div>
            {selected ? (
              <div style={{ position: 'absolute', top: 28, right: 28, width: 52, height: 52, borderRadius: 99, background: f.color, display: 'grid', placeItems: 'center', transform: `scale(${pickPulse})` }}>
                <CheckIcon size={30} color="#0f172a" />
              </div>
            ) : null}
          </div>
        );
      })}
      <div
        style={{
          position: 'absolute',
          top: 800,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          opacity: btn,
          transform: `translateY(${(1 - btn) * 40}px) scale(${1 - btnPress * 0.06})`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '24px 46px', borderRadius: 20, background: AMBER, color: '#0f172a', fontSize: 36, fontWeight: 900, boxShadow: `0 20px 60px ${alpha(AMBER, 0.45)}` }}>
          ✦ Generate Digital Escape Room
        </div>
      </div>
      <Cursor
        path={[
          { f: 24, x: 1500, y: 980 },
          { f: 48, x: left0 + 300, y: 560 },
          { f: 64, x: left0 + 320, y: 600 },
          { f: 84, x: 1060, y: 850 },
        ]}
        pressAt={[52, 90]}
      />
    </AbsoluteFill>
  );
}

/* ───────────────────────── 4 · Play ───────────────────────── */

const W = 1560;
const H = 800;

function MissionClock({ frame }: { frame: number }) {
  const elapsed = Math.max(0, frame - 50) * (768 / 306);
  const remaining = Math.max(0, 30 * 60 - Math.min(elapsed, 768));
  const m = Math.floor(remaining / 60);
  const s = Math.floor(remaining % 60);
  return (
    <div style={{ textAlign: 'right' }}>
      <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '0.2em', color: CYAN }}>MISSION CLOCK</div>
      <div style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 40, fontWeight: 900, color: EMERALD }}>
        {String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
      </div>
    </div>
  );
}

function RoomPips({ cleared }: { cleared: number }) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          style={{
            width: 54,
            height: 10,
            borderRadius: 99,
            background: i < cleared ? EMERALD : alpha('#ffffff', 0.12),
            boxShadow: i < cleared ? `0 0 14px ${alpha(EMERALD, 0.8)}` : 'none',
          }}
        />
      ))}
    </div>
  );
}

function StageShell({ local, len, title, room, children }: { local: number; len: number; title: string; room: number; children: React.ReactNode }) {
  const { fps } = useVideoConfig();
  const enter = spring({ frame: local, fps, config: SPRING.snappy });
  const exit = interpolate(local, [len - 10, len], [0, 1], clamp);
  return (
    <AbsoluteFill style={{ padding: '36px 60px', opacity: enter * (1 - exit), transform: `translateX(${(1 - enter) * 160 - exit * 160}px)` }}>
      <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '0.2em', color: AMBER }}>ROOM {room} OF 4</div>
      <div style={{ fontSize: 46, fontWeight: 900, letterSpacing: '-0.02em', marginTop: 6 }}>{title}</div>
      <div style={{ position: 'relative', flex: 1, marginTop: 24 }}>{children}</div>
    </AbsoluteFill>
  );
}

function Toast({ local, at, text }: { local: number; at: number; text: string }) {
  const { fps } = useVideoConfig();
  const p = spring({ frame: local - at, fps, config: SPRING.pop });
  if (local < at) return null;
  return (
    <div style={{ position: 'absolute', right: 0, bottom: 0, display: 'flex', alignItems: 'center', gap: 12, padding: '14px 24px', borderRadius: 16, background: alpha(EMERALD, 0.16), border: `1.5px solid ${alpha(EMERALD, 0.6)}`, color: EMERALD, fontSize: 26, fontWeight: 800, transform: `translateY(${(1 - p) * 40}px) scale(${0.8 + 0.2 * p})`, opacity: p }}>
      <CheckIcon size={26} color={EMERALD} /> {text}
    </div>
  );
}

const VOCAB = [
  { term: 'Chlorophyll', def: 'Green pigment that traps light' },
  { term: 'Stomata', def: 'Leaf pores for gas exchange' },
  { term: 'Glucose', def: 'Sugar the plant makes' },
];
const DEF_ORDER = [2, 0, 1];

function VocabStage({ local }: { local: number }) {
  const rowY = (i: number) => 30 + i * 130;
  return (
    <>
      <svg width={W - 120} height={420} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
        {VOCAB.map((v, i) => {
          const target = DEF_ORDER.indexOf(i);
          const p = ramp(local, 12 + i * 12, 26 + i * 12, inOut);
          const x1 = 430;
          const y1 = rowY(i) + 42;
          const x2 = 760;
          const y2 = rowY(target) + 42;
          const len = Math.hypot(x2 - x1, y2 - y1) + 60;
          return (
            <path
              key={v.term}
              d={`M${x1},${y1} C${x1 + 160},${y1} ${x2 - 160},${y2} ${x2},${y2}`}
              fill="none"
              stroke={EMERALD}
              strokeWidth={5}
              strokeLinecap="round"
              strokeDasharray={len}
              strokeDashoffset={len * (1 - p)}
              style={{ filter: `drop-shadow(0 0 8px ${EMERALD})` }}
            />
          );
        })}
      </svg>
      {VOCAB.map((v, i) => {
        const done = local > 26 + i * 12;
        return (
          <div key={v.term} style={{ position: 'absolute', left: 0, top: rowY(i), width: 430, height: 84, borderRadius: 18, display: 'flex', alignItems: 'center', padding: '0 28px', fontSize: 32, fontWeight: 800, background: alpha(done ? EMERALD : '#ffffff', done ? 0.14 : 0.06), border: `1.5px solid ${done ? alpha(EMERALD, 0.6) : alpha('#ffffff', 0.12)}` }}>
            {v.term}
          </div>
        );
      })}
      {DEF_ORDER.map((vi, row) => (
        <div key={vi} style={{ position: 'absolute', left: 760, top: rowY(row), width: 640, height: 84, borderRadius: 18, display: 'flex', alignItems: 'center', padding: '0 28px', fontSize: 28, fontWeight: 600, color: '#cbd5e1', background: alpha('#ffffff', 0.05), border: `1.5px solid ${alpha('#ffffff', 0.1)}` }}>
          {VOCAB[vi].def}
        </div>
      ))}
      <Toast local={local} at={56} text="Keyword accepted" />
    </>
  );
}

const SEQ = ['Light is absorbed', 'Water is split', 'CO₂ is taken in', 'Glucose is made'];
const SEQ_START = [2, 0, 3, 1];

function SequenceStage({ local }: { local: number }) {
  const p = ramp(local, 16, 48, inOut);
  const tileW = 330;
  return (
    <>
      {SEQ.map((label, i) => {
        const from = SEQ_START.indexOf(i);
        const slot = from + (i - from) * p;
        const lift = Math.sin(p * Math.PI) * (from !== i ? -70 : 0) * (i % 2 ? 1 : -0.6);
        const done = p >= 1;
        return (
          <div
            key={label}
            style={{
              position: 'absolute',
              left: slot * (tileW + 28),
              top: 90 + lift,
              width: tileW,
              height: 200,
              borderRadius: 24,
              padding: 26,
              background: done ? alpha(EMERALD, 0.14) : alpha('#ffffff', 0.06),
              border: `2px solid ${done ? alpha(EMERALD, 0.65) : alpha(VIOLET, 0.4)}`,
              boxShadow: done ? `0 0 36px ${alpha(EMERALD, 0.25)}` : '0 20px 50px rgba(0,0,0,0.4)',
            }}
          >
            <div style={{ width: 52, height: 52, borderRadius: 99, display: 'grid', placeItems: 'center', fontSize: 26, fontWeight: 900, background: done ? EMERALD : VIOLET, color: '#0f172a' }}>{i + 1}</div>
            <div style={{ marginTop: 22, fontSize: 32, fontWeight: 800, lineHeight: 1.15 }}>{label}</div>
          </div>
        );
      })}
      <Toast local={local} at={54} text="Sequence room unlocked" />
    </>
  );
}

function Dial({ local, start, value, label }: { local: number; start: number; value: number; label: string }) {
  const p = ramp(local, start, start + 30, Easing.out(Easing.cubic));
  const spin = (1 - p) * 30 + value;
  const shown = Math.round(spin) % 10;
  const offset = (spin % 1) * 80;
  const done = p >= 1;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
      <div style={{ width: 200, height: 220, borderRadius: 28, overflow: 'hidden', position: 'relative', background: '#060a14', border: `2px solid ${done ? EMERALD : alpha(CYAN, 0.45)}`, boxShadow: done ? `0 0 40px ${alpha(EMERALD, 0.35)}` : 'inset 0 0 40px rgba(0,0,0,0.8)' }}>
        {[-1, 0, 1].map((k) => (
          <div key={k} style={{ position: 'absolute', left: 0, right: 0, top: 70 + k * 80 - offset, height: 80, display: 'grid', placeItems: 'center', fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 84, fontWeight: 900, color: k === 0 ? (done ? EMERALD : INK) : alpha('#ffffff', 0.2) }}>
            {(shown + k + 10) % 10}
          </div>
        ))}
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: '#cbd5e1' }}>{label}</div>
    </div>
  );
}

function DataStage({ local }: { local: number }) {
  return (
    <>
      <div style={{ fontSize: 28, color: '#cbd5e1', fontWeight: 600 }}>Balance the photosynthesis equation to crack the combination.</div>
      <div style={{ position: 'absolute', top: 70, left: 0, right: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 56 }}>
        <Dial local={local} start={8} value={6} label="CO₂" />
        <div style={{ fontSize: 60, fontWeight: 900, color: MUTED }}>+</div>
        <Dial local={local} start={16} value={6} label="H₂O" />
        <div style={{ fontSize: 60, fontWeight: 900, color: MUTED }}>→</div>
        <Dial local={local} start={24} value={1} label="Glucose" />
      </div>
      <Toast local={local} at={58} text="Combination accepted" />
    </>
  );
}

function MasteryStage({ local }: { local: number }) {
  const { fps } = useVideoConfig();
  const strike = ramp(local, 14, 26, inOut);
  const pick = spring({ frame: local - 34, fps, config: SPRING.pop });
  return (
    <>
      <div style={{ position: 'relative', display: 'inline-block', padding: '22px 30px', borderRadius: 20, background: alpha(ROSE, 0.1), border: `1.5px solid ${alpha(ROSE, 0.45)}`, fontSize: 36, fontWeight: 700, color: '#fecdd3' }}>
        Claim: “Plants get their food from the soil.”
        <div style={{ position: 'absolute', left: 20, right: 20, top: '50%', height: 6, borderRadius: 9, background: ROSE, transform: `scaleX(${strike})`, transformOrigin: 'left' }} />
      </div>
      <div style={{ marginTop: 30, display: 'flex', flexDirection: 'column', gap: 18, width: 1000 }}>
        {['A  Roots absorb ready-made food', 'B  Leaves make glucose using light energy'].map((opt, i) => {
          const right = i === 1;
          const on = right && local >= 34;
          return (
            <div key={opt} style={{ padding: '20px 28px', borderRadius: 18, fontSize: 32, fontWeight: 750, background: on ? alpha(EMERALD, 0.16) : alpha('#ffffff', 0.05), border: `2px solid ${on ? EMERALD : alpha('#ffffff', 0.1)}`, transform: on ? `scale(${1 + 0.03 * pick})` : undefined, opacity: !right && local >= 34 ? 0.45 : 1 }}>
              {opt}
            </div>
          );
        })}
      </div>
    </>
  );
}

function VaultFinale({ local }: { local: number }) {
  const { fps } = useVideoConfig();
  const open = ramp(local, 6, 34, inOut);
  const text = spring({ frame: local - 30, fps, config: SPRING.pop });
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', background: `radial-gradient(circle at 50% 45%, ${alpha(EMERALD, 0.25 * open)}, transparent 60%)` }}>
      <div style={{ position: 'absolute', width: 420, height: 420, display: 'flex', overflow: 'hidden', borderRadius: 999, opacity: 1 - open * 0.9 }}>
        {[0, 1].map((side) => (
          <div
            key={side}
            style={{
              width: 210,
              height: 420,
              background: 'linear-gradient(135deg, #334155, #0f172a)',
              border: `4px solid ${alpha(CYAN, 0.6)}`,
              borderRadius: side === 0 ? '210px 0 0 210px' : '0 210px 210px 0',
              transform: `translateX(${(side === 0 ? -1 : 1) * open * 260}px)`,
            }}
          />
        ))}
        <div style={{ position: 'absolute', left: 150, top: 150, width: 120, height: 120, borderRadius: 99, border: `10px solid ${CYAN}`, transform: `rotate(${open * 540}deg) scale(${1 - open})` }}>
          <div style={{ position: 'absolute', left: 45, top: -10, width: 10, height: 120, background: CYAN }} />
        </div>
      </div>
      <div style={{ textAlign: 'center', opacity: text, transform: `scale(${0.6 + 0.4 * text})` }}>
        <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: '0.3em', color: EMERALD }}>VAULT UNLOCKED</div>
        <div style={{ fontSize: 76, fontWeight: 900, letterSpacing: '-0.03em', marginTop: 10 }}>Mission complete</div>
        <div style={{ fontSize: 32, color: '#cbd5e1', marginTop: 10 }}>
          in <span style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontWeight: 900, color: EMERALD }}>12:48</span> · +400 XP
        </div>
      </div>
      <Burst x={W / 2} y={H / 2 - 60} at={30} count={46} spread={700} seed="vault" />
    </AbsoluteFill>
  );
}

const PLAY_STAGES = [
  { from: 50, len: 82, title: 'Stage 1 · Vocabulary Match', Comp: VocabStage },
  { from: 132, len: 80, title: 'Stage 2 · Sequence Puzzle', Comp: SequenceStage },
  { from: 212, len: 82, title: 'Stage 3 · Data Analysis', Comp: DataStage },
  { from: 294, len: 62, title: 'Stage 4 · Mastery Challenge', Comp: MasteryStage },
];

function PlayScene() {
  const frame = useCurrentFrame();
  const startBtn = interpolate(frame, [36, 40, 48], [0, 1, 0], clamp);
  const startOut = ramp(frame, 42, 52);
  const cleared = frame >= 356 ? 4 : frame >= 294 ? 3 : frame >= 212 ? 2 : frame >= 132 ? 1 : 0;
  const zoom = interpolate(frame, [0, 420], [1, 1.04], clamp);
  const punch = [132, 212, 294, 356].reduce((acc, at) => acc + interpolate(frame, [at, at + 4, at + 14], [0, 1, 0], clamp), 0);
  return (
    <AbsoluteFill>
      <div style={{ position: 'absolute', top: 40, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
        <Label color={EMERALD} delay={2}>Step 3 · Students play it in the browser</Label>
      </div>
      <Sfx at={40} name="click1" volume={0.9} />
      {[78, 90, 102].map((at) => <Sfx key={at} at={at} name="tick" volume={0.5} />)}
      {[132, 212, 294].map((at) => <Sfx key={at} at={at} name="ding" volume={0.45} />)}
      {[226, 234, 242].map((at) => <Sfx key={at} at={at} name="click3" volume={0.6} />)}
      <Sfx at={346} name="click2" volume={0.8} />
      <Sfx at={360} name="whoosh" volume={0.6} />
      <Sfx at={386} name="shimmer" volume={0.7} />
      <Sfx at={388} name="pop" volume={0.9} />

      <div style={{ position: 'absolute', left: (1920 - W) / 2, top: 130, transform: `scale(${zoom + punch * 0.012})`, transformOrigin: '50% 50%' }}>
        <AppWindow width={W} height={H + 56} title="photosynthesis-escape-room.html" delay={0}>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', background: 'linear-gradient(180deg, #0b1224, #050814)' }}>
            <div style={{ height: 96, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 60px', borderBottom: `1px solid ${alpha('#ffffff', 0.08)}` }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '0.2em', color: AMBER }}>DIGITAL ESCAPE ROOM</div>
                <div style={{ fontSize: 30, fontWeight: 900 }}>Operation Green Leaf</div>
              </div>
              <RoomPips cleared={cleared} />
              <MissionClock frame={frame} />
            </div>
            <div style={{ position: 'relative', flex: 1 }}>
              {frame < 54 ? (
                <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center', opacity: 1 - startOut, transform: `scale(${1 + startOut * 0.2})` }}>
                  <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '0.25em', color: CYAN }}>4 LOCKED ROOMS · 30 MINUTES</div>
                  <div style={{ fontSize: 72, fontWeight: 900, letterSpacing: '-0.03em', marginTop: 14 }}>Can your team escape?</div>
                  <div style={{ marginTop: 40, padding: '22px 52px', borderRadius: 18, background: CYAN, color: '#0f172a', fontSize: 34, fontWeight: 900, transform: `scale(${1 - startBtn * 0.08})`, boxShadow: `0 0 ${50 + startBtn * 40}px ${alpha(CYAN, 0.55)}` }}>
                    Start Mission
                  </div>
                </AbsoluteFill>
              ) : null}
              {PLAY_STAGES.map(({ from, len, title, Comp }, i) =>
                frame >= from && frame < from + len ? (
                  <StageShell key={title} local={frame - from} len={len} title={title} room={i + 1}>
                    <Comp local={frame - from} />
                  </StageShell>
                ) : null,
              )}
              {frame >= 356 ? <VaultFinale local={frame - 356} /> : null}
            </div>
          </div>
        </AppWindow>
      </div>
      {frame < 40 ? <Cursor path={[{ f: 8, x: 1300, y: 900 }, { f: 34, x: 975, y: 705 }]} pressAt={[40]} /> : null}
      <div style={{ position: 'absolute', inset: 0, background: '#ffffff', opacity: punch * 0.05, pointerEvents: 'none' }} />
    </AbsoluteFill>
  );
}

/* ───────────────────────── 5 · Quest + skill tree ───────────────────────── */

function QuestPanel({ frame }: { frame: number }) {
  const { fps } = useVideoConfig();
  const steps = [
    { label: 'Decision 1', at: 18 },
    { label: 'Decision 2', at: 50 },
    { label: 'Decision 3', at: 82 },
  ];
  const score = steps.filter((s) => frame >= s.at + 14).length * 100;
  return (
    <div style={{ position: 'absolute', left: 120, top: 300, width: 800, height: 640, borderRadius: 32, padding: 40, background: `linear-gradient(160deg, ${alpha(VIOLET, 0.18)}, ${alpha('#ffffff', 0.02)})`, border: `1.5px solid ${alpha(VIOLET, 0.45)}` }}>
      <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '0.16em', color: VIOLET }}>CHOOSE YOUR OWN ADVENTURE</div>
      <div style={{ fontSize: 38, fontWeight: 900, marginTop: 6 }}>You are the plant scientist</div>
      <div style={{ marginTop: 30, display: 'flex', flexDirection: 'column', gap: 22 }}>
        {steps.map((s) => {
          const p = spring({ frame: frame - s.at, fps, config: SPRING.snappy });
          const chosen = frame >= s.at + 14;
          return (
            <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 18, opacity: p, transform: `translateX(${(1 - p) * -60}px)` }}>
              <div style={{ width: 170, fontSize: 24, fontWeight: 800, color: '#cbd5e1' }}>{s.label}</div>
              {[100, 50, 0].map((pts, j) => {
                const c = pts === 100 ? EMERALD : pts === 50 ? AMBER : ROSE;
                const on = chosen && j === 0;
                return (
                  <div key={pts} style={{ width: 150, padding: '14px 0', textAlign: 'center', borderRadius: 14, fontSize: 26, fontWeight: 900, color: on ? '#0f172a' : c, background: on ? c : alpha(c, 0.1), border: `2px solid ${alpha(c, on ? 1 : 0.4)}`, opacity: chosen && !on ? 0.35 : 1, transform: on ? `scale(${1.06})` : undefined }}>
                    {pts} pts
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
      <div style={{ position: 'absolute', left: 40, right: 40, bottom: 36, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 28px', borderRadius: 18, background: alpha('#000000', 0.3) }}>
        <span style={{ fontSize: 26, fontWeight: 800, color: '#cbd5e1' }}>Scorecard</span>
        <span style={{ fontSize: 40, fontWeight: 900, color: EMERALD, fontFamily: 'ui-monospace, Menlo, monospace' }}>{score} / 300</span>
      </div>
    </div>
  );
}

function SkillPanel({ frame }: { frame: number }) {
  const { fps } = useVideoConfig();
  const tiers = [
    { name: 'Tier 1 · Explore', nodes: 3, at: 20 },
    { name: 'Tier 2 · Apply', nodes: 2, at: 56 },
    { name: 'Tier 3 · Master', nodes: 1, at: 92 },
  ];
  const xp = Math.round(interpolate(frame, [20, 140], [0, 600], { ...clamp, easing: inOut }));
  const badge = spring({ frame: frame - 120, fps, config: SPRING.pop });
  return (
    <div style={{ position: 'absolute', left: 1000, top: 300, width: 800, height: 640, borderRadius: 32, padding: 40, background: `linear-gradient(160deg, ${alpha(EMERALD, 0.14)}, ${alpha('#ffffff', 0.02)})`, border: `1.5px solid ${alpha(EMERALD, 0.4)}` }}>
      <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '0.16em', color: EMERALD }}>XP & SKILL-TREE CHALLENGE</div>
      <div style={{ marginTop: 16, height: 20, borderRadius: 99, background: alpha('#ffffff', 0.08), overflow: 'hidden' }}>
        <div style={{ width: `${(xp / 600) * 100}%`, height: '100%', borderRadius: 99, background: `linear-gradient(90deg, ${EMERALD}, ${CYAN})`, boxShadow: `0 0 20px ${EMERALD}` }} />
      </div>
      <div style={{ marginTop: 8, fontSize: 24, fontWeight: 800, color: '#cbd5e1' }}>
        <span style={{ fontFamily: 'ui-monospace, Menlo, monospace', color: EMERALD }}>{xp}</span> / 600 XP
      </div>
      {tiers.map((t, ti) => (
        <div key={t.name} style={{ position: 'absolute', left: 40, right: 40, top: 470 - ti * 130, display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ width: 210, fontSize: 22, fontWeight: 800, color: '#cbd5e1' }}>{t.name}</div>
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center', gap: 34 }}>
            {Array.from({ length: t.nodes }, (_, n) => {
              const p = spring({ frame: frame - t.at - n * 8, fps, config: SPRING.pop });
              return (
                <div key={n} style={{ width: 84, height: 84, borderRadius: 24, display: 'grid', placeItems: 'center', fontSize: 38, background: p > 0.5 ? alpha(EMERALD, 0.2) : alpha('#ffffff', 0.05), border: `2px solid ${p > 0.5 ? EMERALD : alpha('#ffffff', 0.15)}`, transform: `scale(${0.7 + 0.3 * p}) rotate(${(1 - p) * -20}deg)`, boxShadow: p > 0.5 ? `0 0 26px ${alpha(EMERALD, 0.45)}` : 'none' }}>
                  {p > 0.5 ? '★' : '🔒'}
                </div>
              );
            })}
          </div>
        </div>
      ))}
      <div style={{ position: 'absolute', right: 34, top: 30, padding: '10px 18px', borderRadius: 99, background: AMBER, color: '#0f172a', fontSize: 22, fontWeight: 900, transform: `scale(${badge}) rotate(${(1 - badge) * 30}deg)` }}>
        🏅 Badge earned
      </div>
    </div>
  );
}

function FormatsScene() {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Heading label="Two more formats" title="Branching quests. XP skill trees." color={VIOLET} />
      <Sfx at={6} name="whoosh" volume={0.4} />
      {[32, 64, 96].map((at) => <Sfx key={`q${at}`} at={at} name="click2" volume={0.6} />)}
      {[20, 56, 92].map((at) => <Sfx key={`s${at}`} at={at} name="pop" volume={0.5} />)}
      <Sfx at={120} name="ding" volume={0.6} />
      <QuestPanel frame={frame} />
      <SkillPanel frame={frame} />
    </AbsoluteFill>
  );
}

/* ───────────────────────── 6 · Export ───────────────────────── */

const EXPORTS = [
  { label: 'Single-file HTML', color: CYAN, icon: '</>' },
  { label: 'Google Docs / Slides', color: VIOLET, icon: '▤' },
  { label: 'Classroom choice board', color: EMERALD, icon: '▦' },
  { label: 'Teacher answer key', color: AMBER, icon: '🔑' },
];

function ExportScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill>
      <Heading label="Step 4 · Share it" title="Export anywhere. Answer key included." color={CYAN} top={190} />
      {EXPORTS.map((_, i) => <Sfx key={i} at={14 + i * 7} name="pop" volume={0.5} />)}
      <div style={{ position: 'absolute', top: 560, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 24 }}>
        {EXPORTS.map((e, i) => {
          const p = spring({ frame: frame - 14 - i * 7, fps, config: SPRING.pop });
          return (
            <div key={e.label} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '24px 28px', borderRadius: 24, background: alpha(e.color, 0.12), border: `2px solid ${alpha(e.color, 0.55)}`, fontSize: 29, fontWeight: 850, opacity: p, transform: `translateY(${(1 - p) * 80}px) scale(${0.7 + 0.3 * p})`, boxShadow: `0 0 40px ${alpha(e.color, 0.15)}` }}>
              <span style={{ fontSize: 30, fontWeight: 900, color: e.color, fontFamily: 'ui-monospace, Menlo, monospace' }}>{e.icon}</span>
              {e.label}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}

/* ───────────────────────── 7 · CTA ───────────────────────── */

function CtaScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const logo = spring({ frame: frame - 4, fps, config: { damping: 12, stiffness: 120, mass: 0.9 } });
  const sweep = interpolate(frame, [18, 52], [-30, 130], clamp);
  const url = spring({ frame: frame - 40, fps, config: SPRING.pop });
  const ring = ramp(frame, 0, 40);
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Sfx at={4} name="whoosh" volume={0.5} />
      <Sfx at={10} name="shimmer" volume={0.6} />
      <Sfx at={40} name="pop" volume={0.8} />
      <div style={{ position: 'absolute', width: 1300 * ring, height: 1300 * ring, borderRadius: 999, border: `2px solid ${alpha(CYAN, 0.35 * (1 - ring))}` }} />
      <div style={{ position: 'absolute', top: 230, opacity: logo, transform: `scale(${0.7 + 0.3 * logo})`, filter: `drop-shadow(0 0 40px ${alpha(CYAN, 0.35)})` }}>
        <div style={{ position: 'relative' }}>
          <Img src={staticFile('mindvault-logo-horizontal.png')} style={{ height: 170, display: 'block' }} />
          <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(100deg, transparent ${sweep - 10}%, rgba(255,255,255,0.35) ${sweep}%, transparent ${sweep + 10}%)`, mixBlendMode: 'overlay' }} />
        </div>
      </div>
      <div style={{ position: 'absolute', top: 470, textAlign: 'center' }}>
        <Words text="Turn any chapter into a game." delay={14} size={96} gradient={[INK, '#c7d2fe']} />
        <div style={{ marginTop: 30, display: 'flex', justifyContent: 'center' }}>
          <Label color={AMBER} delay={28}>Gamified Activity · New in MindVault</Label>
        </div>
      </div>
      <div style={{ position: 'absolute', top: 820, padding: '22px 56px', borderRadius: 999, background: `linear-gradient(90deg, ${CYAN}, ${VIOLET})`, color: '#04060F', fontSize: 42, fontWeight: 900, letterSpacing: '-0.01em', transform: `scale(${url})`, boxShadow: `0 20px 70px ${alpha(VIOLET, 0.45)}` }}>
        mindvault.academy
      </div>
    </AbsoluteFill>
  );
}

/* ───────────────────────── HUD + film ───────────────────────── */

function XpHud({ starts }: { starts: number[] }) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const level = starts.filter((s) => frame >= s).length;
  const lastStart = starts[level - 1] ?? 0;
  const pop = spring({ frame: frame - lastStart, fps, config: SPRING.pop });
  const progress = interpolate(frame, [0, durationInFrames - 120], [0, 1], clamp);
  const fadeOut = interpolate(frame, [durationInFrames - 130, durationInFrames - 110], [1, 0], clamp);
  const fadeIn = interpolate(frame, [60, 80], [0, 1], clamp);
  return (
    <div style={{ position: 'absolute', left: 60, right: 60, bottom: 34, display: 'flex', alignItems: 'center', gap: 20, opacity: fadeIn * fadeOut }}>
      <div style={{ padding: '6px 14px', borderRadius: 10, background: alpha(AMBER, 0.15), border: `1.5px solid ${alpha(AMBER, 0.6)}`, color: AMBER, fontSize: 20, fontWeight: 900, letterSpacing: '0.12em', transform: `scale(${level > 1 ? 0.85 + 0.15 * pop : 1})` }}>
        LVL {level}
      </div>
      <div style={{ flex: 1, height: 8, borderRadius: 99, background: alpha('#ffffff', 0.08), overflow: 'hidden' }}>
        <div style={{ width: `${progress * 100}%`, height: '100%', background: `linear-gradient(90deg, ${CYAN}, ${VIOLET}, ${AMBER})`, boxShadow: `0 0 16px ${alpha(CYAN, 0.8)}` }} />
      </div>
      <div style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 20, fontWeight: 800, color: MUTED }}>{Math.round(progress * 1000)} XP</div>
    </div>
  );
}

function Transition({ duration, isLast, children }: { duration: number; isLast: boolean; children: React.ReactNode }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: SPRING.soft, durationInFrames: XFADE + 8 });
  const exit = isLast ? 0 : interpolate(frame, [duration - XFADE, duration], [0, 1], clamp);
  return (
    <AbsoluteFill style={{ opacity: Math.min(1, enter) * (1 - exit), transform: `scale(${1.05 - 0.05 * Math.min(1, enter) - 0.04 * exit})`, filter: exit > 0 ? `blur(${exit * 12}px)` : undefined }}>
      {children}
    </AbsoluteFill>
  );
}

const SCENE_COMPONENTS: Record<(typeof SCENES)[number]['id'], React.FC> = {
  hook: HookScene,
  attach: AttachScene,
  choose: ChooseScene,
  play: PlayScene,
  formats: FormatsScene,
  export: ExportScene,
  cta: CtaScene,
};

export const MindVaultGamifiedActivityFilm: React.FC = () => {
  const { durationInFrames } = useVideoConfig();
  let cursor = 0;
  const slots = SCENES.map((scene, i) => {
    const len = scene.seconds * FPS;
    const isLast = i === SCENES.length - 1;
    const slot = { id: scene.id, from: cursor, duration: len + (isLast ? 0 : XFADE), isLast };
    cursor += len;
    return slot;
  });
  return (
    <PromoProvider value={filmProps}>
      <AbsoluteFill style={{ fontFamily: `${PROMO_FONT}, Inter, system-ui, sans-serif`, color: INK }}>
        <Backdrop />
        <Html5Audio
          src={staticFile('audio/promo-music.wav')}
          volume={(f) => 0.75 * interpolate(f, [0, 10, durationInFrames - 30, durationInFrames], [0, 1, 1, 0], clamp)}
        />
        {slots.map(({ id, from, duration, isLast }) => {
          const Scene = SCENE_COMPONENTS[id];
          return (
            <Sequence key={id} name={id} from={from} durationInFrames={duration}>
              <Transition duration={duration} isLast={isLast}>
                <Scene />
              </Transition>
            </Sequence>
          );
        })}
        <XpHud starts={slots.map((s) => s.from)} />
      </AbsoluteFill>
    </PromoProvider>
  );
};
