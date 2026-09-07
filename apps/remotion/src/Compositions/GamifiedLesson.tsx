import React, { useMemo, useRef } from 'react';
import { AbsoluteFill, Audio, Img, useCurrentFrame, useVideoConfig } from 'remotion';
import { PixelPlayfield } from '../components/pixel/PixelPlayfield';
import { RetroGameHUD } from '../components/pixel/RetroGameHUD';
import { PixelSfxLayer } from '../components/pixel/PixelSfxLayer';
import { KaraokeSubtitles } from '../components/KaraokeSubtitles';
import {
  resolveActiveScene,
  resolveLessonProps,
  type GamifiedLessonProps,
  type NormalizedScene,
} from '../scriptScene';
import type { GameplayHudStats, GameplayVisual } from '@brightpath/shared';

export type { GamifiedLessonProps, SceneProp, ScriptData } from '../scriptScene';
export { resolveLessonProps } from '../scriptScene';

const DEMO_LEVELS: Array<Pick<NormalizedScene, 'level' | 'voiceover' | 'gameplayVisual' | 'sfxTrigger' | 'duration'>> =
  [
    {
      level: 'Level 1: The Manual Era',
      duration: 45,
      voiceover: 'Hardcoded move_right() slams into the wall. One frozen rule is not a level.',
      gameplayVisual: {
        character_action: 'running_into_wall',
        code_terminal_overlay: 'move_right(); jump(); // Hardcoded fail',
        hud_stats: { cpu_usage: '12%', exp: 100, mana: '80/100' },
      },
      sfxTrigger: 'glitch_error_sound',
    },
    {
      level: 'Level 2: The Loop & Logic Era',
      duration: 48,
      voiceover: 'if/else and while loops clear the repeating gates.',
      gameplayVisual: {
        character_action: 'looping',
        code_terminal_overlay: 'while (hazard) { if (gap) jump(); }',
        hud_stats: { cpu_usage: '28%', exp: 220, mana: '70/100' },
      },
      sfxTrigger: 'eight_bit_click',
    },
    {
      level: 'Level 3: The Unpredictable World',
      duration: 50,
      voiceover: 'Noise lands. Static rules miss. Time for math.',
      gameplayVisual: {
        character_action: 'dodge_fail',
        code_terminal_overlay: '// pattern drift — hardcoded jump fails',
        hud_stats: { cpu_usage: '61%', exp: 340, mana: '40/100', variance: 'σ² rising' },
      },
      sfxTrigger: 'glitch_error_sound',
    },
    {
      level: 'Level 4: The AI Companion',
      duration: 52,
      voiceover: 'Feed the pet training data and a loss. It learns the noisy path.',
      gameplayVisual: {
        character_action: 'feeding_data',
        code_terminal_overlay: 'loss = (y - yhat)**2; companion.fit(X, y)',
        hud_stats: { cpu_usage: '74%', exp: 620, mana: '90/100' },
      },
      sfxTrigger: 'neural_net_powerup',
    },
    {
      level: 'Boss Battle / Level Complete',
      duration: 45,
      voiceover: 'Human plan plus trained companion. Co-op maze clear. EXP maxed.',
      gameplayVisual: {
        character_action: 'co_op_clear',
        code_terminal_overlay: 'human.plan(); companion.predict();',
        hud_stats: { cpu_usage: '44%', exp: 999, mana: '100/100' },
      },
      sfxTrigger: 'boss_fanfare',
    },
  ];

const DEMO_SCENES: NormalizedScene[] = DEMO_LEVELS.map((row, i) => ({
  sceneId: i + 1,
  duration: row.duration,
  durationSec: row.duration,
  phase: row.level.toUpperCase(),
  phaseTitle: row.level,
  voiceoverText: row.voiceover,
  voiceover: row.voiceover,
  visualType: 'pixel_game_hud',
  visualArchetype: 'pixel_game_hud',
  animationType: 'PixelQuest',
  teacherGesture: 'demonstrating',
  cameraMotion: 'push_in_close',
  visualConfig: { gameplay_visual: row.gameplayVisual, level: row.level },
  visualProps: {},
  parameters: {},
  props: {},
  level: row.level,
  gameplayVisual: row.gameplayVisual as Record<string, unknown>,
  sfxTrigger: row.sfxTrigger,
}));

export const defaultGamifiedProps: GamifiedLessonProps = {
  topicId: 'demo',
  topicTitle: 'Pixel Quest Micro-Lesson',
  teacherName: 'Pixel Sage',
  totalDurationSeconds: DEMO_SCENES.reduce((a, s) => a + s.duration, 0),
  archetype: 'process',
  pedagogicalPattern: 'process_flow',
  audioUrl: '',
  wordTimings: [],
  scenes: DEMO_SCENES,
  scriptData: {
    topicTitle: 'Pixel Quest Micro-Lesson',
    teacherName: 'Pixel Sage',
    architecture: 'pixel_game_hud',
    archetype: 'process',
    pedagogicalPattern: 'process_flow',
    totalDurationSeconds: DEMO_SCENES.reduce((a, s) => a + s.duration, 0),
    scenes: DEMO_SCENES,
    wordTimings: [],
  },
};

function overlayUrlsFromConfig(config: Record<string, unknown>): string[] {
  const many = config.overlayImageUrls;
  if (Array.isArray(many)) {
    return many.filter((u): u is string => typeof u === 'string' && /^https?:\/\//i.test(u)).slice(0, 2);
  }
  if (typeof config.overlayImageUrl === 'string' && /^https?:\/\//i.test(config.overlayImageUrl)) {
    return [config.overlayImageUrl];
  }
  return [];
}

function AttachmentOverlay({ config }: { config: Record<string, unknown> }) {
  const urls = overlayUrlsFromConfig(config);
  if (!urls.length) return null;
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      {urls.map((url, i) => (
        <Img
          key={`${url}-${i}`}
          src={url}
          style={{
            position: 'absolute',
            right: 268,
            bottom: 300 + i * 8,
            width: 160,
            height: 100,
            objectFit: 'cover',
            border: '3px solid #22d3ee',
            imageRendering: 'pixelated',
            opacity: 0.9,
          }}
        />
      ))}
    </AbsoluteFill>
  );
}

function readGameplay(scene: NormalizedScene): GameplayVisual {
  const fromScene = scene.gameplayVisual ?? {};
  const fromConfig = (scene.visualConfig.gameplay_visual ||
    scene.visualConfig.gameplayVisual ||
    {}) as Record<string, unknown>;
  const merged = { ...fromConfig, ...fromScene };
  const hudRaw = (merged.hud_stats || merged.hudStats) as GameplayHudStats | undefined;
  return {
    character_action: String(merged.character_action || merged.characterAction || ''),
    code_terminal_overlay: String(merged.code_terminal_overlay || merged.codeTerminalOverlay || ''),
    hud_stats: hudRaw,
  };
}

export const GamifiedLesson: React.FC<GamifiedLessonProps> = (rawProps) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const currentTime = frame / fps;
  const loggedScene = useRef<string>('');

  const props = useMemo(() => resolveLessonProps(rawProps), [rawProps]);
  const scenes = (props.scriptData?.scenes ?? props.scenes) as NormalizedScene[];
  const topicTitle = props.topicTitle;
  const wordTimings = props.wordTimings;
  const audioUrl = props.audioUrl;

  if (frame === 0) {
    const live = rawProps.scriptData;
    console.log(
      `[Remotion Render] Pixel quest scenes=${live?.scenes?.length || scenes.length} ` +
        `audio=${audioUrl ? 'yes' : 'NO'} title=${live?.topicTitle || topicTitle}`,
    );
  }

  const active = resolveActiveScene(scenes, currentTime);
  const activeScene = active.scene;
  const visualConfig = activeScene.visualConfig;
  const sceneProgress =
    active.end > active.start ? (currentTime - active.start) / (active.end - active.start) : 0;
  const sceneWords = (wordTimings ?? []).filter((w) => {
    return w.start >= active.start - 0.12 && w.start < active.end + 0.05;
  });
  const gameplay = readGameplay(activeScene);
  const level = activeScene.level || activeScene.phaseTitle || `Level ${active.index + 1}`;
  const sfx = activeScene.sfxTrigger || String(visualConfig.sfx_trigger || 'eight_bit_click');
  const formula = String(visualConfig.formulaText || visualConfig.equationLatex || '');
  const sceneKey = `${activeScene.sceneId}:${level}`;
  if (loggedScene.current !== sceneKey) {
    loggedScene.current = sceneKey;
    console.log(
      `[GamifiedLesson] t=${currentTime.toFixed(2)}s ${level} action=${gameplay.character_action} sfx=${sfx}`,
    );
  }

  const compileFloater = /loop|train|feed|clear|compil|celebr/i.test(String(gameplay.character_action));

  return (
    <AbsoluteFill style={{ backgroundColor: '#0b1020' }}>
      <PixelPlayfield
        levelIndex={active.index}
        action={gameplay.character_action}
        progress01={sceneProgress}
        formula={formula}
      />
      <RetroGameHUD
        topicTitle={topicTitle}
        level={level}
        terminal={gameplay.code_terminal_overlay || formula}
        hud={gameplay.hud_stats}
        action={gameplay.character_action}
        progress01={sceneProgress}
        showExpFloater={compileFloater}
      />
      <PixelSfxLayer
        key={`${activeScene.sceneId}-${sfx}`}
        trigger={sfx}
        sceneStartFrame={Math.round(active.start * fps)}
      />
      <AttachmentOverlay config={visualConfig} />
      <KaraokeSubtitles
        words={sceneWords}
        currentTime={currentTime}
        fallbackText={activeScene.voiceover}
      />
      {audioUrl ? <Audio src={audioUrl} /> : null}
    </AbsoluteFill>
  );
};

export const GamifiedLessonComposition = GamifiedLesson;
