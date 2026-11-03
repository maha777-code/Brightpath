import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { PresentationPayload, PresentationResponse, PresentationSlide } from '@brightpath/shared';
import { PUBLIC_DIR, apiPublicOrigin } from './videoPipeline/mediaPaths.js';

/** Picture layouts only. Cards, quotes, and steps stay designed text. */
const MAX_PICTURES = 5;
const DRAW_MODELS = ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite'];
const GENERIC_PROMPT =
  /classroom illustration|classroom-safe|title illustration|goal markers|vocabulary cards|students noticing|two students|closing slide|teacher reviewing|step cards|claim, a piece of evidence|unordered step/i;
const ALLOWED_TAGS = new Map([
  ['svg', 'svg'],
  ['g', 'g'],
  ['path', 'path'],
  ['circle', 'circle'],
  ['ellipse', 'ellipse'],
  ['rect', 'rect'],
  ['line', 'line'],
  ['polyline', 'polyline'],
  ['polygon', 'polygon'],
  ['defs', 'defs'],
  ['lineargradient', 'linearGradient'],
  ['radialgradient', 'radialGradient'],
  ['stop', 'stop'],
  ['filter', 'filter'],
  ['fegaussianblur', 'feGaussianBlur'],
  ['feoffset', 'feOffset'],
  ['femerge', 'feMerge'],
  ['femergenode', 'feMergeNode'],
  ['feflood', 'feFlood'],
  ['fecomposite', 'feComposite'],
]);

const failedModels = new Set<string>();

function drawModels(): string[] {
  return [...new Set(DRAW_MODELS)];
}

/** A prompt is worth drawing only when it names a concrete scene. */
export function teachingImagePrompt(slide: PresentationSlide): string | null {
  const prompt = slide.imagePrompt.trim();
  if (prompt.length < 24 || GENERIC_PROMPT.test(prompt)) return null;
  return prompt.slice(0, 400);
}

function reuseImages(slides: PresentationSlide[], previous: PresentationSlide[]): PresentationSlide[] {
  return slides.map((slide) => {
    const prior = previous.find(
      (item) => item.imageUrl && item.title === slide.title && item.imagePrompt === slide.imagePrompt,
    );
    return prior?.imageUrl ? { ...slide, imageUrl: prior.imageUrl } : slide;
  });
}

function sanitizeSvg(raw: string): string | null {
  const unfenced = raw.replace(/```(?:xml|svg)?/gi, '').trim();
  const match = unfenced.match(/<svg\b[\s\S]*<\/svg>/i);
  if (!match) return null;
  let svg = match[0]
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, '')
    .replace(/<(iframe|image|use|style|object|embed)\b[\s\S]*?(?:<\/\1>|\/>)/gi, '');
  svg = svg.replace(/<\/?([a-zA-Z0-9:-]+)([^>]*)>/g, (full, tag: string, attrs: string) => {
    const name = ALLOWED_TAGS.get(tag.toLowerCase().replace(/^.*:/, ''));
    if (!name) return '';
    const selfClose = /\/\s*$/.test(attrs);
    const clean = attrs
      .replace(/\/\s*$/, '')
      .replace(/\son[a-z]+\s*=\s*(['"]).*?\1/gi, '')
      .replace(/\s(?:href|xlink:href)\s*=\s*(['"])(?!#).*?\1/gi, '');
    if (full.startsWith('</')) return `</${name}>`;
    return `<${name}${clean}${selfClose ? ' />' : '>'}`;
  });
  if (!/<svg\b/i.test(svg) || svg.length < 40 || svg.length > 80_000) return null;
  if (!/viewBox\s*=/i.test(svg)) svg = svg.replace(/<svg\b/i, '<svg viewBox="0 0 640 360"');
  return svg;
}

async function drawTeachingSvg(prompt: string): Promise<string | null> {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) return null;
  for (const model of drawModels()) {
    if (failedModels.has(model)) continue;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(35_000),
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      text: [
                        'Draw one classroom illustration as a single SVG.',
                        `Scene: ${prompt}`,
                        'Return only the SVG. viewBox="0 0 640 360".',
                        'No text, letters, numbers, words, or labels.',
                        'No scripts. Show the objects and the action a student needs to see, with a few clear filled shapes.',
                      ].join('\n'),
                    },
                  ],
                },
              ],
              generationConfig: { temperature: 0.4 },
            }),
          },
        );
        if (res.status === 404 || res.status === 503 || res.status === 429) {
          failedModels.add(model);
          break;
        }
        if (!res.ok) break;
        const data = (await res.json()) as {
          candidates?: { content?: { parts?: { text?: string }[] } }[];
        };
        const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('') ?? '';
        const svg = sanitizeSvg(text);
        if (!svg) break;
        const dir = path.join(PUBLIC_DIR, 'presentations');
        await mkdir(dir, { recursive: true });
        const name = `${randomUUID()}.svg`;
        await writeFile(path.join(dir, name), svg, 'utf8');
      console.log(`[presentation] drew a teaching image with ${model}`);
      const origin = apiPublicOrigin().replace('://localhost:', '://127.0.0.1:');
      return `${origin}/public/presentations/${name}`;
      } catch (err) {
        if (attempt === 1) failedModels.add(model);
        console.error('[presentation] image generation failed', model, err instanceof Error ? err.message : err);
      }
    }
  }
  return null;
}

/** Draws a picture only on slides whose prompt names a concept a student should see. */
export async function attachPresentationImages(
  deck: PresentationResponse,
  input: PresentationPayload,
): Promise<PresentationResponse> {
  const seeded = reuseImages(deck.slides, input.currentSlides ?? []);
  let budget = MAX_PICTURES - seeded.filter((slide) => slide.imageUrl).length;
  const slides: PresentationSlide[] = [];
  for (const slide of seeded) {
    const prompt = teachingImagePrompt(slide);
    const pictureLayout = slide.layout === 'split' || slide.layout === 'focus';
    if (slide.imageUrl || budget <= 0 || !prompt || !pictureLayout) {
      slides.push(slide.imageUrl ? slide : { ...slide, imageUrl: undefined });
      continue;
    }
    const imageUrl = await drawTeachingSvg(prompt);
    if (!imageUrl) {
      slides.push({ ...slide, imageUrl: undefined });
      continue;
    }
    budget -= 1;
    slides.push({ ...slide, imageUrl });
  }
  return { ...deck, slides };
}
