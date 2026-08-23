import React, { useMemo } from 'react';
import { AbsoluteFill, Audio, useCurrentFrame, useVideoConfig } from 'remotion';
import { DynamicSceneRouter } from './components/DynamicSceneRouter';
import { KaraokeSubtitles } from './components/KaraokeSubtitles';
import { SweetRushHud } from './components/SweetRushHud';

export type SceneProp = {
  sceneId: number;
  duration: number;
  voiceoverText?: string;
  voiceover?: string;
  animationType?: string;
  phase?: string;
  visualType?: string;
  visualProps?: Record<string, unknown>;
  parameters?: Record<string, unknown>;
};

export type ScriptData = {
  topicTitle?: string;
  archetype?: string;
  pedagogicalPattern?: string;
  totalDurationSeconds?: number;
  scenes?: SceneProp[];
  wordTimings?: { word: string; start: number; end: number }[];
};

export type GamifiedLessonProps = {
  topicId: string;
  topicTitle: string;
  totalDurationSeconds: number;
  archetype?: string;
  pedagogicalPattern?: string;
  scenes: SceneProp[];
  wordTimings: { word: string; start: number; end: number }[];
  audioUrl?: string;
  scriptData?: ScriptData;
};

function sceneVoiceover(scene?: SceneProp): string {
  if (!scene) return '';
  return String(scene.voiceoverText || scene.voiceover || '').trim();
}

function collectBadges(visualProps: Record<string, unknown>): string[] {
  const badges: string[] = [];
  const container = visualProps.container ? String(visualProps.container) : '';
  const level = visualProps.liquidLevel;
  const solute = visualProps.solute || visualProps.secondarySubstance;
  if (container) badges.push(container);
  if (level != null && Number.isFinite(Number(level))) {
    badges.push(`${Number(level)}% water level`);
  }
  if (solute) badges.push(String(solute));
  if (visualProps.waterLevelChanged === false) badges.push('Water level unchanged');
  if (visualProps.action) badges.push(String(visualProps.action).replace(/_/g, ' '));
  return badges;
}

export const GamifiedLessonComposition: React.FC<GamifiedLessonProps> = (props) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  const script = props.scriptData;
  const scenes = (script?.scenes?.length ? script.scenes : props.scenes) ?? [];
  const topicTitle = script?.topicTitle || props.topicTitle;
  const pattern = script?.pedagogicalPattern || props.pedagogicalPattern || props.archetype;
  const wordTimings = script?.wordTimings?.length ? script.wordTimings : props.wordTimings;
  const audioUrl = props.audioUrl;
  const totalDurationSeconds =
    Number(script?.totalDurationSeconds) ||
    Number(props.totalDurationSeconds) ||
    scenes.reduce((acc, s) => acc + Number(s.duration || 0), 0) ||
    25;

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
  const sceneProgress =
    active && active.end > active.start ? (t - active.start) / (active.end - active.start) : 0;
  const sceneWords = (wordTimings ?? []).filter((w) => {
    if (!active) return true;
    return w.start >= active.start - 0.12 && w.start < active.end + 0.05;
  });
  const takeaway =
    scene?.phase?.toUpperCase() === 'DISCOVERY'
      ? String(visualProps.takeawayBadge || visualProps.keyTakeaway || '')
      : '';

  return (
    <AbsoluteFill style={{ backgroundColor: '#070d18' }}>
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
            'linear-gradient(180deg, rgba(2,6,23,0.62) 0%, transparent 26%, transparent 62%, rgba(2,6,23,0.78) 100%)',
        }}
      />

      <SweetRushHud
        topicTitle={topicTitle}
        phase={scene?.phase}
        pattern={pattern}
        progress01={sceneProgress}
        leftConcept={
          (visualProps.leftConcept || visualProps.leftLabel) as string | undefined
        }
        rightConcept={
          (visualProps.rightConcept || visualProps.rightLabel) as string | undefined
        }
        badges={collectBadges(visualProps)}
        takeawayBadge={takeaway || undefined}
        stepLabels={visualProps.stepLabels as string[] | undefined}
      />

      <KaraokeSubtitles
        words={sceneWords}
        currentTime={t}
        fallbackText={caption}
      />

      {audioUrl ? <Audio src={audioUrl} /> : null}
    </AbsoluteFill>
  );
};
