import React, { useMemo } from 'react';
import { AbsoluteFill, interpolate } from 'remotion';
import { inferConceptVisual, type LessonSlide, type VisualContentDomain } from '@brightpath/shared';
import { ConceptExplainer } from './ConceptExplainer';

const FONT = 'Inter, system-ui, sans-serif';

export type VideoOverviewStageProps = {
  topicTitle: string;
  chapterTitle?: string;
  textbookTitle?: string;
  audience?: string;
  domain?: VisualContentDomain | string;
  slideIndex: number;
  slideCount: number;
  progress01: number;
  slide: LessonSlide;
};

function fadeOpacity(progress01: number) {
  if (progress01 < 0.07) return interpolate(progress01, [0, 0.07], [0, 1], { extrapolateRight: 'clamp' });
  if (progress01 > 0.93) return interpolate(progress01, [0.93, 1], [1, 0], { extrapolateLeft: 'clamp' });
  return 1;
}

function captionsOf(slide: LessonSlide): string[] {
  if (slide.bullets?.length) return slide.bullets.slice(0, 4);
  if (slide.points?.length) return slide.points.slice(0, 4);
  if (slide.steps?.length) return slide.steps.map((s) => s.label).slice(0, 4);
  return [];
}

export const VideoOverviewStage: React.FC<VideoOverviewStageProps> = (props) => {
  const visual = useMemo(
    () =>
      inferConceptVisual(
        props.slide,
        props.topicTitle,
        props.domain as VisualContentDomain | undefined,
      ),
    [props.slide, props.topicTitle, props.domain],
  );
  const captions = captionsOf(props.slide);
  const isCover = props.slideIndex === 0;

  return (
    <AbsoluteFill
      style={{
        background: 'linear-gradient(160deg, #f4f1ea 0%, #e8eef2 58%, #dce8ea 100%)',
        fontFamily: FONT,
        color: '#1a2332',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: -180,
          right: -100,
          width: 680,
          height: 680,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(13,148,136,0.16), transparent 68%)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: fadeOpacity(props.progress01),
          display: 'flex',
          flexDirection: 'column',
          padding: isCover ? '72px 80px 88px' : '56px 72px 88px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 24 }}>
          <div>
            <div
              style={{
                color: '#0f766e',
                fontSize: 18,
                fontWeight: 750,
                letterSpacing: 2,
                textTransform: 'uppercase',
              }}
            >
              {isCover ? 'Video Overview' : props.chapterTitle || props.textbookTitle}
            </div>
            <h1
              style={{
                margin: '10px 0 0',
                fontSize: isCover ? 64 : 48,
                lineHeight: 1.08,
                fontWeight: 800,
                letterSpacing: -1.2,
                maxWidth: 1100,
              }}
            >
              {props.slide.heading || props.topicTitle}
            </h1>
            {isCover ? (
              <p style={{ margin: '14px 0 0', fontSize: 26, color: '#3f4a59' }}>
                {props.chapterTitle}
                {props.textbookTitle ? `  ·  ${props.textbookTitle}` : ''}
              </p>
            ) : null}
          </div>
          <div style={{ fontSize: 20, color: '#5b6573', fontVariantNumeric: 'tabular-nums' }}>
            {props.slideIndex + 1} / {props.slideCount}
          </div>
        </div>

        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 0,
            padding: '20px 0 12px',
          }}
        >
          <ConceptExplainer
            visual={visual}
            progress01={props.progress01}
            formula={props.slide.formula}
            left={props.slide.left?.points}
            right={props.slide.right?.points}
            statValue={props.slide.stat?.value}
            statLabel={props.slide.stat?.label}
          />
        </div>

        {captions.length ? (
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
            {captions.map((cap) => (
              <span
                key={cap}
                style={{
                  background: 'rgba(255,255,255,0.78)',
                  border: '1px solid rgba(15,118,110,0.16)',
                  color: '#134e4a',
                  padding: '10px 16px',
                  borderRadius: 999,
                  fontSize: 20,
                  fontWeight: 650,
                }}
              >
                {cap}
              </span>
            ))}
          </div>
        ) : props.slide.quote ? (
          <p
            style={{
              margin: 0,
              textAlign: 'center',
              fontSize: 24,
              fontStyle: 'italic',
              color: '#3f4a59',
              maxWidth: 1400,
              alignSelf: 'center',
            }}
          >
            “{props.slide.quote}”
          </p>
        ) : null}
      </div>
      <div
        style={{
          position: 'absolute',
          left: 72,
          right: 72,
          bottom: 28,
          color: '#5b6573',
          fontSize: 16,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {props.slide.sourceRefs?.[0] || props.textbookTitle || 'MindVault'}
      </div>
    </AbsoluteFill>
  );
};
