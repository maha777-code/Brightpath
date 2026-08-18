import type { VideoScriptManifest } from '@brightpath/shared';
import { getActiveProvider, parseLlmJson } from '../llm/provider.js';
import type { TopicContextPacket } from './types.js';

const SYSTEM = `You are an expert education video director for Class 9 Science (NCERT).
Return ONLY valid JSON matching this schema:
{
  "topicTitle": string,
  "totalDurationSeconds": number (25-45),
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
Rules: 2-4 scenes, voiceover clear for spoken narration, total durations sum ≈ totalDurationSeconds.`;

function heuristicManifest(ctx: TopicContextPacket): VideoScriptManifest {
  const tip = ctx.teacherPrompt?.trim()
    ? ` ${ctx.teacherPrompt.trim()}`
    : '';
  const scenes = [
    {
      sceneId: 1,
      duration: 10,
      voiceoverText: `${ctx.title}. Matter is made of tiny particles. Let's explore how they behave.${tip}`,
      animationType: 'ParticleMotion3D',
      parameters: {
        particleDensity: 'high',
        temperature: 25,
        speedMultiplier: 1.2,
        showLabels: ['Molecules', 'Kinetic Energy'],
      },
    },
    {
      sceneId: 2,
      duration: 12,
      voiceoverText:
        'In solids, particles vibrate in place. In liquids, they slide past each other. Heat increases speed and spacing.',
      animationType: 'TemperatureEffect',
      parameters: {
        particleDensity: 'medium',
        temperature: 60,
        speedMultiplier: 1.8,
        showLabels: ['Solid', 'Liquid', 'Heat'],
      },
    },
    {
      sceneId: 3,
      duration: 10,
      voiceoverText: `Remember ${ctx.code}: particles are continuously moving, and temperature controls their kinetic energy.`,
      animationType: 'ConceptCallout',
      parameters: {
        particleDensity: 'medium',
        temperature: 40,
        speedMultiplier: 1.4,
        showLabels: [ctx.code, 'Key Takeaway'],
      },
    },
  ];
  return {
    topicTitle: ctx.title,
    totalDurationSeconds: scenes.reduce((a, s) => a + s.duration, 0),
    scenes,
  };
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
  ]
    .filter(Boolean)
    .join('\n');

  if (!provider) return heuristicManifest(ctx);

  try {
    const raw = await provider.completeJson<VideoScriptManifest>({
      system: SYSTEM,
      user,
    });
    if (!raw?.scenes?.length) return heuristicManifest(ctx);
    const scenes = raw.scenes.map((s, i) => ({
      sceneId: s.sceneId ?? i + 1,
      duration: Math.max(4, Number(s.duration) || 10),
      voiceoverText: String(s.voiceoverText || '').trim() || heuristicManifest(ctx).scenes[0].voiceoverText,
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
    const totalDurationSeconds =
      Number(raw.totalDurationSeconds) || scenes.reduce((a, s) => a + s.duration, 0);
    return {
      topicTitle: raw.topicTitle || ctx.title,
      totalDurationSeconds,
      scenes,
    };
  } catch (err) {
    console.warn('[videoPipeline/script] LLM failed, using heuristic:', err);
    // try parse from text provider path already handled; fallback
    try {
      // secondary: some providers wrap oddly
      void parseLlmJson;
    } catch {
      /* ignore */
    }
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
