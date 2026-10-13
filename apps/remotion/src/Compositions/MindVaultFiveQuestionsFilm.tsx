import React from 'react';
import {
  AbsoluteFill,
  Easing,
  Img,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

export const FIVE_QUESTIONS_FILM = {
  id: 'MindVaultFiveQuestions',
  fps: 30,
  width: 1920,
  height: 1080,
  durationInFrames: 45 * 30,
} as const;

const SANS = '"Ubuntu Sans", Ubuntu, "Segoe UI", sans-serif';
const MONO = '"Ubuntu Mono", "DejaVu Sans Mono", monospace';
const PAPER = '#f4efe6';
const SHEET = '#fffdf8';
const INK = '#14213d';
const NIGHT = '#0b1324';
const CORAL = '#ff5a3c';
const TEAL = '#14b8a6';
const CYAN = '#2ee6ff';
const HIGHLIGHT = '#ffe066';
const RULE = 'rgba(20,33,61,0.08)';

const clamp = {
  extrapolateLeft: 'clamp' as const,
  extrapolateRight: 'clamp' as const,
};

const QUESTIONS = [
  'What should they be able to do by the end?',
  'What did they learn yesterday?',
  'Which standard does it meet?',
  'How will I know they got it?',
  'Who needs support, and who needs a stretch?',
];

const ANSWERS = [
  { label: 'Objective', text: 'Explain how plants use light, water, and CO₂ to make sugar.' },
  { label: 'Warm-up · 5 min', text: 'Recall Monday’s plant cell lab: where are the chloroplasts?' },
  { label: 'Standard', text: 'NGSS MS-LS1-6 · Photosynthesis and the flow of energy' },
  { label: 'Assessment', text: 'Exit ticket: draw the inputs and outputs of a leaf.' },
  { label: 'Differentiation', text: 'Word bank for support. Leaf-color data for a stretch.' },
];

const SCHEDULE = [
  { label: 'Warm-up', minutes: 5, color: '#ffd166' },
  { label: 'Mini-lesson', minutes: 10, color: '#ff8c61' },
  { label: 'Lab stations', minutes: 15, color: TEAL },
  { label: 'Practice', minutes: 10, color: '#4f7cff' },
  { label: 'Exit ticket', minutes: 5, color: CORAL },
];

function pop(frame: number, delay: number, config = { damping: 14, stiffness: 140, mass: 0.7 }) {
  return spring({ frame: frame - delay, fps: 30, config });
}

function rise(frame: number, delay: number, distance = 36) {
  const s = pop(frame, delay);
  return { opacity: s, transform: `translateY(${interpolate(s, [0, 1], [distance, 0])}px)` };
}

function typed(text: string, frame: number, start: number, end: number) {
  const n = Math.round(interpolate(frame, [start, end], [0, text.length], clamp));
  return text.slice(0, n);
}

function Paper({ children }: { children: React.ReactNode }) {
  return (
    <AbsoluteFill style={{ background: PAPER, color: INK, fontFamily: SANS }}>
      <AbsoluteFill
        style={{
          backgroundImage: `linear-gradient(${RULE} 2px, transparent 2px)`,
          backgroundSize: '100% 64px',
          backgroundPosition: '0 30px',
        }}
      />
      <div style={{ position: 'absolute', left: 150, top: 0, bottom: 0, width: 3, background: 'rgba(255,90,60,0.28)' }} />
      {children}
    </AbsoluteFill>
  );
}

function Highlight({ progress, children }: { progress: number; children: React.ReactNode }) {
  return (
    <span style={{ position: 'relative', display: 'inline-block', padding: '0 10px' }}>
      <span
        style={{
          position: 'absolute',
          left: 0,
          bottom: '8%',
          height: '42%',
          width: `${progress * 100}%`,
          background: HIGHLIGHT,
          borderRadius: 6,
          zIndex: 0,
        }}
      />
      <span style={{ position: 'relative', zIndex: 1 }}>{children}</span>
    </span>
  );
}

function Bell({ frame, start, size = 120, color = INK }: { frame: number; start: number; size?: number; color?: string }) {
  const swing = Math.sin(Math.max(0, frame - start) / 2.2) * interpolate(frame, [start, start + 50], [22, 0], clamp);
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      {[0, 1, 2].map((i) => {
        const t = interpolate(frame, [start + i * 9, start + 45 + i * 9], [0, 1], clamp);
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              border: `3px solid ${CORAL}`,
              opacity: (1 - t) * (frame >= start ? 0.8 : 0),
              transform: `scale(${1 + t * 1.6})`,
            }}
          />
        );
      })}
      <svg viewBox="0 0 100 100" width={size} height={size} style={{ transform: `rotate(${swing}deg)`, transformOrigin: '50% 12%' }}>
        <path d="M50 10 C30 10 24 30 24 48 L24 64 L14 76 L86 76 L76 64 L76 48 C76 30 70 10 50 10 Z" fill={color} />
        <circle cx="50" cy="84" r="8" fill={CORAL} />
      </svg>
    </div>
  );
}

function QuestionCard({ index, text, scale = 1 }: { index: number; text: string; scale?: number }) {
  return (
    <div
      style={{
        width: 560 * scale,
        padding: `${26 * scale}px ${30 * scale}px`,
        borderRadius: 18 * scale,
        background: SHEET,
        boxShadow: '0 18px 40px rgba(20,33,61,0.16), 0 2px 0 rgba(20,33,61,0.06)',
        borderTop: `${8 * scale}px solid ${index % 2 === 0 ? CORAL : TEAL}`,
      }}
    >
      <div style={{ fontFamily: MONO, fontSize: 22 * scale, color: index % 2 === 0 ? CORAL : TEAL, fontWeight: 700 }}>
        {String(index + 1).padStart(2, '0')}
      </div>
      <div style={{ marginTop: 8 * scale, fontSize: 34 * scale, lineHeight: 1.18, fontWeight: 700, color: INK }}>{text}</div>
    </div>
  );
}

function OpenScene() {
  const frame = useCurrentFrame();
  const word = 'Monday.';
  const zoom = interpolate(frame, [0, 165], [1.08, 1], { easing: Easing.out(Easing.cubic), ...clamp });
  return (
    <Paper>
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', transform: `scale(${zoom})` }}>
        <div style={{ ...rise(frame, 48, 20), fontFamily: MONO, fontSize: 30, letterSpacing: 6, color: CORAL, fontWeight: 700 }}>
          8:00 AM · FIRST BELL
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 40, marginTop: 10 }}>
          <div style={{ display: 'flex' }}>
            {word.split('').map((ch, i) => {
              const s = pop(frame, 4 + i * 4, { damping: 11, stiffness: 170, mass: 0.6 });
              return (
                <span
                  key={i}
                  style={{
                    display: 'inline-block',
                    fontSize: 230,
                    fontWeight: 800,
                    letterSpacing: -8,
                    opacity: s,
                    transform: `translateY(${interpolate(s, [0, 1], [120, 0])}px) rotate(${interpolate(s, [0, 1], [-14, 0])}deg)`,
                  }}
                >
                  {ch}
                </span>
              );
            })}
          </div>
          <div style={{ opacity: interpolate(frame, [30, 40], [0, 1], clamp) }}>
            <Bell frame={frame} start={40} size={150} />
          </div>
        </div>
        <div style={{ ...rise(frame, 82), marginTop: 30, fontSize: 56, fontWeight: 600, textAlign: 'center', lineHeight: 1.25 }}>
          Every lesson has to answer
          <br />
          <Highlight progress={interpolate(frame, [104, 130], [0, 1], { easing: Easing.inOut(Easing.cubic), ...clamp })}>
            five questions
          </Highlight>
          before it.
        </div>
      </AbsoluteFill>
    </Paper>
  );
}

const CARD_SLOTS = [
  { x: 760, y: 120, r: -3 },
  { x: 1300, y: 240, r: 3 },
  { x: 760, y: 430, r: 2 },
  { x: 1300, y: 560, r: -3 },
  { x: 760, y: 740, r: -1 },
];

function QuestionsScene() {
  const frame = useCurrentFrame();
  const clockMinutes = interpolate(frame, [20, 330], [19 * 60 + 30, 23 * 60 + 40], clamp);
  const hh = Math.floor(clockMinutes / 60);
  const mm = Math.floor(clockMinutes % 60);
  const clock = `${hh > 12 ? hh - 12 : hh}:${String(mm).padStart(2, '0')} PM`;
  const overwhelm = interpolate(frame, [300, 330], [0, 1], clamp);
  const collapse = interpolate(frame, [392, 424], [0, 1], { easing: Easing.in(Easing.cubic), ...clamp });
  const camera = interpolate(frame, [0, 430], [1, 1.03], clamp);
  return (
    <Paper>
      <AbsoluteFill style={{ transform: `scale(${camera})`, transformOrigin: '0% 50%' }}>
        <div style={{ position: 'absolute', left: 200, top: 150, width: 560 }}>
          <div style={{ ...rise(frame, 0, 18), fontFamily: MONO, fontSize: 26, letterSpacing: 6, color: CORAL, fontWeight: 700 }}>
            THE PROBLEM
          </div>
          <div style={{ ...rise(frame, 8), marginTop: 18, fontSize: 70, lineHeight: 1.04, fontWeight: 800, letterSpacing: -2 }}>
            A topic is
            <br />
            not a lesson.
          </div>
          <div style={{ ...rise(frame, 20), marginTop: 28, fontSize: 32, lineHeight: 1.35, color: 'rgba(20,33,61,0.72)' }}>
            “Photosynthesis” doesn’t say what students should do, what they did yesterday, or how you’ll know it worked.
          </div>
          <div style={{ marginTop: 56, display: 'flex', alignItems: 'center', gap: 22, ...rise(frame, 30) }}>
            <div
              style={{
                width: 92,
                height: 92,
                borderRadius: '50%',
                border: `5px solid ${INK}`,
                position: 'relative',
                background: SHEET,
              }}
            >
              {[clockMinutes * 6, (clockMinutes / 60) * 30].map((deg, i) => (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    width: i === 0 ? 4 : 6,
                    height: i === 0 ? 34 : 24,
                    background: i === 0 ? CORAL : INK,
                    borderRadius: 4,
                    transformOrigin: '50% 100%',
                    transform: `translate(-50%, -100%) rotate(${deg}deg)`,
                  }}
                />
              ))}
            </div>
            <div>
              <div style={{ fontFamily: MONO, fontSize: 52, fontWeight: 700 }}>{clock}</div>
              <div style={{ fontSize: 24, color: 'rgba(20,33,61,0.6)' }}>Sunday night, still planning</div>
            </div>
          </div>
          <div
            style={{
              marginTop: 40,
              fontSize: 40,
              fontWeight: 800,
              color: CORAL,
              opacity: overwhelm,
              transform: `translateX(${interpolate(overwhelm, [0, 1], [-30, 0])}px)`,
            }}
          >
            An evening. For one period.
          </div>
        </div>
        {QUESTIONS.map((q, i) => {
          const start = 40 + i * 48;
          const s = pop(frame, start, { damping: 12, stiffness: 120, mass: 0.8 });
          const slot = CARD_SLOTS[i];
          const shake = overwhelm * (1 - collapse) * Math.sin((frame + i * 7) / 1.6) * 3;
          return (
            <div
              key={q}
              style={{
                position: 'absolute',
                left: interpolate(collapse, [0, 1], [slot.x, 900]),
                top: interpolate(collapse, [0, 1], [slot.y, 470]),
                opacity: s * (1 - collapse),
                transform: `translate(${interpolate(s, [0, 1], [500, 0]) + shake}px, ${interpolate(s, [0, 1], [260, 0])}px) rotate(${interpolate(s, [0, 1], [24, slot.r]) * (1 - collapse)}deg) scale(${1 - collapse * 0.8})`,
              }}
            >
              <QuestionCard index={i} text={q} scale={0.9} />
            </div>
          );
        })}
      </AbsoluteFill>
    </Paper>
  );
}

function TurnScene() {
  const frame = useCurrentFrame();
  const wipe = interpolate(frame, [0, 30], [0, 1], { easing: Easing.inOut(Easing.cubic), ...clamp });
  return (
    <AbsoluteFill
      style={{
        background: NIGHT,
        clipPath: `circle(${wipe * 140}% at 50% 47%)`,
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontFamily: SANS,
      }}
    >
      <div style={{ ...rise(frame, 22), fontSize: 120, fontWeight: 800, letterSpacing: -4 }}>Or answer them once.</div>
      <div style={{ ...rise(frame, 42, 20), marginTop: 26, display: 'flex', alignItems: 'center', gap: 18 }}>
        <Img src={staticFile('mindvault-mark.png')} style={{ width: 64, height: 64, borderRadius: '50%' }} />
        <div style={{ fontSize: 42, fontWeight: 600, color: CYAN }}>MindVault Lesson Plan Generator</div>
      </div>
    </AbsoluteFill>
  );
}

const FIELDS = [
  { key: 'grade', label: 'Grade level', value: '7th Grade', start: 14, end: 30 },
  {
    key: 'topic',
    label: 'Topic, Standard, or Objective',
    value: 'Photosynthesis: how plants turn light into food',
    start: 34,
    end: 88,
  },
  {
    key: 'criteria',
    label: 'Additional Criteria',
    value: 'Builds on Monday’s plant cell lab. Students work in pairs.',
    start: 92,
    end: 140,
  },
  { key: 'standards', label: 'Standards Set to Align to', value: 'NGSS MS-LS1-6', start: 144, end: 162 },
];

function InputScene() {
  const frame = useCurrentFrame();
  const active = FIELDS.findIndex((f) => frame >= f.start - 4 && frame <= f.end + 4);
  const focusY = interpolate(frame, [0, 34, 92, 144, 175, 235], [40, 0, -50, -110, -130, -130], {
    easing: Easing.inOut(Easing.cubic),
    ...clamp,
  });
  const zoom = interpolate(frame, [0, 30, 180, 235], [0.96, 1.08, 1.08, 1.02], clamp);
  const press = pop(frame, 186, { damping: 9, stiffness: 220, mass: 0.5 });
  const generating = frame >= 192;
  const chip = pop(frame, 166);
  return (
    <AbsoluteFill style={{ background: NIGHT, fontFamily: SANS, color: 'white', overflow: 'hidden' }}>
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(900px 600px at 20% 10%, rgba(46,230,255,0.14), transparent 60%), radial-gradient(800px 520px at 90% 90%, rgba(124,92,255,0.16), transparent 55%)',
        }}
      />
      <div style={{ position: 'absolute', left: 120, top: 120, width: 420, ...rise(frame, 4) }}>
        <div style={{ fontFamily: MONO, fontSize: 24, letterSpacing: 6, color: CYAN, fontWeight: 700 }}>STEP 1</div>
        <div style={{ marginTop: 16, fontSize: 64, lineHeight: 1.05, fontWeight: 800, letterSpacing: -2 }}>
          Tell it about the class.
        </div>
        <div style={{ marginTop: 22, fontSize: 28, lineHeight: 1.4, color: 'rgba(255,255,255,0.7)' }}>
          Grade, topic, what came before, the standard, and your unit file.
        </div>
      </div>
      <div
        style={{
          position: 'absolute',
          left: 640,
          top: 140,
          width: 1120,
          transform: `translateY(${focusY}px) scale(${zoom})`,
          transformOrigin: '50% 0%',
          opacity: interpolate(frame, [0, 12], [0, 1], clamp),
        }}
      >
        <div
          style={{
            borderRadius: 28,
            background: '#0f1729',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 40px 80px rgba(0,0,0,0.45)',
            padding: '36px 42px',
          }}
        >
          <div style={{ fontSize: 30, fontWeight: 700 }}>Lesson Plan Generator</div>
          <div style={{ marginTop: 6, fontSize: 20, color: 'rgba(255,255,255,0.55)' }}>
            Generate a lesson plan based on a standard, topic, or objective.
          </div>
          {FIELDS.map((f, i) => {
            const isActive = i === active;
            const value = typed(f.value, frame, f.start, f.end);
            const caret = isActive && Math.floor(frame / 8) % 2 === 0;
            return (
              <div key={f.key} style={{ marginTop: 26 }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: isActive ? CYAN : 'rgba(255,255,255,0.85)' }}>{f.label}</div>
                <div
                  style={{
                    marginTop: 10,
                    minHeight: f.key === 'topic' ? 120 : 64,
                    borderRadius: 16,
                    padding: '16px 20px',
                    fontSize: 28,
                    background: '#151c2b',
                    border: `2px solid ${isActive ? CYAN : 'rgba(255,255,255,0.12)'}`,
                    boxShadow: isActive ? '0 0 0 6px rgba(46,230,255,0.12)' : 'none',
                  }}
                >
                  {value}
                  {caret ? <span style={{ display: 'inline-block', width: 3, height: 30, background: CYAN, marginLeft: 3, verticalAlign: 'middle' }} /> : null}
                  {f.key === 'topic' ? (
                    <div
                      style={{
                        marginTop: 16,
                        width: 'fit-content',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        borderRadius: 999,
                        padding: '8px 16px',
                        background: 'rgba(46,230,255,0.12)',
                        border: '1px solid rgba(46,230,255,0.4)',
                        fontSize: 20,
                        color: CYAN,
                        opacity: chip,
                        transform: `scale(${interpolate(chip, [0, 1], [0.6, 1])})`,
                      }}
                    >
                      <span
                        style={{
                          borderRadius: 6,
                          padding: '2px 8px',
                          background: CORAL,
                          color: 'white',
                          fontFamily: MONO,
                          fontSize: 16,
                          fontWeight: 700,
                        }}
                      >
                        PDF
                      </span>
                      unit-4-plants.pdf · read into the lesson
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
          <div
            style={{
              marginTop: 34,
              borderRadius: 18,
              padding: '22px 0',
              textAlign: 'center',
              fontSize: 30,
              fontWeight: 800,
              color: NIGHT,
              background: `linear-gradient(90deg, #06b6d4, #2dd4bf, #06b6d4)`,
              boxShadow: `0 0 ${interpolate(frame, [170, 186], [10, 50], clamp)}px rgba(46,230,255,0.55)`,
              transform: `scale(${1 - 0.05 * (1 - press) * (frame >= 186 ? 1 : 0)})`,
            }}
          >
            {generating ? 'Generating Lesson Plan…' : '✦ Generate Lesson Plan'}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}

function AnswersScene() {
  const frame = useCurrentFrame();
  const reveal = interpolate(frame, [0, 30], [0, 1], { easing: Easing.inOut(Easing.cubic), ...clamp });
  const sheet = pop(frame, 10, { damping: 16, stiffness: 110, mass: 0.8 });
  const camera = interpolate(frame, [0, 180, 300], [1.04, 1, 0.97], clamp);
  const total = SCHEDULE.reduce((a, b) => a + b.minutes, 0);
  return (
    <AbsoluteFill style={{ clipPath: `circle(${reveal * 150}% at 70% 85%)` }}>
      <Paper>
        <AbsoluteFill style={{ transform: `scale(${camera})` }}>
          <div style={{ position: 'absolute', left: 200, top: 120, width: 420 }}>
            <div style={{ ...rise(frame, 16, 18), fontFamily: MONO, fontSize: 24, letterSpacing: 6, color: TEAL, fontWeight: 700 }}>
              STEP 2
            </div>
            <div style={{ ...rise(frame, 22), marginTop: 16, fontSize: 64, lineHeight: 1.05, fontWeight: 800, letterSpacing: -2 }}>
              All five, answered.
            </div>
            <div style={{ ...rise(frame, 34), marginTop: 22, fontSize: 28, lineHeight: 1.4, color: 'rgba(20,33,61,0.7)' }}>
              One class period, built from your topic, your standard, and your file.
            </div>
          </div>
          <div
            style={{
              position: 'absolute',
              left: 700,
              top: 90,
              width: 1060,
              borderRadius: 24,
              background: SHEET,
              boxShadow: '0 30px 70px rgba(20,33,61,0.18)',
              padding: '34px 44px',
              opacity: sheet,
              transform: `translateY(${interpolate(sheet, [0, 1], [80, 0])}px)`,
            }}
          >
            <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: -1 }}>Photosynthesis: Light to Food</div>
            <div style={{ marginTop: 6, fontFamily: MONO, fontSize: 22, color: 'rgba(20,33,61,0.6)' }}>
              7th Grade · {total} minutes · NGSS MS-LS1-6
            </div>
            {ANSWERS.map((a, i) => {
              const land = 40 + i * 24;
              const card = pop(frame, land, { damping: 13, stiffness: 160, mass: 0.6 });
              const check = pop(frame, land + 10, { damping: 10, stiffness: 220, mass: 0.5 });
              return (
                <div
                  key={a.label}
                  style={{
                    marginTop: 18,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 20,
                    opacity: interpolate(frame, [land - 6, land + 4], [0, 1], clamp),
                  }}
                >
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      flexShrink: 0,
                      borderRadius: 14,
                      background: i % 2 === 0 ? CORAL : TEAL,
                      color: 'white',
                      fontFamily: MONO,
                      fontWeight: 700,
                      fontSize: 24,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transform: `translateX(${interpolate(card, [0, 1], [420, 0])}px) rotate(${interpolate(card, [0, 1], [30, 0])}deg)`,
                    }}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(20,33,61,0.55)' }}>
                      {a.label}
                    </div>
                    <div style={{ fontSize: 28, fontWeight: 600, lineHeight: 1.25 }}>
                      {a.text}
                    </div>
                  </div>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: '50%',
                      background: TEAL,
                      color: 'white',
                      fontSize: 26,
                      fontWeight: 900,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transform: `scale(${check})`,
                    }}
                  >
                    ✓
                  </div>
                </div>
              );
            })}
            <div style={{ marginTop: 30, opacity: interpolate(frame, [168, 180], [0, 1], clamp) }}>
              <div style={{ display: 'flex', height: 64, borderRadius: 14, overflow: 'hidden', background: 'rgba(20,33,61,0.06)' }}>
                {SCHEDULE.map((block, i) => {
                  const grow = interpolate(frame, [172 + i * 8, 186 + i * 8], [0, 1], { easing: Easing.out(Easing.cubic), ...clamp });
                  return (
                    <div
                      key={block.label}
                      style={{
                        width: `${(block.minutes / total) * 100 * grow}%`,
                        background: block.color,
                        color: i === 0 ? INK : 'white',
                        fontSize: 19,
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                      }}
                    >
                      {block.label} {block.minutes}
                    </div>
                  );
                })}
              </div>
              <div
                style={{
                  marginTop: 12,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontFamily: MONO,
                  fontSize: 24,
                  fontWeight: 700,
                  opacity: interpolate(frame, [215, 228], [0, 1], clamp),
                }}
              >
                <span>= {total} min</span>
                <span style={{ color: CORAL }}>Fits before the bell.</span>
              </div>
            </div>
          </div>
          <div style={{ position: 'absolute', left: 200, top: 640, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {['Translate it', 'Refine with a follow-up', 'Save to My Resources'].map((pill, i) => (
              <div
                key={pill}
                style={{
                  ...rise(frame, 236 + i * 10, 24),
                  alignSelf: 'flex-start',
                  borderRadius: 999,
                  padding: '14px 26px',
                  background: INK,
                  color: 'white',
                  fontSize: 26,
                  fontWeight: 700,
                }}
              >
                {pill}
              </div>
            ))}
          </div>
        </AbsoluteFill>
      </Paper>
    </AbsoluteFill>
  );
}

function CloseScene() {
  const frame = useCurrentFrame();
  const lines = ['Five questions.', 'One plan.', 'Before the bell.'];
  const mark = pop(frame, 70, { damping: 12, stiffness: 90, mass: 0.8 });
  return (
    <Paper>
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ display: 'flex', gap: 34, alignItems: 'baseline' }}>
          {lines.map((line, i) => {
            const s = pop(frame, i * 14, { damping: 12, stiffness: 150, mass: 0.6 });
            return (
              <div
                key={line}
                style={{
                  fontSize: 86,
                  fontWeight: 800,
                  letterSpacing: -3,
                  color: i === 2 ? CORAL : INK,
                  opacity: s,
                  transform: `translateY(${interpolate(s, [0, 1], [70, 0])}px)`,
                }}
              >
                {line}
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 70, display: 'flex', alignItems: 'center', gap: 34, opacity: mark, transform: `scale(${interpolate(mark, [0, 1], [0.8, 1])})` }}>
          <Img src={staticFile('mindvault-mark.png')} style={{ width: 130, height: 130, borderRadius: '50%' }} />
          <div>
            <div style={{ fontFamily: MONO, fontSize: 26, letterSpacing: 8, color: TEAL, fontWeight: 700 }}>MINDVAULT</div>
            <div style={{ fontSize: 60, fontWeight: 800, letterSpacing: -1.5 }}>Lesson Plan Generator</div>
          </div>
          <div style={{ marginLeft: 90 }}>
            <Bell frame={frame} start={96} size={96} />
          </div>
        </div>
      </AbsoluteFill>
    </Paper>
  );
}

function Fade({
  duration,
  fadeIn = true,
  fadeOut = true,
  children,
}: {
  duration: number;
  fadeIn?: boolean;
  fadeOut?: boolean;
  children: React.ReactNode;
}) {
  const frame = useCurrentFrame();
  const opacity = Math.min(
    fadeIn ? interpolate(frame, [0, 12], [0, 1], clamp) : 1,
    fadeOut ? interpolate(frame, [duration - 14, duration], [1, 0], clamp) : 1,
  );
  return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
}

function Progress() {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 8, background: 'rgba(20,33,61,0.08)' }}>
      <div style={{ width: `${(frame / durationInFrames) * 100}%`, height: '100%', background: `linear-gradient(90deg, ${CORAL}, ${HIGHLIGHT}, ${TEAL})` }} />
    </div>
  );
}

export const MindVaultFiveQuestionsFilm: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: PAPER }}>
      <Sequence from={0} durationInFrames={165}>
        <Fade duration={165} fadeIn={false}>
          <OpenScene />
        </Fade>
      </Sequence>
      <Sequence from={150} durationInFrames={430}>
        <Fade duration={430} fadeOut={false}>
          <QuestionsScene />
        </Fade>
      </Sequence>
      <Sequence from={560} durationInFrames={120}>
        <TurnScene />
      </Sequence>
      <Sequence from={668} durationInFrames={232}>
        <Fade duration={232}>
          <InputScene />
        </Fade>
      </Sequence>
      <Sequence from={885} durationInFrames={300}>
        <Fade duration={300} fadeIn={false}>
          <AnswersScene />
        </Fade>
      </Sequence>
      <Sequence from={1170} durationInFrames={180}>
        <Fade duration={180} fadeOut={false}>
          <CloseScene />
        </Fade>
      </Sequence>
      <Progress />
    </AbsoluteFill>
  );
};
