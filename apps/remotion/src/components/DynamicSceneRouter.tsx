import React, { useMemo } from 'react';
import { ThreeCanvas } from '@remotion/three';
import { GenericLabScene } from './GenericLabScene';
import { ParticleZoomScene } from './ParticleZoomScene';
import { SplitComparisonScene } from './SplitComparisonScene';
import { ProcessFlowScene } from './ProcessFlowScene';
import { ThreeCanvasStage } from './ThreeCanvas';

export type DynamicSceneProps = {
  visualType?: string;
  animationType?: string;
  parameters?: Record<string, unknown>;
  timeSec?: number;
};

const glOpts = {
  powerPreference: 'high-performance' as const,
  failIfMajorPerformanceCaveat: false,
  preserveDrawingBuffer: true,
  antialias: true,
  alpha: false,
};

/**
 * Routes pedagogical visualType → modular Three.js scene.
 * Falls back to legacy ThreeCanvasStage for unknown / legacy animationType.
 */
export const DynamicSceneRouter: React.FC<DynamicSceneProps> = ({
  visualType,
  animationType,
  parameters = {},
}) => {
  const type = String(visualType || '').toLowerCase();

  const content = useMemo(() => {
    if (type === 'lab_simulation' || type === 'dynamic_diagram') {
      return <GenericLabScene props={parameters} />;
    }
    if (type === 'comparison_split' || type === 'question_card') {
      return <SplitComparisonScene props={parameters} />;
    }
    if (type === 'particle_zoom' || type === 'macro_reveal') {
      return <ParticleZoomScene props={parameters} />;
    }
    if (type === 'flow_step') {
      return <ProcessFlowScene props={parameters} />;
    }
    if (type === 'callout_summary' || type === 'concept_hero') {
      return <ParticleZoomScene props={parameters} />;
    }
    return null;
  }, [type, parameters]);

  if (!content) {
    return (
      <ThreeCanvasStage
        animationType={animationType ?? 'ParticleMotion3D'}
        parameters={parameters}
        timeSec={0}
      />
    );
  }

  return (
    <ThreeCanvas
      width={1280}
      height={720}
      camera={{ position: [0, 0.4, 6.4], fov: 42 }}
      gl={glOpts}
      onCreated={({ gl }) => {
        gl.setPixelRatio(1);
      }}
    >
      <color attach="background" args={['#0b1220']} />
      <ambientLight intensity={0.55} />
      <directionalLight position={[4, 6, 2]} intensity={1.15} />
      <pointLight position={[-3, 2, 2]} intensity={0.55} color="#67e8f9" />
      {content}
    </ThreeCanvas>
  );
};
