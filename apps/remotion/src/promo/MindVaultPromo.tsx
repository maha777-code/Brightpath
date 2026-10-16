import React from 'react';
import { AbsoluteFill, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { PROMO_FONT } from './fonts';
import { OVERLAP, PromoProvider, SPRING, clamp, type PromoProps } from './theme';
import { Backdrop } from './ui';
import {
  AudienceScene,
  CtaScene,
  HookScene,
  ProblemScene,
  RevealScene,
  TextbookScene,
  ToolsScene,
  TutorScene,
  type SceneProps,
} from './scenes';

const SCENES: { key: keyof PromoProps['timing']; name: string; Component: React.FC<SceneProps> }[] = [
  { key: 'hook', name: 'Hook', Component: HookScene },
  { key: 'problem', name: 'Problem', Component: ProblemScene },
  { key: 'reveal', name: 'Reveal', Component: RevealScene },
  { key: 'feature1', name: 'Feature · Textbook', Component: TextbookScene },
  { key: 'feature2', name: 'Feature · Tools', Component: ToolsScene },
  { key: 'feature3', name: 'Feature · Tutor', Component: TutorScene },
  { key: 'audiences', name: 'Audiences', Component: AudienceScene },
  { key: 'cta', name: 'Call to action', Component: CtaScene },
];

function SceneFrame({ duration, isLast, children }: { duration: number; isLast: boolean; children: React.ReactNode }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: SPRING.soft, durationInFrames: OVERLAP + 8 });
  const exit = isLast ? 0 : interpolate(frame, [duration - OVERLAP, duration], [0, 1], clamp);
  return (
    <AbsoluteFill
      style={{
        opacity: Math.min(1, enter) * (1 - exit),
        transform: `scale(${1.04 - 0.04 * Math.min(1, enter) - 0.03 * exit})`,
        filter: exit > 0 ? `blur(${exit * 10}px)` : undefined,
      }}
    >
      {children}
    </AbsoluteFill>
  );
}

export const MindVaultPromo: React.FC<PromoProps> = (props) => {
  const { fps } = useVideoConfig();
  let cursor = 0;
  const slots = SCENES.map((scene, i) => {
    const length = Math.round(props.timing[scene.key] * fps);
    const isLast = i === SCENES.length - 1;
    const slot = { ...scene, from: cursor, duration: length + (isLast ? 0 : OVERLAP), isLast };
    cursor += length;
    return slot;
  });

  return (
    <PromoProvider value={props}>
      <AbsoluteFill style={{ fontFamily: `${PROMO_FONT}, Inter, system-ui, sans-serif`, color: props.colors.text }}>
        <Backdrop />
        {slots.map(({ key, name, Component, from, duration, isLast }) => (
          <Sequence key={key} name={name} from={from} durationInFrames={duration}>
            <SceneFrame duration={duration} isLast={isLast}>
              <Component duration={duration} />
            </SceneFrame>
          </Sequence>
        ))}
      </AbsoluteFill>
    </PromoProvider>
  );
};
