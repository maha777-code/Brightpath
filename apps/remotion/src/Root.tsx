import React from 'react';
import { Composition, getInputProps } from 'remotion';
import { getAudioDurationInSeconds } from '@remotion/media-utils';
import {
  GamifiedLesson,
  defaultGamifiedProps,
  resolveLessonProps,
  type GamifiedLessonProps,
} from './Compositions/GamifiedLesson';
import { Box3DVideoComposition } from './Compositions/Box3DVideoComposition';

function sceneDurationSum(props: GamifiedLessonProps): number {
  const scenes = props.scriptData?.scenes?.length ? props.scriptData.scenes : props.scenes;
  return (scenes ?? []).reduce((acc, s) => {
    const n = Number(s.durationSec ?? s.duration);
    return acc + (Number.isFinite(n) && n > 0 ? n : 0);
  }, 0);
}

export const RemotionRoot: React.FC = () => {
  const inputProps = getInputProps() as Partial<GamifiedLessonProps>;
  const defaultProps = resolveLessonProps({
    ...defaultGamifiedProps,
    ...inputProps,
    scriptData: inputProps.scriptData ?? defaultGamifiedProps.scriptData,
    scenes:
      inputProps.scriptData?.scenes?.length
        ? inputProps.scriptData.scenes
        : inputProps.scenes?.length
          ? inputProps.scenes
          : defaultGamifiedProps.scenes,
  });

  return (
    <>
    <Composition
      id="GamifiedLesson"
      component={GamifiedLesson}
      durationInFrames={900}
      fps={30}
      width={1280}
      height={720}
      defaultProps={defaultProps}
      calculateMetadata={async ({ props }) => {
        const resolved = resolveLessonProps(props);
        let seconds =
          Number(resolved.scriptData?.totalDurationSeconds) ||
          Number(resolved.totalDurationSeconds) ||
          sceneDurationSum(resolved) ||
          25;

        const audioUrl = String(resolved.audioUrl || '').trim();
        if (/^https?:\/\//i.test(audioUrl)) {
          try {
            const audioSec = await getAudioDurationInSeconds(audioUrl);
            if (Number.isFinite(audioSec) && audioSec > 0) {
              seconds = audioSec;
            }
          } catch (err) {
            console.warn('[GamifiedLesson] audio duration probe failed, using script length', err);
          }
        }

        seconds = Math.max(8, seconds);
        console.log(
          `[GamifiedLesson] calculateMetadata visuals=${resolved.scenes
            .map((s) => s.visualArchetype || s.visualType)
            .join(',')} duration=${seconds.toFixed(1)}s`,
        );
        return {
          durationInFrames: Math.ceil(seconds * 30),
          props: {
            ...resolved,
            totalDurationSeconds: seconds,
            scriptData: {
              ...resolved.scriptData,
              totalDurationSeconds: seconds,
              scenes: resolved.scenes,
            },
          },
        };
      }}
    />
      <Composition
        id="Box3DPhysics"
        component={Box3DVideoComposition}
        durationInFrames={90}
        fps={30}
        width={1280}
        height={720}
        defaultProps={{
          templateId: 'space_shooter',
          title: 'Box3D Physics Preview',
          optionIds: ['A', 'B', 'C', 'D'],
          correctOptionId: 'B',
        }}
      />
    </>
  );
};
