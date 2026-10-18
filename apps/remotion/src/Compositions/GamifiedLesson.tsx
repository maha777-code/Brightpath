import React, { useMemo, useRef } from 'react';
import { AbsoluteFill, Audio, useCurrentFrame, useVideoConfig } from 'remotion';
import { LessonBoard } from '../components/lesson/LessonBoard';
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
    heading: 'Matter in Our Surroundings',
    subheading: 'Class 9 Science · Chapter 1',
    body: 'Everything around us is made of matter, and this lesson names how we tell one state from another.',
    keyTerms: ['matter', 'particles', 'states'],
  },
  {
    layout: 'definition',
    heading: 'What matter is',
    body: 'Matter is anything that has mass and occupies space. The chapter studies it through particles.',
    keyTerms: ['mass', 'space', 'particles'],
  },
  {
    layout: 'steps',
    heading: 'How the idea builds',
    steps: [
      { label: 'Notice the object', detail: 'Ask if it has mass and takes up space.' },
      { label: 'Name the particles', detail: 'The chapter treats matter as made of tiny particles.' },
      { label: 'Watch the state', detail: 'Solid, liquid, or gas depends on how those particles move.' },
    ],
  },
  {
    layout: 'compare',
    heading: 'A common mix-up',
    left: { label: 'Easy to mix up', points: ['Air is “nothing”', 'Only solids count as matter'] },
    right: { label: 'From the textbook', points: ['Air has mass and occupies space', 'Gases are matter too'] },
  },
  {
    layout: 'example',
    heading: 'Worked example',
    example: {
      prompt: 'Is the air in this room matter?',
      working: ['Does it occupy space? The room is full of it.', 'Does it have mass? A balloon of air is heavier than an empty one.'],
      answer: 'Yes. Air is matter because it has mass and occupies space.',
    },
  },
  {
    layout: 'recap',
    heading: 'Remember this',
    points: ['Matter has mass and occupies space.', 'It is made of particles.', 'Solids, liquids, and gases are all matter.'],
    body: 'Matter is anything that has mass and occupies space.',
  },
];

const DEMO_PHASES = [
  'Meet the topic',
  'The definition',
  'How it works',
  'Common mix-up',
  'Worked example',
  'Remember this',
] as const;

const DEMO_SCENES: NormalizedScene[] = DEMO_SLIDES.map((slide, i) => ({
  sceneId: i + 1,
  duration: [36, 48, 50, 48, 52, 40][i],
  durationSec: [36, 48, 50, 48, 52, 40][i],
  phase: DEMO_PHASES[i],
  phaseTitle: DEMO_PHASES[i],
  voiceoverText: slide.body || slide.heading,
  voiceover: slide.body || slide.heading,
  visualType: 'lesson_board',
  visualArchetype: 'concept_card',
  animationType: 'LessonBoard',
  teacherGesture: i === 0 ? 'questioning' : 'demonstrating',
  cameraMotion: 'push_in_close',
  visualConfig: { lesson: slide, headline: slide.heading },
  visualProps: { lesson: slide },
  parameters: { lesson: slide },
  props: { lesson: slide },
  lesson: slide,
}));

export const defaultGamifiedProps: GamifiedLessonProps = {
  topicId: 'demo',
  topicTitle: 'Matter in Our Surroundings',
  teacherName: 'MindVault',
  totalDurationSeconds: DEMO_SCENES.reduce((a, s) => a + s.duration, 0),
  archetype: 'concept',
  pedagogicalPattern: 'lesson_board',
  audioUrl: '',
  wordTimings: [],
  scenes: DEMO_SCENES,
  scriptData: {
    topicTitle: 'Matter in Our Surroundings',
    teacherName: 'MindVault',
    architecture: 'lesson_board',
    archetype: 'concept',
    pedagogicalPattern: 'lesson_board',
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
      `[Remotion Render] Lesson board scenes=${live?.scenes?.length || scenes.length} ` +
        `audio=${audioUrl ? 'yes' : 'NO'} title=${live?.topicTitle || topicTitle}`,
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
    <AbsoluteFill style={{ backgroundColor: '#07101d' }}>
      <LessonBoard
        topicTitle={topicTitle}
        phase={phase}
        sceneIndex={active.index}
        sceneCount={scenes.length}
        progress01={sceneProgress}
        slide={slide}
        visualConfig={activeScene.visualConfig}
      />
      <KaraokeSubtitles words={sceneWords} currentTime={currentTime} fallbackText={activeScene.voiceover} />
      {audioUrl ? <Audio src={audioUrl} /> : null}
    </AbsoluteFill>
  );
};

export const GamifiedLessonComposition = GamifiedLesson;
