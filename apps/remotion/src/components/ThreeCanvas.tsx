import React, { useMemo } from 'react';
import { ThreeCanvas } from '@remotion/three';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import * as THREE from 'three';

type Params = {
  particleDensity?: string;
  temperature?: number;
  speedMultiplier?: number;
  showLabels?: string[];
};

function densityCount(d?: string) {
  if (d === 'high') return 90;
  if (d === 'low') return 35;
  return 60;
}

const Particles: React.FC<{
  count: number;
  speed: number;
  temp: number;
  animationType: string;
}> = ({ count, speed, temp, animationType }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  const points = useMemo(() => {
    const arr: THREE.Vector3[] = [];
    for (let i = 0; i < count; i++) {
      const seed = i * 1.7;
      arr.push(
        new THREE.Vector3(
          Math.sin(seed) * 2.2,
          Math.cos(seed * 1.3) * 1.4,
          Math.sin(seed * 0.7) * 1.8,
        ),
      );
    }
    return arr;
  }, [count]);

  return (
    <group>
      {points.map((base, i) => {
        const wobble =
          animationType === 'TemperatureEffect'
            ? Math.sin(t * speed * 3 + i) * (0.15 + temp / 200)
            : Math.sin(t * speed * 2 + i) * 0.12;
        const drift =
          animationType === 'ParticleMotion3D'
            ? Math.cos(t * speed + i * 0.2) * 0.25
            : Math.sin(t * 0.6 + i) * 0.08;
        return (
          <mesh
            key={i}
            position={[base.x + drift, base.y + wobble, base.z + Math.sin(t + i) * 0.1]}
          >
            <sphereGeometry args={[0.08 + (i % 5) * 0.01, 12, 12]} />
            <meshStandardMaterial
              color={temp > 45 ? '#fb7185' : '#38bdf8'}
              emissive={temp > 45 ? '#9f1239' : '#0e7490'}
              emissiveIntensity={0.35}
            />
          </mesh>
        );
      })}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -1.7, 0]}>
        <torusGeometry args={[2.4, 0.03, 12, 80]} />
        <meshStandardMaterial color="#334155" />
      </mesh>
    </group>
  );
};

export const ThreeCanvasStage: React.FC<{
  animationType: string;
  parameters: Params;
  timeSec: number;
}> = ({ animationType, parameters }) => {
  const count = densityCount(parameters.particleDensity);
  const speed = Number(parameters.speedMultiplier ?? 1.2);
  const temp = Number(parameters.temperature ?? 25);

  return (
    <ThreeCanvas
      width={1280}
      height={720}
      camera={{ position: [0, 0.6, 6.2], fov: 42 }}
      gl={{
        powerPreference: 'high-performance',
        failIfMajorPerformanceCaveat: false,
        preserveDrawingBuffer: true,
        antialias: true,
        alpha: false,
      }}
      onCreated={({ gl }) => {
        // Soften WebGL context loss on software ANGLE / SwiftShader
        gl.setPixelRatio(1);
        gl.domElement.addEventListener(
          'webglcontextlost',
          (e) => {
            e.preventDefault();
            console.warn('[ThreeCanvas] webglcontextlost — prevented default');
          },
          false,
        );
      }}
    >
      <color attach="background" args={['#0b1220']} />
      <ambientLight intensity={0.55} />
      <directionalLight position={[4, 6, 2]} intensity={1.1} />
      <pointLight position={[-3, 2, 2]} intensity={0.6} color="#67e8f9" />
      <Particles
        count={count}
        speed={speed}
        temp={temp}
        animationType={animationType}
      />
    </ThreeCanvas>
  );
};
