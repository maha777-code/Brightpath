import React from 'react';
import {
  AbsoluteFill,
  Html5Audio,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { PROMO_FONT } from './fonts';
import { OVERLAP, PromoProvider, SPRING, clamp, type PromoProps } from './theme';
import { Backdrop, Sfx } from './ui';
import { VOICEOVER } from './voiceover';
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

function SceneFrame({
  duration,
  isFirst,
  isLast,
  children,
}: {
  duration: number;
  isFirst: boolean;
  isLast: boolean;
  children: React.ReactNode;
}) {
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
      {isFirst ? null : <Sfx at={0} name="whoosh" volume={0.45} />}
      {children}
    </AbsoluteFill>
  );
}

export const MindVaultPromo: React.FC<PromoProps> = (props) => {
  const { fps, durationInFrames } = useVideoConfig();
  const { audio } = props;
  let cursor = 0;
  const slots = SCENES.map((scene, i) => {
    const length = Math.round(props.timing[scene.key] * fps);
    const isLast = i === SCENES.length - 1;
    const slot = { ...scene, from: cursor, duration: length + (isLast ? 0 : OVERLAP), isLast };
    cursor += length;
    return slot;
  });

  const narration = audio.voiceover
    ? slots.flatMap(({ key, from }) => {
        const line = VOICEOVER[key];
        if (!line) return [];
        const start = from + Math.round(line.startSec * fps);
        return [{ key, file: line.file, start, end: start + Math.ceil(line.durationSec * fps) }];
      })
    : [];

  const musicLevel = (f: number) => {
    let level = 1;
    for (const { start, end } of narration) {
      if (f < start - 8 || f > end + 12) continue;
      level = Math.min(
        level,
        interpolate(f, [start - 8, start, end, end + 12], [1, audio.musicUnderVoice, audio.musicUnderVoice, 1], clamp),
      );
    }
    return level * interpolate(f, [durationInFrames - 15, durationInFrames], [1, 0], clamp);
  };

  return (
    <PromoProvider value={props}>
      <AbsoluteFill style={{ fontFamily: `${PROMO_FONT}, Inter, system-ui, sans-serif`, color: props.colors.text }}>
        <Backdrop />
        {audio.music && audio.musicVolume > 0 ? (
          <Html5Audio
            src={staticFile('audio/promo-music.wav')}
            volume={(f) => audio.musicVolume * musicLevel(f)}
          />
        ) : null}
        {narration.map(({ key, file, start, end }) => (
          <Sequence key={`vo-${key}`} name={`voiceover: ${key}`} from={start} durationInFrames={end - start + 6} layout="none">
            <Html5Audio src={staticFile(file)} volume={audio.voiceoverVolume} />
          </Sequence>
        ))}
        {slots.map(({ key, name, Component, from, duration, isLast }, i) => (
          <Sequence key={key} name={name} from={from} durationInFrames={duration}>
            <SceneFrame duration={duration} isFirst={i === 0} isLast={isLast}>
              <Component duration={duration} />
            </SceneFrame>
          </Sequence>
        ))}
      </AbsoluteFill>
    </PromoProvider>
  );
};
