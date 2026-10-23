import type { VideoScriptManifest, VideoSceneSpec } from '@brightpath/shared';

export type PipelineStage =
  | 'queued'
  | 'retrieving'
  | 'scripting'
  | 'tts'
  | 'footage'
  | 'rendering'
  | 'done'
  | 'error';

export const STAGE_PROGRESS: Record<PipelineStage, number> = {
  queued: 2,
  retrieving: 15,
  scripting: 35,
  tts: 55,
  footage: 68,
  rendering: 80,
  done: 100,
  error: 0,
};

/** Per-stage budgets (ms). Rendering needs headroom for bundle + Chromium on slow VMs. */
export const STAGE_TIMEOUTS = {
  retrieving: 45_000,
  scripting: 240_000,
  tts: 360_000,
  footage: 900_000,
  rendering: 1_200_000, // 20 minutes
} as const;

export interface TopicContextPacket {
  topicId: string;
  code: string;
  title: string;
  chapterTitle: string;
  chapterSummary: string;
  textbookTitle: string;
  subject: string;
  gradeLabel: string;
  fileName?: string;
  ragExcerpts: string[];
  teacherPrompt?: string;
  contentDomain?: 'dsml' | 'math' | 'physics' | 'chemistry' | 'biology' | 'generic';
}

export interface VoiceSynthesisResult {
  audioPath: string;
  audioPublicUrl: string;
  wordTimings: { word: string; start: number; end: number }[];
  durationSec: number;
}

export interface RenderResult {
  videoPath: string;
  videoPublicUrl: string;
  usedFallback: boolean;
}

export type { VideoScriptManifest, VideoSceneSpec };
