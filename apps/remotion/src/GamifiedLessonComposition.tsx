import React, { useMemo } from 'react';
import { AbsoluteFill, Audio, Sequence, useCurrentFrame, useVideoConfig } from 'remotion';
import { ThreeCanvasStage } from './components/ThreeCanvas';
import { KaraokeSubtitles } from './components/KaraokeSubtitles';
import { VectorOverlay } from './components/VectorOverlay';

export type SceneProp = {
  sceneId: number;
  duration: number;
  voiceoverText: string;
  animationType: string;
  parameters: {
    particleDensity?: string;
    temperature?: number;
    speedMultiplier?: number;
    showLabels?: string[];
  };
};

export type GamifiedLessonProps = {
  topicId: string;
  topicTitle: string;
  totalDurationSeconds: number;
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

  return (
    <AbsoluteFill style={{ backgroundColor: '#0b1220' }}>
      <AbsoluteFill>
        <ThreeCanvasStage
          animationType={active?.scene.animationType ?? 'ParticleMotion3D'}
          parameters={active?.scene.parameters ?? {}}
          timeSec={t}
        />
      </AbsoluteFill>

      <AbsoluteFill
        style={{
          background:
            'linear-gradient(180deg, rgba(2,6,23,0.55) 0%, transparent 28%, transparent 70%, rgba(2,6,23,0.75) 100%)',
        }}
      />

      <div
        style={{
          position: 'absolute',
          top: 28,
          left: 36,
          color: 'white',
          fontFamily: 'Inter, system-ui, sans-serif',
        }}
      >
        <div style={{ fontSize: 14, opacity: 0.75, fontWeight: 600, letterSpacing: 1 }}>
          EDUQUEST · AI VIDEO EXPLAINER
        </div>
        <div style={{ fontSize: 32, fontWeight: 800, marginTop: 4 }}>{topicTitle}</div>
      </div>

      <VectorOverlay
        labels={active?.scene.parameters.showLabels ?? []}
        temperature={Number(active?.scene.parameters.temperature ?? 25)}
        animationType={active?.scene.animationType ?? 'ParticleMotion3D'}
      />

      {scenes.map((scene, i) => {
        const startFrame = Math.round(
          sceneOffsets.slice(0, i).reduce((a, s) => a + s.scene.duration, 0) * fps,
        );
        const durationInFrames = Math.round(scene.duration * fps);
        return (
          <Sequence key={scene.sceneId} from={startFrame} durationInFrames={durationInFrames}>
            <AbsoluteFill />
          </Sequence>
        );
      })}

      <KaraokeSubtitles words={wordTimings} currentTime={t} />

      {audioUrl ? <Audio src={audioUrl} /> : null}

      <div
        style={{
          position: 'absolute',
          bottom: 18,
          right: 28,
          color: 'rgba(255,255,255,0.55)',
          fontSize: 12,
          fontFamily: 'monospace',
        }}
      >
        {t.toFixed(1)}s / {totalDurationSeconds}s
      </div>
    </AbsoluteFill>
  );
};
