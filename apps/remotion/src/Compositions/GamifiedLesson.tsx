import React, { useMemo, useRef } from 'react';
import { AbsoluteFill, Audio, useCurrentFrame, useVideoConfig } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import { DynamicSplitComparison } from '../components/3D/DynamicSplitComparison';
import { DynamicInteractiveStage } from '../components/3D/DynamicInteractiveStage';
import { DynamicMicroZoom } from '../components/3D/DynamicMicroZoom';
import { DynamicConceptCard } from '../components/3D/DynamicConceptCard';
import { CinematicCameraRig, CinematicLights } from '../components/3D/CinematicCameraRig';
import { TeacherAvatar } from '../components/Avatar/TeacherAvatar';
import { CinematicGrade } from '../components/CinematicGrade';
import { KaraokeSubtitles } from '../components/KaraokeSubtitles';
import { SweetRushHUD } from '../components/UI/SweetRushHUD';
import {
  resolveActiveScene,
  resolveLessonProps,
  type GamifiedLessonProps,
  type NormalizedScene,
} from '../scriptScene';

export type { GamifiedLessonProps, SceneProp, ScriptData } from '../scriptScene';
export { resolveLessonProps } from '../scriptScene';

const DEMO_SCENES: NormalizedScene[] = [
  {
    sceneId: 1,
    duration: 8,
    durationSec: 8,
    phase: 'CHALLENGE',
    phaseTitle: 'CHALLENGE',
    voiceoverText: 'What two ideas in this lesson seem opposite — until you look closer?',
    voiceover: 'What two ideas in this lesson seem opposite — until you look closer?',
    visualType: 'split_comparison',
    visualArchetype: 'split_comparison',
    animationType: 'StateComparison',
    teacherGesture: 'questioning',
    cameraMotion: 'cinematic_pan_right',
    visualConfig: {
      leftLabel: 'Idea A',
      rightLabel: 'Idea B',
      primaryShape: 'cube',
      primaryColor: '#00A8FF',
      secondaryColor: '#FF5722',
    },
    visualProps: {},
    parameters: {},
    props: {
      leftLabel: 'Idea A',
      rightLabel: 'Idea B',
      primaryShape: 'cube',
      primaryColor: '#00A8FF',
      secondaryColor: '#FF5722',
    },
  },
  {
    sceneId: 2,
    duration: 12,
    durationSec: 12,
    phase: 'SIMULATION',
    phaseTitle: 'SIMULATION',
    voiceoverText: 'Watch the process unfold, one labeled element at a time.',
    voiceover: 'Watch the process unfold, one labeled element at a time.',
    visualType: 'interactive_stage',
    visualArchetype: 'interactive_stage',
    animationType: 'TemperatureEffect',
    teacherGesture: 'demonstrating',
    cameraMotion: 'orbit_around_object',
    visualConfig: {},
    visualProps: {},
    parameters: {},
    props: {
      stageLabel: 'Process',
      actionText: 'Transforming',
      elements: [
        { name: 'Stage', type: 'container', color: '#e2e8f0' },
        { name: 'Change', type: 'particles', color: '#00a8ff' },
      ],
      calloutBadges: ['Observe', 'Change'],
      primaryColor: '#00A8FF',
      secondaryColor: '#FACC15',
    },
  },
  {
    sceneId: 3,
    duration: 8,
    durationSec: 8,
    phase: 'DISCOVERY',
    phaseTitle: 'DISCOVERY',
    voiceoverText: 'Zoom in: the structure underneath explains the rule.',
    voiceover: 'Zoom in: the structure underneath explains the rule.',
    visualType: 'micro_zoom',
    visualArchetype: 'micro_zoom',
    animationType: 'ParticleMotion3D',
    teacherGesture: 'eureka',
    cameraMotion: 'hyper_zoom_into_particles',
    visualConfig: {},
    visualProps: {},
    parameters: {},
    props: {
      headline: 'Core insight',
      particleMatrix: { typeA: 'blue_spheres', typeB: 'yellow_spheres' },
      takeawayBadge: 'The hidden structure explains the observed change.',
      primaryColor: '#38bdf8',
      secondaryColor: '#facc15',
    },
  },
];

export const defaultGamifiedProps: GamifiedLessonProps = {
  topicId: 'demo',
  topicTitle: 'SweetRush Micro-Lesson',
  teacherName: 'Professor Maya',
  totalDurationSeconds: 28,
  archetype: 'concept',
  pedagogicalPattern: 'concept_card',
  audioUrl: '',
  wordTimings: [],
  scenes: DEMO_SCENES,
  scriptData: {
    topicTitle: 'SweetRush Micro-Lesson',
    teacherName: 'Professor Maya',
    archetype: 'concept',
    pedagogicalPattern: 'concept_card',
    totalDurationSeconds: 28,
    scenes: DEMO_SCENES,
    wordTimings: [],
  },
};

const glOpts = {
  powerPreference: 'high-performance' as const,
  failIfMajorPerformanceCaveat: false,
  preserveDrawingBuffer: true,
  antialias: true,
  alpha: false,
};

function collectBadges(cfg: Record<string, unknown>): string[] {
  const fromCallouts = Array.isArray(cfg.calloutBadges)
    ? cfg.calloutBadges.map((b) => String(b))
    : [];
  const fromSteps = Array.isArray(cfg.stepLabels) ? cfg.stepLabels.map((b) => String(b)) : [];
  const extras = [
    cfg.stageLabel,
    cfg.actionText,
    cfg.headline,
    cfg.container,
  ]
    .map((x) => (typeof x === 'string' ? x : ''))
    .filter(Boolean);
  return [...fromCallouts, ...fromSteps, ...extras].filter(Boolean).slice(0, 4);
}

function SceneVisual({
  scene,
  frame,
  progress01,
}: {
  scene: NormalizedScene;
  frame: number;
  progress01: number;
}) {
  const arch = scene.visualArchetype;
  const config = scene.visualConfig;
  const lighting = String(config.lighting || '');

  return (
    <ThreeCanvas
      key={`${scene.sceneId}-${arch}`}
      width={1280}
      height={720}
      camera={{ position: [0, 1.2, 8], fov: 48 }}
      gl={glOpts}
      onCreated={({ gl }) => {
        gl.setPixelRatio(1);
      }}
    >
      <color attach="background" args={['#020617']} />
      <CinematicLights lighting={lighting} />
      <CinematicCameraRig motion={scene.cameraMotion} progress01={progress01} />

      {arch === 'split_comparison' ? (
        <DynamicSplitComparison config={config as never} frame={frame} />
      ) : null}
      {arch === 'interactive_stage' ? (
        <DynamicInteractiveStage config={config as never} frame={frame} />
      ) : null}
      {arch === 'micro_zoom' ? (
        <DynamicMicroZoom config={config as never} frame={frame} />
      ) : null}
      {arch === 'concept_card' ? (
        <DynamicConceptCard config={config as never} frame={frame} />
      ) : null}
    </ThreeCanvas>
  );
}

export const GamifiedLesson: React.FC<GamifiedLessonProps> = (rawProps) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const currentTime = frame / fps;
  const loggedScene = useRef<string>('');

  const props = useMemo(() => resolveLessonProps(rawProps), [rawProps]);
  const scenes = (props.scriptData?.scenes ?? props.scenes) as NormalizedScene[];
  const topicTitle = props.topicTitle;
  const teacherName = props.teacherName || props.scriptData?.teacherName || 'Professor Maya';
  const pattern = props.pedagogicalPattern || props.archetype;
  const wordTimings = props.wordTimings;
  const audioUrl = props.audioUrl;

  if (frame === 0) {
    const live = rawProps.scriptData;
    if (!live?.scenes?.length) {
      console.error(
        '[Remotion Render] WARNING: scriptData is missing or invalid! Using fallback.',
      );
    } else {
      console.log(
        `[Remotion Render] Rendering dynamic scenes for: ${live.topicTitle || topicTitle} ` +
          `teacher=${live.teacherName || teacherName} scenes=${live.scenes.length} ` +
          `audio=${audioUrl ? 'yes' : 'NO'} ` +
          `cameras=${live.scenes.map((s) => s.cameraMotion || s.visualArchetype).join(',')} ` +
          `gestures=${live.scenes.map((s) => s.teacherGesture || '?').join(',')}`,
      );
    }
  }

  const active = resolveActiveScene(scenes, currentTime);
  const activeScene = active.scene;
  const visualConfig = activeScene.visualConfig;
  const sceneProgress =
    active.end > active.start ? (currentTime - active.start) / (active.end - active.start) : 0;
  const sceneWords = (wordTimings ?? []).filter((w) => {
    return w.start >= active.start - 0.12 && w.start < active.end + 0.05;
  });
  const takeaway =
    activeScene.phase === 'DISCOVERY'
      ? String(visualConfig.takeawayBadge || visualConfig.keyTakeaway || visualConfig.headline || '')
      : '';
  const stepLabels = Array.isArray(visualConfig.calloutBadges)
    ? (visualConfig.calloutBadges as string[])
    : Array.isArray(visualConfig.stepLabels)
      ? (visualConfig.stepLabels as string[])
      : undefined;

  const sceneKey = `${activeScene.sceneId}:${activeScene.visualArchetype}`;
  if (loggedScene.current !== sceneKey) {
    loggedScene.current = sceneKey;
    console.log(
      `[GamifiedLesson] t=${currentTime.toFixed(2)}s scene=${activeScene.sceneId} ` +
        `visualArchetype=${activeScene.visualArchetype} camera=${activeScene.cameraMotion} ` +
        `gesture=${activeScene.teacherGesture} durationSec=${activeScene.durationSec} ` +
        `config=${Object.keys(visualConfig).join(',') || '(none)'}`,
    );
  }

  return (
    <AbsoluteFill className="bg-slate-950" style={{ backgroundColor: '#020617' }}>
      <AbsoluteFill>
        <SceneVisual scene={activeScene} frame={frame} progress01={sceneProgress} />
      </AbsoluteFill>

      <AbsoluteFill
        style={{
          background:
            'linear-gradient(180deg, rgba(2,6,23,0.45) 0%, transparent 26%, transparent 62%, rgba(2,6,23,0.55) 100%)',
        }}
      />

      <CinematicGrade lighting={String(visualConfig.lighting || '')} />

      <SweetRushHUD
        topicTitle={topicTitle}
        phaseTitle={activeScene.phaseTitle}
        phase={activeScene.phase}
        pattern={pattern}
        progress01={sceneProgress}
        voiceover={activeScene.voiceover}
        leftConcept={
          (visualConfig.leftLabel || visualConfig.leftConcept) as string | undefined
        }
        rightConcept={
          (visualConfig.rightLabel || visualConfig.rightConcept) as string | undefined
        }
        badges={collectBadges(visualConfig)}
        takeawayBadge={takeaway || undefined}
        stepLabels={stepLabels}
      />

      <TeacherAvatar
        gesture={activeScene.teacherGesture}
        teacherName={teacherName}
        currentTime={currentTime}
        wordTimings={wordTimings}
      />

      <KaraokeSubtitles
        words={sceneWords}
        currentTime={currentTime}
        fallbackText={activeScene.voiceover}
      />

      {audioUrl ? <Audio src={audioUrl} /> : null}
    </AbsoluteFill>
  );
};

export const GamifiedLessonComposition = GamifiedLesson;
