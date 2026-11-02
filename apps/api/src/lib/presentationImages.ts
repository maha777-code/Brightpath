import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { PresentationPayload, PresentationResponse, PresentationSlide } from '@brightpath/shared';
import { PUBLIC_DIR, apiPublicOrigin } from './videoPipeline/mediaPaths.js';

const IMAGE_MODELS = ['gemini-2.5-flash-image', 'gemini-3.1-flash-lite-image'];
const USER_AGENT = 'MindVaultPresentation/1.0 (educational; https://mindvault.academy)';
const SKIP_FILE = /logo|icon|flag|map|coat of arms|signature|autograph|diagram|schematic|chart\b|graph\b|svg/i;

let imageGenDisabled = false;

function searchTerms(slide: PresentationSlide, topic: string): string {
  const prompt = slide.imagePrompt
    .replace(/classroom[- ]safe illustration of/gi, '')
    .replace(/a classroom illustration of/gi, '')
    .replace(/\bno (words|text|labels|watermark)[^.]*/gi, '')
    .replace(/photorealistic photograph of/gi, '')
    .trim();
  const base = prompt.length > 12 ? prompt : `${topic} ${slide.title}`;
  return base.replace(/[^\w\s-]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 110);
}

function reuseImages(slides: PresentationSlide[], previous: PresentationSlide[]): PresentationSlide[] {
  return slides.map((slide) => {
    const prior = previous.find(
      (item) => item.imageUrl && item.title === slide.title && item.imagePrompt === slide.imagePrompt,
    );
    return prior?.imageUrl ? { ...slide, imageUrl: prior.imageUrl } : slide;
  });
}

async function mapPool<T, R>(items: T[], limit: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      out[index] = await fn(items[index], index);
    }
  });
  await Promise.all(workers);
  return out;
}

async function geminiPhotograph(prompt: string): Promise<string | null> {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key || imageGenDisabled) return null;
  for (const model of IMAGE_MODELS) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(40_000),
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `Photorealistic 16:9 photograph. No text, letters, labels, watermark, collage, or slide layout. Subject: ${prompt}`,
                  },
                ],
              },
            ],
            generationConfig: {
              responseModalities: ['IMAGE'],
              imageConfig: { aspectRatio: '16:9' },
            },
          }),
        },
      );
      if (res.status === 429) {
        imageGenDisabled = true;
        return null;
      }
      if (!res.ok) continue;
      const data = (await res.json()) as {
        candidates?: { content?: { parts?: { inlineData?: { mimeType?: string; data?: string } }[] } }[];
      };
      const image = data.candidates?.[0]?.content?.parts?.find((part) => part.inlineData?.data)?.inlineData;
      if (!image?.data) continue;
      const ext = image.mimeType?.includes('jpeg') || image.mimeType?.includes('jpg') ? 'jpg' : 'png';
      const dir = path.join(PUBLIC_DIR, 'presentations');
      await mkdir(dir, { recursive: true });
      const name = `${randomUUID()}.${ext}`;
      await writeFile(path.join(dir, name), Buffer.from(image.data, 'base64'));
      return `${apiPublicOrigin()}/public/presentations/${name}`;
    } catch (err) {
      console.error('[presentation] image generation failed', err instanceof Error ? err.message : err);
    }
  }
  return null;
}

type CommonsPage = {
  title?: string;
  imageinfo?: { mime?: string; thumburl?: string; url?: string }[];
};

async function commonsPhotographs(query: string): Promise<string[]> {
  const url = new URL('https://commons.wikimedia.org/w/api.php');
  url.searchParams.set('action', 'query');
  url.searchParams.set('format', 'json');
  url.searchParams.set('generator', 'search');
  url.searchParams.set('gsrsearch', `${query} filetype:bitmap`);
  url.searchParams.set('gsrnamespace', '6');
  url.searchParams.set('gsrlimit', '8');
  url.searchParams.set('prop', 'imageinfo');
  url.searchParams.set('iiprop', 'url|mime');
  url.searchParams.set('iiurlwidth', '1280');
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(12_000) });
  if (!res.ok) return [];
  const data = (await res.json()) as { query?: { pages?: Record<string, CommonsPage> } };
  const pages = Object.values(data.query?.pages ?? {});
  const photos: string[] = [];
  const diagrams: string[] = [];
  for (const page of pages) {
    const info = page.imageinfo?.[0];
    const mime = info?.mime ?? '';
    const src = info?.thumburl || info?.url;
    if (!src || !mime.startsWith('image/') || mime.includes('svg')) continue;
    if (SKIP_FILE.test(page.title ?? '')) diagrams.push(src);
    else if (mime === 'image/jpeg') photos.push(src);
    else diagrams.push(src);
  }
  return [...photos, ...diagrams];
}

/** Adds a 16:9 photograph to every slide. Uses the image model when it is available, otherwise a matching Commons photograph. */
export async function attachPresentationImages(
  deck: PresentationResponse,
  input: PresentationPayload,
): Promise<PresentationResponse> {
  const previous = input.currentSlides ?? [];
  const seeded = reuseImages(deck.slides, previous);
  const used = new Set(seeded.map((slide) => slide.imageUrl).filter((url): url is string => Boolean(url)));
  const slides = await mapPool(seeded, 3, async (slide) => {
    if (slide.imageUrl) return slide;
    const query = searchTerms(slide, input.topic);
    const generated = await geminiPhotograph(query);
    if (generated) {
      used.add(generated);
      return { ...slide, imageUrl: generated };
    }
    const found = (await commonsPhotographs(query)).find((url) => !used.has(url));
    if (!found) return slide;
    used.add(found);
    return { ...slide, imageUrl: found };
  });
  return { ...deck, slides };
}
