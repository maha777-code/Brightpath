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
import { LESSON_PLAN_FILM, MindVaultLessonPlanFilm } from './Compositions/MindVaultLessonPlanFilm';
import { FIVE_QUESTIONS_FILM, MindVaultFiveQuestionsFilm } from './Compositions/MindVaultFiveQuestionsFilm';
import { MindVaultPromo } from './promo/MindVaultPromo';
import {
  PROMO_FPS,
  PROMO_HEIGHT,
  PROMO_WIDTH,
  defaultPromoProps,
  promoDurationInFrames,
  promoSchema,
} from './promo/theme';

function sceneDurationSum(props: GamifiedLessonProps): number {
  const scenes = props.scriptData?.scenes?.length ? props.scriptData.scenes : props.scenes;
  return (scenes ?? []).reduce((acc, s) => {
    const n = Number(s.durationSec ?? s.duration);
    return acc + (Number.isFinite(n) && n > 0 ? n : 0);
  }, 0);
}

export const RemotionRoot: React.FC = () => {
  const inputProps = getInputProps() as Partial<GamifiedLessonProps>;
  const liveScenes = inputProps.scriptData?.scenes?.length
    ? inputProps.scriptData.scenes
    : inputProps.scenes;
  const hasLiveScript = Boolean(liveScenes?.length && inputProps.topicId && inputProps.topicId !== 'demo');
  const defaultProps = resolveLessonProps(
    hasLiveScript
      ? {
          ...defaultGamifiedProps,
          ...inputProps,
          topicTitle:
            inputProps.topicTitle ||
            inputProps.scriptData?.topicTitle ||
            inputProps.topicId ||
            defaultGamifiedProps.topicTitle,
          textbookTitle: inputProps.textbookTitle,
          chapterTitle: inputProps.chapterTitle,
          audience: inputProps.audience || inputProps.scriptData?.audience,
          scenes: liveScenes ?? [],
          scriptData: {
            ...(inputProps.scriptData ?? {}),
            topicTitle:
              inputProps.topicTitle ||
              inputProps.scriptData?.topicTitle ||
              defaultGamifiedProps.topicTitle,
            scenes: liveScenes,
          },
        }
      : defaultGamifiedProps,
  );

  return (
    <>
    <Composition
      id="GamifiedLesson"
      component={GamifiedLesson}
      durationInFrames={900}
      fps={30}
      width={1920}
      height={1080}
      defaultProps={defaultProps}
      calculateMetadata={async ({ props }) => {
        const resolved = resolveLessonProps(props);
        let seconds =
          Number(resolved.scriptData?.totalDurationSeconds) ||
          Number(resolved.totalDurationSeconds) ||
          sceneDurationSum(resolved) ||
          180;

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
          `[GamifiedLesson] calculateMetadata title="${resolved.topicTitle}" chapter="${resolved.chapterTitle || ''}" ` +
            `headings=${resolved.scenes.map((s) => s.lesson?.heading || s.phase).join(' | ')} ` +
            `duration=${seconds.toFixed(1)}s`,
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
        id="MindVaultPromo"
        component={MindVaultPromo}
        schema={promoSchema}
        defaultProps={defaultPromoProps}
        durationInFrames={promoDurationInFrames(defaultPromoProps)}
        fps={PROMO_FPS}
        width={PROMO_WIDTH}
        height={PROMO_HEIGHT}
        calculateMetadata={({ props }) => ({ durationInFrames: promoDurationInFrames(props) })}
      />
      <Composition
        id={LESSON_PLAN_FILM.id}
        component={MindVaultLessonPlanFilm}
        durationInFrames={LESSON_PLAN_FILM.durationInFrames}
        fps={LESSON_PLAN_FILM.fps}
        width={LESSON_PLAN_FILM.width}
        height={LESSON_PLAN_FILM.height}
      />
      <Composition
        id={FIVE_QUESTIONS_FILM.id}
        component={MindVaultFiveQuestionsFilm}
        durationInFrames={FIVE_QUESTIONS_FILM.durationInFrames}
        fps={FIVE_QUESTIONS_FILM.fps}
        width={FIVE_QUESTIONS_FILM.width}
        height={FIVE_QUESTIONS_FILM.height}
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
