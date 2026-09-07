import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import zlib from 'node:zlib';

export type PdfExtractOptions = {
  /** Approx. content streams to scan (one per page in many textbooks). */
  maxStreams?: number;
  /** Hard cap on extracted text characters. */
  maxChars?: number;
  /** Skip binary/image streams larger than this. */
  maxStreamBytes?: number;
  /** Stop reading past this byte offset (TOC = first pages only). */
  maxFileBytes?: number;
};

/** Table-of-contents / curriculum scan — first ~20 pages / 8MB only. */
export const TOC_EXTRACT_OPTS: PdfExtractOptions = {
  maxStreams: 20,
  maxChars: 80_000,
  maxStreamBytes: 1_200_000,
  maxFileBytes: 8 * 1024 * 1024,
};

/** Bounded body extract for RAG — never the whole 500-page book at once. */
export const BODY_EXTRACT_OPTS: PdfExtractOptions = {
  maxStreams: 80,
  maxChars: 140_000,
  maxStreamBytes: 1_200_000,
  maxFileBytes: 32 * 1024 * 1024,
};

const STREAM = Buffer.from('stream');
const ENDSTREAM = Buffer.from('endstream');
const FULL_READ_LIMIT = 12 * 1024 * 1024;

function tryInflate(data: Buffer): Buffer | null {
  const candidates: Array<(buf: Buffer) => Buffer> = [
    (buf) => zlib.inflateSync(buf),
    (buf) => zlib.inflateRawSync(buf),
    (buf) => zlib.unzipSync(buf),
  ];
  for (const fn of candidates) {
    try {
      return fn(data);
    } catch {
      /* try next */
    }
  }
  return null;
}

function decodePdfLiteral(raw: string): string {
  return raw
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\\\/g, '\\')
    .replace(/\\(\d{1,3})/g, (_, oct: string) => String.fromCharCode(parseInt(oct, 8)));
}

function stringsFromContentStream(content: string): string[] {
  const out: string[] = [];
  const tjRe = /\(((?:\\.|[^\\)])*)\)\s*Tj/g;
  let m: RegExpExecArray | null;
  while ((m = tjRe.exec(content))) {
    out.push(decodePdfLiteral(m[1]));
  }

  const tjArrayRe = /\[(.*?)\]\s*TJ/gs;
  while ((m = tjArrayRe.exec(content))) {
    const inner = m[1];
    const litRe = /\(((?:\\.|[^\\)])*)\)/g;
    let lit: RegExpExecArray | null;
    const parts: string[] = [];
    while ((lit = litRe.exec(inner))) {
      parts.push(decodePdfLiteral(lit[1]));
    }
    if (parts.length) out.push(parts.join(''));
  }

  return out;
}

function skipStreamNewline(buf: Buffer, afterKeyword: number): number {
  if (afterKeyword >= buf.length) return -1;
  if (buf[afterKeyword] === 13 && buf[afterKeyword + 1] === 10) return afterKeyword + 2;
  if (buf[afterKeyword] === 10 || buf[afterKeyword] === 13) return afterKeyword + 1;
  return -1;
}

function isStreamKeyword(buf: Buffer, at: number): boolean {
  if (at > 0) {
    const prev = buf[at - 1];
    if (prev !== 10 && prev !== 13 && prev !== 32 && prev !== 9) return false;
  }
  return true;
}

/** Decode one content stream; drop inflated bytes immediately after text extract. */
function textFromStreamBody(raw: Buffer): string {
  if (raw.length === 0 || raw.length > 1_200_000) return '';
  let inflated: Buffer | null = null;
  try {
    inflated = tryInflate(raw);
    const src = inflated ?? raw;
    if (src.length > 400_000) {
      const sample = src.subarray(0, 12_000).toString('latin1');
      return stringsFromContentStream(sample).join(' ');
    }
    const content = src.toString('latin1');
    return stringsFromContentStream(content).join(' ');
  } finally {
    inflated = null;
  }
}

function extractFromBuffer(buf: Buffer, opts: PdfExtractOptions): string {
  const maxStreams = opts.maxStreams ?? 20;
  const maxChars = opts.maxChars ?? 80_000;
  const maxStreamBytes = opts.maxStreamBytes ?? 1_200_000;
  const pieces: string[] = [];
  let chars = 0;
  let streams = 0;
  let pos = 0;

  while (streams < maxStreams && chars < maxChars && pos < buf.length) {
    const s = buf.indexOf(STREAM, pos);
    if (s < 0) break;
    if (!isStreamKeyword(buf, s)) {
      pos = s + STREAM.length;
      continue;
    }
    const bodyStart = skipStreamNewline(buf, s + STREAM.length);
    if (bodyStart < 0) {
      pos = s + STREAM.length;
      continue;
    }
    const e = buf.indexOf(ENDSTREAM, bodyStart);
    if (e < 0) break;
    const bodyLen = e - bodyStart;
    if (bodyLen > 0 && bodyLen <= maxStreamBytes) {
      const raw = Buffer.from(buf.subarray(bodyStart, e));
      const text = textFromStreamBody(raw);
      if (text) {
        const take = text.slice(0, maxChars - chars);
        if (take) {
          pieces.push(take);
          chars += take.length;
        }
      }
    }
    streams += 1;
    pos = e + ENDSTREAM.length;
  }

  if (pieces.length === 0) {
    const sample = buf.subarray(0, Math.min(buf.length, 400_000)).toString('latin1');
    pieces.push(...stringsFromContentStream(sample));
  }

  return pieces.join('\n');
}

/**
 * Best-effort text from an in-memory PDF. Does NOT stringify the whole buffer.
 * Prefer extractPdfTextFromFile for large uploads.
 */
export function extractPdfText(buffer: Buffer, opts: PdfExtractOptions = TOC_EXTRACT_OPTS): string {
  return extractFromBuffer(buffer, opts);
}

const FILE_WINDOW = 4 * 1024 * 1024;
const FILE_OVERLAP = 1_200_000;

/** Yield text from overlapping file windows so we never hold a 35MB+ PDF + latin1 copy. */
export async function* iteratePdfStreamText(
  filePath: string,
  opts: PdfExtractOptions = TOC_EXTRACT_OPTS,
): AsyncGenerator<string, void, undefined> {
  const maxStreams = opts.maxStreams ?? 20;
  const maxChars = opts.maxChars ?? 80_000;
  const fh = await fsPromises.open(filePath, 'r');
  try {
    const stat = await fh.stat();
    const scanLimit = Math.min(stat.size, opts.maxFileBytes ?? stat.size);
    let offset = 0;
    let streamsLeft = maxStreams;
    let chars = 0;
    const win = Buffer.allocUnsafe(FILE_WINDOW);

    while (offset < scanLimit && streamsLeft > 0 && chars < maxChars) {
      const toRead = Math.min(FILE_WINDOW, stat.size - offset);
      const { bytesRead } = await fh.read(win, 0, toRead, offset);
      if (!bytesRead) break;
      const text = extractFromBuffer(Buffer.from(win.subarray(0, bytesRead)), {
        ...opts,
        maxStreams: Math.min(8, streamsLeft),
        maxChars: maxChars - chars,
      });
      streamsLeft = Math.max(0, streamsLeft - 1);
      if (text) {
        chars += text.length;
        streamsLeft = Math.max(0, streamsLeft - 2);
        yield text;
      }
      if (offset + bytesRead >= scanLimit) break;
      offset += Math.max(1, bytesRead - FILE_OVERLAP);
      await new Promise<void>((resolve) => setImmediate(resolve));
    }
  } finally {
    await fh.close();
  }
}

/** Stream PDF from disk; never builds one giant latin1 copy of a 35MB+ file. */
export async function extractPdfTextFromFile(
  filePath: string,
  opts: PdfExtractOptions = TOC_EXTRACT_OPTS,
): Promise<string> {
  const pieces: string[] = [];
  let chars = 0;
  const cap = opts.maxChars ?? 80_000;
  for await (const piece of iteratePdfStreamText(filePath, opts)) {
    pieces.push(piece);
    chars += piece.length;
    if (chars >= cap) break;
  }
  return pieces.join('\n');
}

export function extractPdfTextFromPathSync(
  filePath: string,
  opts: PdfExtractOptions = TOC_EXTRACT_OPTS,
): string {
  if (!fs.existsSync(filePath)) return '';
  const size = fs.statSync(filePath).size;
  const cap = Math.min(size, opts.maxFileBytes ?? FULL_READ_LIMIT, FULL_READ_LIMIT);
  if (size <= cap && size <= FULL_READ_LIMIT) {
    const buf = fs.readFileSync(filePath);
    try {
      return extractFromBuffer(buf, opts);
    } finally {
      /* buf goes out of scope */
    }
  }
  const head = Buffer.alloc(Math.min(size, cap, 4 * 1024 * 1024));
  const fd = fs.openSync(filePath, 'r');
  try {
    fs.readSync(fd, head, 0, head.length, 0);
    return extractFromBuffer(head, opts);
  } finally {
    fs.closeSync(fd);
  }
}

/** Read only the PDF header for /Title — not the whole file. */
export function readPdfHeaderLatin1(filePath: string, bytes = 256 * 1024): string {
  if (!fs.existsSync(filePath)) return '';
  const size = fs.statSync(filePath).size;
  const n = Math.min(size, bytes);
  const buf = Buffer.alloc(n);
  const fd = fs.openSync(filePath, 'r');
  try {
    fs.readSync(fd, buf, 0, n, 0);
    return buf.toString('latin1');
  } finally {
    fs.closeSync(fd);
  }
}
