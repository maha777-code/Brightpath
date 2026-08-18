import type { VideoScriptManifest, VideoSceneSpec } from '@brightpath/shared';

export type PipelineStage =
  | 'queued'
  | 'retrieving'
  | 'scripting'
  | 'tts'
  | 'rendering'
  | 'done'
  | 'error';

export const STAGE_PROGRESS: Record<PipelineStage, number> = {
  queued: 2,
  retrieving: 15,
  scripting: 35,
  tts: 55,
  rendering: 80,
  done: 100,
  error: 0,
};

export interface TopicContextPacket {
  topicId: string;
  code: string;
  title: string;
  chapterTitle: string;
  chapterSummary: string;
  textbookTitle: string;
  subject: string;
  gradeLabel: string;
  ragExcerpts: string[];
  teacherPrompt?: string;
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
