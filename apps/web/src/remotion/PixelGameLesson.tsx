import type { GameplayHudStats, GameplayVisual } from '@brightpath/shared';

export interface PixelGameLessonProps {
  frame: number;
  fps: number;
  topicTitle: string;
  level?: string;
  gameplay?: GameplayVisual;
  sfxTrigger?: string;
  progress01?: number;
}

const FONT = '"Courier New", "Lucida Console", ui-monospace, monospace';

/** Frame-driven 2D pixel HUD (web preview twin of apps/remotion pixel quest). */
export default function PixelGameLesson({
  topicTitle,
  level = 'Level 1: The Manual Era',
  gameplay,
  progress01 = 0,
}: PixelGameLessonProps) {
  const terminal = gameplay?.code_terminal_overlay ?? 'move_right(); // compiling';
  const hud: GameplayHudStats = gameplay?.hud_stats ?? { cpu_usage: '12%', exp: 100, mana: '80/100' };
  const action = gameplay?.character_action ?? 'running_into_wall';
  const run = 80 + progress01 * (action.includes('wall') ? 280 : 620);

  return (
    <div
      style={{
        position: 'relative',
        width: 1280,
        height: 720,
        overflow: 'hidden',
        background: 'linear-gradient(180deg,#0b1020,#1a0a2e)',
        fontFamily: FONT,
        color: '#e2e8f0',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'linear-gradient(rgba(56,189,248,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(56,189,248,0.08) 1px, transparent 1px)',
          backgroundSize: 32,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: 16,
          transform: 'translateX(-50%)',
          padding: '8px 16px',
          border: '3px solid #22d3ee',
          background: '#041016',
          color: '#fef08a',
        }}
      >
        {level}
      </div>
      <div style={{ position: 'absolute', left: 18, top: 18, padding: 8, border: '3px solid #64748b', background: '#041016' }}>
        QUEST: {topicTitle}
      </div>
      <div
        style={{
          position: 'absolute',
          left: run,
          top: 380,
          width: 36,
          height: 48,
          background: '#fde68a',
          boxShadow: 'inset 8px 6px 0 #0f172a',
        }}
      />
      <pre
        style={{
          position: 'absolute',
          left: 18,
          bottom: 24,
          width: 430,
          height: 150,
          margin: 0,
          padding: 12,
          background: '#07140c',
          border: '3px solid #22c55e',
          color: '#86efac',
          whiteSpace: 'pre-wrap',
        }}
      >
        {terminal}
      </pre>
      <div
        style={{
          position: 'absolute',
          right: 18,
          bottom: 24,
          width: 230,
          padding: 12,
          background: '#041016',
          border: '3px solid #22d3ee',
          fontSize: 12,
        }}
      >
        CPU {hud.cpu_usage}
        <br />
        MANA {hud.mana}
        <br />
        EXP {hud.exp}
      </div>
    </div>
  );
}
