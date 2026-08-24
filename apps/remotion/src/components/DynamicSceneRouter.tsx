import React, { useMemo } from 'react';
import { useCurrentFrame } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import { DynamicSplitComparison } from './3D/DynamicSplitComparison';
import { DynamicInteractiveStage } from './3D/DynamicInteractiveStage';
import { DynamicMicroZoom } from './3D/DynamicMicroZoom';
import { DynamicConceptCard } from './3D/DynamicConceptCard';
import { canonicalVisualArchetype } from '../scriptScene';

export type DynamicSceneProps = {
  visualType?: string;
  visualArchetype?: string;
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

/** Routes visualArchetype (or legacy visualType) → generic 3D primitives. */
export const DynamicSceneRouter: React.FC<DynamicSceneProps> = ({
  visualType,
  visualArchetype,
  parameters = {},
}) => {
  const frame = useCurrentFrame();
  const arch = canonicalVisualArchetype(visualArchetype || visualType, 1);

  const content = useMemo(() => {
    if (arch === 'split_comparison') {
      return <DynamicSplitComparison config={parameters as never} frame={frame} />;
    }
    if (arch === 'micro_zoom') {
      return <DynamicMicroZoom config={parameters as never} frame={frame} />;
    }
    if (arch === 'concept_card') {
      return <DynamicConceptCard config={parameters as never} frame={frame} />;
    }
    return <DynamicInteractiveStage config={parameters as never} frame={frame} />;
  }, [arch, parameters, frame]);

  return (
    <ThreeCanvas
      key={arch}
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
