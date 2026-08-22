import type { VideoScriptManifest } from '@brightpath/shared';
import { getActiveProvider } from '../llm/provider.js';
import type { TopicContextPacket } from './types.js';

const SYSTEM = `You are an expert education video director for Class 9 Science (NCERT).
Return ONLY valid JSON matching this schema:
{
  "topicTitle": string,
  "totalDurationSeconds": number (15-25),
  "scenes": [
    {
      "sceneId": number,
      "duration": number,
      "voiceoverText": string,
      "animationType": "ParticleMotion3D" | "TemperatureEffect" | "StateComparison" | "ConceptCallout",
      "parameters": {
        "particleDensity": "low" | "medium" | "high",
        "temperature": number,
        "speedMultiplier": number,
        "showLabels": string[]
      }
    }
  ]
}
Rules: Prefer 2 scenes (max 3). Keep voiceover concise for fast Remotion renders.
totalDurationSeconds MUST be between 15 and 25. Scene durations must sum ≈ totalDurationSeconds.`;

function heuristicManifest(ctx: TopicContextPacket): VideoScriptManifest {
  const tip = ctx.teacherPrompt?.trim()
    ? ` ${ctx.teacherPrompt.trim()}`
    : '';
  const scenes = [
    {
      sceneId: 1,
      duration: 10,
      voiceoverText: `${ctx.title}. Matter is made of tiny particles in constant motion.${tip}`,
      animationType: 'ParticleMotion3D',
      parameters: {
        particleDensity: 'medium',
        temperature: 25,
        speedMultiplier: 1.2,
        showLabels: ['Molecules', 'Kinetic Energy'],
      },
    },
    {
      sceneId: 2,
      duration: 10,
      voiceoverText: `Heat speeds particles up. Remember ${ctx.code}: temperature controls kinetic energy.`,
      animationType: 'TemperatureEffect',
      parameters: {
        particleDensity: 'medium',
        temperature: 60,
        speedMultiplier: 1.6,
        showLabels: ['Heat', 'Key Takeaway'],
      },
    },
  ];
  return {
    topicTitle: ctx.title,
    totalDurationSeconds: scenes.reduce((a, s) => a + s.duration, 0),
    scenes,
  };
}

function clampDuration(sec: number): number {
  return Math.min(25, Math.max(15, Math.round(sec)));
}

/** Step 2 — structured Remotion script via LLM (heuristic fallback). */
export async function generateStructuredVideoScript(
  ctx: TopicContextPacket,
): Promise<VideoScriptManifest> {
  const provider = getActiveProvider();
  const excerpts = ctx.ragExcerpts.slice(0, 6).join('\n---\n');
  const user = [
    `Topic: ${ctx.code} ${ctx.title}`,
    `Chapter: ${ctx.chapterTitle}`,
    `Textbook: ${ctx.textbookTitle} (${ctx.subject}, ${ctx.gradeLabel})`,
    `Summary: ${ctx.chapterSummary}`,
    ctx.teacherPrompt ? `Teacher refinement: ${ctx.teacherPrompt}` : '',
    `Textbook excerpts:\n${excerpts}`,
    'Target length: 15–25 seconds total (keep narration short for faster video render).',
  ]
    .filter(Boolean)
    .join('\n');

  if (!provider) return heuristicManifest(ctx);

  try {
    const raw = await Promise.race([
      provider.completeJson<VideoScriptManifest>({ system: SYSTEM, user }),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('LLM script timed out')), 45_000);
      }),
    ]);
    if (!raw?.scenes?.length) return heuristicManifest(ctx);
    const scenes = raw.scenes.slice(0, 3).map((s, i) => ({
      sceneId: s.sceneId ?? i + 1,
      duration: Math.max(5, Math.min(15, Number(s.duration) || 8)),
      voiceoverText:
        String(s.voiceoverText || '').trim() ||
        heuristicManifest(ctx).scenes[0].voiceoverText,
      animationType: s.animationType || 'ParticleMotion3D',
      parameters: {
        particleDensity: String(s.parameters?.particleDensity ?? 'medium'),
        temperature: Number(s.parameters?.temperature ?? 25),
        speedMultiplier: Number(s.parameters?.speedMultiplier ?? 1.2),
        showLabels: Array.isArray(s.parameters?.showLabels)
          ? (s.parameters!.showLabels as string[])
          : ['Molecules'],
      },
    }));
    let totalDurationSeconds =
      Number(raw.totalDurationSeconds) || scenes.reduce((a, s) => a + s.duration, 0);
    totalDurationSeconds = clampDuration(totalDurationSeconds);
    // Scale scene durations to match clamped total if needed
    const sceneSum = scenes.reduce((a, s) => a + s.duration, 0);
    if (sceneSum > 0 && Math.abs(sceneSum - totalDurationSeconds) > 2) {
      const scale = totalDurationSeconds / sceneSum;
      for (const s of scenes) {
        s.duration = Math.max(5, Math.round(s.duration * scale));
      }
    }
    return {
      topicTitle: raw.topicTitle || ctx.title,
      totalDurationSeconds: scenes.reduce((a, s) => a + s.duration, 0),
      scenes,
    };
  } catch (err) {
    console.warn('[videoPipeline/script] LLM failed/timed out, using heuristic:', err);
    return heuristicManifest(ctx);
  }
}

export function flattenVoiceover(manifest: VideoScriptManifest): string {
  return manifest.scenes.map((s) => s.voiceoverText).join(' ');
}

export function cuesFromManifest(manifest: VideoScriptManifest) {
  let t = 0;
  return manifest.scenes.map((s) => {
    const cue = {
      timeSec: t + Math.min(2, s.duration / 3),
      label: `${s.animationType}: ${(s.parameters.showLabels as string[] | undefined)?.[0] ?? s.voiceoverText.slice(0, 40)}`,
    };
    t += s.duration;
    return cue;
  });
}
