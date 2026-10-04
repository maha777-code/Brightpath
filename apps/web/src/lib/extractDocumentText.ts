import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import mammoth from 'mammoth';

GlobalWorkerOptions.workerSrc = workerSrc;

const TEXT_CAP = 80_000;
const MAX_IMAGE_BYTES = 4_500_000;

export interface AttachedDocument {
  id: string;
  name: string;
  extractedText: string;
  imageDataUrl?: string;
  isProcessing: boolean;
}

export function documentContext(files: AttachedDocument[]): string {
  return files
    .filter((file) => !file.isProcessing && file.extractedText.trim())
    .map((file) => `=== ATTACHED FILE CONTENT (${file.name}) ===\n${file.extractedText.trim()}`)
    .join('\n\n');
}

export function documentImages(files: AttachedDocument[]): string[] {
  return files.flatMap((file) => (file.imageDataUrl ? [file.imageDataUrl] : []));
}

export function documentsFromPayload(payload: {
  attachments?: string[];
  attachedDocumentContext?: string;
}): AttachedDocument[] {
  const names = payload.attachments ?? [];
  const context = payload.attachedDocumentContext?.trim() ?? '';
  if (!names.length) {
    return context
      ? [{ id: 'restored-doc', name: 'Attached document', extractedText: context, isProcessing: false }]
      : [];
  }
  return names.map((name, index) => ({
    id: `restored-${index}-${name}`,
    name,
    extractedText: index === 0 ? context : '',
    isProcessing: false,
  }));
}

function capText(text: string): string {
  const trimmed = text.replace(/\u0000/g, '').trim();
  if (trimmed.length <= TEXT_CAP) return trimmed;
  return `${trimmed.slice(0, TEXT_CAP)}\n\n[Document truncated after ${TEXT_CAP.toLocaleString()} characters.]`;
}

function readDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error(`Could not read ${file.name}`));
    };
    reader.onerror = () => reject(new Error(`Could not read ${file.name}`));
    reader.readAsDataURL(file);
  });
}

function textItem(item: unknown): string {
  if (item && typeof item === 'object' && 'str' in item && typeof item.str === 'string') return item.str;
  return '';
}

async function extractPdf(file: File): Promise<string> {
  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await getDocument({ data }).promise;
  const pages: string[] = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const line = content.items.map(textItem).join(' ').replace(/\s+/g, ' ').trim();
    if (line) pages.push(`--- Page ${pageNumber} ---\n${line}`);
  }
  if (!pages.length) {
    throw new Error(
      `No selectable text found in ${file.name}. If this is a scanned PDF, upload a photo of the page.`,
    );
  }
  return pages.join('\n');
}

async function extractDocx(file: File): Promise<string> {
  const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
  if (!result.value.trim()) throw new Error(`No text found in ${file.name}`);
  return result.value;
}

export async function extractDocumentText(file: File): Promise<{ text: string; imageDataUrl?: string }> {
  const name = file.name.toLowerCase();
  const type = file.type;

  if (name.endsWith('.doc') && !name.endsWith('.docx')) {
    throw new Error(`${file.name} is an older Word file. Save it as .docx and upload it again.`);
  }
  if (type === 'application/pdf' || name.endsWith('.pdf')) {
    return { text: capText(await extractPdf(file)) };
  }
  if (
    type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    name.endsWith('.docx')
  ) {
    return { text: capText(await extractDocx(file)) };
  }
  if (type.startsWith('text/') || name.endsWith('.txt') || name.endsWith('.md')) {
    const text = capText(await file.text());
    if (!text) throw new Error(`No text found in ${file.name}`);
    return { text };
  }
  if (type.startsWith('image/') || /\.(png|jpe?g|gif|webp)$/i.test(name)) {
    if (file.size > MAX_IMAGE_BYTES) {
      throw new Error(`${file.name} is too large. Use an image under 4 MB.`);
    }
    return {
      text: `Image file ${file.name}. Read the visible text, labels, and diagrams in this image.`,
      imageDataUrl: await readDataUrl(file),
    };
  }
  throw new Error(`${file.name} is not a supported PDF, Word, text, or image file.`);
}
