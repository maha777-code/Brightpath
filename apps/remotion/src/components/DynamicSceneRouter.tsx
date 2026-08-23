import React, { useMemo } from 'react';
import { ThreeCanvas } from '@remotion/three';
import { GenericLabScene } from './GenericLabScene';
import { ParticleZoomScene } from './ParticleZoomScene';
import { SplitComparisonScene } from './SplitComparisonScene';
import { ProcessFlowScene } from './ProcessFlowScene';
import { BeakerSimulation } from './3D/BeakerSimulation';
import { ParticleZoomLattice } from './3D/ParticleZoomLattice';
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
 * Routes SweetRush visualType → modular Three.js apparatus / concept scenes.
 */
export const DynamicSceneRouter: React.FC<DynamicSceneProps> = ({
  visualType,
  animationType,
  parameters = {},
}) => {
  const type = String(visualType || '').toLowerCase();

  const content = useMemo(() => {
    if (type === '3d_beaker_experiment' || type === 'lab_simulation') {
      return <BeakerSimulation props={parameters} />;
    }
    if (type === 'dynamic_diagram') {
      return <GenericLabScene props={parameters} />;
    }
    if (type === 'comparison_split' || type === 'question_card') {
      return <SplitComparisonScene props={parameters} />;
    }
    if (type === '3d_particle_zoom' || type === 'particle_zoom' || type === 'macro_reveal') {
      return <ParticleZoomLattice props={parameters} />;
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
      camera={{ position: [0, 0.45, 6.5], fov: 40 }}
      gl={glOpts}
      onCreated={({ gl }) => {
        gl.setPixelRatio(1);
      }}
    >
      <color attach="background" args={['#070d18']} />
      <ambientLight intensity={0.62} />
      <directionalLight position={[4, 7, 3]} intensity={1.25} />
      <pointLight position={[-3, 2, 2]} intensity={0.7} color="#67e8f9" />
      <pointLight position={[2, -1, 3]} intensity={0.35} color="#fbbf24" />
      {content}
    </ThreeCanvas>
  );
};
