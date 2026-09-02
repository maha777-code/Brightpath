import zlib from 'node:zlib';

/** Try common PDF Flate variants; return null if the bytes are not compressed. */
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

/** Pull show-text operators (Tj / TJ) out of a PDF content stream. */
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

/**
 * Best-effort text extraction from a PDF buffer without a full PDF library.
 * Continues across page streams (page breaks / form feeds) instead of stopping
 * after the first content object.
 */
export function extractPdfText(buffer: Buffer): string {
  const latin = buffer.toString('latin1');
  const pieces: string[] = [];

  const streamRe = /stream\r?\n([\s\S]*?)endstream/g;
  let sm: RegExpExecArray | null;
  while ((sm = streamRe.exec(latin))) {
    const raw = Buffer.from(sm[1], 'latin1');
    const inflated = tryInflate(raw);
    const content = (inflated ?? raw).toString('latin1');
    const strings = stringsFromContentStream(content);
    if (strings.length) {
      pieces.push(strings.join(' '));
    } else if (inflated) {
      pieces.push(inflated.toString('utf8'));
    }
  }

  // Uncompressed literal strings anywhere in the file (simple NCERT exports)
  if (pieces.length === 0) {
    pieces.push(...stringsFromContentStream(latin));
  }

  return pieces.join('\n');
}
