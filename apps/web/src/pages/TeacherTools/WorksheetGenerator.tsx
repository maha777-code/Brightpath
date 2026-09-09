import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronDown,
  ChevronRight,
  FilePlus,
  History,
  Lightbulb,
  Loader2,
  Mic,
  RotateCcw,
  Sparkles,
  Star,
} from 'lucide-react';
import type { WorksheetGeneratorPayload, WorksheetGeneratorResponse } from '@brightpath/shared';
import { api } from '@/lib/api';

const GRADE_LEVELS = [
  'Kindergarten',
  '1st grade',
  '2nd grade',
  '3rd grade',
  '4th grade',
  '5th grade',
  '6th grade',
  '7th grade',
  '8th grade',
  '9th grade',
  '10th grade',
  '11th grade',
  '12th grade',
  'University',
];

const WORD_LIMIT = 75_000;
const EXEMPLAR_TOPIC = 'Mitosis';
const TOPIC_PLACEHOLDER =
  'Mitosis, World War II, paste a block of text or attach a PDF of content to base the worksheet on.';

const TOOL_TEXTAREA_STYLE: CSSProperties = {
  fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  WebkitTextFillColor: '#ffffff',
};

function countWords(value: string): number {
  return value.trim() ? value.trim().split(/\s+/).length : 0;
}

function sanitizePastedText(text: string): string {
  return text
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '')
    .normalize('NFC');
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

function useDictation(onAppend: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const recRef = useRef<{ stop: () => void } | null>(null);

  const toggle = () => {
    const Ctor =
      (
        window as unknown as {
          SpeechRecognition?: new () => SpeechRec;
          webkitSpeechRecognition?: new () => SpeechRec;
        }
      ).SpeechRecognition ??
      (
        window as unknown as {
          webkitSpeechRecognition?: new () => SpeechRec;
        }
      ).webkitSpeechRecognition;

    if (!Ctor) return;
    if (listening) {
      recRef.current?.stop();
      setListening(false);
      return;
    }
    const rec = new Ctor();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = 'en-US';
    rec.onresult = (event) => {
      const text = event.results[0]?.[0]?.transcript?.trim();
      if (text) onAppend(text);
    };
    rec.onend = () => setListening(false);
    recRef.current = rec;
    setListening(true);
    rec.start();
  };

  useEffect(() => () => recRef.current?.stop(), []);
  return { listening, toggle };
}

type FormSnapshot = {
  gradeLevel: string;
  topicOrText: string;
  files: string[];
};

function WorksheetTemplateSkeleton() {
  return (
    <div className="ws-doc" aria-hidden>
      <div className="mb-6 flex flex-wrap justify-between gap-4 text-sm text-slate-300">
        <span>
          Name <span className="inline-block min-w-[9rem] border-b border-slate-500">&nbsp;</span>
        </span>
        <span>
          Date <span className="inline-block min-w-[7rem] border-b border-slate-500">&nbsp;</span>
        </span>
      </div>
      <div className="mb-6 h-9 w-2/3 rounded bg-slate-700/80" />
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Title</p>
      <div className="mb-8 space-y-2">
        <div className="h-2.5 w-full rounded bg-slate-700/70" />
        <div className="h-2.5 w-5/6 rounded bg-slate-700/55" />
      </div>
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Section</p>
      <div className="mb-6 space-y-2">
        <div className="h-2.5 w-full rounded bg-slate-700/70" />
        <div className="h-2.5 w-4/5 rounded bg-slate-700/50" />
        <div className="h-2.5 w-3/5 rounded bg-slate-700/40" />
      </div>
      <ol className="space-y-4 text-sm text-slate-400">
        {[1, 2, 3, 4, 5].map((n) => (
          <li key={n} className="flex items-center gap-3">
            <span className="w-5 shrink-0 font-semibold text-slate-500">{n}.</span>
            <span className="h-2.5 flex-1 rounded bg-slate-700/60" />
          </li>
        ))}
      </ol>
    </div>
  );
}

function WorksheetDocument({ worksheet }: { worksheet: WorksheetGeneratorResponse }) {
  let number = 1;
  return (
    <div className="ws-doc">
      <div className="mb-6 flex flex-wrap justify-between gap-4 text-sm text-slate-200">
        <span>
          Name <span className="inline-block min-w-[9rem] border-b border-slate-500">&nbsp;</span>
        </span>
        <span>
          Date <span className="inline-block min-w-[7rem] border-b border-slate-500">&nbsp;</span>
        </span>
      </div>
      <p className="text-xs font-semibold uppercase tracking-widest text-violet-300">{worksheet.gradeLevel}</p>
      <h2 className="mt-1 text-2xl font-bold tracking-tight text-white">{worksheet.title}</h2>
      {worksheet.instructions ? (
        <p className="mt-2 text-sm leading-relaxed text-slate-300">{worksheet.instructions}</p>
      ) : null}
      <div className="mt-6 space-y-6">
        {worksheet.sections.map((section) => (
          <section key={section.heading}>
            <h3 className="mb-3 border-b border-slate-600 pb-1 text-sm font-bold uppercase tracking-wide text-slate-200">
              {section.heading}
            </h3>
            <ol className="space-y-4">
              {section.items.map((item) => {
                const n = number;
                number += 1;
                return (
                  <li key={`${item.id}-${n}`} className="text-sm leading-relaxed text-slate-100">
                    <p>
                      <span className="mr-2 font-semibold text-violet-300">{n}.</span>
                      {item.prompt}
                    </p>
                    <div className="mt-2 space-y-2 pl-6">
                      <div className="h-px bg-slate-600" />
                      <div className="h-px bg-slate-600" />
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
      </div>
    </div>
  );
}

export function WorksheetGenerator({
  favorited: favoritedProp,
  onToggleFavorite,
}: {
  favorited?: boolean;
  onToggleFavorite?: () => void;
}) {
  const [gradeLevel, setGradeLevel] = useState('9th grade');
  const [topicOrText, setTopicOrText] = useState('');
  const [files, setFiles] = useState<string[]>([]);
  const [showExemplar, setShowExemplar] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [worksheet, setWorksheet] = useState<WorksheetGeneratorResponse | null>(null);
  const [localFavorited, setLocalFavorited] = useState(false);
  const [history, setHistory] = useState<FormSnapshot[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (favoritedProp !== undefined) return;
    void api
      .teacherTools()
      .then((res) => setLocalFavorited(res.favoriteIds.includes('worksheet-generator')))
      .catch(() => undefined);
  }, [favoritedProp]);

  const favorited = favoritedProp ?? localFavorited;

  const toggleFavorite = () => {
    if (onToggleFavorite) {
      onToggleFavorite();
      return;
    }
    setLocalFavorited((v) => !v);
    void api.toggleTeacherToolFavorite('worksheet-generator').then((res) => {
      setLocalFavorited(res.favorited);
    });
  };

  const snapshot = (): FormSnapshot => ({
    gradeLevel,
    topicOrText,
    files,
  });

  const pushHistory = () => {
    setHistory((prev) => [...prev.slice(-11), snapshot()]);
  };

  const undo = () => {
    setHistory((prev) => {
      const last = prev[prev.length - 1];
      if (!last) {
        setGradeLevel('9th grade');
        setTopicOrText('');
        setFiles([]);
        setShowExemplar(false);
        return prev;
      }
      setGradeLevel(last.gradeLevel);
      setTopicOrText(last.topicOrText);
      setFiles(last.files);
      return prev.slice(0, -1);
    });
  };

  const resetAll = () => {
    setGradeLevel('9th grade');
    setTopicOrText('');
    setFiles([]);
    setShowExemplar(false);
    setAssistantOpen(false);
    setError(null);
    setWorksheet(null);
    setHistory([]);
  };

  const overLimit = countWords(topicOrText) > WORD_LIMIT;
  const payload: WorksheetGeneratorPayload = useMemo(
    () => ({
      gradeLevel,
      topicOrText: topicOrText.trim(),
      attachments: files,
    }),
    [gradeLevel, topicOrText, files],
  );

  const { listening, toggle } = useDictation((text) => {
    const next = topicOrText.trim() ? `${topicOrText.trim()} ${text}` : text;
    setTopicOrText(sanitizePastedText(next));
  });

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    const pasted = sanitizePastedText(e.clipboardData.getData('text/plain'));
    const el = e.currentTarget;
    const start = el.selectionStart ?? topicOrText.length;
    const end = el.selectionEnd ?? topicOrText.length;
    setTopicOrText(sanitizePastedText(topicOrText.slice(0, start) + pasted + topicOrText.slice(end)));
  };

  const addFiles = (list: FileList | null) => {
    if (!list?.length) return;
    setFiles((prev) => {
      const next = [...prev];
      for (const file of Array.from(list)) {
        if (!next.includes(file.name)) next.push(file.name);
      }
      return next;
    });
  };

  const generate = async () => {
    if (!payload.topicOrText || overLimit) return;
    pushHistory();
    setBusy(true);
    setError(null);
    try {
      const next = await api.generateWorksheet(payload);
      setWorksheet(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate worksheet');
    } finally {
      setBusy(false);
    }
  };

  const words = countWords(topicOrText);

  return (
    <div className="ms-quiz-form font-sans text-slate-800">
      <nav className="mb-5 flex flex-wrap items-center justify-between gap-2 text-sm">
        <div className="flex flex-wrap items-center gap-1.5 text-slate-500">
          <Link to="/teacher/tools" className="font-semibold text-violet-700 hover:text-violet-900">
            Teacher Tools
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="font-semibold text-slate-800">Worksheet Generator</span>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
          onClick={resetAll}
          aria-label="Reset worksheet generator"
        >
          <History className="h-3.5 w-3.5" /> Reset
        </button>
      </nav>

      <div className="grid h-full grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="min-w-0 lg:col-span-5">
          <header className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">Worksheet Generator</h2>
                <button
                  type="button"
                  className={favorited ? 'text-amber-400' : 'text-slate-300 hover:text-amber-400'}
                  aria-label={favorited ? 'Remove from favorites' : 'Add to favorites'}
                  aria-pressed={Boolean(favorited)}
                  onClick={toggleFavorite}
                >
                  <Star className="h-5 w-5" fill={favorited ? 'currentColor' : 'none'} />
                </button>
              </div>
              <p className="mt-1 text-sm text-slate-500">Generate a worksheet based on any topic or text.</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                className="rounded-full border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50"
                aria-label="Undo last change"
                onClick={undo}
              >
                <RotateCcw className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-violet-700 shadow-sm hover:bg-violet-50"
                onClick={() => {
                  pushHistory();
                  setShowExemplar(true);
                  setGradeLevel('9th grade');
                  setTopicOrText(EXEMPLAR_TOPIC);
                }}
              >
                {showExemplar ? 'Exemplar loaded' : 'Show exemplar'}
              </button>
            </div>
          </header>

          <div className="mt-6 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-800">
                Grade level:<span className="ml-0.5 text-rose-500">*</span>
              </label>
              <div className="relative">
                <select
                  className="w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 py-2.5 pr-9 text-sm text-slate-800 shadow-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200"
                  style={{
                    fontFamily:
                      "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                  }}
                  value={gradeLevel}
                  onChange={(e) => setGradeLevel(e.target.value)}
                >
                  {GRADE_LEVELS.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-800">
                Topic or text:<span className="ml-0.5 text-rose-500">*</span>
              </label>
              <div className="overflow-hidden rounded-lg border border-slate-700 bg-slate-900 shadow-sm focus-within:ring-2 focus-within:ring-purple-500">
                <div className="relative">
                  <textarea
                    className="h-32 w-full resize-y rounded-lg border border-slate-700 bg-[#0f172a] p-3 pr-11 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    style={TOOL_TEXTAREA_STYLE}
                    placeholder={TOPIC_PLACEHOLDER}
                    value={topicOrText}
                    onChange={(e) => setTopicOrText(sanitizePastedText(e.target.value))}
                    onPaste={handlePaste}
                    spellCheck
                  />
                  <button
                    type="button"
                    className={[
                      'absolute right-2 top-2 rounded-full p-1.5 text-slate-400 hover:bg-slate-800 hover:text-purple-300',
                      listening ? 'bg-purple-500/20 text-purple-200' : '',
                    ].join(' ')}
                    aria-label={listening ? 'Stop dictation' : 'Dictate with microphone'}
                    onClick={toggle}
                  >
                    <Mic className="h-4 w-4" />
                  </button>
                </div>
                {files.length > 0 && (
                  <ul className="flex flex-wrap gap-1.5 border-t border-slate-700 px-3 py-2">
                    {files.map((name) => (
                      <li
                        key={name}
                        className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs font-medium text-slate-300"
                      >
                        {name}
                      </li>
                    ))}
                  </ul>
                )}
                <div className="flex items-center justify-between gap-3 border-t border-slate-700 bg-slate-800 px-2 py-1.5">
                  <div className="relative">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-slate-300 hover:bg-slate-700 hover:text-white"
                      onClick={() => setMenuOpen((v) => !v)}
                    >
                      <FilePlus className="h-4 w-4" /> + Add File
                      <ChevronDown className="h-3 w-3" />
                    </button>
                    {menuOpen && (
                      <div className="absolute bottom-9 left-0 z-10 w-44 overflow-hidden rounded-lg border border-slate-600 bg-slate-800 py-1 shadow-lg">
                        <button
                          type="button"
                          className="block w-full px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-700"
                          onClick={() => {
                            setMenuOpen(false);
                            fileRef.current?.click();
                          }}
                        >
                          Upload PDF or document
                        </button>
                      </div>
                    )}
                    <input
                      ref={fileRef}
                      type="file"
                      accept=".pdf,.doc,.docx,.txt,.md,application/pdf"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        addFiles(e.target.files);
                        e.currentTarget.value = '';
                      }}
                    />
                  </div>
                  <p className={overLimit ? 'text-xs font-medium text-rose-400' : 'text-xs text-slate-400'}>
                    Total word limit: {words.toLocaleString()}/{WORD_LIMIT.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col items-end gap-3">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-violet-700 hover:text-violet-900"
              onClick={() => setAssistantOpen((v) => !v)}
            >
              <Lightbulb className="h-4 w-4" /> Prompt assistant
            </button>
            {assistantOpen && (
              <div className="w-full rounded-xl border border-violet-100 bg-violet-50 px-4 py-3 text-sm text-slate-700">
                Name a topic, paste source text, or attach a PDF. Say whether you want vocabulary,
                short answer, or mixed practice.
              </div>
            )}
            <button
              type="button"
              disabled={busy || !payload.topicOrText || overLimit}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 py-3 font-medium text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => void generate()}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Generate
            </button>
          </div>

          {error && (
            <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </p>
          )}
        </div>

        <section className="flex min-h-[28rem] min-w-0 flex-col lg:col-span-7">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Template preview
          </h3>
          <div className="ws-preview-card flex-1 overflow-y-auto">
            {busy && !worksheet ? (
              <div className="flex min-h-[22rem] flex-col items-center justify-center gap-3 text-slate-400">
                <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
                <p className="text-sm">Generating your worksheet…</p>
              </div>
            ) : worksheet ? (
              <WorksheetDocument worksheet={worksheet} />
            ) : (
              <WorksheetTemplateSkeleton />
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

export default WorksheetGenerator;
