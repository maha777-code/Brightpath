import zlib from 'node:zlib';
import { extractPdfText } from '../pdf/extractPdfText.js';

export type AttachmentKind = 'pdf' | 'image' | 'pptx';

export function detectAttachmentKind(fileName: string, mimeType: string): AttachmentKind | null {
  const name = fileName.toLowerCase();
  const mime = mimeType.toLowerCase();
  if (mime === 'application/pdf' || name.endsWith('.pdf')) return 'pdf';
  if (
    mime === 'image/png' ||
    mime === 'image/jpeg' ||
    mime === 'image/jpg' ||
    name.endsWith('.png') ||
    name.endsWith('.jpg') ||
    name.endsWith('.jpeg')
  ) {
    return 'image';
  }
  if (
    mime === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
    name.endsWith('.pptx')
  ) {
    return 'pptx';
  }
  return null;
}

function readU16(buf: Buffer, offset: number): number {
  return buf.readUInt16LE(offset);
}

function readU32(buf: Buffer, offset: number): number {
  return buf.readUInt32LE(offset);
}

/** Minimal ZIP reader for PPTX (OOXML) slide XML. */
function unzipNamedEntries(buffer: Buffer, match: (name: string) => boolean): Map<string, string> {
  const out = new Map<string, string>();
  let offset = 0;
  while (offset + 30 <= buffer.length) {
    const sig = readU32(buffer, offset);
    if (sig === 0x02014b50 || sig === 0x06054b50) break;
    if (sig !== 0x04034b50) {
      offset += 1;
      continue;
    }
    const flags = readU16(buffer, offset + 6);
    const method = readU16(buffer, offset + 8);
    let compSize = readU32(buffer, offset + 18);
    const nameLen = readU16(buffer, offset + 26);
    const extraLen = readU16(buffer, offset + 28);
    const nameStart = offset + 30;
    const name = buffer.toString('utf8', nameStart, nameStart + nameLen);
    const dataStart = nameStart + nameLen + extraLen;
    if (flags & 0x8) {
      break;
    }
    const data = buffer.subarray(dataStart, dataStart + compSize);
    if (match(name)) {
      try {
        const raw = method === 8 ? zlib.inflateRawSync(data) : method === 0 ? data : null;
        if (raw) out.set(name, raw.toString('utf8'));
      } catch {
        /* skip corrupt entry */
      }
    }
    offset = dataStart + compSize;
  }
  return out;
}

function xmlSlideText(xml: string): string {
  const texts: string[] = [];
  const re = /<a:t(?:\s[^>]*)?>([\s\S]*?)<\/a:t>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) {
    const t = m[1]
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
    if (t) texts.push(t);
  }
  return texts.join(' ');
}

export function extractPptxText(buffer: Buffer): string {
  const slides = unzipNamedEntries(buffer, (name) => /^ppt\/slides\/slide\d+\.xml$/i.test(name));
  const names = [...slides.keys()].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  return names
    .map((name, i) => {
      const body = xmlSlideText(slides.get(name) ?? '');
      return body ? `Slide ${i + 1}: ${body}` : '';
    })
    .filter(Boolean)
    .join('\n');
}

/** Lightweight PNG tEXt / iTXt harvest — not full OCR. */
export function extractPngTextChunks(buffer: Buffer): string {
  if (buffer.length < 16 || buffer.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') {
    return '';
  }
  const texts: string[] = [];
  let offset = 8;
  while (offset + 12 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    if (type === 'tEXt') {
      const z = data.indexOf(0);
      const value = data.toString('latin1', z >= 0 ? z + 1 : 0).trim();
      if (value.length > 3) texts.push(value);
    }
    if (type === 'iTXt') {
      const z = data.indexOf(0);
      const rest = data.subarray(z >= 0 ? z + 1 : 0);
      const value = rest.toString('utf8').replace(/\u0000/g, ' ').trim();
      if (value.length > 3) texts.push(value);
    }
    if (type === 'IEND') break;
    offset += 12 + length;
  }
  return texts.join('\n');
}

export async function describeImageWithLlm(
  buffer: Buffer,
  mimeType: string,
  hint: string,
): Promise<string> {
  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  if (geminiKey) {
    try {
      const model = process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash';
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `OCR and describe this teacher-uploaded classroom image for ${hint}. Return plain text of any labels, captions, and the scientific concept shown.`,
                  },
                  {
                    inline_data: {
                      mime_type: mimeType || 'image/png',
                      data: buffer.toString('base64'),
                    },
                  },
                ],
              },
            ],
          }),
        },
      );
      if (res.ok) {
        const data = (await res.json()) as {
          candidates?: { content?: { parts?: { text?: string }[] } }[];
        };
        const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('\n') ?? '';
        if (text.trim().length > 8) return text.trim();
      }
    } catch {
      /* fall through */
    }
  }

  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  if (openaiKey) {
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `OCR and describe this teacher-uploaded classroom image for ${hint}. Return plain text of labels and the concept shown.`,
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:${mimeType || 'image/png'};base64,${buffer.toString('base64')}`,
                  },
                },
              ],
            },
          ],
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as {
          choices?: { message?: { content?: string } }[];
        };
        const text = data.choices?.[0]?.message?.content ?? '';
        if (text.trim().length > 8) return text.trim();
      }
    } catch {
      /* fall through */
    }
  }

  return '';
}

export async function extractAttachmentText(input: {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
  kind: AttachmentKind;
  topicHint: string;
}): Promise<string> {
  if (input.kind === 'pdf') {
    return extractPdfText(input.buffer).trim();
  }
  if (input.kind === 'pptx') {
    return extractPptxText(input.buffer).trim();
  }
  const pngText = extractPngTextChunks(input.buffer);
  const vision = await describeImageWithLlm(input.buffer, input.mimeType, input.topicHint);
  return [pngText, vision].filter(Boolean).join('\n').trim();
}

export function chunkExtractedText(text: string, size = 700): string[] {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (!cleaned) return [];
  const chunks: string[] = [];
  for (let i = 0; i < cleaned.length; i += size) {
    chunks.push(cleaned.slice(i, i + size));
  }
  return chunks.slice(0, 24);
}
