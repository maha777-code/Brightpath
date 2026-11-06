import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, FileText, Loader2, Mic, Paperclip, Sparkles, Star } from 'lucide-react';
import {
  LESSON_PLAN_GRADE_LEVELS,
  PRESENTATION_SLIDE_OPTIONS,
  PRESENTATION_THEMES,
  fallbackPresentation,
  presentationSlideTarget,
  revisePresentation,
  slideLayout,
  type PresentationPayload,
  type PresentationResponse,
  type PresentationSlide,
  type PresentationSlideCount,
  type PresentationTheme,
} from '@brightpath/shared';
import { api } from '@/lib/api';
import {
  documentContext,
  documentImages,
  extractDocumentText,
  type AttachedDocument,
} from '@/lib/extractDocumentText';

const WORD_LIMIT = 75_000;
const FIELD = 'mv-pres-field mt-2 w-full rounded-xl px-4 py-3 text-sm outline-none focus:border-violet-400';

const THEME_STYLE: Record<
  PresentationTheme,
  {
    stage: string;
    wash: string;
    card: string;
    title: string;
    body: string;
    chip: string;
    dot: string;
    art: string;
    paper: string;
    ink: string;
    muted: string;
    accent: string;
    soft: string;
    band: string;
    onBand: string;
  }
> = {
  made: { stage: '#14161e', wash: '#f6f3f1', card: '#fff7f3', title: '#1c1917', body: '#44403c', chip: '#fff7f3', dot: '#e07a62', art: 'linear-gradient(160deg,#fde7df,#e07a62 48%,#9a3412)', paper: '#fff7f3', ink: '#1c1917', muted: '#57534e', accent: '#c2410c', soft: '#ffedd5', band: '#9a3412', onBand: '#fff7f3' },
  light: { stage: '#ececef', wash: '#f4f4f5', card: '#ffffff', title: '#18181b', body: '#3f3f46', chip: '#f4f4f5', dot: '#d4d4d8', art: 'linear-gradient(160deg,#fafafa,#d4d4d8 55%,#71717a)', paper: '#ffffff', ink: '#18181b', muted: '#3f3f46', accent: '#52525b', soft: '#f4f4f5', band: '#18181b', onBand: '#fafafa' },
  dark: { stage: '#0c0e14', wash: '#eef1f6', card: '#18181b', title: '#fafafa', body: '#d4d4d8', chip: '#27272a', dot: '#52525b', art: 'linear-gradient(160deg,#3f3f46,#18181b 50%,#09090b)', paper: '#18181b', ink: '#fafafa', muted: '#d4d4d8', accent: '#e4e4e7', soft: '#27272a', band: '#09090b', onBand: '#fafafa' },
  magic: { stage: '#140c24', wash: '#f6f3ff', card: '#f5f3ff', title: '#1e1b4b', body: '#4c1d95', chip: '#ede9fe', dot: '#c4b5fd', art: 'linear-gradient(160deg,#f3e8ff,#7c3aed 46%,#4c1d95)', paper: '#f5f3ff', ink: '#1e1b4b', muted: '#5b21b6', accent: '#7c3aed', soft: '#ede9fe', band: '#4c1d95', onBand: '#f5f3ff' },
  playful: { stage: '#1a120c', wash: '#fff8f1', card: '#fffbeb', title: '#1c1917', body: '#44403c', chip: '#fffbeb', dot: '#fbbf24', art: 'linear-gradient(160deg,#fef3c7,#f59e0b 50%,#c2410c)', paper: '#fffbeb', ink: '#1c1917', muted: '#44403c', accent: '#d97706', soft: '#fef3c7', band: '#c2410c', onBand: '#fffbeb' },
  chalk: { stage: '#0d1f18', wash: '#f3faf6', card: '#f0fdf4', title: '#052e16', body: '#14532d', chip: '#dcfce7', dot: '#4ade80', art: 'linear-gradient(160deg,#bbf7d0,#166534 48%,#052e16)', paper: '#052e16', ink: '#ecfdf5', muted: '#bbf7d0', accent: '#4ade80', soft: '#14532d', band: '#022c22', onBand: '#ecfdf5' },
  notebook: { stage: '#f3efe6', wash: '#f7f4ee', card: '#fffdf8', title: '#1e3a5f', body: '#334155', chip: '#eff6ff', dot: '#93c5fd', art: 'linear-gradient(160deg,#eff6ff,#93c5fd 50%,#1e3a5f)', paper: '#fffdf8', ink: '#1e3a5f', muted: '#334155', accent: '#2563eb', soft: '#dbeafe', band: '#1e3a5f', onBand: '#fffdf8' },
  scholar: { stage: '#0b1220', wash: '#f4f7fb', card: '#f8fafc', title: '#0f172a', body: '#334155', chip: '#e2e8f0', dot: '#eab308', art: 'linear-gradient(160deg,#fef9c3,#1e293b 52%,#0f172a)', paper: '#0f172a', ink: '#f8fafc', muted: '#cbd5e1', accent: '#eab308', soft: '#1e293b', band: '#020617', onBand: '#fef9c3' },
};

type SlideColors = (typeof THEME_STYLE)[PresentationTheme];

function stageInk(stage: string, title: string): string {
  const n = Number.parseInt(stage.replace('#', ''), 16);
  const lum = (((n >> 16) & 255) * 299 + ((n >> 8) & 255) * 587 + (n & 255) * 114) / 1000;
  return lum < 150 ? '#f8fafc' : title;
}

function countWords(value: string): number {
  return value.trim() ? value.trim().split(/\s+/).length : 0;
}

function exportSlideHtml(slide: PresentationSlide, index: number, _colors: SlideColors): string {
  const layout = slideLayout(slide, index);
  const title = escapeHtml(slide.title);
  const subtitle = slide.subtitle ? `<p>${escapeHtml(slide.subtitle)}</p>` : '';
  const bullets = slide.bullets.slice(0, 4).map((item) => `<li>${escapeHtml(item)}</li>`).join('');
  const question = slide.question ? `<p class="chip">${escapeHtml(slide.question)}</p>` : '';
  const img = slide.imageUrl ? `<img src="${escapeHtml(slideImageSrc(slide.imageUrl))}" alt="">` : '';
  if (layout === 'cover') {
    return `<section><div class="cover"><p class="kicker">Lesson</p><h2>${title}</h2>${subtitle}<div class="mark"></div></div></section>`;
  }
  if (layout === 'quote') {
    const line = escapeHtml(slide.question || slide.subtitle || slide.bullets[0] || slide.title);
    return `<section><div class="quote"><p class="kicker">${title}</p><p>${line}</p></div></section>`;
  }
  if (layout === 'cards') {
    const cards = slide.bullets.slice(0, 3).map((item, itemIndex) => `<div class="card"><span class="num">${itemIndex + 1}</span><p>${escapeHtml(item)}</p></div>`).join('');
    return `<section><div class="paper cards"><h2>${title}</h2>${subtitle}<div class="grid">${cards}</div></div></section>`;
  }
  if (layout === 'steps') {
    const steps = slide.bullets.slice(0, 4).map((item, itemIndex) => `<div class="step"><span class="bubble">${itemIndex + 1}</span><p>${escapeHtml(item)}</p></div>`).join('');
    return `<section><div class="paper steps"><h2>${title}</h2>${steps}${question}</div></section>`;
  }
  if (layout === 'focus') {
    return `<section><div class="paper focus">${img || '<div class="band"></div>'}<div class="copy"><h2>${title}</h2>${subtitle}${bullets ? `<ul>${bullets}</ul>` : ''}${question}</div></div></section>`;
  }
  const side = img || `<div class="band"><p class="kicker">Look</p><p>${escapeHtml(slide.question || slide.subtitle || 'What do you notice?')}</p></div>`;
  return `<section><div class="paper split"><div class="copy"><h2>${title}</h2>${subtitle}${bullets ? `<ul>${bullets}</ul>` : ''}${question}</div>${side}</div></section>`;
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function fileWords(files: AttachedDocument[]): number {
  return countWords(files.map((file) => file.extractedText).join(' '));
}

function useDictation(onAppend: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const recRef = useRef<{ stop: () => void } | null>(null);

  const toggle = () => {
    if (listening) {
      recRef.current?.stop();
      setListening(false);
      return;
    }
    const Speech = (window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec })
      .SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: new () => SpeechRec }).webkitSpeechRecognition;
    if (!Speech) return;
    const rec = new Speech();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = 'en-US';
    rec.onresult = (event) => {
      const text = event.results[0]?.[0]?.transcript?.trim();
      if (text) onAppend(text);
    };
    rec.onend = () => setListening(false);
    recRef.current = rec;
    rec.start();
    setListening(true);
  };

  return { listening, toggle };
}

type SpeechRec = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript?: string }>> }) => void) | null;
  onend: (() => void) | null;
};

function FileRow({
  files,
  words,
  onPick,
  onRemove,
}: {
  files: AttachedDocument[];
  words: number;
  onPick: (list: FileList | null) => void;
  onRemove: (id: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="mt-3">
      <div className="mv-pres-muted flex items-center justify-between gap-3 text-xs">
        <button
          type="button"
          className="mv-pres-field inline-flex items-center gap-2 rounded-lg px-3 py-1.5 font-semibold"
          onClick={() => inputRef.current?.click()}
        >
          <FileText className="h-3.5 w-3.5" />
          Add File
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
        <span>Total file word count: {words.toLocaleString()}/{WORD_LIMIT.toLocaleString()}</span>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx,.txt,.md,image/*"
          className="hidden"
          multiple
          onChange={(event) => {
            onPick(event.target.files);
            event.target.value = '';
          }}
        />
      </div>
      {files.length ? (
        <ul className="mt-2 flex flex-wrap gap-2">
          {files.map((file) => (
            <li key={file.id} className="mv-pres-field inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs">
              {file.isProcessing ? 'Reading…' : file.name}
              <button type="button" className="mv-pres-muted" onClick={() => onRemove(file.id)} aria-label={`Remove ${file.name}`}>
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function slideImageSrc(src: string): string {
  if (typeof window === 'undefined') return src;
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') return src.replace('://localhost:', '://127.0.0.1:');
  return src;
}

function SlidePicture({ src }: { src: string }) {
  return <img src={slideImageSrc(src)} alt="" className="h-full w-full object-cover" />;
}

function SlideCopy({ slide, colors, cover = false }: { slide: PresentationSlide; colors: SlideColors; cover?: boolean }) {
  return (
    <>
      <h2 className="mv-slide-title break-words font-semibold tracking-tight">{slide.title}</h2>
      {slide.subtitle ? <p className="mv-slide-copy mt-[0.45em] line-clamp-2" style={{ color: cover ? colors.onBand : colors.muted }}>{slide.subtitle}</p> : null}
      {slide.bullets.length ? (
        <ul className="mv-slide-copy mt-[0.7em] list-disc space-y-[0.28em] pl-[1.15em]">
          {slide.bullets.slice(0, 4).map((item) => (
            <li key={item} className="line-clamp-2">{item}</li>
          ))}
        </ul>
      ) : null}
      {slide.question ? (
        <p className="mv-slide-copy mt-[0.7em] line-clamp-2 w-fit max-w-full rounded-full px-[0.8em] py-[0.35em]" style={{ background: colors.soft, color: colors.ink }}>{slide.question}</p>
      ) : null}
    </>
  );
}

function VisualSlide({ slide, index, colors }: { slide: PresentationSlide; index: number; colors: SlideColors }) {
  const layout = slideLayout(slide, index);
  const picture = slide.imageUrl ? <SlidePicture src={slide.imageUrl} /> : null;
  if (layout === 'cover') {
    return (
      <div className="mv-slide-canvas mv-pres-slide flex flex-col justify-center px-[10%]" style={{ background: colors.band, color: colors.onBand }}>
        <p className="mv-slide-copy font-semibold uppercase tracking-[0.16em] opacity-80">Lesson</p>
        <h2 className="mv-slide-title mt-[0.35em] max-w-[18ch] font-semibold tracking-tight">{slide.title}</h2>
        {slide.subtitle ? <p className="mv-slide-copy mt-[0.7em] max-w-[40ch] opacity-90">{slide.subtitle}</p> : null}
        <span className="mt-[1.1em] h-[0.42em] w-[3.4em] rounded-full" style={{ background: colors.onBand }} />
      </div>
    );
  }
  if (layout === 'quote') {
    return (
      <div className="mv-slide-canvas mv-pres-slide flex flex-col justify-center px-[12%]" style={{ background: colors.band, color: colors.onBand }}>
        <p className="mv-slide-copy font-semibold uppercase tracking-[0.14em] opacity-80">{slide.title}</p>
        <p className="mt-[0.45em] max-w-[22ch] font-semibold tracking-tight" style={{ fontSize: 'clamp(1.35rem, 4.8cqw, 2.8rem)', lineHeight: 1.12 }}>{slide.question || slide.subtitle || slide.bullets[0]}</p>
      </div>
    );
  }
  if (layout === 'cards') {
    const items = slide.bullets.slice(0, 3);
    return (
      <div className="mv-slide-canvas mv-pres-slide flex flex-col px-[6%] py-[7%]" style={{ background: colors.paper, color: colors.ink }}>
        <h2 className="mv-slide-title font-semibold tracking-tight">{slide.title}</h2>
        {slide.subtitle ? <p className="mv-slide-copy mt-[0.35em]" style={{ color: colors.muted }}>{slide.subtitle}</p> : null}
        <div className={`mt-[4%] grid min-h-0 flex-1 gap-[2.5%] ${items.length > 2 ? 'grid-cols-3' : 'grid-cols-2'}`}>
          {items.map((item, itemIndex) => (
            <div key={item} className="flex min-h-0 flex-col justify-between rounded-[1.2cqw] p-[7%]" style={{ background: colors.soft }}>
              <span className="font-semibold" style={{ color: colors.accent, fontSize: 'clamp(1rem, 2.4cqw, 1.6rem)' }}>{itemIndex + 1}</span>
              <p className="mv-slide-copy line-clamp-4">{item}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (layout === 'steps') {
    return (
      <div className="mv-slide-canvas mv-pres-slide flex flex-col justify-center px-[8%] py-[7%]" style={{ background: colors.paper, color: colors.ink }}>
        <h2 className="mv-slide-title font-semibold tracking-tight">{slide.title}</h2>
        <ol className="mt-[4%] space-y-[0.55em]">
          {slide.bullets.slice(0, 4).map((item, itemIndex) => (
            <li key={item} className="mv-slide-copy flex items-start gap-[0.7em]">
              <span className="grid h-[1.7em] w-[1.7em] shrink-0 place-items-center rounded-full font-semibold" style={{ background: colors.accent, color: colors.paper }}>{itemIndex + 1}</span>
              <span className="line-clamp-2 pt-[0.15em]">{item}</span>
            </li>
          ))}
        </ol>
        {slide.question ? <p className="mv-slide-copy mt-[0.8em] line-clamp-2 w-fit max-w-full rounded-full px-[0.8em] py-[0.35em]" style={{ background: colors.soft }}>{slide.question}</p> : null}
      </div>
    );
  }
  if (layout === 'focus') {
    return (
      <div className="mv-slide-canvas mv-pres-slide grid grid-cols-[1.05fr_0.95fr]" style={{ background: colors.paper, color: colors.ink }}>
        {picture ?? <div style={{ background: colors.soft }} />}
        <div className="flex min-w-0 flex-col justify-center px-[7%] py-[8%]">
          <SlideCopy slide={slide} colors={colors} />
        </div>
      </div>
    );
  }
  return (
    <div className="mv-slide-canvas mv-pres-slide grid grid-cols-[1.15fr_0.85fr]" style={{ background: colors.paper, color: colors.ink }}>
      <div className="flex min-w-0 flex-col justify-center px-[6%] py-[7%]">
        <span className="mb-[0.7em] h-[0.38em] w-[2.4em] rounded-full" style={{ background: colors.accent }} />
        <SlideCopy slide={slide} colors={colors} />
      </div>
      {picture ?? (
        <div className="flex flex-col justify-end p-[8%]" style={{ background: colors.band, color: colors.onBand }}>
          <p className="mv-slide-copy font-semibold uppercase tracking-[0.14em]" style={{ color: colors.accent }}>Look</p>
          <p className="mt-[0.4em] font-semibold" style={{ fontSize: 'clamp(1rem, 2.6cqw, 1.7rem)', lineHeight: 1.2 }}>{slide.question || slide.subtitle || 'What do you notice?'}</p>
        </div>
      )}
    </div>
  );
}

export function PresentationGenerator() {
  const [gradeLevel, setGradeLevel] = useState('9th grade');
  const [slideCount, setSlideCount] = useState<PresentationSlideCount>('standard');
  const [topic, setTopic] = useState('');
  const [criteria, setCriteria] = useState('');
  const [topicFiles, setTopicFiles] = useState<AttachedDocument[]>([]);
  const [criteriaFiles, setCriteriaFiles] = useState<AttachedDocument[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [deck, setDeck] = useState<PresentationResponse | null>(null);
  const [shown, setShown] = useState(0);
  const [phase, setPhase] = useState<'form' | 'studio'>('form');
  const [theme, setTheme] = useState<PresentationTheme>('made');
  const [promptOpen, setPromptOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [followUp, setFollowUp] = useState('');
  const [thread, setThread] = useState<string[]>([]);
  const [revising, setRevising] = useState(false);
  const [favorited, setFavorited] = useState(false);
  const seenDeck = useRef(false);
  const topicMic = useDictation((text) => setTopic((prev) => (prev ? `${prev} ${text}` : text)));
  const criteriaMic = useDictation((text) => setCriteria((prev) => (prev ? `${prev} ${text}` : text)));

  const topicWordCount = countWords(topic) + fileWords(topicFiles);
  const criteriaWordCount = countWords(criteria) + fileWords(criteriaFiles);
  const overLimit = topicWordCount > WORD_LIMIT || criteriaWordCount > WORD_LIMIT;
  const filesBusy = [...topicFiles, ...criteriaFiles].some((file) => file.isProcessing);
  const canGenerate = topic.trim().length > 2 && Boolean(gradeLevel) && !overLimit && !busy && !filesBusy;

  const attach = async (field: 'topic' | 'criteria', list: FileList | null) => {
    if (!list?.length) return;
    const setFiles = field === 'topic' ? setTopicFiles : setCriteriaFiles;
    for (const [index, file] of Array.from(list).entries()) {
      const id = `file_${Date.now()}_${index}`;
      setFiles((prev) => [...prev, { id, name: file.name, extractedText: '', isProcessing: true }]);
      try {
        const extracted = await extractDocumentText(file);
        setFiles((prev) =>
          prev.map((item) =>
            item.id === id ? { ...item, extractedText: extracted.text, imageDataUrl: extracted.imageDataUrl, isProcessing: false } : item,
          ),
        );
      } catch (err) {
        setFiles((prev) => prev.filter((item) => item.id !== id));
        setError(err instanceof Error ? err.message : `Could not read ${file.name}`);
      }
    }
  };

  const payload = (): PresentationPayload => {
    const files = [...topicFiles, ...criteriaFiles];
    return {
      gradeLevel,
      slideCount,
      topic: topic.trim(),
      additionalCriteria: criteria.trim() || undefined,
      attachments: files.map((file) => file.name),
      attachedDocumentContext: documentContext(files).slice(0, 180_000) || undefined,
      imageFiles: documentImages(files).slice(0, 4),
    };
  };

  const run = async (extra?: string) => {
    const instruction = extra?.trim() ?? '';
    const isRevision = Boolean(instruction && deck);
    if (!isRevision && !canGenerate) return;
    if (topic.trim().length < 3) return;
    setBusy(true);
    setRevising(isRevision);
    setError('');
    setPhase('studio');
    if (!isRevision) {
      seenDeck.current = false;
      setDeck(null);
      setShown(0);
      setThread([]);
    }
    const body = payload();
    if (isRevision && deck) {
      body.revision = instruction;
      body.currentSlides = deck.slides;
    }
    try {
      const next = await api.generatePresentation(body);
      if (isRevision && deck) {
        const unchanged =
          next.slides.length === deck.slides.length &&
          next.slides.every((slide, index) => slide.title === deck.slides[index]?.title && slide.bullets.join('|') === deck.slides[index]?.bullets.join('|'));
        setDeck(unchanged ? revisePresentation(deck, instruction) : next);
        setThread((prev) => [...prev, instruction]);
      } else {
        setDeck(next);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      if (!isRevision && /unauthorized|grade level/i.test(message)) {
        setPhase('form');
        setError(message || 'Could not generate the presentation.');
      } else if (isRevision && deck) {
        setDeck(revisePresentation(deck, instruction));
        setThread((prev) => [...prev, instruction]);
      } else {
        setDeck(fallbackPresentation(body));
      }
    } finally {
      setBusy(false);
      setRevising(false);
      setFollowUp('');
    }
  };

  useEffect(() => {
    if (!deck) return;
    if (seenDeck.current) {
      setShown(deck.slides.length);
      return;
    }
    seenDeck.current = true;
    setShown(1);
    let current = 1;
    const timer = window.setInterval(() => {
      current += 1;
      if (current >= deck.slides.length) {
        setShown(deck.slides.length);
        window.clearInterval(timer);
        return;
      }
      setShown(current);
    }, 650);
    return () => window.clearInterval(timer);
  }, [deck]);

  const expected = presentationSlideTarget(slideCount);
  const total = deck?.slides.length ?? expected;
  const visibleSlides = deck?.slides.slice(0, shown) ?? [];
  const writing = !deck || shown < (deck?.slides.length ?? 0);
  const colors = THEME_STYLE[theme];
  const deckTitle = deck?.title || topic.split(/[.\n]/)[0]?.trim() || 'Presentation';

  const outline = useMemo(() => {
    if (!deck) return '';
    return deck.slides
      .map((slide, index) => {
        const lines = [`Slide ${index + 1}: ${slide.title}`, slide.subtitle ?? '', ...slide.bullets.map((item) => `- ${item}`), slide.question ? `Question: ${slide.question}` : '', slide.speakerNotes ? `Notes: ${slide.speakerNotes}` : ''];
        return lines.filter(Boolean).join('\n');
      })
      .join('\n\n');
  }, [deck]);

  const download = (kind: 'html' | 'txt') => {
    if (!deck) return;
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(deck.title)}</title>
      <style>
        body{margin:0;background:#111}
        section{width:13.333in;height:7.5in;margin:0 auto 16px;overflow:hidden;font-family:Georgia,serif}
        img{width:100%;height:100%;object-fit:cover}
        h2{font-size:32pt;line-height:1.08;margin:0}
        p,li{font-size:16pt;line-height:1.35}
        .kicker{font-size:13pt;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:${colors.accent}}
        .cover,.quote{background:${colors.band};color:${colors.onBand};display:flex;flex-direction:column;justify-content:center;padding:.9in;height:7.5in}
        .quote p{font-size:36pt;line-height:1.12;margin:.3in 0 0;max-width:9in}
        .mark{width:.7in;height:.12in;border-radius:99px;background:${colors.accent};margin-top:.35in}
        .paper{background:${colors.paper};color:${colors.ink};height:7.5in}
        .split{display:grid;grid-template-columns:1.15fr .85fr}
        .focus{display:grid;grid-template-columns:1.05fr .95fr}
        .copy{display:flex;flex-direction:column;justify-content:center;padding:.55in .6in;min-width:0}
        .band{background:${colors.band};color:${colors.onBand};display:flex;flex-direction:column;justify-content:flex-end;padding:.55in}
        .cards{display:flex;flex-direction:column;padding:.5in .6in}
        .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:.22in;margin-top:.3in;flex:1}
        .card{background:${colors.soft};border-radius:16px;padding:.24in;display:flex;flex-direction:column;justify-content:space-between}
        .num{color:${colors.accent};font-size:22pt;font-weight:700}
        .steps{padding:.55in .75in;display:flex;flex-direction:column;justify-content:center}
        .step{display:flex;gap:.18in;align-items:flex-start;margin-top:.16in}
        .bubble{width:.38in;height:.38in;border-radius:99px;background:${colors.accent};color:${colors.paper};display:grid;place-items:center;font-weight:700;flex:none}
        .chip{display:inline-block;margin-top:.18in;padding:6pt 12pt;border-radius:999px;background:${colors.soft};color:${colors.ink}}
      </style></head><body>
      ${deck.slides.map((slide, index) => exportSlideHtml(slide, index, colors)).join('')}</body></html>`;
    const blob = new Blob([kind === 'html' ? html : outline], { type: kind === 'html' ? 'text/html' : 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${deck.title.replace(/[^\w]+/g, '-').toLowerCase()}.${kind}`;
    link.click();
    URL.revokeObjectURL(url);
    setExportOpen(false);
  };

  if (phase === 'studio') {
    return (
      <div className="mv-presentation mv-pres-studio grid min-h-[780px] w-full max-w-full grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="mv-pres-rail flex flex-col border-b p-4 lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Presentation Generator</h2>
            <button type="button" className="mv-pres-muted" onClick={() => void api.toggleTeacherToolFavorite('presentation-generator').then((res) => setFavorited(res.favorited)).catch(() => setFavorited((value) => !value))} aria-label="Favorite">
              <Star className={`h-4 w-4 ${favorited ? 'fill-amber-300 text-amber-300' : ''}`} />
            </button>
          </div>
          <button type="button" className="mv-pres-muted mt-4 inline-flex items-center gap-2 text-sm" onClick={() => setPromptOpen((open) => !open)}>
            Show prompt <ChevronDown className="h-4 w-4" />
          </button>
          {promptOpen ? (
            <div className="mv-pres-field mt-3 rounded-xl p-3 text-xs leading-5">
              <p>Grade: {gradeLevel}</p>
              <p className="mt-1">Slides: {PRESENTATION_SLIDE_OPTIONS.find((item) => item.id === slideCount)?.label}</p>
              <p className="mt-2 whitespace-pre-wrap">{topic}</p>
              {criteria ? <p className="mv-pres-muted mt-2 whitespace-pre-wrap">{criteria}</p> : null}
            </div>
          ) : null}
          <div className="mv-pres-field mv-pres-status mt-4 rounded-xl p-3">
            <p className="font-semibold">{deckTitle}</p>
            <p className="mv-pres-muted mt-2 text-xs">{revising ? 'Updating the deck…' : writing ? `Writing your slides… ${shown} of ${total}` : `${total} slides ready`}</p>
            {writing ? (
              <div className="mv-pres-progress mt-3" aria-hidden>
                <span style={{ width: `${Math.max(8, Math.round((shown / Math.max(total, 1)) * 100))}%` }} />
              </div>
            ) : null}
          </div>
          {thread.length ? (
            <ul className="mt-3 space-y-2 text-xs">
              {thread.map((note, index) => (
                <li key={`${index}-${note}`} className="mv-pres-field rounded-xl px-3 py-2">{note}</li>
              ))}
            </ul>
          ) : null}
          <div className="pt-4">
            <label className="sr-only" htmlFor="presentation-follow-up">Continue the conversation</label>
            <textarea
              id="presentation-follow-up"
              value={followUp}
              onChange={(event) => setFollowUp(event.target.value)}
              placeholder="Add a slide, change one, or ask for a quiz…"
              className="mv-pres-field h-20 w-full resize-none rounded-xl px-3 py-2 text-sm outline-none"
            />
            <button
              type="button"
              disabled={busy || followUp.trim().length < 2}
              className="mv-pres-generate mt-2 w-full rounded-xl py-2 text-sm font-semibold disabled:opacity-50"
              onClick={() => void run(followUp)}
            >
              {revising ? 'Updating…' : 'Update slides'}
            </button>
            <button type="button" className="mv-pres-muted mt-2 w-full text-xs" onClick={() => setPhase('form')}>
              Edit the form
            </button>
          </div>
        </aside>
        <section
          className="mv-pres-stage min-w-0 overflow-x-hidden"
          style={{ background: colors.stage, ['--pres-wash' as string]: colors.wash }}
        >
          <header className="mv-pres-chrome flex items-center justify-between gap-3 border-b border-black/5 px-5 py-3" style={{ color: stageInk(colors.stage, colors.title) }}>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-semibold">{deckTitle}</h1>
              <p className="mt-0.5 text-xs">{revising ? 'Applying your change…' : writing ? `Generating slides… ${shown}/${total}` : `Slide ${Math.min(shown, total)}/${total}`}</p>
            </div>
            <div className="relative shrink-0">
              <button type="button" className="mv-pres-export rounded-lg px-3 py-1.5 text-xs font-semibold" onClick={() => setExportOpen((open) => !open)}>
                Export
              </button>
              {exportOpen ? (
                <div className="mv-pres-field absolute right-0 z-10 mt-2 w-44 rounded-xl p-1 text-sm shadow-xl">
                  <button type="button" className="block w-full rounded-lg px-3 py-2 text-left" onClick={() => download('html')}>Download slides</button>
                  <button type="button" className="block w-full rounded-lg px-3 py-2 text-left" onClick={() => download('txt')}>Download outline</button>
                </div>
              ) : null}
            </div>
          </header>
          <div className="mx-auto flex w-full max-w-[1080px] flex-wrap items-center gap-2 px-4 py-3 sm:px-8">
            {PRESENTATION_THEMES.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTheme(item.id)}
                data-active={theme === item.id ? 'true' : 'false'}
                className="mv-pres-chip inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
              >
                <span className="h-2.5 w-2.5 rounded-full ring-1 ring-black/15" style={{ background: THEME_STYLE[item.id].dot }} />
                {item.id === 'made' ? <Sparkles className="h-3 w-3" /> : null}
                {item.label}
              </button>
            ))}
          </div>
          <div className={`mx-auto w-full max-w-[1280px] px-4 py-6 sm:px-8 ${deck ? 'space-y-8' : 'flex min-h-[62vh] flex-col justify-center'}`}>
            {visibleSlides.map((slide, index) => (
              <article key={`${index}-${slide.title}`}>
                <p className="mv-pres-chrome mx-auto mb-2 w-full max-w-[1280px] text-xs" style={{ color: stageInk(colors.stage, colors.title) }}>Slide {index + 1}/{total}</p>
                <div className="mv-slide-frame overflow-hidden rounded-md shadow-xl">
                  <VisualSlide slide={slide} index={index} colors={colors} />
                </div>
                {slide.speakerNotes ? <p className="mv-pres-chrome mx-auto mt-3 w-full max-w-[1280px] text-xs" style={{ color: stageInk(colors.stage, colors.title) }}>Teacher notes: {slide.speakerNotes}</p> : null}
              </article>
            ))}
            {!deck ? (
              <div className="mv-slide-frame mv-pres-loading overflow-hidden rounded-md" role="status">
                <div className="mv-slide-canvas grid grid-cols-1 bg-white">
                  <div className="flex flex-col justify-center gap-3 px-[10%]">
                    <span className="h-6 w-2/5 rounded-lg bg-black/10" />
                    <span className="h-4 w-3/5 rounded-lg bg-black/10" />
                    <span className="h-4 w-1/2 rounded-lg bg-black/10" />
                    <span className="mt-2 h-7 w-1/3 rounded-full bg-black/5" />
                  </div>
                  <p className="absolute inset-x-0 bottom-3 flex items-center justify-center gap-2 text-sm font-medium" style={{ color: '#57534e' }}>
                    <Loader2 className="h-4 w-4 animate-spin" /> Writing your slides…
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="mv-presentation mv-pres-form min-h-[780px] w-full px-4 py-8 md:px-8">
      <nav className="mb-6 flex w-full items-center gap-2 text-sm">
        <Link to="/teacher/tools" className="mv-pres-link no-underline">Teacher Tools</Link>
        <span className="mv-pres-muted">›</span>
        <span>Presentation Generator</span>
      </nav>
      <form
        className="mv-pres-card w-full rounded-2xl p-6 shadow-2xl md:p-8"
        onSubmit={(event) => {
          event.preventDefault();
          void run();
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold">
              Presentation Generator
              <button type="button" aria-label="Favorite this tool" onClick={() => void api.toggleTeacherToolFavorite('presentation-generator').then((res) => setFavorited(res.favorited)).catch(() => setFavorited((value) => !value))}>
                <Star className={`h-5 w-5 ${favorited ? 'fill-amber-300 text-amber-300' : 'mv-pres-muted'}`} />
              </button>
            </h1>
            <p className="mv-pres-muted mt-2 text-sm">All-new presentation generator experience with images, themes, editing, and exports.</p>
          </div>
          <button
            type="button"
            className="mv-pres-accent text-sm font-semibold"
            onClick={() => {
              setGradeLevel('9th grade');
              setSlideCount('standard');
              setTopic('Mitosis. How can one cell make an exact copy? Explain the stages and why the daughter cells match.');
              setCriteria('Make sure that the slides include at least three questions throughout');
            }}
          >
            Show exemplar
          </button>
        </div>

        <label className="mt-6 block text-sm font-semibold" htmlFor="presentation-grade">Grade level: *</label>
        <select id="presentation-grade" className={FIELD} value={gradeLevel} onChange={(event) => setGradeLevel(event.target.value)} required>
          {LESSON_PLAN_GRADE_LEVELS.map((grade) => (
            <option key={grade} value={grade}>{grade}</option>
          ))}
        </select>

        <label className="mt-5 block text-sm font-semibold" htmlFor="presentation-count">Number of Slides: *</label>
        <select id="presentation-count" className={FIELD} value={slideCount} onChange={(event) => setSlideCount(event.target.value as PresentationSlideCount)} required>
          {PRESENTATION_SLIDE_OPTIONS.map((option) => (
            <option key={option.id} value={option.id}>{option.label}</option>
          ))}
        </select>

        <label className="mt-5 block text-sm font-semibold" htmlFor="presentation-topic">Topic, Standard, or Objective: *</label>
        <div className="relative">
          <textarea
            id="presentation-topic"
            className={`${FIELD} min-h-36 pr-10`}
            value={topic}
            required
            onChange={(event) => setTopic(event.target.value)}
            placeholder="Add the topic, standard, or longer description of what you’re teaching. You can also use the paperclip icon to the left to attach content to base your presentation on."
          />
          <button type="button" className="mv-pres-muted absolute bottom-3 left-3" aria-label="Dictate the topic" onClick={topicMic.toggle}>
            <Mic className={`h-4 w-4 ${topicMic.listening ? 'text-violet-300' : ''}`} />
          </button>
          <Paperclip className="mv-pres-muted pointer-events-none absolute bottom-3 right-3 h-4 w-4" />
        </div>
        <FileRow files={topicFiles} words={fileWords(topicFiles)} onPick={(list) => void attach('topic', list)} onRemove={(id) => setTopicFiles((prev) => prev.filter((file) => file.id !== id))} />

        <div className="mt-6 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Additional Criteria:</h2>
          <button
            type="button"
            className="mv-pres-accent inline-flex items-center gap-1 text-xs font-semibold"
            onClick={() => {
              if (topic.trim().length < 3) {
                setError('Add a topic first, then the prompt assistant can expand it.');
                return;
              }
              setCriteria((prev) =>
                prev.trim()
                  ? prev
                  : `Build an advanced ${gradeLevel} deck. Move from a phenomenon, to the model, to a worked example, to a misconception, then a new case. Include at least three student questions.`,
              );
              setTopic((prev) => (prev.length > 180 ? prev : `${prev.trim()}\n\nTeach this so students can explain the mechanism and use it on an example they have not seen.`));
            }}
          >
            <Sparkles className="h-3.5 w-3.5" /> Prompt assistant
          </button>
        </div>
        <div className="relative">
          <textarea
            id="presentation-criteria"
            className={`${FIELD} min-h-24`}
            value={criteria}
            onChange={(event) => setCriteria(event.target.value)}
            placeholder="Make sure that the slides include at least three questions throughout"
          />
          <button type="button" className="mv-pres-muted absolute bottom-3 left-3" aria-label="Dictate additional criteria" onClick={criteriaMic.toggle}>
            <Mic className={`h-4 w-4 ${criteriaMic.listening ? 'text-violet-300' : ''}`} />
          </button>
        </div>
        <FileRow files={criteriaFiles} words={fileWords(criteriaFiles)} onPick={(list) => void attach('criteria', list)} onRemove={(id) => setCriteriaFiles((prev) => prev.filter((file) => file.id !== id))} />

        {overLimit ? <p className="mt-4 text-sm text-rose-300">File and description text must stay within {WORD_LIMIT.toLocaleString()} words.</p> : null}
        {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}

        <button
          type="submit"
          disabled={!canGenerate}
          className="mv-pres-generate mt-6 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-base font-semibold disabled:opacity-50"
        >
          {busy || filesBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {filesBusy ? 'Reading files…' : 'Generate'}
        </button>
      </form>
    </div>
  );
}
