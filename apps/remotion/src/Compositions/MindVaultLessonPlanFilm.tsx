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

export const LESSON_PLAN_FILM = {
  id: 'MindVaultLessonPlan',
  fps: 30,
  width: 1920,
  height: 1080,
  durationInFrames: 45 * 30,
} as const;

const FONT = 'Bahnschrift, "Segoe UI", sans-serif';
const SERIF = 'Georgia, "Iowan Old Style", serif';
const INK = '#07131c';
const CYAN = '#2ee6ff';
const PAPER = '#f5f8fb';
const MUTED = '#8ea0b3';

const clamp = {
  extrapolateLeft: 'clamp' as const,
  extrapolateRight: 'clamp' as const,
};

const CONSTRAINTS = [
  'A grade-level objective',
  'What they learned yesterday',
  'Fifty minutes. Not ninety.',
  'A standard with a real name',
  'Practice they can finish',
  'A way to know they learned it',
  'Support, and a stretch',
];

const BLOCKS = [
  { label: 'Opening', minutes: 8, width: 16 },
  { label: 'New material', minutes: 12, width: 24 },
  { label: 'Guided practice', minutes: 15, width: 30 },
  { label: 'Independent', minutes: 8, width: 16 },
  { label: 'Closing', minutes: 5, width: 14 },
];

function rise(frame: number, delay: number, distance = 28) {
  const spr = spring({
    frame: frame - delay,
    fps: 30,
    config: { damping: 16, stiffness: 120, mass: 0.7 },
  });
  return {
    opacity: spr,
    transform: `translateY(${interpolate(spr, [0, 1], [distance, 0])}px)`,
  };
}

function Stage({ children }: { children: React.ReactNode }) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const drift = interpolate(frame, [0, durationInFrames], [0, -40]);
  const progress = frame / durationInFrames;
  return (
    <AbsoluteFill style={{ background: INK, fontFamily: FONT, color: 'white', overflow: 'hidden' }}>
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(900px 520px at 18% 12%, rgba(46,230,255,0.16), transparent 60%), radial-gradient(800px 500px at 90% 88%, rgba(99,102,241,0.18), transparent 55%)',
          transform: `translateY(${drift}px)`,
        }}
      />
      <AbsoluteFill
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)',
          backgroundSize: '80px 80px',
          opacity: 0.35,
          maskImage: 'radial-gradient(circle at 50% 45%, black 20%, transparent 75%)',
        }}
      />
      {children}
      <div
        style={{
          position: 'absolute',
          left: 80,
          right: 80,
          bottom: 36,
          height: 3,
          borderRadius: 99,
          background: 'rgba(255,255,255,0.08)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${progress * 100}%`,
            height: '100%',
            background: `linear-gradient(90deg, ${CYAN}, #7c5cff)`,
          }}
        />
      </div>
    </AbsoluteFill>
  );
}

function NightScene() {
  const frame = useCurrentFrame();
  const hand = interpolate(frame, [0, 150], [0, 80]);
  const caret = frame % 16 < 8 ? 1 : 0;
  const title = rise(frame, 18, 36);
  const sub = rise(frame, 36, 24);
  return (
    <AbsoluteFill style={{ padding: '120px 140px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ letterSpacing: 6, fontSize: 18, color: CYAN, fontWeight: 700 }}>SUNDAY NIGHT</div>
          <div style={{ marginTop: 18, fontSize: 120, fontWeight: 700, letterSpacing: -3, lineHeight: 0.9 }}>
            9:47
            <span style={{ fontSize: 42, marginLeft: 14, color: MUTED, letterSpacing: 2 }}>PM</span>
          </div>
        </div>
        <div
          style={{
            width: 168,
            height: 168,
            borderRadius: '50%',
            border: '2px solid rgba(46,230,255,0.45)',
            position: 'relative',
            boxShadow: '0 0 40px rgba(46,230,255,0.15)',
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: 3,
              height: 62,
              background: CYAN,
              transformOrigin: '50% 0%',
              transform: `translate(-50%, 0) rotate(${hand}deg)`,
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: 'white',
              transform: 'translate(-50%, -50%)',
            }}
          />
        </div>
      </div>
      <div style={{ marginTop: 70, maxWidth: 1100, ...title }}>
        <div style={{ fontFamily: SERIF, fontSize: 78, lineHeight: 1.05, fontWeight: 500 }}>
          The lesson still
          <br />
          isn’t written.
        </div>
      </div>
      <div style={{ marginTop: 28, fontSize: 32, color: MUTED, ...sub }}>First period is in the morning.</div>
      <div
        style={{
          marginTop: 54,
          width: 720,
          height: 150,
          borderRadius: 22,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          padding: 28,
          display: 'flex',
          alignItems: 'flex-start',
        }}
      >
        <div style={{ width: 3, height: 36, background: CYAN, opacity: caret }} />
      </div>
    </AbsoluteFill>
  );
}

function ProblemScene() {
  const frame = useCurrentFrame();
  const head = rise(frame, 4, 20);
  const verdictIn = spring({
    frame: frame - 210,
    fps: 30,
    config: { damping: 12, stiffness: 140 },
  });
  return (
    <AbsoluteFill style={{ padding: '100px 140px', display: 'flex', flexDirection: 'row', gap: 80 }}>
      <div style={{ width: 620 }}>
        <div style={{ letterSpacing: 5, fontSize: 16, color: '#ff8b9a', fontWeight: 700 }} {...{}}>
          THE PROBLEM
        </div>
        <div style={{ marginTop: 22, fontFamily: SERIF, fontSize: 64, lineHeight: 1.02, ...head }}>
          A topic is not
          <br />a lesson plan.
        </div>
        <div
          style={{
            marginTop: 36,
            opacity: verdictIn,
            transform: `translateY(${interpolate(verdictIn, [0, 1], [16, 0])}px)`,
            fontSize: 30,
            lineHeight: 1.35,
            color: '#f3f7fb',
            maxWidth: 520,
          }}
        >
          Hours of planning, for a single class period that still has to fit yesterday, a standard, and proof they learned it.
        </div>
      </div>
      <div style={{ flex: 1, paddingTop: 8 }}>
        {CONSTRAINTS.map((label, index) => {
          const spr = spring({
            frame: frame - (16 + index * 16),
            fps: 30,
            config: { damping: 13, stiffness: 150, mass: 0.65 },
          });
          return (
            <div
              key={label}
              style={{
                opacity: spr,
                transform: `translateX(${interpolate(spr, [0, 1], [80, 0])}px)`,
                display: 'flex',
                alignItems: 'center',
                gap: 18,
                height: 72,
                marginBottom: 12,
                padding: '0 22px',
                borderRadius: 18,
                background: 'rgba(8, 18, 28, 0.72)',
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 16px 40px rgba(0,0,0,0.25)',
              }}
            >
              <span style={{ width: 42, color: CYAN, fontWeight: 700, fontSize: 18 }}>
                {String(index + 1).padStart(2, '0')}
              </span>
              <span style={{ fontSize: 30, fontWeight: 650 }}>{label}</span>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}

function TurnScene() {
  const frame = useCurrentFrame();
  const mark = spring({ frame, fps: 30, config: { damping: 12, stiffness: 90 } });
  const line = interpolate(frame, [28, 70], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const sub = rise(frame, 48, 18);
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Img
        src={staticFile('mindvault-mark.png')}
        style={{
          width: 150,
          height: 150,
          borderRadius: '50%',
          opacity: mark,
          transform: `scale(${interpolate(mark, [0, 1], [0.6, 1])})`,
          boxShadow: '0 0 60px rgba(46,230,255,0.35)',
        }}
      />
      <div style={{ marginTop: 28, fontSize: 28, letterSpacing: 10, fontWeight: 700, color: CYAN }}>MINDVAULT</div>
      <div style={{ marginTop: 12, fontSize: 78, fontWeight: 720, letterSpacing: -2 }}>Lesson Plan Generator</div>
      <div style={{ marginTop: 18, width: 420, height: 4, background: 'rgba(255,255,255,0.12)', borderRadius: 99 }}>
        <div style={{ width: `${line * 100}%`, height: '100%', background: CYAN, borderRadius: 99 }} />
      </div>
      <div style={{ marginTop: 28, fontSize: 34, color: '#d5e4f0', ...sub }}>Tell it the class you actually teach.</div>
    </AbsoluteFill>
  );
}

function typed(text: string, frame: number, start: number, speed = 1.15) {
  const count = Math.max(0, Math.floor((frame - start) * speed));
  return text.slice(0, Math.min(text.length, count));
}

function Field({
  label,
  value,
  tall,
  caret,
}: {
  label: string;
  value: string;
  tall?: boolean;
  caret?: boolean;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: '#334155', marginBottom: 6 }}>{label}</div>
      <div
        style={{
          minHeight: tall ? 72 : 46,
          borderRadius: 12,
          border: '1px solid #d5dee8',
          background: '#fbfdff',
          padding: '12px 14px',
          fontSize: 20,
          lineHeight: 1.35,
          color: '#0f172a',
        }}
      >
        {value}
        {caret ? (
          <span
            style={{
              display: 'inline-block',
              width: 2,
              height: 18,
              background: '#0891b2',
              marginLeft: 2,
              verticalAlign: 'text-bottom',
            }}
          />
        ) : null}
      </div>
    </div>
  );
}

function ProductScene() {
  const frame = useCurrentFrame();
  const card = spring({ frame, fps: 30, config: { damping: 16, stiffness: 100 } });
  const plan = spring({
    frame: frame - 275,
    fps: 30,
    config: { damping: 15, stiffness: 90 },
  });
  const topic = typed(
    'HS-PS1-1. Use the periodic table as a model for the properties of elements.',
    frame,
    28,
    1.35,
  );
  const criteria = typed(
    'Chemistry unit. Yesterday: the table layout. Add a 10-minute lab rotation and group work.',
    frame,
    95,
    1.25,
  );
  const standards = typed('NGSS HS-PS1-1', frame, 175, 1.1);
  const showFile = frame > 205;
  const pressed = frame > 250 && frame < 268;

  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div
        style={{
          width: interpolate(plan, [0, 1], [980, 1560]),
          display: 'flex',
          alignItems: 'center',
          opacity: card,
          transform: `translateY(${interpolate(card, [0, 1], [40, 0])}px) scale(${interpolate(card, [0, 1], [0.96, 1])})`,
        }}
      >
        <div
          style={{
            flex: 1,
            background: PAPER,
            color: '#0f172a',
            borderRadius: 28,
            padding: 32,
            boxShadow: '0 30px 80px rgba(0,0,0,0.35)',
            transition: 'none',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <div>
              <div style={{ fontSize: 13, letterSpacing: 2, color: '#0891b2', fontWeight: 800 }}>MINDVAULT</div>
              <div style={{ fontSize: 28, fontWeight: 750 }}>Lesson Plan Generator</div>
            </div>
            <div style={{ fontSize: 16, color: '#64748b' }}>9th grade</div>
          </div>
          <Field label="Topic, Standard, or Objective" value={topic} tall caret={frame >= 28 && frame < 95} />
          <Field label="Additional Criteria" value={criteria} tall caret={frame >= 95 && frame < 175} />
          <Field label="Standards Set to Align to" value={standards} caret={frame >= 175 && frame < 210} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
            <div
              style={{
                opacity: showFile ? 1 : 0,
                borderRadius: 999,
                background: '#ecfeff',
                color: '#0e7490',
                fontSize: 16,
                fontWeight: 700,
                padding: '8px 14px',
              }}
            >
              chapter.pdf · read into the lesson
            </div>
            <div
              style={{
                borderRadius: 14,
                padding: '14px 22px',
                background: 'linear-gradient(90deg, #06b6d4, #2dd4bf)',
                color: '#042f2e',
                fontWeight: 800,
                fontSize: 18,
                transform: `scale(${pressed ? 0.96 : 1})`,
                boxShadow: '0 10px 24px rgba(6,182,212,0.35)',
              }}
            >
              Generate Lesson Plan
            </div>
          </div>
        </div>
        <div
          style={{
            width: interpolate(plan, [0, 1], [0, 700]),
            maxHeight: interpolate(plan, [0, 1], [0, 760]),
            marginLeft: interpolate(plan, [0, 1], [0, 28]),
            overflow: 'hidden',
            opacity: plan,
            transform: `translateX(${interpolate(plan, [0, 1], [40, 0])}px)`,
            background: 'white',
            borderRadius: 28,
            padding: 32,
            color: '#0f172a',
            boxShadow: '0 30px 80px rgba(0,0,0,0.35)',
          }}
        >
          <div style={{ fontSize: 13, letterSpacing: 2, color: '#0891b2', fontWeight: 800 }}>ONE CLASS PERIOD · 48 MIN</div>
          <div style={{ marginTop: 8, fontSize: 34, fontWeight: 760, letterSpacing: -0.5 }}>
            The periodic table as a model
          </div>
          <div style={{ marginTop: 10, fontSize: 20, lineHeight: 1.4, color: '#334155' }}>
            Objective: explain the model, then use it on a new example.
          </div>
          <div style={{ display: 'flex', height: 22, borderRadius: 99, overflow: 'hidden', marginTop: 22, background: '#e2e8f0' }}>
            {BLOCKS.map((block, index) => {
              const appear = interpolate(frame, [300 + index * 12, 318 + index * 12], [0, 1], clamp);
              return (
                <div
                  key={block.label}
                  style={{
                    width: `${block.width}%`,
                    background: index % 2 === 0 ? '#0891b2' : '#22d3ee',
                    opacity: appear,
                  }}
                />
              );
            })}
          </div>
          <div style={{ marginTop: 18 }}>
            {BLOCKS.map((block, index) => {
              const row = rise(frame, 300 + index * 10, 12);
              return (
                <div
                  key={block.label}
                  style={{
                    ...row,
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '10px 0',
                    borderBottom: '1px solid #e2e8f0',
                    fontSize: 22,
                  }}
                >
                  <span style={{ fontWeight: 700 }}>{block.label}</span>
                  <span style={{ color: '#0e7490', fontWeight: 750 }}>{block.minutes} min</span>
                </div>
              );
            })}
          </div>
          <div
            style={{
              marginTop: 16,
              display: 'flex',
              gap: 10,
              opacity: interpolate(frame, [380, 400], [0, 1], clamp),
            }}
          >
            {['Assessment', 'Differentiation'].map((tag) => (
              <div
                key={tag}
                style={{
                  borderRadius: 999,
                  background: '#f1f5f9',
                  padding: '8px 14px',
                  fontSize: 16,
                  fontWeight: 700,
                  color: '#0f172a',
                }}
              >
                {tag}
              </div>
            ))}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}

function CloseScene() {
  const frame = useCurrentFrame();
  const pillars = ['Your textbook.', 'Your standard.', 'One period.'];
  const mark = spring({ frame: frame - 70, fps: 30, config: { damping: 12, stiffness: 80 } });
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ display: 'flex', gap: 28, marginBottom: 48 }}>
        {pillars.map((line, index) => {
          const spr = spring({
            frame: frame - index * 10,
            fps: 30,
            config: { damping: 14, stiffness: 130 },
          });
          return (
            <div
              key={line}
              style={{
                opacity: spr,
                transform: `translateY(${interpolate(spr, [0, 1], [24, 0])}px)`,
                fontFamily: SERIF,
                fontSize: 48,
                padding: '8px 4px',
              }}
            >
              {line}
            </div>
          );
        })}
      </div>
      <Img
        src={staticFile('mindvault-mark.png')}
        style={{
          width: 120,
          height: 120,
          borderRadius: '50%',
          opacity: mark,
          transform: `scale(${interpolate(mark, [0, 1], [0.7, 1])})`,
        }}
      />
      <div style={{ marginTop: 18, letterSpacing: 8, fontSize: 20, color: CYAN, fontWeight: 800 }}>MINDVAULT</div>
      <div style={{ marginTop: 8, fontSize: 54, fontWeight: 740, letterSpacing: -1 }}>Lesson Plan Generator</div>
      <div style={{ marginTop: 14, fontSize: 28, color: '#d7e4ee' }}>Ready to teach.</div>
    </AbsoluteFill>
  );
}

function Fade({ duration, children }: { duration: number; children: React.ReactNode }) {
  const frame = useCurrentFrame();
  const opacity = Math.min(
    interpolate(frame, [0, 10], [0, 1], clamp),
    interpolate(frame, [duration - 12, duration], [1, 0], clamp),
  );
  return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
}

export const MindVaultLessonPlanFilm: React.FC = () => {
  return (
    <Stage>
      <Sequence from={0} durationInFrames={170}>
        <Fade duration={170}>
          <NightScene />
        </Fade>
      </Sequence>
      <Sequence from={155} durationInFrames={290}>
        <Fade duration={290}>
          <ProblemScene />
        </Fade>
      </Sequence>
      <Sequence from={430} durationInFrames={190}>
        <Fade duration={190}>
          <TurnScene />
        </Fade>
      </Sequence>
      <Sequence from={600} durationInFrames={470}>
        <Fade duration={470}>
          <ProductScene />
        </Fade>
      </Sequence>
      <Sequence from={1055} durationInFrames={295}>
        <Fade duration={295}>
          <CloseScene />
        </Fade>
      </Sequence>
    </Stage>
  );
};
