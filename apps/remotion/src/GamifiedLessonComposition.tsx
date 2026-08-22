import React, { useMemo } from 'react';
import { AbsoluteFill, Audio, useCurrentFrame, useVideoConfig } from 'remotion';
import { DynamicSceneRouter } from './components/DynamicSceneRouter';
import { KaraokeSubtitles } from './components/KaraokeSubtitles';
import { InteractiveUIOverlay } from './components/InteractiveUIOverlay';

export type SceneProp = {
  sceneId: number;
  duration: number;
  voiceoverText: string;
  animationType: string;
  phase?: string;
  visualType?: string;
  visualProps?: Record<string, unknown>;
  parameters: {
    particleDensity?: string;
    temperature?: number;
    speedMultiplier?: number;
    showLabels?: string[];
    leftLabel?: string;
    rightLabel?: string;
    primaryObject?: string;
    container?: string;
    action?: string;
    primarySubstance?: string;
    secondarySubstance?: string;
    particleTypeA?: string;
    particleTypeB?: string;
    keyTakeaway?: string;
    stepLabels?: string[];
    [key: string]: unknown;
  };
};

export type GamifiedLessonProps = {
  topicId: string;
  topicTitle: string;
  totalDurationSeconds: number;
  archetype?: string;
  scenes: SceneProp[];
  wordTimings: { word: string; start: number; end: number }[];
  audioUrl?: string;
};

export const GamifiedLessonComposition: React.FC<GamifiedLessonProps> = ({
  topicTitle,
  scenes,
  wordTimings,
  audioUrl,
  totalDurationSeconds,
  archetype,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  const sceneOffsets = useMemo(() => {
    let acc = 0;
    return scenes.map((s) => {
      const start = acc;
      acc += s.duration;
      return { start, end: acc, scene: s };
    });
  }, [scenes]);

  const active = sceneOffsets.find((s) => t >= s.start && t < s.end) ?? sceneOffsets[0];
  const scene = active?.scene;
  const visualProps = {
    ...(scene?.parameters ?? {}),
    ...(scene?.visualProps ?? {}),
  };

  return (
    <AbsoluteFill style={{ backgroundColor: '#0b1220' }}>
      <AbsoluteFill>
        <DynamicSceneRouter
          visualType={scene?.visualType}
          animationType={scene?.animationType ?? 'ParticleMotion3D'}
          parameters={visualProps}
          timeSec={t}
        />
      </AbsoluteFill>

      <AbsoluteFill
        style={{
          background:
            'linear-gradient(180deg, rgba(2,6,23,0.55) 0%, transparent 28%, transparent 70%, rgba(2,6,23,0.72) 100%)',
        }}
      />

      <InteractiveUIOverlay
        topicTitle={topicTitle}
        archetype={archetype}
        phase={scene?.phase}
        leftLabel={visualProps.leftLabel as string | undefined}
        rightLabel={visualProps.rightLabel as string | undefined}
        keyTakeaway={visualProps.keyTakeaway as string | undefined}
        stepLabels={visualProps.stepLabels as string[] | undefined}
      />

      <KaraokeSubtitles words={wordTimings} currentTime={t} />

      {audioUrl ? <Audio src={audioUrl} /> : null}

      <div
        style={{
          position: 'absolute',
          bottom: 10,
          right: 20,
          color: 'rgba(255,255,255,0.45)',
          fontSize: 11,
          fontFamily: 'monospace',
        }}
      >
        {t.toFixed(1)}s / {totalDurationSeconds}s
        {scene?.visualType ? ` · ${scene.visualType}` : ''}
      </div>
    </AbsoluteFill>
  );
};
