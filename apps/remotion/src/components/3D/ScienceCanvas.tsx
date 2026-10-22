import React, { useLayoutEffect, useRef } from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import * as THREE from 'three';
import type { LessonMatterState, LessonVisualKind } from '@brightpath/shared';
import { isHeated, lattice, particleColor, particlePose } from './scienceMath';

export type ScienceCanvasProps = {
  visualKind: LessonVisualKind;
  matterState?: LessonMatterState;
  progress01: number;
  objectLabel?: string;
  leftVisual?: string;
  rightVisual?: string;
  steps?: string[];
  primaryColor?: string;
};

type Handle = {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  root: THREE.Group;
  particles: THREE.Mesh[];
  ice: THREE.Mesh[];
  steam: THREE.Mesh[];
  flames: THREE.Mesh[];
  liquid: THREE.Mesh | null;
  heatLight: THREE.PointLight;
  processOrbs: THREE.Mesh[];
};

function makeMat(color: string, extra: THREE.MeshStandardMaterialParameters = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.32, metalness: 0.08, ...extra });
}

function addBeaker(group: THREE.Group) {
  const wall = new THREE.Mesh(
    new THREE.CylinderGeometry(1.05, 1.14, 2.2, 40, 1, true),
    makeMat('#dbeafe', { transparent: true, opacity: 0.2, side: THREE.DoubleSide, roughness: 0.1 }),
  );
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(1.06, 0.045, 10, 36),
    makeMat('#cbd5e1', { metalness: 0.25 }),
  );
  rim.position.y = 1.1;
  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.16, 1.2, 0.1, 36), makeMat('#94a3b8', { roughness: 0.45 }));
  base.position.y = -1.12;
  const liquid = new THREE.Mesh(
    new THREE.CylinderGeometry(0.96, 1.02, 1, 36),
    makeMat('#3aa0ff', { transparent: true, opacity: 0.46, roughness: 0.16 }),
  );
  group.add(wall, rim, base, liquid);
  return liquid;
}

function addParticles(group: THREE.Group, count: number, scale = 1) {
  const meshes: THREE.Mesh[] = [];
  const geo = new THREE.SphereGeometry(0.11 * scale, 12, 12);
  for (let i = 0; i < count; i++) {
    const mesh = new THREE.Mesh(geo, makeMat('#2b9bff', { emissive: '#2b9bff', emissiveIntensity: 0.22 }));
    group.add(mesh);
    meshes.push(mesh);
  }
  return meshes;
}

function addIce(group: THREE.Group) {
  return [
    [-0.28, 0.18],
    [0.22, -0.12],
    [0.02, 0.32],
  ].map(([x, z], i) => {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.28, 0.36),
      makeMat('#e0f2fe', { transparent: true, opacity: 0.82, roughness: 0.18 }),
    );
    mesh.position.set(x, 0.2, z);
    mesh.rotation.set(0.2 * i, 0.4 * i, 0.1);
    group.add(mesh);
    return mesh;
  });
}

function addSteam(group: THREE.Group) {
  return Array.from({ length: 10 }, () => {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 10, 10),
      makeMat('#f8fafc', { transparent: true, opacity: 0.28 }),
    );
    group.add(mesh);
    return mesh;
  });
}

function addFlames(group: THREE.Group) {
  const burner = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 0.28, 16), makeMat('#334155', { roughness: 0.6 }));
  burner.position.y = -1.55;
  group.add(burner);
  return [0, 1, 2].map((i) => {
    const mesh = new THREE.Mesh(
      new THREE.ConeGeometry(0.1, 0.32, 8),
      makeMat('#fb923c', { emissive: '#ea580c', emissiveIntensity: 1.1, transparent: true, opacity: 0.85 }),
    );
    mesh.position.set(Math.sin((i / 3) * Math.PI * 2) * 0.12, -1.25, Math.cos((i / 3) * Math.PI * 2) * 0.12);
    group.add(mesh);
    return mesh;
  });
}

function addProcess(group: THREE.Group) {
  const orbs: THREE.Mesh[] = [];
  for (let i = 0; i < 3; i++) {
    const x = (i - 1) * 2.35;
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.12, 24), makeMat('#38bdf8'));
    pad.position.set(x, -0.85, 0);
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.48, 22, 22), makeMat('#38bdf8', { emissive: '#38bdf8', emissiveIntensity: 0.25 }));
    orb.position.set(x, 0.05, 0);
    group.add(pad, orb);
    orbs.push(orb, pad);
    if (i < 2) {
      const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.36, 8), makeMat('#64748b'));
      arrow.position.set(x + 1.18, -0.15, 0);
      arrow.rotation.z = -Math.PI / 2;
      group.add(arrow);
    }
  }
  return orbs;
}

function addObject(group: THREE.Group, cube: boolean, color: string) {
  const mesh = new THREE.Mesh(
    cube ? new THREE.BoxGeometry(1.7, 1.7, 1.7) : new THREE.SphereGeometry(1.15, 36, 36),
    makeMat(color, { metalness: 0.12 }),
  );
  group.add(mesh);
  for (let i = 0; i < 8; i++) {
    const sat = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 10), makeMat('#f8fafc'));
    sat.userData.index = i;
    group.add(sat);
  }
  return mesh;
}

function addDiagram(group: THREE.Group, color: string) {
  return [0, 1, 2].map((i) => {
    const card = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.15, 0.08), makeMat(color));
    card.position.set((i - 1) * 2.2, 0.1, 0);
    card.rotation.set(-0.12, 0.18 * (i - 1), 0);
    group.add(card);
    return card;
  });
}

function inferCompareState(raw: string | undefined, fallback: LessonMatterState): LessonMatterState {
  const v = String(raw ?? '').toLowerCase();
  if (v.includes('gas')) return 'gas';
  if (v.includes('liquid')) return 'liquid';
  if (v.includes('solid')) return 'solid';
  return fallback;
}

export const ScienceCanvas: React.FC<ScienceCanvasProps> = ({
  visualKind,
  matterState = 'solid',
  progress01,
  objectLabel,
  leftVisual,
  rightVisual,
  primaryColor = '#38bdf8',
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handle = useRef<Handle | null>(null);
  const kindRef = useRef(visualKind);
  const t = frame / fps;

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rebuild = !handle.current || kindRef.current !== visualKind;
    kindRef.current = visualKind;

    if (rebuild) {
      handle.current?.renderer.dispose();
      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, preserveDrawingBuffer: true });
      renderer.setPixelRatio(1);
      renderer.setSize(width, height, false);
      renderer.setClearColor('#c9d9e8', 1);
      const scene = new THREE.Scene();
      scene.background = new THREE.Color('#c9d9e8');
      const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 40);
      camera.position.set(2.15, 1.55, 6.35);
      camera.lookAt(0, 0.1, 0);
      scene.add(new THREE.AmbientLight(0xffffff, 0.92));
      const key = new THREE.DirectionalLight(0xfff7ed, 1.35);
      key.position.set(5, 8, 4);
      scene.add(key);
      const fill = new THREE.DirectionalLight(0x93c5fd, 0.45);
      fill.position.set(-4, 2, 3);
      scene.add(fill);
      const floor = new THREE.Mesh(new THREE.CircleGeometry(8, 48), makeMat('#e8eef5'));
      floor.rotation.x = -Math.PI / 2;
      floor.position.y = -1.85;
      scene.add(floor);

      const root = new THREE.Group();
      scene.add(root);
      const heatLight = new THREE.PointLight(0xfb923c, 0, 5);
      heatLight.position.set(0, -1.15, 0);
      root.add(heatLight);

      const particles: THREE.Mesh[] = [];
      const ice: THREE.Mesh[] = [];
      const steam: THREE.Mesh[] = [];
      const flames: THREE.Mesh[] = [];
      const processOrbs: THREE.Mesh[] = [];
      let liquid: THREE.Mesh | null = null;

      if (visualKind === 'particles' || visualKind === 'beaker') {
        liquid = addBeaker(root);
        particles.push(...addParticles(root, 36, visualKind === 'beaker' ? 0.82 : 1));
        ice.push(...addIce(root));
        steam.push(...addSteam(root));
        flames.push(...addFlames(root));
      } else if (visualKind === 'compare') {
        const left = new THREE.Group();
        left.position.x = -1.7;
        left.scale.setScalar(0.78);
        const right = new THREE.Group();
        right.position.x = 1.7;
        right.scale.setScalar(0.78);
        liquid = addBeaker(left);
        addBeaker(right);
        particles.push(...addParticles(left, 36, 0.9), ...addParticles(right, 36, 0.9));
        ice.push(...addIce(left));
        steam.push(...addSteam(right));
        root.add(left, right);
      } else if (visualKind === 'process') {
        processOrbs.push(...addProcess(root));
      } else if (visualKind === 'diagram') {
        processOrbs.push(...addDiagram(root, primaryColor));
      } else {
        const token = String(objectLabel ?? '').toLowerCase();
        addObject(root, token.includes('box') || token.includes('cube') || token.includes('solid'), primaryColor);
      }

      handle.current = { renderer, scene, camera, root, particles, ice, steam, flames, liquid, heatLight, processOrbs };
    }

    const h = handle.current;
    if (!h) return;
    h.renderer.setSize(width, height, false);
    h.camera.aspect = width / height;
    h.camera.updateProjectionMatrix();
    h.root.rotation.y = t * 0.12;
    h.root.rotation.x = 0.08;

    const bases = lattice(4, 3, 3);
    const color = particleColor(matterState, progress01);
    const heat = isHeated(matterState) ? 0.55 + progress01 * 0.45 : visualKind === 'beaker' ? 0.35 : 0;
    h.heatLight.intensity = 2.2 * heat;

    if (visualKind === 'compare') {
      const leftState = inferCompareState(leftVisual, 'solid');
      const rightState = inferCompareState(rightVisual, 'liquid');
      h.particles.forEach((mesh, i) => {
        const side = i < 36 ? leftState : rightState;
        const p = particlePose(i % 36, bases[i % 36], side, progress01, t);
        mesh.position.set(p.x, p.y, p.z);
        (mesh.material as THREE.MeshStandardMaterial).color.set(particleColor(side, progress01));
      });
    } else {
      h.particles.forEach((mesh, i) => {
        const p = particlePose(i, bases[i] ?? bases[0], matterState, progress01, t);
        const scale = visualKind === 'beaker' ? 0.82 : 1;
        mesh.position.set(p.x * scale, p.y * scale + 0.05, p.z * scale);
        const mat = mesh.material as THREE.MeshStandardMaterial;
        mat.color.set(color);
        mat.emissive.set(color);
      });
    }

    const fill =
      matterState === 'gas'
        ? 0.08
        : matterState === 'evaporating'
          ? 0.55 - progress01 * 0.28
          : matterState === 'solid'
            ? 0.22
            : 0.52;
    if (h.liquid) {
      const waterH = Math.max(0.12, fill * 1.35);
      h.liquid.scale.y = waterH;
      h.liquid.position.y = -0.72 + waterH / 2;
      (h.liquid.material as THREE.MeshStandardMaterial).color.set(color);
    }

    const iceAmt = matterState === 'solid' ? 1 : matterState === 'melting' ? 1 - progress01 : 0;
    h.ice.forEach((mesh, i) => {
      mesh.visible = iceAmt > 0.05;
      mesh.scale.setScalar(0.55 * iceAmt);
      mesh.position.y = 0.05 + 0.18 * iceAmt + (i % 2) * 0.04;
    });

    const steamAmt =
      matterState === 'evaporating' ? progress01 : matterState === 'gas' ? 0.85 : matterState === 'heating' ? 0.35 : 0;
    h.steam.forEach((mesh, i) => {
      const rise = ((t * 0.35 + i * 0.11) % 1) * Math.max(steamAmt, 0.001);
      mesh.visible = steamAmt > 0.05;
      mesh.position.set(Math.sin(i * 1.7) * 0.35, 0.35 + rise * 1.4, Math.cos(i * 1.3) * 0.3);
      mesh.scale.setScalar(0.18 + rise * 0.28);
      (mesh.material as THREE.MeshStandardMaterial).opacity = 0.28 * (1 - rise);
    });

    const flicker = 0.85 + Math.sin(t * 14) * 0.15;
    h.flames.forEach((mesh) => {
      mesh.visible = heat > 0.05;
      mesh.scale.set(0.7, 0.9 + flicker * 0.3, 0.7);
    });

    h.processOrbs.forEach((mesh, i) => {
      const on = progress01 * 3 > Math.floor(i / 2);
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.color.set(on ? primaryColor : '#cbd5e1');
      mat.emissiveIntensity = on ? 0.25 : 0.04;
    });

    h.root.children.forEach((child) => {
      if (child instanceof THREE.Mesh && child.userData.index != null) {
        const i = Number(child.userData.index);
        child.position.set(
          Math.cos((i / 8) * Math.PI * 2 + t) * 1.85,
          Math.sin(t * 0.8 + i) * 0.35,
          Math.sin((i / 8) * Math.PI * 2 + t) * 1.85,
        );
      }
    });

    h.renderer.render(h.scene, h.camera);
  }, [frame, fps, width, height, visualKind, matterState, progress01, objectLabel, leftVisual, rightVisual, primaryColor, t]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{ width: '100%', height: '100%', display: 'block' }}
    />
  );
};
