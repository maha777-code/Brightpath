import React, { useMemo, useRef } from 'react';
import { AbsoluteFill, Audio, useCurrentFrame, useVideoConfig } from 'remotion';
import { VideoOverviewStage } from '../components/lesson/VideoOverviewStage';
import { KaraokeSubtitles } from '../components/KaraokeSubtitles';
import {
  resolveActiveScene,
  resolveLessonProps,
  type GamifiedLessonProps,
  type NormalizedScene,
} from '../scriptScene';
import type { LessonSlide } from '@brightpath/shared';

export type { GamifiedLessonProps, SceneProp, ScriptData } from '../scriptScene';
export { resolveLessonProps } from '../scriptScene';

const DEMO_SLIDES: LessonSlide[] = [
  {
    layout: 'title',
    heading: 'Ashoka after Kalinga',
    subheading: 'Ashoka, The Emperor Who Gave Up War',
    quote: 'He saw the grief of war and chose another path.',
    sourceRefs: ['Ashoka, The Emperor Who Gave Up War'],
  },
  {
    layout: 'bullets',
    heading: 'What the chapter shows',
    bullets: ['War left Kalinga in grief', 'Ashoka turned toward dhamma', 'Edicts carried the message'],
    sourceRefs: ['Kalinga war and its aftermath'],
  },
  {
    layout: 'quote',
    heading: 'From the textbook',
    quote: 'He decided to give up war and follow dhamma.',
    sourceRefs: ['Decision after Kalinga'],
  },
  {
    layout: 'two_column',
    heading: 'Two paths',
    left: { label: 'Conquest', points: ['More land', 'More grief'] },
    right: { label: 'Dhamma', points: ['Care for people', 'Edicts, not armies'] },
    sourceRefs: ['War compared with dhamma'],
  },
  {
    layout: 'stat',
    heading: 'The turn',
    stat: { value: 'Kalinga', label: 'The war that changed a king' },
    sourceRefs: ['Kalinga'],
  },
  {
    layout: 'diagram',
    heading: 'How dhamma spread',
    bullets: ['Edicts carved', 'Messengers sent', 'People heard'],
    sourceRefs: ['Spread of dhamma'],
  },
  {
    layout: 'image_caption',
    heading: 'The edict pillar',
    quote: 'A carved message instead of another campaign.',
    sourceRefs: ['Ashokan edicts'],
  },
  {
    layout: 'bullets',
    heading: 'Remember this',
    bullets: ['Gave up war', 'Taught dhamma', 'Spoke through edicts'],
    sourceRefs: ['Chapter recap'],
  },
];

const DEMO_SCENES: NormalizedScene[] = DEMO_SLIDES.map((slide, i) => ({
  sceneId: i + 1,
  duration: 12,
  durationSec: 12,
  phase: i === 0 ? 'Cover' : i === DEMO_SLIDES.length - 1 ? 'Recap' : `Slide ${i + 1}`,
  phaseTitle: slide.heading,
  voiceoverText: slide.quote || slide.heading,
  voiceover: slide.quote || slide.heading,
  visualType: 'video_overview',
  visualArchetype: 'video_overview',
  animationType: 'VideoOverview',
  teacherGesture: i === 0 ? 'questioning' : 'demonstrating',
  cameraMotion: 'ken_burns',
  visualConfig: { lesson: slide, headline: slide.heading },
  visualProps: { lesson: slide },
  parameters: { lesson: slide },
  props: { lesson: slide },
  lesson: slide,
}));

export const defaultGamifiedProps: GamifiedLessonProps = {
  topicId: 'demo',
  topicTitle: 'Ashoka, The Emperor Who Gave Up War',
  teacherName: 'MindVault',
  audience: 'Class 6 History',
  totalDurationSeconds: DEMO_SCENES.reduce((a, s) => a + s.duration, 0),
  archetype: 'concept',
  pedagogicalPattern: 'video_overview',
  audioUrl: '',
  wordTimings: [],
  scenes: DEMO_SCENES,
  scriptData: {
    topicTitle: 'Ashoka, The Emperor Who Gave Up War',
    teacherName: 'MindVault',
    audience: 'Class 6 History',
    architecture: 'video_overview',
    archetype: 'concept',
    pedagogicalPattern: 'video_overview',
    totalDurationSeconds: DEMO_SCENES.reduce((a, s) => a + s.duration, 0),
    scenes: DEMO_SCENES,
    wordTimings: [],
  },
};

function readLesson(scene: NormalizedScene): LessonSlide {
  const fromScene = scene.lesson;
  const fromConfig = scene.visualConfig.lesson as LessonSlide | undefined;
  const slide = fromScene ?? fromConfig;
  if (slide && typeof slide === 'object' && slide.heading) return slide;
  return {
    layout: 'title',
    heading: scene.phaseTitle || scene.voiceover.slice(0, 48) || 'Lesson',
    body: scene.voiceover,
  };
}

export const GamifiedLesson: React.FC<GamifiedLessonProps> = (rawProps) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const currentTime = frame / fps;
  const loggedScene = useRef<string>('');

  const props = useMemo(() => resolveLessonProps(rawProps), [rawProps]);
  const scenes = (props.scriptData?.scenes ?? props.scenes) as NormalizedScene[];
  const topicTitle = props.topicTitle;
  const wordTimings = props.wordTimings;
  const audioUrl = props.audioUrl;

  if (frame === 0) {
    const live = rawProps.scriptData;
    console.log(
      `[Remotion Render] Video Overview topicId=${rawProps.topicId} title="${live?.topicTitle || topicTitle}" ` +
        `chapter="${rawProps.chapterTitle || ''}" slides=${live?.scenes?.length || scenes.length} ` +
        `layouts=${scenes.map((s) => s.lesson?.layout || s.phase).join(' | ')} audio=${audioUrl ? 'yes' : 'NO'}`,
    );
  }

  const active = resolveActiveScene(scenes, currentTime);
  const activeScene = active.scene;
  const sceneProgress =
    active.end > active.start ? (currentTime - active.start) / (active.end - active.start) : 0;
  const sceneWords = (wordTimings ?? []).filter((w) => {
    return w.start >= active.start - 0.12 && w.start < active.end + 0.05;
  });
  const slide = readLesson(activeScene);
  const phase = activeScene.phaseTitle || activeScene.phase || slide.heading;
  const sceneKey = `${activeScene.sceneId}:${phase}`;
  if (loggedScene.current !== sceneKey) {
    loggedScene.current = sceneKey;
    console.log(`[GamifiedLesson] t=${currentTime.toFixed(2)}s ${phase} layout=${slide.layout}`);
  }

  return (
    <AbsoluteFill style={{ backgroundColor: '#f7f4ee' }}>
      <VideoOverviewStage
        topicTitle={topicTitle}
        chapterTitle={props.chapterTitle || slide.subheading}
        textbookTitle={props.textbookTitle}
        audience={props.audience || props.scriptData?.audience}
        slideIndex={active.index}
        slideCount={Math.max(1, scenes.length)}
        progress01={sceneProgress}
        slide={slide}
      />
      <KaraokeSubtitles words={sceneWords} currentTime={currentTime} fallbackText={activeScene.voiceover} />
      {audioUrl ? <Audio src={audioUrl} /> : null}
    </AbsoluteFill>
  );
};

export const GamifiedLessonComposition = GamifiedLesson;
