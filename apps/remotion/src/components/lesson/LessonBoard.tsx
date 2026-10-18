import React from 'react';
import { AbsoluteFill, Img, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { LessonSlide } from '@brightpath/shared';

const COLORS = {
  bg: '#07101d',
  panel: 'rgba(15, 23, 42, 0.78)',
  line: 'rgba(34, 211, 238, 0.28)',
  cyan: '#22d3ee',
  violet: '#a78bfa',
  text: '#f8fafc',
  muted: '#94a3b8',
  rose: '#fb7185',
  emerald: '#34d399',
};

function appear(frame: number, fps: number, delay: number, from = 24) {
  const p = spring({ fps, frame: frame - delay, config: { damping: 16, stiffness: 120 } });
  return {
    opacity: interpolate(p, [0, 1], [0, 1]),
    transform: `translateY(${interpolate(p, [0, 1], [from, 0])}px)`,
  };
}

function Chip({ label, delay }: { label: string; delay: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <span
      style={{
        ...appear(frame, fps, delay, 12),
        display: 'inline-flex',
        padding: '8px 16px',
        borderRadius: 999,
        border: `1px solid ${COLORS.line}`,
        background: 'rgba(34, 211, 238, 0.08)',
        color: COLORS.cyan,
        fontSize: 20,
        fontWeight: 700,
        letterSpacing: 0.2,
      }}
    >
      {label}
    </span>
  );
}

function Card({
  children,
  delay = 0,
  accent = COLORS.line,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  accent?: string;
  style?: React.CSSProperties;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div
      style={{
        ...appear(frame, fps, delay),
        background: COLORS.panel,
        border: `1px solid ${accent}`,
        borderRadius: 22,
        padding: '22px 26px',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function overlayUrls(config: Record<string, unknown>): string[] {
  const many = config.overlayImageUrls;
  if (Array.isArray(many)) {
    return many.filter((u): u is string => typeof u === 'string' && /^https?:\/\//i.test(u)).slice(0, 1);
  }
  if (typeof config.overlayImageUrl === 'string' && /^https?:\/\//i.test(config.overlayImageUrl)) {
    return [config.overlayImageUrl];
  }
  return [];
}

function TitleSlide({ slide }: { slide: LessonSlide }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22, maxWidth: 980 }}>
      {slide.subheading ? (
        <div style={{ ...appear(frame, fps, 2), color: COLORS.cyan, fontSize: 22, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase' }}>
          {slide.subheading}
        </div>
      ) : null}
      <h1 style={{ ...appear(frame, fps, 8), margin: 0, fontSize: 68, lineHeight: 1.08, fontWeight: 850, color: COLORS.text }}>
        {slide.heading}
      </h1>
      {slide.body ? (
        <p style={{ ...appear(frame, fps, 16), margin: 0, fontSize: 28, lineHeight: 1.4, color: COLORS.muted, maxWidth: 860 }}>
          {slide.body}
        </p>
      ) : null}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 8 }}>
        {(slide.keyTerms ?? []).map((term, i) => (
          <Chip key={`${term}-${i}`} label={term} delay={24 + i * 6} />
        ))}
      </div>
    </div>
  );
}

function DefinitionSlide({ slide }: { slide: LessonSlide }) {
  return (
    <div style={{ display: 'grid', gap: 20, width: '100%' }}>
      <Card delay={4}>
        <div style={{ color: COLORS.cyan, fontSize: 18, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>Definition</div>
        <h2 style={{ margin: '10px 0 14px', fontSize: 42, color: COLORS.text }}>{slide.heading}</h2>
        <p style={{ margin: 0, fontSize: 28, lineHeight: 1.45, color: '#e2e8f0' }}>{slide.body}</p>
      </Card>
      {slide.formula ? (
        <Card delay={14} accent="rgba(167, 139, 250, 0.4)">
          <div style={{ color: COLORS.violet, fontSize: 16, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>From the chapter</div>
          <div style={{ marginTop: 10, fontSize: 32, fontFamily: 'Georgia, serif', color: COLORS.text }}>{slide.formula}</div>
        </Card>
      ) : null}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        {(slide.keyTerms ?? []).map((term, i) => (
          <Chip key={`${term}-${i}`} label={term} delay={22 + i * 6} />
        ))}
      </div>
    </div>
  );
}

function StepsSlide({ slide, progress01 }: { slide: LessonSlide; progress01: number }) {
  const steps = slide.steps ?? [];
  const visible = Math.max(1, Math.ceil(progress01 * steps.length));
  return (
    <div style={{ display: 'grid', gap: 16, width: '100%' }}>
      <h2 style={{ margin: 0, fontSize: 40, color: COLORS.text }}>{slide.heading}</h2>
      {steps.slice(0, visible).map((step, i) => (
        <Card key={`${step.label}-${i}`} delay={6 + i * 4}>
          <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start' }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                background: 'rgba(34, 211, 238, 0.16)',
                color: COLORS.cyan,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: 20,
                flexShrink: 0,
              }}
            >
              {i + 1}
            </div>
            <div>
              <div style={{ fontSize: 26, fontWeight: 750, color: COLORS.text }}>{step.label}</div>
              {step.detail ? <div style={{ marginTop: 6, fontSize: 22, color: COLORS.muted }}>{step.detail}</div> : null}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function CompareSlide({ slide }: { slide: LessonSlide }) {
  return (
    <div style={{ display: 'grid', gap: 18, width: '100%' }}>
      <h2 style={{ margin: 0, fontSize: 40, color: COLORS.text }}>{slide.heading}</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
        <Card delay={8} accent="rgba(251, 113, 133, 0.4)">
          <div style={{ color: COLORS.rose, fontSize: 18, fontWeight: 800, letterSpacing: 0.6, textTransform: 'uppercase' }}>
            {slide.left?.label || 'Mix-up'}
          </div>
          <ul style={{ margin: '14px 0 0', paddingLeft: 22, color: '#fecdd3', fontSize: 24, lineHeight: 1.45 }}>
            {(slide.left?.points ?? []).map((point) => (
              <li key={point} style={{ marginBottom: 10 }}>
                {point}
              </li>
            ))}
          </ul>
        </Card>
        <Card delay={16} accent="rgba(52, 211, 153, 0.4)">
          <div style={{ color: COLORS.emerald, fontSize: 18, fontWeight: 800, letterSpacing: 0.6, textTransform: 'uppercase' }}>
            {slide.right?.label || 'Correct'}
          </div>
          <ul style={{ margin: '14px 0 0', paddingLeft: 22, color: '#bbf7d0', fontSize: 24, lineHeight: 1.45 }}>
            {(slide.right?.points ?? []).map((point) => (
              <li key={point} style={{ marginBottom: 10 }}>
                {point}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}

function ExampleSlide({ slide, progress01 }: { slide: LessonSlide; progress01: number }) {
  const working = slide.example?.working ?? [];
  const showAnswer = progress01 > 0.62;
  const visible = Math.max(1, Math.ceil(Math.min(1, progress01 / 0.62) * working.length));
  return (
    <div style={{ display: 'grid', gap: 16, width: '100%' }}>
      <h2 style={{ margin: 0, fontSize: 40, color: COLORS.text }}>{slide.heading}</h2>
      <Card delay={4}>
        <div style={{ color: COLORS.cyan, fontSize: 16, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>Question</div>
        <div style={{ marginTop: 8, fontSize: 28, color: COLORS.text }}>{slide.example?.prompt}</div>
      </Card>
      {working.slice(0, visible).map((line, i) => (
        <Card key={`${line}-${i}`} delay={8 + i * 3}>
          <div style={{ fontSize: 24, color: '#e2e8f0' }}>{line}</div>
        </Card>
      ))}
      {showAnswer && slide.example?.answer ? (
        <Card delay={4} accent="rgba(34, 211, 238, 0.5)">
          <div style={{ color: COLORS.cyan, fontSize: 16, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>Answer</div>
          <div style={{ marginTop: 8, fontSize: 30, fontWeight: 750, color: COLORS.text }}>{slide.example.answer}</div>
        </Card>
      ) : null}
    </div>
  );
}

function RecapSlide({ slide }: { slide: LessonSlide }) {
  return (
    <div style={{ display: 'grid', gap: 16, width: '100%' }}>
      <h2 style={{ margin: 0, fontSize: 40, color: COLORS.text }}>{slide.heading}</h2>
      {(slide.points ?? []).map((point, i) => (
        <Card key={`${point}-${i}`} delay={6 + i * 5}>
          <div style={{ fontSize: 26, color: COLORS.text }}>{point}</div>
        </Card>
      ))}
      {slide.body ? (
        <Card delay={20} accent="rgba(167, 139, 250, 0.45)">
          <div style={{ color: COLORS.violet, fontSize: 16, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>
            Say it back
          </div>
          <div style={{ marginTop: 10, fontSize: 28, color: COLORS.text }}>{slide.body}</div>
        </Card>
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
}> = ({ topicTitle, phase, sceneIndex, sceneCount, progress01, slide, visualConfig = {} }) => {
  const images = overlayUrls(visualConfig);
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(1200px 700px at 12% 0%, rgba(34,211,238,0.12), transparent 55%), radial-gradient(900px 600px at 100% 100%, rgba(167,139,250,0.12), transparent 50%), ${COLORS.bg}`,
        fontFamily: 'Inter, system-ui, sans-serif',
        color: COLORS.text,
        padding: '36px 56px 150px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div style={{ color: COLORS.muted, fontSize: 18, fontWeight: 650 }}>{topicTitle}</div>
        <div style={{ color: COLORS.cyan, fontSize: 18, fontWeight: 750 }}>
          {phase} · {sceneIndex + 1}/{sceneCount}
        </div>
      </div>
      <div style={{ height: 4, background: 'rgba(148,163,184,0.18)', borderRadius: 99, overflow: 'hidden', marginBottom: 28 }}>
        <div style={{ width: `${Math.max(8, Math.min(100, progress01 * 100))}%`, height: '100%', background: COLORS.cyan }} />
      </div>
      {slide.layout === 'title' ? <TitleSlide slide={slide} /> : null}
      {slide.layout === 'definition' ? <DefinitionSlide slide={slide} /> : null}
      {slide.layout === 'steps' ? <StepsSlide slide={slide} progress01={progress01} /> : null}
      {slide.layout === 'compare' ? <CompareSlide slide={slide} /> : null}
      {slide.layout === 'example' ? <ExampleSlide slide={slide} progress01={progress01} /> : null}
      {slide.layout === 'recap' ? <RecapSlide slide={slide} /> : null}
      {images[0] ? (
        <Img
          src={images[0]}
          style={{
            position: 'absolute',
            right: 56,
            bottom: 168,
            width: 180,
            height: 120,
            objectFit: 'cover',
            borderRadius: 16,
            border: `1px solid ${COLORS.line}`,
            opacity: 0.92,
          }}
        />
      ) : null}
    </AbsoluteFill>
  );
};
