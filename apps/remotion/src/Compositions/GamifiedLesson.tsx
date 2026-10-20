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
    layout: 'hook',
    motion: 'smash_zoom',
    heading: 'Matter is everywhere',
    subheading: 'Class 9 Science',
    body: 'The chapter starts with what fills the room around you.',
    highlight: 'Mass and space',
  },
  {
    layout: 'insight',
    motion: 'drift_up',
    heading: 'What matter is',
    body: 'Anything that has mass and occupies space.',
    keyTerms: ['mass', 'space', 'particles'],
  },
  {
    layout: 'build',
    motion: 'parallax',
    heading: 'How it builds',
    steps: [
      { label: 'Notice it', detail: 'Does it take up space?' },
      { label: 'Name particles', detail: 'The text treats matter as tiny bits.' },
      { label: 'Watch the state', detail: 'Solid, liquid, or gas.' },
    ],
  },
  {
    layout: 'turn',
    motion: 'whip',
    heading: 'Air counts',
    left: { label: 'Easy miss', points: ['Air feels like nothing'] },
    right: { label: 'The text', points: ['Air has mass and occupies space'] },
  },
  {
    layout: 'payoff',
    motion: 'bloom',
    heading: 'Say it back',
    points: ['Matter has mass.', 'It occupies space.'],
    body: 'Matter is anything that has mass and occupies space.',
  },
];

const DEMO_PHASES = ['Hook', 'Insight', 'Build', 'Turn', 'Payoff'] as const;
const DEMO_DURATIONS = [8, 10, 10, 9, 8] as const;

const DEMO_SCENES: NormalizedScene[] = DEMO_SLIDES.map((slide, i) => ({
  sceneId: i + 1,
  duration: DEMO_DURATIONS[i],
  durationSec: DEMO_DURATIONS[i],
  phase: DEMO_PHASES[i],
  phaseTitle: DEMO_PHASES[i],
  voiceoverText: slide.body || slide.heading,
  voiceover: slide.body || slide.heading,
  visualType: 'cinematic_motion',
  visualArchetype: 'concept_card',
  animationType: 'CinematicMotion',
  teacherGesture: i === 0 ? 'questioning' : 'demonstrating',
  cameraMotion: slide.motion || 'smash_zoom',
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
  pedagogicalPattern: 'cinematic_motion',
  audioUrl: '',
  wordTimings: [],
  scenes: DEMO_SCENES,
  scriptData: {
    topicTitle: 'Matter in Our Surroundings',
    teacherName: 'MindVault',
    architecture: 'cinematic_motion',
    archetype: 'concept',
    pedagogicalPattern: 'cinematic_motion',
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
