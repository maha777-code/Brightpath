import React from 'react';
import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { PAD, SPRING, alpha, clamp, rise, typed, useEnter, usePromo } from './theme';
import { AppWindow, CheckIcon, Chip, CrossIcon, GradientText, SceneHeading } from './ui';

export type SceneProps = { duration: number };

const PRODUCT_WIDTH = 1344; // 70% of a 1920px frame

/* ───────────────────────── 1. Hook ───────────────────────── */

function Clock({ p, minuteDeg }: { p: number; minuteDeg: number }) {
  const { colors } = usePromo();
  return (
    <svg
      width={150}
      height={150}
      viewBox="0 0 100 100"
      style={{ opacity: p, transform: `scale(${0.5 + 0.5 * p}) rotate(${(1 - p) * -40}deg)`, marginBottom: 36 }}
    >
      <circle cx="50" cy="50" r="44" fill={alpha(colors.primary, 0.08)} stroke={colors.primary} strokeWidth="4" />
      {Array.from({ length: 12 }, (_, i) => (
        <line
          key={i}
          x1="50"
          y1="11"
          x2="50"
          y2={i % 3 === 0 ? 19 : 15}
          stroke={alpha('#ffffff', 0.6)}
          strokeWidth="2.5"
          strokeLinecap="round"
          transform={`rotate(${i * 30} 50 50)`}
        />
      ))}
      <line x1="50" y1="50" x2="50" y2="28" stroke="#fff" strokeWidth="5" strokeLinecap="round" transform="rotate(-4 50 50)" />
      <line
        x1="50"
        y1="50"
        x2="50"
        y2="16"
        stroke={colors.accent}
        strokeWidth="3.5"
        strokeLinecap="round"
        transform={`rotate(${minuteDeg} 50 50)`}
      />
      <circle cx="50" cy="50" r="4" fill="#fff" />
    </svg>
  );
}

export function HookScene(_: SceneProps) {
  const { copy } = usePromo();
  const frame = useCurrentFrame();
  const clock = useEnter(0, SPRING.soft);
  const line1 = useEnter(6, SPRING.pop);
  const line2 = useEnter(16, SPRING.pop);
  const minuteDeg = interpolate(frame, [0, 110], [300, 360], clamp);
  const lineStyle: React.CSSProperties = {
    fontSize: 124,
    fontWeight: 800,
    letterSpacing: '-0.04em',
    lineHeight: 1.04,
  };
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', padding: PAD, textAlign: 'center' }}>
      <Clock p={clock} minuteDeg={minuteDeg} />
      <div style={{ ...lineStyle, opacity: line1, transform: `scale(${0.55 + 0.45 * line1})` }}>{copy.hookLine1}</div>
      <div style={{ ...lineStyle, opacity: line2, transform: `scale(${0.55 + 0.45 * line2})` }}>
        <GradientText>{copy.hookLine2}</GradientText>
      </div>
    </AbsoluteFill>
  );
}

/* ───────────────────────── 2. Problem ───────────────────────── */

const PROBLEM_PROMPT = 'Make a Class 9 quiz on Chapter 4 of our science textbook.';
const PROBLEM_REPLY = 'Sure! Here are 10 general questions about plants and the environment…';
const PROBLEM_FLAGS = ['Not from your textbook', 'Wrong grade level', 'Rewrite it… again'];

export function ProblemScene(_: SceneProps) {
  const { copy, colors } = usePromo();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const head = useEnter(4, SPRING.snappy);
  const sub = useEnter(18, SPRING.snappy);
  const userBubble = useEnter(14, SPRING.snappy);
  const botBubble = useEnter(96, SPRING.snappy);
  const thinking = frame > 78 && frame < 100;
  const shake = frame > 175 ? Math.sin((frame - 175) * 1.3) * 10 * Math.exp(-(frame - 175) / 9) : 0;

  return (
    <AbsoluteFill style={{ padding: PAD, flexDirection: 'row', alignItems: 'center', gap: 72 }}>
      <div style={{ width: 720, display: 'flex', flexDirection: 'column', gap: 32 }}>
        <div style={{ ...rise(head, 40), fontSize: 80, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.06 }}>
          {copy.problemHeadline}
        </div>
        <div style={{ ...rise(sub, 24), fontSize: 40, fontWeight: 400, color: alpha(colors.text, 0.72), lineHeight: 1.35 }}>
          {copy.problemSub}
        </div>
      </div>

      <div style={{ position: 'relative', transform: `translateX(${shake}px)` }}>
        <AppWindow width={936} height={640} title="Generic AI chatbot" delay={8}>
          <div style={{ flex: 1, padding: 36, display: 'flex', flexDirection: 'column', gap: 26 }}>
            <div
              style={{
                ...rise(userBubble, 24),
                alignSelf: 'flex-end',
                maxWidth: 640,
                padding: '20px 26px',
                borderRadius: '24px 24px 6px 24px',
                background: alpha(colors.primary, 0.16),
                border: `1px solid ${alpha(colors.primary, 0.35)}`,
                fontSize: 28,
                lineHeight: 1.4,
                minHeight: 40,
              }}
            >
              {typed(PROBLEM_PROMPT, frame, 20, 1.1)}
            </div>

            {thinking ? (
              <div style={{ display: 'flex', gap: 10, padding: '18px 24px' }}>
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: 99,
                      background: alpha('#ffffff', 0.5),
                      transform: `translateY(${Math.sin(frame / 3 - i) * 6}px)`,
                    }}
                  />
                ))}
              </div>
            ) : null}

            {frame >= 96 ? (
              <div
                style={{
                  ...rise(botBubble, 24),
                  alignSelf: 'flex-start',
                  width: 700,
                  padding: '22px 26px',
                  borderRadius: '24px 24px 24px 6px',
                  background: alpha('#ffffff', 0.06),
                  border: `1px solid ${alpha('#ffffff', 0.1)}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 16,
                }}
              >
                <div style={{ fontSize: 28, lineHeight: 1.4, color: alpha(colors.text, 0.85) }}>
                  {typed(PROBLEM_REPLY, frame, 100, 2)}
                </div>
                {[0.92, 0.78, 0.86, 0.6].map((w, i) => {
                  const bar = spring({ frame: Math.max(0, frame - 120 - i * 5), fps, config: SPRING.soft });
                  return (
                    <div
                      key={i}
                      style={{
                        height: 16,
                        width: `${w * 100 * bar}%`,
                        borderRadius: 99,
                        background: alpha('#ffffff', 0.12),
                      }}
                    />
                  );
                })}
              </div>
            ) : null}
          </div>
        </AppWindow>

        {PROBLEM_FLAGS.map((label, i) => {
          const p = spring({ frame: Math.max(0, frame - (150 + i * 14)), fps, config: SPRING.pop });
          const positions = [
            { left: -40, bottom: 150, rot: -4 },
            { right: -20, bottom: 70, rot: 3 },
            { left: 120, bottom: -26, rot: -2 },
          ][i];
          return (
            <div
              key={label}
              style={{
                position: 'absolute',
                left: positions.left,
                right: positions.right,
                bottom: positions.bottom,
                opacity: p,
                transform: `scale(${0.4 + 0.6 * p}) rotate(${positions.rot * p}deg)`,
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '16px 26px',
                borderRadius: 18,
                background: 'rgba(69, 10, 10, 0.92)',
                border: '1.5px solid rgba(248, 113, 113, 0.7)',
                boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                fontSize: 32,
                fontWeight: 700,
                color: '#fecaca',
              }}
            >
              <CrossIcon size={30} color="#f87171" />
              {label}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}

/* ───────────────────────── 3. Reveal ───────────────────────── */

export function RevealScene(_: SceneProps) {
  const { copy, colors } = usePromo();
  const frame = useCurrentFrame();
  const meet = useEnter(0, SPRING.snappy);
  const logo = useEnter(8, SPRING.pop);
  const tagline = useEnter(30, SPRING.snappy);
  const rings = [10, 20].map((start) => interpolate(frame, [start, start + 45], [0, 1], clamp));
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', padding: PAD, textAlign: 'center' }}>
      {rings.map((r, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            width: 520,
            height: 520,
            borderRadius: '50%',
            border: `3px solid ${i === 0 ? colors.primary : colors.accent}`,
            opacity: r > 0 ? (1 - r) * 0.8 : 0,
            transform: `scale(${0.3 + r * 2.4})`,
          }}
        />
      ))}
      <div style={{ ...rise(meet, 24), fontSize: 44, fontWeight: 600, color: alpha(colors.text, 0.75), marginBottom: 12 }}>
        Meet
      </div>
      <Img
        src={staticFile('mindvault-logo-horizontal.png')}
        style={{ width: 1000, mixBlendMode: 'screen', opacity: logo, transform: `scale(${0.7 + 0.3 * logo})` }}
      />
      <div style={{ ...rise(tagline, 30), marginTop: 28, fontSize: 48, fontWeight: 600, maxWidth: 1400, lineHeight: 1.25 }}>
        {copy.revealTagline}
      </div>
    </AbsoluteFill>
  );
}

/* ───────────────────────── 4. Feature: textbook upload ───────────────────────── */

const CHAPTERS = [
  'Cells: the unit of life',
  'Tissues',
  'Nutrition in plants',
  'Photosynthesis',
  'Respiration',
];

function Sidebar({ active, items }: { active: string; items: string[] }) {
  const { colors } = usePromo();
  return (
    <div
      style={{
        width: 280,
        flexShrink: 0,
        padding: 24,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        borderRight: `1px solid ${alpha('#ffffff', 0.08)}`,
        background: alpha('#000000', 0.18),
      }}
    >
      <Img src={staticFile('mindvault-logo-horizontal.png')} style={{ width: 200, marginBottom: 20, mixBlendMode: 'screen' }} />
      {items.map((item) => {
        const on = item === active;
        return (
          <div
            key={item}
            style={{
              padding: '14px 16px',
              borderRadius: 14,
              fontSize: 22,
              fontWeight: on ? 700 : 500,
              color: on ? colors.primary : alpha('#ffffff', 0.6),
              background: on ? alpha(colors.primary, 0.12) : 'transparent',
              border: `1px solid ${on ? alpha(colors.primary, 0.35) : 'transparent'}`,
            }}
          >
            {item}
          </div>
        );
      })}
    </div>
  );
}

export function TextbookScene(_: SceneProps) {
  const { copy, colors } = usePromo();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const file = useEnter(18, SPRING.snappy);
  const progress = interpolate(frame, [36, 84], [0, 1], clamp);
  const done = frame >= 86;
  const doneP = useEnter(86, SPRING.pop);
  const highlight = interpolate(frame, [160, 175], [0, 1], clamp);

  return (
    <AbsoluteFill>
      <SceneHeading label={copy.feature1Label} headline={copy.feature1Headline} />
      <div style={{ position: 'absolute', left: (1920 - PRODUCT_WIDTH) / 2, top: 318 }}>
        <AppWindow width={PRODUCT_WIDTH} height={1080 - 318 - PAD} title="MindVault · Curriculum & Textbook Studio" delay={10}>
          <Sidebar active="Textbook Studio" items={['Home', 'AI Tools', 'Textbook Studio', 'My Resources']} />
          <div style={{ flex: 1, padding: 28, display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 22,
                padding: 18,
                borderRadius: 20,
                border: `2px dashed ${alpha(colors.primary, done ? 0.15 : 0.45)}`,
                background: alpha(colors.primary, 0.05),
              }}
            >
              <div
                style={{
                  opacity: file,
                  transform: `translateX(${(1 - file) * 260}px)`,
                  width: 64,
                  height: 80,
                  borderRadius: 10,
                  background: `linear-gradient(160deg, ${colors.primary}, ${colors.accent})`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 20,
                  fontWeight: 800,
                  color: '#031018',
                  flexShrink: 0,
                }}
              >
                PDF
              </div>
              <div style={{ flex: 1, opacity: file, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 26, fontWeight: 700 }}>
                  <span>Science textbook · Class 9.pdf</span>
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      color: done ? '#34d399' : alpha('#ffffff', 0.6),
                      fontSize: 24,
                      transform: done ? `scale(${0.8 + 0.2 * doneP})` : undefined,
                    }}
                  >
                    {done ? <CheckIcon size={26} color="#34d399" /> : null}
                    {done ? 'Chapters ready' : 'Reading chapters…'}
                  </span>
                </div>
                <div style={{ height: 12, borderRadius: 99, background: alpha('#ffffff', 0.08), overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${progress * 100}%`,
                      height: '100%',
                      background: `linear-gradient(90deg, ${colors.primary}, ${colors.accent})`,
                    }}
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {CHAPTERS.map((title, i) => {
                const p = spring({ frame: Math.max(0, frame - (92 + i * 9)), fps, config: SPRING.snappy });
                const isTarget = i === 3;
                const glow = isTarget ? highlight : 0;
                return (
                  <div
                    key={title}
                    style={{
                      ...rise(p, 24),
                      display: 'flex',
                      alignItems: 'center',
                      gap: 18,
                      padding: '10px 20px',
                      borderRadius: 16,
                      background: glow ? alpha(colors.primary, 0.12 * glow) : alpha('#ffffff', 0.04),
                      border: `1.5px solid ${glow ? alpha(colors.primary, 0.7 * glow) : alpha('#ffffff', 0.08)}`,
                      boxShadow: glow ? `0 0 40px ${alpha(colors.primary, 0.3 * glow)}` : 'none',
                      transform: `${rise(p, 24).transform} scale(${1 + 0.02 * glow})`,
                    }}
                  >
                    <span
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: alpha(colors.accent, 0.2),
                        color: '#ddd6fe',
                        fontSize: 22,
                        fontWeight: 800,
                      }}
                    >
                      {i + 1}
                    </span>
                    <span style={{ fontSize: 26, fontWeight: 600 }}>Chapter {i + 1} · {title}</span>
                    <span style={{ marginLeft: 'auto', fontSize: 20, color: alpha('#ffffff', 0.5) }}>Topics mapped</span>
                  </div>
                );
              })}
            </div>
          </div>
        </AppWindow>
      </div>
    </AbsoluteFill>
  );
}

/* ───────────────────────── 5. Feature: tools follow chapters ───────────────────────── */

const TOOLS = ['Lesson Plan', 'Multiple Choice Quiz', 'Worksheet', 'Presentation', 'Text Rewriter', 'Email Responder'];

const QUESTIONS = [
  { q: 'Which pigment captures light energy in leaves?', options: ['Chlorophyll', 'Haemoglobin', 'Keratin', 'Melanin'] },
  { q: 'Which gas do plants take in for photosynthesis?', options: ['Carbon dioxide', 'Oxygen', 'Nitrogen', 'Hydrogen'] },
  { q: 'Where in the cell does photosynthesis happen?', options: ['Chloroplast', 'Nucleus', 'Mitochondria', 'Ribosome'] },
];

export function ToolsScene(_: SceneProps) {
  const { copy, colors } = usePromo();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const press = interpolate(frame, [30, 36, 44], [1, 0.9, 1], clamp);
  const ripple = interpolate(frame, [34, 60], [0, 1], clamp);
  const toolsBadge = useEnter(24, SPRING.pop);

  return (
    <AbsoluteFill>
      <SceneHeading label={copy.feature2Label} headline={copy.feature2Headline} />
      <div style={{ position: 'absolute', left: (1920 - PRODUCT_WIDTH) / 2, top: 318 }}>
        <AppWindow width={PRODUCT_WIDTH} height={1080 - 318 - PAD} title="MindVault · AI Tools" delay={10}>
          <div
            style={{
              width: 300,
              flexShrink: 0,
              padding: 24,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              borderRight: `1px solid ${alpha('#ffffff', 0.08)}`,
              background: alpha('#000000', 0.18),
            }}
          >
            {TOOLS.map((tool, i) => {
              const p = spring({ frame: Math.max(0, frame - (14 + i * 4)), fps, config: SPRING.snappy });
              const on = tool === 'Multiple Choice Quiz';
              return (
                <div
                  key={tool}
                  style={{
                    ...rise(p, 16),
                    padding: '14px 16px',
                    borderRadius: 14,
                    fontSize: 22,
                    fontWeight: on ? 700 : 500,
                    color: on ? colors.primary : alpha('#ffffff', 0.62),
                    background: on ? alpha(colors.primary, 0.12) : alpha('#ffffff', 0.03),
                    border: `1px solid ${on ? alpha(colors.primary, 0.4) : alpha('#ffffff', 0.06)}`,
                  }}
                >
                  {tool}
                </div>
              );
            })}
          </div>

          <div style={{ flex: 1, padding: 30, display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <div
                style={{
                  flex: 1,
                  padding: '16px 22px',
                  borderRadius: 14,
                  background: alpha('#ffffff', 0.05),
                  border: `1px solid ${alpha('#ffffff', 0.1)}`,
                  fontSize: 24,
                  color: alpha('#ffffff', 0.85),
                }}
              >
                {typed('Class 9 · Chapter 4 · Photosynthesis · 3 questions', frame, 12, 2.2)}
              </div>
              <div style={{ position: 'relative' }}>
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: 14,
                    border: `2px solid ${colors.primary}`,
                    opacity: ripple > 0 ? 1 - ripple : 0,
                    transform: `scale(${1 + ripple * 0.5})`,
                  }}
                />
                <div
                  style={{
                    padding: '16px 30px',
                    borderRadius: 14,
                    background: `linear-gradient(90deg, ${colors.primary}, ${colors.accent})`,
                    color: '#031018',
                    fontSize: 24,
                    fontWeight: 800,
                    transform: `scale(${press})`,
                  }}
                >
                  Generate
                </div>
              </div>
            </div>

            {QUESTIONS.map((item, qi) => {
              const start = 48 + qi * 22;
              const p = spring({ frame: Math.max(0, frame - start), fps, config: SPRING.snappy });
              const reveal = interpolate(frame, [start + 40, start + 50], [0, 1], clamp);
              return (
                <div
                  key={item.q}
                  style={{
                    ...rise(p, 30),
                    padding: '18px 22px',
                    borderRadius: 18,
                    background: alpha('#ffffff', 0.04),
                    border: `1px solid ${alpha('#ffffff', 0.08)}`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 14,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <span style={{ fontSize: 24, fontWeight: 700 }}>
                      {qi + 1}. {item.q}
                    </span>
                    <span
                      style={{
                        marginLeft: 'auto',
                        padding: '6px 14px',
                        borderRadius: 999,
                        fontSize: 18,
                        fontWeight: 700,
                        color: colors.primary,
                        background: alpha(colors.primary, 0.12),
                        whiteSpace: 'nowrap',
                      }}
                    >
                      From your textbook · Ch 4
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 12 }}>
                    {item.options.map((opt, oi) => {
                      const correct = oi === 0;
                      const on = correct ? reveal : 0;
                      return (
                        <span
                          key={opt}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '8px 16px',
                            borderRadius: 12,
                            fontSize: 20,
                            fontWeight: 600,
                            color: on ? '#a7f3d0' : alpha('#ffffff', 0.7),
                            background: on ? `rgba(16, 185, 129, ${0.18 * on})` : alpha('#ffffff', 0.05),
                            border: `1px solid ${on ? `rgba(52, 211, 153, ${0.7 * on})` : alpha('#ffffff', 0.08)}`,
                          }}
                        >
                          {on > 0.5 ? <CheckIcon size={20} color="#34d399" /> : null}
                          {String.fromCharCode(65 + oi)}. {opt}
                        </span>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </AppWindow>

        <div
          style={{
            position: 'absolute',
            right: -28,
            top: -28,
            opacity: toolsBadge,
            transform: `scale(${0.4 + 0.6 * toolsBadge}) rotate(${(1 - toolsBadge) * 20 + 4}deg)`,
            padding: '14px 24px',
            borderRadius: 18,
            background: `linear-gradient(135deg, ${colors.accent}, ${colors.primary})`,
            color: '#fff',
            fontSize: 30,
            fontWeight: 800,
            boxShadow: `0 20px 50px ${alpha(colors.accent, 0.45)}`,
          }}
        >
          Lesson plans · Quizzes · Slides
        </div>
      </div>
    </AbsoluteFill>
  );
}

/* ───────────────────────── 6. Feature: student tutor ───────────────────────── */

const STUDENT_Q = 'Why do leaves need sunlight?';
const SHARADA_A =
  'Great question! Remember Chapter 4: leaves use sunlight to turn carbon dioxide and water into food. What do you think happens in the dark?';

const OVERSIGHT_ROWS = [
  { name: 'Aarav', detail: 'Ch 4 · Photosynthesis', status: 'Live', tone: 'live' },
  { name: 'Meera', detail: 'Ch 3 · Nutrition in plants', status: 'Reviewed', tone: 'ok' },
  { name: 'Safety alerts', detail: 'Flagged chats reach the teacher', status: 'None open', tone: 'ok' },
] as const;

export function TutorScene(_: SceneProps) {
  const { copy, colors } = usePromo();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const notice = useEnter(14, SPRING.snappy);
  const studentBubble = useEnter(20, SPRING.snappy);
  const reply = useEnter(36, SPRING.snappy);
  const langs = ['English', 'Hindi', 'Arabic'];

  return (
    <AbsoluteFill>
      <SceneHeading label={copy.feature3Label} headline={copy.feature3Headline} />
      <div
        style={{
          position: 'absolute',
          left: (1920 - PRODUCT_WIDTH) / 2,
          top: 318,
          width: PRODUCT_WIDTH,
          display: 'flex',
          gap: 32,
        }}
      >
        <AppWindow width={800} height={540} title="Sharada · Student view" delay={10}>
          <div style={{ flex: 1, padding: 30, display: 'flex', flexDirection: 'column', gap: 22 }}>
            <div
              style={{
                ...rise(notice, 14),
                alignSelf: 'center',
                padding: '8px 18px',
                borderRadius: 999,
                fontSize: 20,
                fontWeight: 600,
                color: alpha('#ffffff', 0.7),
                background: alpha('#ffffff', 0.06),
              }}
            >
              Your teacher can see this chat
            </div>
            <div
              style={{
                ...rise(studentBubble, 20),
                alignSelf: 'flex-end',
                padding: '18px 24px',
                borderRadius: '22px 22px 6px 22px',
                background: alpha(colors.primary, 0.16),
                border: `1px solid ${alpha(colors.primary, 0.35)}`,
                fontSize: 28,
              }}
            >
              {STUDENT_Q}
            </div>
            <div style={{ ...rise(reply, 20), display: 'flex', gap: 16, alignItems: 'flex-start' }}>
              <Img
                src={staticFile('mindvault-mark.png')}
                style={{ width: 60, height: 60, borderRadius: 99, flexShrink: 0, background: alpha('#000000', 0.4) }}
              />
              <div
                style={{
                  padding: '18px 24px',
                  borderRadius: '22px 22px 22px 6px',
                  background: alpha('#ffffff', 0.06),
                  border: `1px solid ${alpha('#ffffff', 0.1)}`,
                  fontSize: 27,
                  lineHeight: 1.45,
                  minHeight: 120,
                }}
              >
                <div style={{ fontSize: 20, fontWeight: 700, color: colors.primary, marginBottom: 6 }}>Sharada</div>
                {typed(SHARADA_A, frame, 44, 1.8)}
              </div>
            </div>
          </div>
        </AppWindow>

        <AppWindow width={512} height={540} title="Teacher oversight" delay={22}>
          <div style={{ flex: 1, padding: 26, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {OVERSIGHT_ROWS.map((row, i) => {
              const p = spring({ frame: Math.max(0, frame - (50 + i * 12)), fps, config: SPRING.snappy });
              const live = row.tone === 'live';
              const dot = live ? colors.primary : '#34d399';
              return (
                <div
                  key={row.name}
                  style={{
                    ...rise(p, 24),
                    padding: '18px 20px',
                    borderRadius: 16,
                    background: alpha('#ffffff', 0.04),
                    border: `1px solid ${alpha('#ffffff', 0.08)}`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: 99,
                        background: dot,
                        boxShadow: live ? `0 0 ${10 + Math.sin(frame / 4) * 6}px ${dot}` : 'none',
                      }}
                    />
                    <span style={{ fontSize: 25, fontWeight: 700 }}>{row.name}</span>
                    <span style={{ marginLeft: 'auto', fontSize: 20, fontWeight: 700, color: dot }}>{row.status}</span>
                  </div>
                  <div style={{ fontSize: 21, color: alpha('#ffffff', 0.6), paddingLeft: 24 }}>{row.detail}</div>
                </div>
              );
            })}
          </div>
        </AppWindow>
      </div>

      <div
        style={{
          position: 'absolute',
          left: PAD,
          right: PAD,
          bottom: PAD,
          display: 'flex',
          justifyContent: 'center',
          gap: 20,
        }}
      >
        {langs.map((lang, i) => (
          <Chip key={lang} label={lang} delay={110 + i * 8} />
        ))}
      </div>
    </AbsoluteFill>
  );
}

/* ───────────────────────── 7. Audiences ───────────────────────── */

export function AudienceScene({ duration }: SceneProps) {
  const { copy } = usePromo();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const lead = useEnter(0, SPRING.snappy);
  const words = copy.audiences;
  const perWord = Math.max(10, Math.floor((duration - 24) / words.length));

  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', padding: PAD }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 36, fontSize: 132, fontWeight: 800, letterSpacing: '-0.04em' }}>
        <span style={rise(lead, 30)}>{copy.audienceLead}</span>
        <span style={{ display: 'inline-grid', overflow: 'hidden', paddingBottom: '0.12em', lineHeight: 1.1 }}>
          {words.map((word, i) => {
            const start = 4 + i * perWord;
            const pIn = spring({ frame: Math.max(0, frame - start), fps, config: SPRING.snappy });
            const isLast = i === words.length - 1;
            const pOut = isLast ? 0 : spring({ frame: Math.max(0, frame - (start + perWord)), fps, config: SPRING.snappy });
            return (
              <span
                key={word}
                style={{
                  gridArea: '1 / 1',
                  opacity: pIn * (1 - pOut),
                  transform: `translateY(${(1 - pIn) * 100 - pOut * 100}%)`,
                }}
              >
                <GradientText>{word}</GradientText>
              </span>
            );
          })}
        </span>
      </div>
    </AbsoluteFill>
  );
}

/* ───────────────────────── 8. Call to action ───────────────────────── */

export function CtaScene(_: SceneProps) {
  const { copy, colors, url } = usePromo();
  const frame = useCurrentFrame();
  const logo = useEnter(0, SPRING.pop);
  const head = useEnter(12, SPRING.snappy);
  const button = useEnter(24, SPRING.pop);
  const urlP = useEnter(34, SPRING.snappy);
  const note = useEnter(44, SPRING.snappy);
  const shimmer = ((frame - 50) % 60) / 60;

  return (
    <AbsoluteFill
      style={{ alignItems: 'center', justifyContent: 'center', padding: PAD, textAlign: 'center', gap: 36 }}
    >
      <Img
        src={staticFile('mindvault-logo-horizontal.png')}
        style={{ width: 760, mixBlendMode: 'screen', opacity: logo, transform: `scale(${0.6 + 0.4 * logo})` }}
      />
      <div style={{ ...rise(head, 36), fontSize: 104, fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.04 }}>
        {copy.ctaHeadline}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
        <div
          style={{
            position: 'relative',
            overflow: 'hidden',
            opacity: button,
            transform: `scale(${0.6 + 0.4 * button})`,
            padding: '24px 48px',
            borderRadius: 22,
            background: `linear-gradient(90deg, ${colors.primary}, ${colors.accent})`,
            color: '#031018',
            fontSize: 42,
            fontWeight: 800,
            boxShadow: `0 24px 60px ${alpha(colors.primary, 0.35)}`,
          }}
        >
          {copy.ctaButton} →
          {frame > 50 ? (
            <span
              style={{
                position: 'absolute',
                top: -20,
                bottom: -20,
                width: 90,
                left: `${-20 + shimmer * 140}%`,
                transform: 'skewX(-20deg)',
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent)',
              }}
            />
          ) : null}
        </div>
        <div
          style={{
            ...rise(urlP, 20),
            padding: '22px 36px',
            borderRadius: 22,
            border: `2px solid ${alpha(colors.primary, 0.6)}`,
            background: alpha(colors.primary, 0.08),
            color: colors.primary,
            fontSize: 42,
            fontWeight: 700,
          }}
        >
          {url}
        </div>
      </div>
      <div style={{ ...rise(note, 16), fontSize: 34, fontWeight: 400, color: alpha(colors.text, 0.7) }}>{copy.ctaNote}</div>
    </AbsoluteFill>
  );
}
