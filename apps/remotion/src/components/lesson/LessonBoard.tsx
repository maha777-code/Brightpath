import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { LessonSlide, LessonSlideMotion } from '@brightpath/shared';

function appear(frame: number, fps: number, delay: number, from = 36) {
  const p = spring({ fps, frame: frame - delay, config: { damping: 14, stiffness: 160, mass: 0.7 } });
  return {
    opacity: interpolate(p, [0, 1], [0, 1]),
    transform: `translateY(${interpolate(p, [0, 1], [from, 0])}px)`,
  };
}

function camera(motion: LessonSlideMotion | undefined, progress01: number, t: number) {
  const p = Math.max(0, Math.min(1, progress01));
  if (motion === 'smash_zoom') return `scale(${interpolate(p, [0, 1], [1.18, 1])})`;
  if (motion === 'drift_up') return `translateY(${interpolate(p, [0, 1], [28, -16])}px) scale(1.04)`;
  if (motion === 'whip') return `translateX(${interpolate(p, [0, 1], [90, -24])}px) rotate(${interpolate(p, [0, 1], [1.2, -0.4])}deg)`;
  if (motion === 'bloom') return `scale(${interpolate(p, [0, 1], [0.94, 1.06])})`;
  return `translate(${Math.sin(t * 0.55) * 10}px, ${Math.cos(t * 0.4) * 8}px) scale(${1.05 + p * 0.04})`;
}

function Atmosphere({ progress01 }: { progress01: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  return (
    <>
      <div
        style={{
          position: 'absolute',
          width: 720,
          height: 720,
          left: interpolate(progress01, [0, 1], [-80, 40]),
          top: -180,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(34,211,238,0.28), transparent 68%)',
          filter: 'blur(8px)',
          transform: `translateY(${Math.sin(t * 0.8) * 18}px)`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: 620,
          height: 620,
          right: interpolate(progress01, [0, 1], [-120, 20]),
          bottom: -200,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(167,139,250,0.26), transparent 70%)',
          filter: 'blur(10px)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '72px 72px',
          opacity: 0.35,
          transform: `translateX(${-progress01 * 40}px)`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.015), rgba(255,255,255,0.015) 1px, transparent 1px, transparent 3px)',
          opacity: 0.4,
          pointerEvents: 'none',
        }}
      />
    </>
  );
}

function Letterbox() {
  return (
    <>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 46, background: '#020617' }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 46, background: '#020617' }} />
    </>
  );
}

function HookSlide({ slide }: { slide: LessonSlide }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div style={{ maxWidth: 1040 }}>
      {slide.subheading ? (
        <div style={{ ...appear(frame, fps, 2, 16), color: '#67e8f9', fontSize: 20, fontWeight: 800, letterSpacing: 3, textTransform: 'uppercase' }}>
          {slide.subheading}
        </div>
      ) : null}
      <h1
        style={{
          ...appear(frame, fps, 6, 50),
          margin: '14px 0 0',
          fontSize: 84,
          lineHeight: 0.95,
          fontWeight: 900,
          letterSpacing: -1.5,
          color: '#f8fafc',
        }}
      >
        {slide.heading}
      </h1>
      {slide.highlight ? (
        <div
          style={{
            ...appear(frame, fps, 14, 20),
            marginTop: 22,
            fontSize: 34,
            fontWeight: 800,
            color: '#22d3ee',
          }}
        >
          {slide.highlight}
        </div>
      ) : null}
      {slide.body ? (
        <p style={{ ...appear(frame, fps, 18), marginTop: 18, fontSize: 28, color: '#cbd5e1', maxWidth: 820 }}>
          {slide.body}
        </p>
      ) : null}
    </div>
  );
}

function InsightSlide({ slide }: { slide: LessonSlide }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div style={{ width: '100%' }}>
      <div style={{ ...appear(frame, fps, 2), color: '#a78bfa', fontSize: 18, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase' }}>
        Insight
      </div>
      <h2 style={{ ...appear(frame, fps, 6, 40), margin: '10px 0 18px', fontSize: 58, fontWeight: 850, color: '#f8fafc' }}>
        {slide.heading}
      </h2>
      <p style={{ ...appear(frame, fps, 12), margin: 0, fontSize: 32, lineHeight: 1.35, color: '#e2e8f0', maxWidth: 900 }}>
        {slide.body}
      </p>
      {slide.formula ? (
        <div
          style={{
            ...appear(frame, fps, 18),
            marginTop: 28,
            padding: '16px 22px',
            borderLeft: '4px solid #22d3ee',
            fontSize: 30,
            fontFamily: 'Georgia, serif',
            color: '#f8fafc',
          }}
        >
          {slide.formula}
        </div>
      ) : null}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 24 }}>
        {(slide.keyTerms ?? []).map((term, i) => (
          <span
            key={`${term}-${i}`}
            style={{
              ...appear(frame, fps, 20 + i * 4, 12),
              padding: '8px 16px',
              borderRadius: 999,
              background: 'rgba(34,211,238,0.12)',
              color: '#67e8f9',
              fontWeight: 700,
              fontSize: 20,
            }}
          >
            {term}
          </span>
        ))}
      </div>
    </div>
  );
}

function BuildSlide({ slide, progress01 }: { slide: LessonSlide; progress01: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const steps = slide.steps ?? [];
  const visible = Math.max(1, Math.ceil(progress01 * steps.length));
  return (
    <div style={{ width: '100%' }}>
      <h2 style={{ ...appear(frame, fps, 2), margin: '0 0 22px', fontSize: 48, color: '#f8fafc' }}>{slide.heading}</h2>
      <div style={{ display: 'grid', gap: 14 }}>
        {steps.slice(0, visible).map((step, i) => (
          <div
            key={`${step.label}-${i}`}
            style={{
              ...appear(frame, fps, 4 + i * 3, 28),
              display: 'flex',
              gap: 18,
              alignItems: 'center',
              padding: '16px 20px',
              background: 'rgba(15,23,42,0.55)',
              border: '1px solid rgba(148,163,184,0.2)',
            }}
          >
            <div style={{ fontSize: 36, fontWeight: 900, color: '#22d3ee', minWidth: 48 }}>{String(i + 1).padStart(2, '0')}</div>
            <div>
              <div style={{ fontSize: 28, fontWeight: 750, color: '#f8fafc' }}>{step.label}</div>
              {step.detail ? <div style={{ marginTop: 4, fontSize: 20, color: '#94a3b8' }}>{step.detail}</div> : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TurnSlide({ slide }: { slide: LessonSlide }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const hasCompare = Boolean(slide.left?.points?.length || slide.right?.points?.length);
  return (
    <div style={{ width: '100%' }}>
      <h2 style={{ ...appear(frame, fps, 2), margin: '0 0 20px', fontSize: 48, color: '#f8fafc' }}>{slide.heading}</h2>
      {hasCompare ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
          <div style={{ ...appear(frame, fps, 6, 40), padding: 22, background: 'rgba(251,113,133,0.1)', borderLeft: '4px solid #fb7185' }}>
            <div style={{ color: '#fb7185', fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase' }}>{slide.left?.label}</div>
            {(slide.left?.points ?? []).map((p) => (
              <div key={p} style={{ marginTop: 12, fontSize: 24, color: '#fecdd3' }}>
                {p}
              </div>
            ))}
          </div>
          <div style={{ ...appear(frame, fps, 10, 40), padding: 22, background: 'rgba(52,211,153,0.1)', borderLeft: '4px solid #34d399' }}>
            <div style={{ color: '#34d399', fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase' }}>{slide.right?.label}</div>
            {(slide.right?.points ?? []).map((p) => (
              <div key={p} style={{ marginTop: 12, fontSize: 24, color: '#bbf7d0' }}>
                {p}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div>
          <div style={{ ...appear(frame, fps, 6), fontSize: 28, color: '#e2e8f0' }}>{slide.example?.prompt || slide.body}</div>
          <div style={{ ...appear(frame, fps, 12), marginTop: 20, fontSize: 32, fontWeight: 800, color: '#22d3ee' }}>
            {slide.example?.answer}
          </div>
        </div>
      )}
    </div>
  );
}

function PayoffSlide({ slide }: { slide: LessonSlide }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div style={{ width: '100%' }}>
      <div style={{ ...appear(frame, fps, 2), color: '#22d3ee', fontSize: 18, fontWeight: 800, letterSpacing: 3, textTransform: 'uppercase' }}>
        Remember
      </div>
      <h2 style={{ ...appear(frame, fps, 6, 36), margin: '8px 0 18px', fontSize: 56, color: '#f8fafc' }}>{slide.heading}</h2>
      {(slide.points ?? []).map((point, i) => (
        <div key={`${point}-${i}`} style={{ ...appear(frame, fps, 10 + i * 4), fontSize: 26, color: '#cbd5e1', marginBottom: 8 }}>
          {point}
        </div>
      ))}
      {slide.body ? (
        <div
          style={{
            ...appear(frame, fps, 20),
            marginTop: 22,
            fontSize: 32,
            fontWeight: 750,
            color: '#f8fafc',
            maxWidth: 900,
          }}
        >
          {slide.body}
        </div>
      ) : null}
    </div>
  );
}

export const LessonBoard: React.FC<{
  topicTitle: string;
  phase: string;
  sceneIndex: number;
  sceneCount: number;
  progress01: number;
  slide: LessonSlide;
  visualConfig?: Record<string, unknown>;
}> = ({ topicTitle, phase, sceneIndex, sceneCount, progress01, slide }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const layout = slide.layout;
  return (
    <AbsoluteFill style={{ backgroundColor: '#050814', fontFamily: 'Inter, system-ui, sans-serif', color: '#f8fafc' }}>
      <Atmosphere progress01={progress01} />
      <div
        style={{
          position: 'absolute',
          inset: '64px 64px 120px',
          transform: camera(slide.motion, progress01, t),
          transformOrigin: 'center center',
        }}
      >
        {layout === 'hook' || layout === 'title' ? <HookSlide slide={slide} /> : null}
        {layout === 'insight' || layout === 'definition' ? <InsightSlide slide={slide} /> : null}
        {layout === 'build' || layout === 'steps' ? <BuildSlide slide={slide} progress01={progress01} /> : null}
        {layout === 'turn' || layout === 'compare' || layout === 'example' ? <TurnSlide slide={slide} /> : null}
        {layout === 'payoff' || layout === 'recap' ? <PayoffSlide slide={slide} /> : null}
      </div>
      <div style={{ position: 'absolute', left: 64, top: 18, fontSize: 15, letterSpacing: 1.4, color: '#94a3b8', fontWeight: 650 }}>
        {topicTitle}
      </div>
      <div style={{ position: 'absolute', right: 64, top: 18, fontSize: 15, letterSpacing: 1.4, color: '#67e8f9', fontWeight: 750 }}>
        {phase} · {sceneIndex + 1}/{sceneCount}
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 46, height: 3, background: 'rgba(148,163,184,0.2)' }}>
        <div style={{ width: `${Math.max(6, Math.min(100, ((sceneIndex + progress01) / sceneCount) * 100))}%`, height: '100%', background: '#22d3ee' }} />
      </div>
      <Letterbox />
    </AbsoluteFill>
  );
};
