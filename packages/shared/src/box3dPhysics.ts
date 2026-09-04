import type { GenerationTemplateId } from './generationTemplates.js';
import { isGenerationTemplateId, DEFAULT_GENERATION_TEMPLATE_ID } from './generationTemplates.js';

export type Vec3 = [number, number, number];

export interface PhysicsTargetSpec {
  id: string;
  position: Vec3;
  mass: number;
  isCorrect: boolean;
  /** Half-extents of the rigid body AABB (meters). */
  size?: Vec3;
  restitution?: number;
}

export interface PhysicsWorldSpec {
  gravity: Vec3;
  /** Player / projectile spawn. */
  playerSpawn?: Vec3;
  /** World bounds half-size; bodies bounce or clamp at edges. */
  bounds?: Vec3;
  /** Restitution (bounciness) for default dynamic bodies. */
  restitution?: number;
  /** Linear damping (0–1). */
  damping?: number;
  targets: PhysicsTargetSpec[];
  /** Optional static obstacle AABBs (traps, walls, anvils). */
  obstacles?: Array<{
    id: string;
    position: Vec3;
    size: Vec3;
    kind?: 'trap' | 'anvil' | 'wall' | 'asteroid' | 'candy' | 'platform';
  }>;
  /** Template-specific flavor tags consumed by renderers. */
  environment?: 'space' | 'earth' | 'bouncy' | 'noir';
}

export interface PhysicsBodyState {
  id: string;
  position: Vec3;
  velocity: Vec3;
  size: Vec3;
  mass: number;
  restitution: number;
  isStatic: boolean;
  isPlayer: boolean;
  isOptionTarget: boolean;
  optionId?: string;
  isCorrect?: boolean;
  kind?: string;
}

export interface PhysicsContactEvent {
  bodyA: PhysicsBodyState;
  bodyB: PhysicsBodyState;
}

export type PhysicsContactHandler = (bodyA: PhysicsBodyState, bodyB: PhysicsBodyState) => void;

/** Per-template default worlds used when LLM omits physicsWorld. */
export const PHYSICS_PRESETS: Record<GenerationTemplateId, Omit<PhysicsWorldSpec, 'targets'>> = {
  tom_and_jerry: {
    gravity: [0, -9.8, 0],
    playerSpawn: [0, 0.5, 0],
    bounds: [8, 6, 4],
    restitution: 0.25,
    damping: 0.08,
    environment: 'earth',
    obstacles: [
      { id: 'anvil', position: [0, 4.5, 0], size: [0.6, 0.5, 0.6], kind: 'anvil' },
      { id: 'trap_left', position: [-3, 1.2, 0], size: [0.4, 1.2, 0.4], kind: 'trap' },
      { id: 'trap_right', position: [3, 1.2, 0], size: [0.4, 1.2, 0.4], kind: 'trap' },
    ],
  },
  space_shooter: {
    gravity: [0, -0.15, 0],
    playerSpawn: [0, -2.5, 0],
    bounds: [9, 6, 4],
    restitution: 0.55,
    damping: 0.02,
    environment: 'space',
    obstacles: [
      { id: 'asteroid_1', position: [-2.5, 1.5, 0], size: [0.7, 0.7, 0.7], kind: 'asteroid' },
      { id: 'asteroid_2', position: [2.2, 2.2, 0], size: [0.55, 0.55, 0.55], kind: 'asteroid' },
    ],
  },
  detective_mystery: {
    gravity: [0, -9.8, 0],
    playerSpawn: [0, 0.4, 0],
    bounds: [7, 5, 3],
    restitution: 0.15,
    damping: 0.12,
    environment: 'noir',
    obstacles: [
      { id: 'desk', position: [0, -0.2, -1], size: [3, 0.4, 1], kind: 'platform' },
    ],
  },
  sweetrush_quest: {
    gravity: [0, -6.2, 0],
    playerSpawn: [0, 0.6, 0],
    bounds: [8, 6, 4],
    restitution: 0.85,
    damping: 0.04,
    environment: 'bouncy',
    obstacles: [
      { id: 'candy_pad', position: [0, -0.3, 0], size: [4, 0.35, 2], kind: 'candy' },
      { id: 'fruit_left', position: [-2.5, 1.8, 0], size: [0.5, 0.5, 0.5], kind: 'candy' },
      { id: 'fruit_right', position: [2.5, 1.8, 0], size: [0.5, 0.5, 0.5], kind: 'candy' },
    ],
  },
};

const OPTION_LANES: Vec3[] = [
  [-3.2, 1.2, 0],
  [-1.05, 1.2, 0],
  [1.05, 1.2, 0],
  [3.2, 1.2, 0],
];

export function defaultTargetsForOptions(
  options: Array<{ id: string; correct?: boolean }>,
  templateId?: string | null,
): PhysicsTargetSpec[] {
  const tid = isGenerationTemplateId(templateId) ? templateId : DEFAULT_GENERATION_TEMPLATE_ID;
  const mass = tid === 'sweetrush_quest' ? 2.5 : tid === 'space_shooter' ? 3.5 : 5;
  const size: Vec3 = tid === 'space_shooter' ? [0.7, 0.7, 0.7] : [0.85, 0.85, 0.55];
  return options.slice(0, 4).map((opt, i) => ({
    id: opt.id || String.fromCharCode(65 + i),
    position: OPTION_LANES[i] ?? ([i * 2 - 3, 1.2, 0] as Vec3),
    mass,
    isCorrect: Boolean(opt.correct),
    size,
    restitution: PHYSICS_PRESETS[tid].restitution,
  }));
}

export function buildPhysicsWorldForTemplate(
  templateId: string | null | undefined,
  options: Array<{ id: string; correct?: boolean }>,
  override?: Partial<PhysicsWorldSpec> | null,
): PhysicsWorldSpec {
  const tid = isGenerationTemplateId(templateId) ? templateId : DEFAULT_GENERATION_TEMPLATE_ID;
  const preset = PHYSICS_PRESETS[tid];
  const targets =
    override?.targets && override.targets.length > 0
      ? override.targets
      : defaultTargetsForOptions(options, tid);
  return {
    ...preset,
    ...override,
    gravity: override?.gravity ?? preset.gravity,
    targets,
    obstacles: override?.obstacles ?? preset.obstacles,
    environment: override?.environment ?? preset.environment,
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asVec3(value: unknown, fallback: Vec3): Vec3 {
  if (!Array.isArray(value) || value.length < 2) return fallback;
  const x = Number(value[0]);
  const y = Number(value[1]);
  const z = Number(value[2] ?? 0);
  if (![x, y, z].every(Number.isFinite)) return fallback;
  return [x, y, z];
}

export function parsePhysicsWorld(
  raw: unknown,
  templateId?: string | null,
  options: Array<{ id: string; correct?: boolean }> = [],
): PhysicsWorldSpec {
  const tid = isGenerationTemplateId(templateId) ? templateId : DEFAULT_GENERATION_TEMPLATE_ID;
  const preset = PHYSICS_PRESETS[tid];
  const rec = asRecord(raw);
  if (!rec) return buildPhysicsWorldForTemplate(tid, options);

  const targetsRaw = Array.isArray(rec.targets) ? rec.targets : [];
  const targets: PhysicsTargetSpec[] = [];
  for (let i = 0; i < targetsRaw.length; i++) {
    const r = asRecord(targetsRaw[i]);
    if (!r) continue;
    const id = typeof r.id === 'string' && r.id.trim() ? r.id.trim() : String.fromCharCode(65 + i);
    targets.push({
      id,
      position: asVec3(r.position, OPTION_LANES[i] ?? [0, 1, 0]),
      mass: Number.isFinite(Number(r.mass)) ? Number(r.mass) : 5,
      isCorrect: Boolean(r.isCorrect ?? r.correct),
      size: asVec3(r.size, [0.85, 0.85, 0.55]),
      restitution: Number.isFinite(Number(r.restitution))
        ? Number(r.restitution)
        : preset.restitution,
    });
  }

  return buildPhysicsWorldForTemplate(tid, options, {
    gravity: asVec3(rec.gravity, preset.gravity),
    playerSpawn: asVec3(rec.playerSpawn, preset.playerSpawn ?? [0, 0.5, 0]),
    bounds: asVec3(rec.bounds, preset.bounds ?? [8, 6, 4]),
    restitution: Number.isFinite(Number(rec.restitution))
      ? Number(rec.restitution)
      : preset.restitution,
    damping: Number.isFinite(Number(rec.damping)) ? Number(rec.damping) : preset.damping,
    targets: targets.length > 0 ? targets : undefined,
    environment: preset.environment,
  });
}

export function extractPhysicsWorldFromContent(
  content: unknown,
  templateId?: string | null,
  options: Array<{ id: string; correct?: boolean }> = [],
): PhysicsWorldSpec {
  const rec = asRecord(content);
  if (rec?.physicsWorld) return parsePhysicsWorld(rec.physicsWorld, templateId, options);
  return buildPhysicsWorldForTemplate(templateId, options);
}

/**
 * Deterministic Box3D-compatible rigid-body world.
 * Fixed-timestep Euler + AABB contacts — identical results for live play and Remotion.
 */
export class Box3DWorld {
  gravity: Vec3;
  bounds: Vec3;
  damping: number;
  private bodies = new Map<string, PhysicsBodyState>();
  private contactHandlers: PhysicsContactHandler[] = [];
  private activeContacts = new Set<string>();
  private impulseQueue: Array<{ id: string; impulse: Vec3 }> = [];

  constructor(spec: PhysicsWorldSpec) {
    this.gravity = [...spec.gravity] as Vec3;
    this.bounds = [...(spec.bounds ?? [8, 6, 4])] as Vec3;
    this.damping = spec.damping ?? 0.05;

    const spawn = spec.playerSpawn ?? ([0, 0.5, 0] as Vec3);
    this.addBody({
      id: 'player',
      position: [...spawn] as Vec3,
      velocity: [0, 0, 0],
      size: [0.45, 0.45, 0.45],
      mass: 1,
      restitution: spec.restitution ?? 0.3,
      isStatic: false,
      isPlayer: true,
      isOptionTarget: false,
      kind: 'player',
    });

    for (const t of spec.targets) {
      this.addBody({
        id: `target_${t.id}`,
        position: [...t.position] as Vec3,
        velocity: [0, 0, 0],
        size: [...(t.size ?? [0.85, 0.85, 0.55])] as Vec3,
        mass: Math.max(0.1, t.mass),
        restitution: t.restitution ?? spec.restitution ?? 0.3,
        isStatic: true,
        isPlayer: false,
        isOptionTarget: true,
        optionId: t.id,
        isCorrect: t.isCorrect,
        kind: 'option',
      });
    }

    for (const o of spec.obstacles ?? []) {
      this.addBody({
        id: o.id,
        position: [...o.position] as Vec3,
        velocity: [0, 0, 0],
        size: [...o.size] as Vec3,
        mass: 0,
        restitution: 0.2,
        isStatic: true,
        isPlayer: false,
        isOptionTarget: false,
        kind: o.kind ?? 'obstacle',
      });
    }
  }

  on(event: 'contact-start', handler: PhysicsContactHandler): () => void {
    if (event !== 'contact-start') return () => undefined;
    this.contactHandlers.push(handler);
    return () => {
      this.contactHandlers = this.contactHandlers.filter((h) => h !== handler);
    };
  }

  addBody(body: PhysicsBodyState): void {
    this.bodies.set(body.id, {
      ...body,
      position: [...body.position] as Vec3,
      velocity: [...body.velocity] as Vec3,
      size: [...body.size] as Vec3,
    });
  }

  getBody(id: string): PhysicsBodyState | undefined {
    const b = this.bodies.get(id);
    return b ? { ...b, position: [...b.position] as Vec3, velocity: [...b.velocity] as Vec3 } : undefined;
  }

  getBodies(): PhysicsBodyState[] {
    return [...this.bodies.values()].map((b) => ({
      ...b,
      position: [...b.position] as Vec3,
      velocity: [...b.velocity] as Vec3,
    }));
  }

  applyImpulse(id: string, impulse: Vec3): void {
    this.impulseQueue.push({ id, impulse: [...impulse] as Vec3 });
  }

  /** Aim player toward a world-space point (used by click-to-launch answers). */
  launchPlayerToward(target: Vec3, speed = 14): void {
    const player = this.bodies.get('player');
    if (!player || player.isStatic) return;
    const dx = target[0] - player.position[0];
    const dy = target[1] - player.position[1];
    const dz = target[2] - player.position[2];
    const len = Math.hypot(dx, dy, dz) || 1;
    player.velocity = [(dx / len) * speed, (dy / len) * speed, (dz / len) * speed];
  }

  resetPlayer(spawn?: Vec3): void {
    const player = this.bodies.get('player');
    if (!player) return;
    player.position = [...(spawn ?? [0, 0.5, 0])] as Vec3;
    player.velocity = [0, 0, 0];
    this.activeContacts.clear();
  }

  /**
   * Advance simulation by `dt` seconds. Call with `1 / fps` from Remotion for
   * frame-perfect parity with live previews.
   */
  step(dt: number): void {
    const clampedDt = Math.min(Math.max(dt, 0), 1 / 20);

    while (this.impulseQueue.length) {
      const item = this.impulseQueue.shift()!;
      const body = this.bodies.get(item.id);
      if (!body || body.isStatic) continue;
      const inv = 1 / Math.max(body.mass, 0.001);
      body.velocity[0] += item.impulse[0] * inv;
      body.velocity[1] += item.impulse[1] * inv;
      body.velocity[2] += item.impulse[2] * inv;
    }

    for (const body of this.bodies.values()) {
      if (body.isStatic) continue;
      body.velocity[0] += this.gravity[0] * clampedDt;
      body.velocity[1] += this.gravity[1] * clampedDt;
      body.velocity[2] += this.gravity[2] * clampedDt;
      const damp = Math.max(0, 1 - this.damping);
      body.velocity[0] *= damp;
      body.velocity[1] *= damp;
      body.velocity[2] *= damp;
      body.position[0] += body.velocity[0] * clampedDt;
      body.position[1] += body.velocity[1] * clampedDt;
      body.position[2] += body.velocity[2] * clampedDt;
      this.clampToBounds(body);
    }

    this.resolveContacts();
  }

  private clampToBounds(body: PhysicsBodyState): void {
    const [bx, by, bz] = this.bounds;
    for (let axis = 0; axis < 3; axis++) {
      const limit = axis === 0 ? bx : axis === 1 ? by : bz;
      const half = body.size[axis] / 2;
      const min = -limit + half;
      const max = limit - half;
      if (body.position[axis] < min) {
        body.position[axis] = min;
        body.velocity[axis] = Math.abs(body.velocity[axis]) * body.restitution;
      } else if (body.position[axis] > max) {
        body.position[axis] = max;
        body.velocity[axis] = -Math.abs(body.velocity[axis]) * body.restitution;
      }
    }
    // Floor at y = -bounds
    const floor = -by + body.size[1] / 2;
    if (body.position[1] < floor) {
      body.position[1] = floor;
      body.velocity[1] = Math.abs(body.velocity[1]) * body.restitution;
    }
  }

  private aabbOverlap(a: PhysicsBodyState, b: PhysicsBodyState): boolean {
    return (
      Math.abs(a.position[0] - b.position[0]) < (a.size[0] + b.size[0]) / 2 &&
      Math.abs(a.position[1] - b.position[1]) < (a.size[1] + b.size[1]) / 2 &&
      Math.abs(a.position[2] - b.position[2]) < (a.size[2] + b.size[2]) / 2
    );
  }

  private contactKey(a: string, b: string): string {
    return a < b ? `${a}|${b}` : `${b}|${a}`;
  }

  private resolveContacts(): void {
    const list = [...this.bodies.values()];
    const seen = new Set<string>();

    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i];
        const b = list[j];
        if (!this.aabbOverlap(a, b)) continue;
        const key = this.contactKey(a.id, b.id);
        seen.add(key);
        if (!this.activeContacts.has(key)) {
          this.activeContacts.add(key);
          for (const handler of this.contactHandlers) {
            handler(
              { ...a, position: [...a.position] as Vec3, velocity: [...a.velocity] as Vec3 },
              { ...b, position: [...b.position] as Vec3, velocity: [...b.velocity] as Vec3 },
            );
          }
        }

        // Simple separation for dynamic vs static
        if (!a.isStatic && b.isStatic) {
          a.velocity[0] *= -a.restitution * 0.4;
          a.velocity[1] = Math.abs(a.velocity[1]) * a.restitution * 0.5;
        } else if (a.isStatic && !b.isStatic) {
          b.velocity[0] *= -b.restitution * 0.4;
          b.velocity[1] = Math.abs(b.velocity[1]) * b.restitution * 0.5;
        }
      }
    }

    for (const key of [...this.activeContacts]) {
      if (!seen.has(key)) this.activeContacts.delete(key);
    }
  }
}
