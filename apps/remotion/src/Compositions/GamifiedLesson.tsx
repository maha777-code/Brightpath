import React, { useMemo, useRef } from 'react';
import { AbsoluteFill, Audio, useCurrentFrame, useVideoConfig } from 'remotion';
import { CinematicExplainerStage } from '../components/lesson/CinematicExplainerStage';
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
    heading: 'Ashoka after war',
    subheading: 'Ashoka, The Emperor Who Gave Up War',
    body: 'A king stands in the quiet after Kalinga.',
    visualKind: 'scene',
    mood: 'parchment',
    shape: 'crystal',
    setting: 'Kalinga dusk',
    objectLabel: 'Ashoka',
    keyTerms: ['Kalinga'],
  },
  {
    layout: 'insight',
    motion: 'drift_up',
    heading: 'Dhamma',
    body: 'He chose a rule of kindness, not more conquest.',
    visualKind: 'object',
    mood: 'parchment',
    shape: 'torus',
    setting: 'edict pillar',
    keyTerms: ['dhamma'],
  },
  {
    layout: 'build',
    motion: 'parallax',
    heading: 'How it spread',
    steps: [{ label: 'Edicts carved' }, { label: 'Messengers sent' }, { label: 'People heard' }],
    visualKind: 'process',
    mood: 'parchment',
    shape: 'cylinder',
    setting: 'royal road',
  },
  {
    layout: 'turn',
    motion: 'whip',
    heading: 'War or dhamma',
    left: { label: 'Conquest', points: ['More land, more grief'] },
    right: { label: 'Dhamma', points: ['Care for people'] },
    visualKind: 'compare',
    mood: 'dusk',
    shape: 'cube',
    setting: 'two paths',
  },
  {
    layout: 'payoff',
    motion: 'bloom',
    heading: 'Remember this',
    body: 'Ashoka gave up war and taught dhamma.',
    visualKind: 'scene',
    mood: 'parchment',
    shape: 'sphere',
    setting: 'edict at dusk',
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
  visualType: 'cinematic_explainer',
  visualArchetype: 'cinematic_explainer',
  animationType: 'CinematicExplainer',
  teacherGesture: i === 0 ? 'questioning' : 'demonstrating',
  cameraMotion: 'orbit',
  visualConfig: { lesson: slide, headline: slide.heading, visualKind: slide.visualKind, matterState: slide.matterState },
  visualProps: { lesson: slide },
  parameters: { lesson: slide },
  props: { lesson: slide },
  lesson: slide,
}));

export const defaultGamifiedProps: GamifiedLessonProps = {
  topicId: 'demo',
  topicTitle: 'Ashoka, The Emperor Who Gave Up War',
  teacherName: 'MindVault',
  totalDurationSeconds: DEMO_SCENES.reduce((a, s) => a + s.duration, 0),
  archetype: 'concept',
  pedagogicalPattern: 'cinematic_explainer',
  audioUrl: '',
  wordTimings: [],
  scenes: DEMO_SCENES,
  scriptData: {
    topicTitle: 'Ashoka, The Emperor Who Gave Up War',
    teacherName: 'MindVault',
    architecture: 'cinematic_explainer',
    archetype: 'concept',
    pedagogicalPattern: 'cinematic_explainer',
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
    visualKind: 'scene',
    mood: 'dusk',
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
      `[Remotion Render] Cinematic explainer topicId=${rawProps.topicId} title="${live?.topicTitle || topicTitle}" ` +
        `chapter="${rawProps.chapterTitle || ''}" scenes=${live?.scenes?.length || scenes.length} ` +
        `headings=${scenes.map((s) => s.lesson?.heading || s.phase).join(' | ')} audio=${audioUrl ? 'yes' : 'NO'}`,
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
    console.log(`[GamifiedLesson] t=${currentTime.toFixed(2)}s ${phase} kind=${slide.visualKind || 'infer'}`);
  }

  return (
    <AbsoluteFill style={{ backgroundColor: '#efe4c8' }}>
      <CinematicExplainerStage
        topicTitle={topicTitle}
        chapterTitle={props.chapterTitle || slide.subheading}
        textbookTitle={props.textbookTitle}
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
