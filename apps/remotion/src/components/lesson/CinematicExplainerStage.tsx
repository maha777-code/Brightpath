import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import type { LessonMatterState, LessonMood, LessonShape, LessonSlide, LessonVisualKind } from '@brightpath/shared';
import { CinematicCanvas } from '../3D/CinematicCanvas';
import { paletteFor } from '../3D/cinematicPalettes';

const KINDS: LessonVisualKind[] = [
  'scene',
  'process',
  'compare',
  'object',
  'diagram',
  'example',
  'particles',
  'beaker',
];
const MOODS: LessonMood[] = ['warm', 'cool', 'dusk', 'studio', 'parchment', 'night'];
const SHAPES: LessonShape[] = ['sphere', 'cube', 'cylinder', 'crystal', 'torus'];
const STATES: LessonMatterState[] = ['solid', 'liquid', 'gas', 'melting', 'evaporating', 'heating'];

function pick<T extends string>(raw: unknown, allowed: T[], fallback: T): T {
  const v = String(raw ?? '').toLowerCase().trim();
  return (allowed as string[]).includes(v) ? (v as T) : fallback;
}

function inferKind(slide: LessonSlide, visualConfig?: Record<string, unknown>): LessonVisualKind {
  if (slide.visualKind) return pick(slide.visualKind, KINDS, 'scene');
  const fromConfig = visualConfig?.visualKind;
  if (fromConfig) return pick(fromConfig, KINDS, 'scene');
  if (slide.left?.points?.length || slide.right?.points?.length) return 'compare';
  if (slide.steps?.length) return 'process';
  if (slide.example?.prompt) return 'example';
  if (slide.formula) return 'diagram';
  return 'scene';
}

function inferState(slide: LessonSlide, visualConfig?: Record<string, unknown>): LessonMatterState | undefined {
  const kind = inferKind(slide, visualConfig);
  if (kind !== 'particles' && kind !== 'beaker') return undefined;
  if (slide.matterState) return pick(slide.matterState, STATES, 'solid');
  if (visualConfig?.matterState) return pick(visualConfig.matterState, STATES, 'solid');
  return 'solid';
}

export const CinematicExplainerStage: React.FC<{
  topicTitle: string;
  chapterTitle?: string;
  textbookTitle?: string;
  progress01: number;
  slide: LessonSlide;
  visualConfig?: Record<string, unknown>;
}> = ({ topicTitle, chapterTitle, textbookTitle, progress01, slide, visualConfig }) => {
  const frame = useCurrentFrame();
  const kind = inferKind(slide, visualConfig);
  const mood = pick(slide.mood ?? visualConfig?.mood, MOODS, 'dusk');
  const shape = pick(slide.shape ?? visualConfig?.shape, SHAPES, 'sphere');
  const state = inferState(slide, visualConfig);
  const palette = paletteFor(mood);
  const titleIn = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: 'clamp' });
  const lab = kind === 'particles' || kind === 'beaker';

  return (
    <AbsoluteFill style={{ backgroundColor: palette.bg, fontFamily: 'Inter, system-ui, sans-serif', color: palette.text }}>
      <CinematicCanvas
        visualKind={kind}
        mood={mood}
        shape={shape}
        accentColor={slide.accentColor}
        matterState={state}
        progress01={progress01}
        objectLabel={slide.objectLabel || slide.heading}
        leftVisual={slide.leftVisual || slide.left?.label}
        rightVisual={slide.rightVisual || slide.right?.label}
      />

      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            mood === 'night' || mood === 'dusk'
              ? 'linear-gradient(180deg, rgba(0,0,0,0.28) 0%, transparent 22%, transparent 58%, rgba(0,0,0,0.4) 100%)'
              : 'linear-gradient(180deg, rgba(15,23,42,0.12) 0%, transparent 20%, transparent 62%, rgba(15,23,42,0.18) 100%)',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          position: 'absolute',
          top: 22,
          left: 28,
          right: 28,
          display: 'flex',
          justifyContent: 'space-between',
          opacity: titleIn,
        }}
      >
        <div>
          <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 1.8, textTransform: 'uppercase', color: palette.text }}>
            {textbookTitle || 'MindVault'}
          </div>
          <div style={{ marginTop: 4, fontSize: 16, fontWeight: 750, color: palette.muted, maxWidth: 720 }}>
            {chapterTitle || topicTitle}
            {chapterTitle && topicTitle && chapterTitle !== topicTitle ? ` · ${topicTitle}` : ''}
          </div>
        </div>
        {lab && state ? (
          <div
            style={{
              padding: '8px 14px',
              borderRadius: 999,
              background: palette.captionBg,
              color: palette.text,
              fontSize: 14,
              fontWeight: 750,
            }}
          >
            {state}
          </div>
        ) : null}
      </div>

      <div
        style={{
          position: 'absolute',
          top: 92,
          left: 0,
          right: 0,
          textAlign: 'center',
          opacity: titleIn,
          transform: `translateY(${interpolate(titleIn, [0, 1], [12, 0])}px)`,
        }}
      >
        <div
          style={{
            display: 'inline-block',
            padding: '10px 22px',
            borderRadius: 14,
            background: palette.captionBg,
            boxShadow: '0 10px 28px rgba(15,23,42,0.12)',
          }}
        >
          <div style={{ fontSize: 34, fontWeight: 850, letterSpacing: -0.4, color: palette.text }}>{slide.heading}</div>
          {slide.body ? (
            <div style={{ marginTop: 4, fontSize: 18, fontWeight: 600, color: palette.muted }}>{slide.body}</div>
          ) : null}
          {slide.quote ? (
            <div
              style={{
                marginTop: 12,
                maxWidth: 760,
                fontSize: 18,
                lineHeight: 1.4,
                fontWeight: 550,
                color: palette.text,
                fontStyle: 'italic',
              }}
            >
              “{slide.quote}”
            </div>
          ) : null}
        </div>
      </div>

      {kind === 'process' || kind === 'diagram' || kind === 'example' ? (
        <div
          style={{
            position: 'absolute',
            left: 80,
            right: 80,
            bottom: 118,
            display: 'flex',
            justifyContent: 'space-between',
            gap: 16,
          }}
        >
          {(slide.steps ?? []).slice(0, 3).map((step, i) => (
            <div
              key={`${step.label}-${i}`}
              style={{
                flex: 1,
                textAlign: 'center',
                padding: '10px 12px',
                borderRadius: 12,
                background: progress01 * 3 > i ? palette.captionBg : 'rgba(255,255,255,0.35)',
                color: palette.text,
                fontWeight: 700,
                fontSize: 16,
              }}
            >
              {step.label}
            </div>
          ))}
        </div>
      ) : null}

      {kind === 'compare' ? (
        <div
          style={{
            position: 'absolute',
            left: 90,
            right: 90,
            bottom: 118,
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ fontWeight: 800, fontSize: 18, color: palette.text }}>
            {slide.left?.label || slide.leftVisual || 'This'}
          </div>
          <div style={{ fontWeight: 800, fontSize: 18, color: palette.text }}>
            {slide.right?.label || slide.rightVisual || 'That'}
          </div>
        </div>
      ) : null}

      {(slide.keyTerms ?? []).length ? (
        <div style={{ position: 'absolute', left: 28, bottom: 118, display: 'flex', gap: 8, flexWrap: 'wrap', maxWidth: 420 }}>
          {(slide.keyTerms ?? []).slice(0, 3).map((term) => (
            <span
              key={term}
              style={{
                padding: '6px 12px',
                borderRadius: 999,
                background: palette.captionBg,
                color: palette.text,
                fontWeight: 750,
                fontSize: 14,
              }}
            >
              {term}
            </span>
          ))}
        </div>
      ) : null}

      {slide.formula ? (
        <div
          style={{
            position: 'absolute',
            right: 28,
            bottom: 118,
            padding: '10px 16px',
            borderRadius: 12,
            background: palette.captionBg,
            color: palette.text,
            fontSize: 20,
            fontFamily: 'Georgia, serif',
            fontWeight: 650,
          }}
        >
          {slide.formula}
        </div>
      ) : null}

      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 4, background: 'rgba(15,23,42,0.12)' }}>
        <div style={{ width: `${Math.max(4, Math.min(100, progress01 * 100))}%`, height: '100%', background: palette.accent }} />
      </div>
    </AbsoluteFill>
  );
};
