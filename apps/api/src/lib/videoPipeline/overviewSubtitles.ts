import type { VideoSceneSpec, VideoScriptManifest } from '@brightpath/shared';

function pad(n: number, width: number): string {
  return String(n).padStart(width, '0');
}

export function formatSrtTimestamp(totalSec: number): string {
  const clamped = Math.max(0, totalSec);
  const hours = Math.floor(clamped / 3600);
  const minutes = Math.floor((clamped % 3600) / 60);
  const seconds = Math.floor(clamped % 60);
  const millis = Math.round((clamped - Math.floor(clamped)) * 1000);
  return `${pad(hours, 2)}:${pad(minutes, 2)}:${pad(seconds, 2)},${pad(millis, 3)}`;
}

/** Build an SRT from per-slide narration timings (after audio alignment). */
export function buildSrtFromScenes(scenes: Pick<VideoSceneSpec, 'duration' | 'voiceoverText' | 'voiceover'>[]): string {
  let t = 0;
  const blocks: string[] = [];
  scenes.forEach((scene, i) => {
    const text = String(scene.voiceoverText || scene.voiceover || '').trim();
    if (!text) return;
    const start = t;
    const end = t + Math.max(0.4, Number(scene.duration) || 0);
    t = end;
    blocks.push(`${blocks.length + 1}\n${formatSrtTimestamp(start)} --> ${formatSrtTimestamp(end)}\n${text}`);
    void i;
  });
  return `${blocks.join('\n\n')}\n`;
}

export function buildTranscriptMarkdown(manifest: VideoScriptManifest): string {
  const lines = [`# ${manifest.topicTitle}`, ''];
  if (manifest.audience) {
    lines.push(`Audience: ${manifest.audience}`, '');
  }
  for (const scene of manifest.scenes) {
    const heading = scene.lesson?.heading || scene.phaseTitle || `Slide ${scene.sceneId}`;
    lines.push(`## Slide ${scene.sceneId}: ${heading}`, '');
    lines.push(String(scene.voiceoverText || scene.voiceover || '').trim(), '');
    const refs = scene.lesson?.sourceRefs ?? [];
    if (refs.length) {
      lines.push(`Sources: ${refs.join('; ')}`, '');
    }
  }
  return `${lines.join('\n').trim()}\n`;
}
