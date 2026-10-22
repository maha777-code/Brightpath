import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import type { LessonMatterState, LessonSlide, LessonVisualKind } from '@brightpath/shared';
import { ScienceCanvas } from '../3D/ScienceCanvas';

const KINDS: LessonVisualKind[] = ['particles', 'beaker', 'process', 'compare', 'object', 'diagram'];
const STATES: LessonMatterState[] = ['solid', 'liquid', 'gas', 'melting', 'evaporating', 'heating'];

function asKind(raw: unknown, fallback: LessonVisualKind): LessonVisualKind {
  const v = String(raw ?? '').toLowerCase().trim();
  return (KINDS as string[]).includes(v) ? (v as LessonVisualKind) : fallback;
}

function asState(raw: unknown, fallback: LessonMatterState): LessonMatterState {
  const v = String(raw ?? '').toLowerCase().trim();
  return (STATES as string[]).includes(v) ? (v as LessonMatterState) : fallback;
}

function inferKind(slide: LessonSlide, visualConfig?: Record<string, unknown>): LessonVisualKind {
  if (slide.visualKind) return asKind(slide.visualKind, 'particles');
  const fromConfig = visualConfig?.visualKind ?? visualConfig?.visualArchetype;
  if (fromConfig) return asKind(fromConfig, 'object');
  const blob = `${slide.heading} ${slide.body ?? ''} ${slide.highlight ?? ''} ${(slide.keyTerms ?? []).join(' ')}`.toLowerCase();
  if (/\b(particle|molecule|atom|solid|liquid|gas|lattice)\b/.test(blob)) return 'particles';
  if (/\b(beaker|ice|steam|heat|melt|evapor|boil|water)\b/.test(blob)) return 'beaker';
  if (slide.left?.points?.length || slide.right?.points?.length) return 'compare';
  if (slide.steps?.length) return 'process';
  if (slide.formula) return 'diagram';
  return 'object';
}

function inferState(slide: LessonSlide, visualConfig?: Record<string, unknown>): LessonMatterState {
  if (slide.matterState) return asState(slide.matterState, 'solid');
  const fromConfig = visualConfig?.matterState;
  if (fromConfig) return asState(fromConfig, 'solid');
  const blob = `${slide.heading} ${slide.body ?? ''} ${slide.highlight ?? ''}`.toLowerCase();
  if (/\bevapor|steam|vapou?r|gas\b/.test(blob)) return blob.includes('evapor') ? 'evaporating' : 'gas';
  if (/\bmelt|melting\b/.test(blob)) return 'melting';
  if (/\bheat|hot|thermal\b/.test(blob)) return 'heating';
  if (/\bliquid|water\b/.test(blob)) return 'liquid';
  if (/\bsolid|ice|crystal\b/.test(blob)) return 'solid';
  return 'solid';
}

function stateCaption(state: LessonMatterState): string {
  if (state === 'melting') return 'Melting · solid → liquid';
  if (state === 'evaporating') return 'Evaporation · liquid → gas';
  if (state === 'heating') return 'Heat energy added';
  if (state === 'gas') return 'Gas · particles move freely';
  if (state === 'liquid') return 'Liquid · particles slide';
  return 'Solid · particles vibrate';
}

export const ScienceExplainerStage: React.FC<{
  topicTitle: string;
  chapterTitle?: string;
  progress01: number;
  slide: LessonSlide;
  visualConfig?: Record<string, unknown>;
}> = ({ topicTitle, chapterTitle, progress01, slide, visualConfig }) => {
  const frame = useCurrentFrame();
  const kind = inferKind(slide, visualConfig);
  const state = inferState(slide, visualConfig);
  const steps = (slide.steps ?? []).map((s) => s.label).filter(Boolean);
  const titleIn = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: 'clamp' });
  const showLabChrome = kind === 'particles' || kind === 'beaker' || kind === 'compare';

  return (
    <AbsoluteFill style={{ backgroundColor: '#c9d9e8', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <ScienceCanvas
        visualKind={kind}
        matterState={state}
        progress01={progress01}
        objectLabel={slide.objectLabel || slide.heading}
        leftVisual={slide.leftVisual || slide.left?.label}
        rightVisual={slide.rightVisual || slide.right?.label}
        steps={steps}
        primaryColor="#38bdf8"
      />

      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(180deg, rgba(15,23,42,0.18) 0%, transparent 18%, transparent 62%, rgba(15,23,42,0.28) 100%)',
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
          alignItems: 'flex-start',
          opacity: titleIn,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 800,
              letterSpacing: 1.8,
              textTransform: 'uppercase',
              color: '#0f172a',
            }}
          >
            MindVault Classroom
          </div>
          <div style={{ marginTop: 4, fontSize: 15, fontWeight: 650, color: '#334155' }}>
            {chapterTitle || topicTitle}
          </div>
        </div>
        {showLabChrome ? (
          <div
            style={{
              padding: '8px 14px',
              borderRadius: 999,
              background: 'rgba(255,255,255,0.78)',
              color: '#0f172a',
              fontSize: 14,
              fontWeight: 750,
              boxShadow: '0 6px 18px rgba(15,23,42,0.12)',
            }}
          >
            {stateCaption(state)}
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
            background: 'rgba(255,255,255,0.82)',
            boxShadow: '0 10px 28px rgba(15,23,42,0.12)',
          }}
        >
          <div style={{ fontSize: 34, fontWeight: 850, color: '#0f172a', letterSpacing: -0.4 }}>
            {slide.heading}
          </div>
          {slide.body ? (
            <div style={{ marginTop: 4, fontSize: 18, fontWeight: 600, color: '#334155' }}>{slide.body}</div>
          ) : null}
        </div>
      </div>

      {kind === 'process' || kind === 'diagram' ? (
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
                background: progress01 * 3 > i ? 'rgba(14,165,233,0.16)' : 'rgba(255,255,255,0.7)',
                color: '#0f172a',
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
          <div style={{ fontWeight: 800, fontSize: 18, color: '#0f172a' }}>
            {slide.left?.label || slide.leftVisual || 'Before'}
          </div>
          <div style={{ fontWeight: 800, fontSize: 18, color: '#0f172a' }}>
            {slide.right?.label || slide.rightVisual || 'After'}
          </div>
        </div>
      ) : null}

      {(slide.keyTerms ?? []).length ? (
        <div
          style={{
            position: 'absolute',
            left: 28,
            bottom: 118,
            display: 'flex',
            gap: 8,
            flexWrap: 'wrap',
            maxWidth: 420,
          }}
        >
          {(slide.keyTerms ?? []).slice(0, 3).map((term) => (
            <span
              key={term}
              style={{
                padding: '6px 12px',
                borderRadius: 999,
                background: 'rgba(255,255,255,0.8)',
                color: '#0369a1',
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
            background: 'rgba(255,255,255,0.84)',
            color: '#0f172a',
            fontSize: 20,
            fontFamily: 'Georgia, serif',
            fontWeight: 650,
          }}
        >
          {slide.formula}
        </div>
      ) : null}

      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 4, background: 'rgba(15,23,42,0.12)' }}>
        <div
          style={{
            width: `${Math.max(4, Math.min(100, progress01 * 100))}%`,
            height: '100%',
            background: '#0284c7',
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
