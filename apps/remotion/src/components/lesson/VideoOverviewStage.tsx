import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { LessonSlide, LessonSlideLayout } from '@brightpath/shared';

const FONT = 'Inter, system-ui, sans-serif';

export type VideoOverviewStageProps = {
  topicTitle: string;
  chapterTitle?: string;
  textbookTitle?: string;
  audience?: string;
  slideIndex: number;
  slideCount: number;
  progress01: number;
  slide: LessonSlide;
};

function kenBurns(progress01: number, even: boolean) {
  const t = Math.min(1, Math.max(0, progress01));
  const scale = interpolate(t, [0, 1], even ? [1, 1.045] : [1.04, 1]);
  const x = interpolate(t, [0, 1], even ? [0, -18] : [12, -6]);
  const y = interpolate(t, [0, 1], even ? [0, -10] : [8, -4]);
  return { transform: `translate(${x}px, ${y}px) scale(${scale})` };
}

function fadeOpacity(progress01: number) {
  if (progress01 < 0.08) return interpolate(progress01, [0, 0.08], [0, 1], { extrapolateRight: 'clamp' });
  if (progress01 > 0.92) return interpolate(progress01, [0.92, 1], [1, 0], { extrapolateLeft: 'clamp' });
  return 1;
}

function visibleCount(progress01: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(total, Math.max(1, Math.ceil(progress01 * total * 1.15)));
}

function bulletsOf(slide: LessonSlide): string[] {
  if (slide.bullets?.length) return slide.bullets.slice(0, 4);
  if (slide.points?.length) return slide.points.slice(0, 4);
  if (slide.steps?.length) return slide.steps.map((s) => s.label).slice(0, 4);
  return [];
}

function Footer({
  textbookTitle,
  slideIndex,
  slideCount,
  source,
}: {
  textbookTitle?: string;
  slideIndex: number;
  slideCount: number;
  source?: string;
}) {
  return (
    <div
      style={{
        position: 'absolute',
        left: 72,
        right: 72,
        bottom: 36,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        color: '#5b6573',
        fontSize: 18,
        letterSpacing: 0.2,
      }}
    >
      <span style={{ maxWidth: '70%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {source || textbookTitle || 'MindVault Video Overview'}
      </span>
      <span style={{ fontVariantNumeric: 'tabular-nums' }}>
        {slideIndex + 1} / {slideCount}
      </span>
    </div>
  );
}

function TitleSlide({
  slide,
  topicTitle,
  chapterTitle,
  textbookTitle,
  audience,
  progress01,
}: {
  slide: LessonSlide;
  topicTitle: string;
  chapterTitle?: string;
  textbookTitle?: string;
  audience?: string;
  progress01: number;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 16, stiffness: 90 } });
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        height: '100%',
        padding: '120px 120px 100px',
        opacity: interpolate(enter, [0, 1], [0.4, 1]),
        transform: `translateY(${interpolate(enter, [0, 1], [28, 0])}px)`,
      }}
    >
      <div style={{ color: '#0f766e', fontSize: 22, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' }}>
        Video Overview
      </div>
      <h1
        style={{
          margin: '22px 0 18px',
          fontSize: 84,
          lineHeight: 1.05,
          fontWeight: 750,
          letterSpacing: -1.6,
          maxWidth: 1400,
        }}
      >
        {slide.heading || topicTitle}
      </h1>
      <p style={{ margin: 0, fontSize: 32, color: '#3f4a59', maxWidth: 1100 }}>
        {chapterTitle || slide.subheading}
        {textbookTitle ? `  ·  ${textbookTitle}` : ''}
      </p>
      {audience ? (
        <p style={{ marginTop: 28, fontSize: 22, color: '#0f766e' }}>{audience}</p>
      ) : null}
      {progress01 > 0.35 && slide.quote ? (
        <p style={{ marginTop: 40, fontSize: 26, fontStyle: 'italic', color: '#5b6573', maxWidth: 1000 }}>
          “{slide.quote}”
        </p>
      ) : null}
    </div>
  );
}

function BulletsSlide({ slide, progress01 }: { slide: LessonSlide; progress01: number }) {
  const items = bulletsOf(slide);
  const shown = visibleCount(progress01, items.length || 1);
  return (
    <div style={{ padding: '120px 120px 110px' }}>
      <h2 style={{ margin: 0, fontSize: 62, fontWeight: 750, letterSpacing: -1, maxWidth: 1400 }}>
        {slide.heading}
      </h2>
      <ul style={{ margin: '48px 0 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 22 }}>
        {items.slice(0, shown).map((item, i) => (
          <li
            key={`${item}-${i}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 22,
              fontSize: 40,
              color: '#1a2332',
            }}
          >
            <span
              style={{
                width: 18,
                height: 18,
                borderRadius: 6,
                background: '#0d9488',
                flexShrink: 0,
              }}
            />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function QuoteSlide({ slide }: { slide: LessonSlide }) {
  return (
    <div style={{ padding: '160px 140px 110px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <div style={{ color: '#0d9488', fontSize: 80, lineHeight: 0.6, fontWeight: 700 }}>"</div>
      <p style={{ margin: '24px 0 0', fontSize: 52, lineHeight: 1.25, fontWeight: 600, maxWidth: 1480 }}>
        {slide.quote || slide.heading}
      </p>
      <p style={{ marginTop: 36, fontSize: 26, color: '#5b6573' }}>{slide.heading}</p>
    </div>
  );
}

function StatSlide({ slide }: { slide: LessonSlide }) {
  return (
    <div style={{ padding: '140px 120px 110px', textAlign: 'center' }}>
      <div style={{ fontSize: 28, color: '#0f766e', fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' }}>
        {slide.heading}
      </div>
      <div
        style={{
          marginTop: 36,
          fontSize: 128,
          fontWeight: 800,
          letterSpacing: -3,
          color: '#0f766e',
          lineHeight: 1,
        }}
      >
        {slide.stat?.value || '—'}
      </div>
      <p style={{ marginTop: 28, fontSize: 36, color: '#3f4a59' }}>{slide.stat?.label || slide.subheading}</p>
    </div>
  );
}

function TwoColumnSlide({ slide, progress01 }: { slide: LessonSlide; progress01: number }) {
  const left = slide.left?.points ?? [];
  const right = slide.right?.points ?? [];
  const leftShown = visibleCount(progress01, left.length || 1);
  const rightShown = visibleCount(progress01, right.length || 1);
  return (
    <div style={{ padding: '110px 100px 110px' }}>
      <h2 style={{ margin: '0 0 48px', fontSize: 56, fontWeight: 750 }}>{slide.heading}</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 36 }}>
        {[
          { col: slide.left, items: left.slice(0, leftShown), accent: '#0d9488' },
          { col: slide.right, items: right.slice(0, rightShown), accent: '#b45309' },
        ].map((side, i) => (
          <div
            key={side.col?.label || i}
            style={{
              background: 'rgba(255,255,255,0.62)',
              borderRadius: 28,
              padding: '36px 40px',
              border: '1px solid rgba(15,23,42,0.06)',
            }}
          >
            <div style={{ color: side.accent, fontSize: 24, fontWeight: 750, marginBottom: 18 }}>
              {side.col?.label || (i === 0 ? 'From the text' : 'In practice')}
            </div>
            {side.items.map((p) => (
              <p key={p} style={{ margin: '0 0 14px', fontSize: 30, color: '#1a2332' }}>
                {p}
              </p>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function DiagramSlide({ slide, progress01 }: { slide: LessonSlide; progress01: number }) {
  const items = bulletsOf(slide);
  const shown = visibleCount(progress01, items.length || 1);
  return (
    <div style={{ padding: '110px 90px 110px' }}>
      <h2 style={{ margin: '0 0 56px', fontSize: 56, fontWeight: 750 }}>{slide.heading}</h2>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 18 }}>
        {items.slice(0, shown).map((item, i) => (
          <React.Fragment key={`${item}-${i}`}>
            <div
              style={{
                minWidth: 220,
                maxWidth: 300,
                minHeight: 160,
                padding: '28px 24px',
                borderRadius: 24,
                background: i % 2 === 0 ? '#0f766e' : '#134e4a',
                color: '#f4faf9',
                fontSize: 26,
                fontWeight: 650,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
              }}
            >
              {item}
            </div>
            {i < shown - 1 ? (
              <div style={{ fontSize: 42, color: '#0d9488', fontWeight: 700 }}>→</div>
            ) : null}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

function ImageCaptionSlide({ slide }: { slide: LessonSlide }) {
  const initial = (slide.heading || '?').trim().charAt(0).toUpperCase();
  return (
    <div style={{ padding: '110px 110px', display: 'grid', gridTemplateColumns: '420px 1fr', gap: 56, alignItems: 'center' }}>
      <div
        style={{
          width: 420,
          height: 420,
          borderRadius: 36,
          background: 'linear-gradient(160deg, #0f766e 0%, #134e4a 55%, #1e293b 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ecfdf5',
          fontSize: 180,
          fontWeight: 800,
        }}
      >
        {initial}
      </div>
      <div>
        <h2 style={{ margin: 0, fontSize: 58, fontWeight: 750 }}>{slide.heading}</h2>
        <p style={{ marginTop: 28, fontSize: 32, color: '#3f4a59', maxWidth: 900 }}>
          {slide.quote || slide.body || slide.visualPrompt || bulletsOf(slide)[0]}
        </p>
      </div>
    </div>
  );
}

function SlideBody(props: VideoOverviewStageProps) {
  const layout: LessonSlideLayout = props.slide.layout || 'bullets';
  if (layout === 'title' || layout === 'hook') {
    return (
      <TitleSlide
        slide={props.slide}
        topicTitle={props.topicTitle}
        chapterTitle={props.chapterTitle}
        textbookTitle={props.textbookTitle}
        audience={props.audience}
        progress01={props.progress01}
      />
    );
  }
  if (layout === 'quote') return <QuoteSlide slide={props.slide} />;
  if (layout === 'stat') return <StatSlide slide={props.slide} />;
  if (layout === 'two_column' || layout === 'compare') {
    return <TwoColumnSlide slide={props.slide} progress01={props.progress01} />;
  }
  if (layout === 'diagram' || layout === 'steps') {
    return <DiagramSlide slide={props.slide} progress01={props.progress01} />;
  }
  if (layout === 'image_caption') return <ImageCaptionSlide slide={props.slide} />;
  return <BulletsSlide slide={props.slide} progress01={props.progress01} />;
}

export const VideoOverviewStage: React.FC<VideoOverviewStageProps> = (props) => {
  const even = props.slideIndex % 2 === 0;
  return (
    <AbsoluteFill
      style={{
        background: 'linear-gradient(160deg, #f7f4ee 0%, #eef3f4 55%, #e7eef2 100%)',
        fontFamily: FONT,
        color: '#1a2332',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: fadeOpacity(props.progress01),
          ...kenBurns(props.progress01, even),
          transformOrigin: '50% 50%',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: -160,
            right: -80,
            width: 620,
            height: 620,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(13,148,136,0.14), transparent 68%)',
          }}
        />
        <SlideBody {...props} />
      </div>
      <Footer
        textbookTitle={props.textbookTitle}
        slideIndex={props.slideIndex}
        slideCount={props.slideCount}
        source={props.slide.sourceRefs?.[0]}
      />
    </AbsoluteFill>
  );
};
