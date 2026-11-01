import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, FileText, Loader2, Mic, Paperclip, Sparkles, Star } from 'lucide-react';
import {
  LESSON_PLAN_GRADE_LEVELS,
  PRESENTATION_SLIDE_OPTIONS,
  PRESENTATION_THEMES,
  fallbackPresentation,
  presentationSlideTarget,
  type PresentationPayload,
  type PresentationResponse,
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
const FIELD =
  'mt-2 w-full rounded-xl border border-white/10 bg-[#12141c] px-4 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-violet-400/70';

const THEME_STYLE: Record<
  PresentationTheme,
  { stage: string; card: string; title: string; body: string; chip: string; dot: string }
> = {
  made: { stage: '#14161e', card: '#e07a62', title: '#1c1917', body: '#44403c', chip: '#fff7f3', dot: '#e07a62' },
  light: { stage: '#ececef', card: '#ffffff', title: '#18181b', body: '#3f3f46', chip: '#f4f4f5', dot: '#d4d4d8' },
  dark: { stage: '#0c0e14', card: '#18181b', title: '#fafafa', body: '#d4d4d8', chip: '#27272a', dot: '#52525b' },
  magic: { stage: '#140c24', card: '#5b21b6', title: '#f5f3ff', body: '#ddd6fe', chip: '#2e1065', dot: '#c4b5fd' },
  playful: { stage: '#1a120c', card: '#f59e0b', title: '#1c1917', body: '#44403c', chip: '#fffbeb', dot: '#fbbf24' },
  chalk: { stage: '#0d1f18', card: '#166534', title: '#ecfccb', body: '#d9f99d', chip: '#052e16', dot: '#4ade80' },
  notebook: { stage: '#f3efe6', card: '#fffdf8', title: '#1e3a5f', body: '#334155', chip: '#eff6ff', dot: '#93c5fd' },
  scholar: { stage: '#0b1220', card: '#1e293b', title: '#f8fafc', body: '#cbd5e1', chip: '#0f172a', dot: '#eab308' },
};

function countWords(value: string): number {
  return value.trim() ? value.trim().split(/\s+/).length : 0;
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
      <div className="flex items-center justify-between gap-3 text-xs text-slate-400">
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-[#12141c] px-3 py-1.5 font-semibold text-slate-200"
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
            <li key={file.id} className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-xs text-slate-300">
              {file.isProcessing ? 'Reading…' : file.name}
              <button type="button" className="text-slate-400" onClick={() => onRemove(file.id)} aria-label={`Remove ${file.name}`}>
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : null}
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
  const [favorited, setFavorited] = useState(false);
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
    if (!extra && !canGenerate) return;
    if (topic.trim().length < 3) return;
    setBusy(true);
    setError('');
    setPhase('studio');
    setDeck(null);
    setShown(0);
    const body = payload();
    if (extra?.trim()) {
      body.additionalCriteria = [body.additionalCriteria, extra.trim()].filter(Boolean).join('\n\n');
    }
    try {
      setDeck(await api.generatePresentation(body));
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      if (/unauthorized|grade level/i.test(message)) {
        setPhase('form');
        setError(message || 'Could not generate the presentation.');
      } else {
        setDeck(fallbackPresentation(body));
      }
    } finally {
      setBusy(false);
      setFollowUp('');
    }
  };

  useEffect(() => {
    if (!deck) return;
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
      <style>body{margin:0;font-family:Georgia,serif;background:${colors.stage}} section{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:48px} article{width:min(960px,100%);background:${colors.card};color:${colors.title};border-radius:28px;padding:64px} h1{font-size:64px;margin:0} h2{font-size:36px;margin:0 0 16px} p,li{color:${colors.body};font-size:22px;line-height:1.45}</style></head><body>
      ${deck.slides
        .map(
          (slide) => `<section><article><p>Slide</p><h1>${escapeHtml(slide.title)}</h1>${slide.subtitle ? `<p>${escapeHtml(slide.subtitle)}</p>` : ''}${slide.bullets.length ? `<ul>${slide.bullets.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : ''}${slide.question ? `<p><strong>${escapeHtml(slide.question)}</strong></p>` : ''}</article></section>`,
        )
        .join('')}</body></html>`;
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
      <div className="flex min-h-[780px] w-full text-slate-100" style={{ background: '#0e1016' }}>
        <aside className="flex w-[280px] shrink-0 flex-col border-r border-white/10 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Presentation Generator</h2>
            <button type="button" className="text-slate-400" onClick={() => void api.toggleTeacherToolFavorite('presentation-generator').then((res) => setFavorited(res.favorited)).catch(() => setFavorited((value) => !value))} aria-label="Favorite">
              <Star className={`h-4 w-4 ${favorited ? 'fill-amber-300 text-amber-300' : ''}`} />
            </button>
          </div>
          <button type="button" className="mt-4 inline-flex items-center gap-2 text-sm text-slate-300" onClick={() => setPromptOpen((open) => !open)}>
            Show prompt <ChevronDown className="h-4 w-4" />
          </button>
          {promptOpen ? (
            <div className="mt-3 rounded-xl bg-white/5 p-3 text-xs leading-5 text-slate-300">
              <p><span className="text-slate-500">Grade:</span> {gradeLevel}</p>
              <p className="mt-1"><span className="text-slate-500">Slides:</span> {PRESENTATION_SLIDE_OPTIONS.find((item) => item.id === slideCount)?.label}</p>
              <p className="mt-2 whitespace-pre-wrap">{topic}</p>
              {criteria ? <p className="mt-2 whitespace-pre-wrap text-slate-400">{criteria}</p> : null}
            </div>
          ) : null}
          <div className="mt-4 rounded-xl border border-violet-400/40 bg-[#171a24] p-3">
            <p className="font-semibold">{deckTitle}</p>
            <p className="mt-2 text-xs text-slate-400">{writing ? `Writing your slides… ${shown} of ${total}` : `${total} slides ready`}</p>
          </div>
          <div className="mt-auto pt-4">
            <label className="sr-only" htmlFor="presentation-follow-up">Continue the conversation</label>
            <textarea
              id="presentation-follow-up"
              value={followUp}
              onChange={(event) => setFollowUp(event.target.value)}
              placeholder="Continue the conversation…"
              className="h-20 w-full resize-none rounded-xl border border-white/10 bg-[#12141c] px-3 py-2 text-sm outline-none"
            />
            <button
              type="button"
              disabled={busy || followUp.trim().length < 2}
              className="mt-2 w-full rounded-xl bg-violet-500 py-2 text-sm font-semibold text-white disabled:opacity-50"
              onClick={() => void run(followUp)}
            >
              {busy ? 'Updating…' : 'Update slides'}
            </button>
            <button type="button" className="mt-2 w-full text-xs text-slate-400" onClick={() => setPhase('form')}>
              Edit the form
            </button>
          </div>
        </aside>
        <section className="min-w-0 flex-1" style={{ background: colors.stage }}>
          <header className="flex items-center justify-between gap-3 border-b border-black/10 px-5 py-3" style={{ color: colors.title }}>
            <h1 className="truncate text-sm font-semibold">{deckTitle}</h1>
            <div className="flex items-center gap-2">
              <div className="relative">
                <button type="button" className="rounded-lg border border-black/10 bg-black/20 px-3 py-1.5 text-xs font-semibold text-white" onClick={() => setExportOpen((open) => !open)}>
                  Export
                </button>
                {exportOpen ? (
                  <div className="absolute right-0 z-10 mt-2 w-44 rounded-xl border border-white/10 bg-[#171a24] p-1 text-sm text-slate-100 shadow-xl">
                    <button type="button" className="block w-full rounded-lg px-3 py-2 text-left hover:bg-white/5" onClick={() => download('html')}>Download slides</button>
                    <button type="button" className="block w-full rounded-lg px-3 py-2 text-left hover:bg-white/5" onClick={() => download('txt')}>Download outline</button>
                  </div>
                ) : null}
              </div>
            </div>
          </header>
          <div className="flex flex-wrap items-center gap-2 px-5 py-3">
            {PRESENTATION_THEMES.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTheme(item.id)}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
                style={{
                  background: theme === item.id ? '#6d28d9' : 'rgba(255,255,255,0.08)',
                  color: '#fff',
                }}
              >
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: THEME_STYLE[item.id].dot }} />
                {item.id === 'made' ? <Sparkles className="h-3 w-3" /> : null}
                {item.label}
              </button>
            ))}
          </div>
          <p className="px-5 text-sm text-slate-300">{writing ? `Generating slides… ${shown}/${total}` : `${total} slides`}</p>
          <div className="space-y-8 px-5 py-6">
            {visibleSlides.map((slide, index) => (
              <article key={`${slide.title}-${index}`}>
                <p className="mb-2 text-xs text-slate-400">Slide {index + 1}/{total}</p>
                <div className="mx-auto flex min-h-[360px] max-w-4xl flex-col items-center justify-center rounded-[28px] px-10 py-14 text-center shadow-xl" style={{ background: colors.card, color: colors.title }}>
                  <h2 className="text-5xl font-semibold tracking-tight">{slide.title}</h2>
                  {slide.subtitle ? (
                    <p className="mt-6 rounded-full px-4 py-1 text-sm" style={{ background: colors.chip, color: colors.body }}>{slide.subtitle}</p>
                  ) : null}
                  {slide.bullets.length ? (
                    <ul className="mt-6 max-w-xl space-y-2 text-left text-base" style={{ color: colors.body }}>
                      {slide.bullets.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  ) : null}
                  {slide.question ? <p className="mt-6 max-w-xl text-base font-medium" style={{ color: colors.body }}>{slide.question}</p> : null}
                  {writing && index === visibleSlides.length - 1 ? (
                    <p className="mt-8 rounded-full bg-white/80 px-4 py-1 text-xs font-semibold text-slate-700">Generating illustration…</p>
                  ) : (
                    <p className="mt-8 max-w-lg text-xs" style={{ color: colors.body }}>{slide.imagePrompt}</p>
                  )}
                </div>
                {slide.speakerNotes ? <p className="mx-auto mt-3 max-w-4xl text-xs text-slate-400">Teacher notes: {slide.speakerNotes}</p> : null}
              </article>
            ))}
            {!deck ? (
              <div className="mx-auto flex min-h-[360px] max-w-4xl items-center justify-center rounded-[28px] text-slate-300" style={{ background: colors.card }}>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Writing your slides…
              </div>
            ) : null}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-[780px] px-4 py-8 text-slate-100" style={{ background: '#0e1016' }}>
      <nav className="mx-auto mb-6 flex max-w-3xl items-center gap-2 text-sm text-slate-400">
        <Link to="/teacher/tools" className="text-slate-300 no-underline">Teacher Tools</Link>
        <span>›</span>
        <span className="text-slate-200">Presentation Generator</span>
      </nav>
      <form
        className="mx-auto max-w-3xl rounded-2xl border border-white/10 p-6 shadow-2xl"
        style={{ background: '#171922' }}
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
                <Star className={`h-5 w-5 ${favorited ? 'fill-amber-300 text-amber-300' : 'text-slate-500'}`} />
              </button>
            </h1>
            <p className="mt-2 text-sm text-slate-400">All-new presentation generator experience with images, themes, editing, and exports.</p>
          </div>
          <button
            type="button"
            className="text-sm font-semibold text-violet-300"
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
          <button type="button" className="absolute bottom-3 left-3 text-slate-500" aria-label="Dictate the topic" onClick={topicMic.toggle}>
            <Mic className={`h-4 w-4 ${topicMic.listening ? 'text-violet-300' : ''}`} />
          </button>
          <Paperclip className="pointer-events-none absolute bottom-3 right-3 h-4 w-4 text-slate-600" />
        </div>
        <FileRow files={topicFiles} words={fileWords(topicFiles)} onPick={(list) => void attach('topic', list)} onRemove={(id) => setTopicFiles((prev) => prev.filter((file) => file.id !== id))} />

        <div className="mt-6 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Additional Criteria:</h2>
          <button
            type="button"
            className="inline-flex items-center gap-1 text-xs font-semibold text-violet-300"
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
          <button type="button" className="absolute bottom-3 left-3 text-slate-500" aria-label="Dictate additional criteria" onClick={criteriaMic.toggle}>
            <Mic className={`h-4 w-4 ${criteriaMic.listening ? 'text-violet-300' : ''}`} />
          </button>
        </div>
        <FileRow files={criteriaFiles} words={fileWords(criteriaFiles)} onPick={(list) => void attach('criteria', list)} onRemove={(id) => setCriteriaFiles((prev) => prev.filter((file) => file.id !== id))} />

        {overLimit ? <p className="mt-4 text-sm text-rose-300">File and description text must stay within {WORD_LIMIT.toLocaleString()} words.</p> : null}
        {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}

        <button
          type="submit"
          disabled={!canGenerate}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-violet-500 py-3 text-base font-semibold text-white disabled:opacity-50"
        >
          {busy || filesBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {filesBusy ? 'Reading files…' : 'Generate'}
        </button>
      </form>
    </div>
  );
}
