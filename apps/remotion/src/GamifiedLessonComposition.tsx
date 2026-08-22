import React, { useMemo } from 'react';
import { AbsoluteFill, Audio, useCurrentFrame, useVideoConfig } from 'remotion';
import { DynamicSceneRouter } from './components/DynamicSceneRouter';
import { KaraokeSubtitles } from './components/KaraokeSubtitles';
import { InteractiveUIOverlay } from './components/InteractiveUIOverlay';

export type SceneProp = {
  sceneId: number;
  duration: number;
  voiceoverText?: string;
  voiceover?: string;
  animationType?: string;
  phase?: string;
  visualType?: string;
  visualProps?: Record<string, unknown>;
  parameters?: {
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

export type ScriptData = {
  topicTitle?: string;
  archetype?: string;
  totalDurationSeconds?: number;
  scenes?: SceneProp[];
  wordTimings?: { word: string; start: number; end: number }[];
};

export type GamifiedLessonProps = {
  topicId: string;
  topicTitle: string;
  totalDurationSeconds: number;
  archetype?: string;
  scenes: SceneProp[];
  wordTimings: { word: string; start: number; end: number }[];
  audioUrl?: string;
  /** Exact generated pipeline payload (preferred over flattened defaults). */
  scriptData?: ScriptData;
};

function sceneVoiceover(scene?: SceneProp): string {
  if (!scene) return '';
  return String(scene.voiceoverText || scene.voiceover || '').trim();
}

export const GamifiedLessonComposition: React.FC<GamifiedLessonProps> = (props) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  const script = props.scriptData;
  const scenes = (script?.scenes?.length ? script.scenes : props.scenes) ?? [];
  const topicTitle = script?.topicTitle || props.topicTitle;
  const archetype = script?.archetype || props.archetype;
  const wordTimings = script?.wordTimings?.length ? script.wordTimings : props.wordTimings;
  const audioUrl = props.audioUrl;
  const totalDurationSeconds =
    Number(script?.totalDurationSeconds) ||
    Number(props.totalDurationSeconds) ||
    scenes.reduce((acc, s) => acc + Number(s.duration || 0), 0) ||
    8;

  const sceneOffsets = useMemo(() => {
    let acc = 0;
    return scenes.map((s) => {
      const duration = Math.max(0.5, Number(s.duration) || 7);
      const start = acc;
      acc += duration;
      return { start, end: acc, scene: s };
    });
  }, [scenes]);

  const active = sceneOffsets.find((s) => t >= s.start && t < s.end) ?? sceneOffsets[0];
  const scene = active?.scene;
  const visualProps = {
    ...(scene?.parameters ?? {}),
    ...(scene?.visualProps ?? {}),
  };
  const caption = sceneVoiceover(scene);

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

      {!caption && wordTimings?.length ? (
        <KaraokeSubtitles words={wordTimings} currentTime={t} />
      ) : null}

      {caption ? (
        <div
          style={{
            position: 'absolute',
            left: 40,
            right: 40,
            bottom: 28,
            padding: '16px 22px',
            borderRadius: 16,
            background: 'rgba(2, 6, 23, 0.78)',
            border: '1px solid rgba(34, 211, 238, 0.35)',
            color: 'white',
            fontFamily: 'Inter, system-ui, sans-serif',
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 800,
              letterSpacing: 0.6,
              color: '#67e8f9',
              marginBottom: 6,
            }}
          >
            {topicTitle}
            {scene?.phase ? ` · ${scene.phase}` : ''}
          </div>
          <div style={{ fontSize: 22, fontWeight: 650, lineHeight: 1.35 }}>{caption}</div>
        </div>
      ) : null}

      {audioUrl ? <Audio src={audioUrl} /> : null}

      <div
        style={{
          position: 'absolute',
          bottom: 8,
          right: 16,
          color: 'rgba(255,255,255,0.4)',
          fontSize: 11,
          fontFamily: 'monospace',
        }}
      >
        {t.toFixed(1)}s / {totalDurationSeconds.toFixed(1)}s
        {scene?.visualType ? ` · ${scene.visualType}` : ''}
      </div>
    </AbsoluteFill>
  );
};
