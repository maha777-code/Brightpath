import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDown,
  Bookmark,
  ChevronDown,
  ChevronRight,
  Copy,
  FilePlus,
  History,
  Languages,
  Lightbulb,
  Loader2,
  Maximize2,
  Mic,
  Pencil,
  Minimize2,
  Plus,
  Printer,
  RotateCcw,
  Send,
  Share2,
  Sparkles,
  Star,
  ThumbsDown,
  ThumbsUp,
  Volume2,
} from 'lucide-react';
import {
  applyWorksheetFollowUp,
  applyWorksheetTranslation,
  type WorksheetGeneratorPayload,
  type WorksheetGeneratorResponse,
  type WorksheetHistoryItem,
} from '@brightpath/shared';
import { api } from '@/lib/api';
import { WorksheetHistoryDrawer } from '@/components/tools/WorksheetHistoryDrawer';

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
const HISTORY_KEY = 'brightpath_worksheet_history';
const PROMPT_SUGGESTIONS = [
  'Make questions harder',
  'Add 5 more multiple-choice questions',
  'Translate reading passage to Spanish',
  'Add answer key',
  'Shorten the reading passage',
];

const TRANSLATE_LANGUAGES = [
  { id: 'Spanish', native: 'Español' },
  { id: 'French', native: 'Français' },
  { id: 'German', native: 'Deutsch' },
  { id: 'Hindi', native: 'हिन्दी' },
  { id: 'Chinese', native: '中文' },
  { id: 'Arabic', native: 'العربية' },
  { id: 'Portuguese', native: 'Português' },
] as const;

function loadLocalVersions(): WorksheetHistoryItem[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistLocalVersions(items: WorksheetHistoryItem[]) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, 30)));
  } catch {
    /* ignore quota */
  }
}

function withWorksheetId(worksheet: WorksheetGeneratorResponse): WorksheetGeneratorResponse {
  return { ...worksheet, id: worksheet.id || crypto.randomUUID() };
}
const TOPIC_PLACEHOLDER =
  'Mitosis, World War II, paste a block of text or attach a PDF of content to base the worksheet on.';

const TOOL_TEXTAREA_STYLE: CSSProperties = {
  fontFamily: 'Cambria, Georgia, serif',
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
    <div className="ws-doc flex h-full min-h-[28rem] flex-col justify-between" aria-hidden>
      <div>
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

function topicCrumb(topic: string, title: string): string {
  const raw = topic.trim() || title.trim() || 'worksheet';
  const firstLine = raw.split(/\n/)[0]?.trim() || raw;
  if (firstLine.length <= 42) return firstLine;
  return `${firstLine.slice(0, 42).trim()}…`;
}

function gradeBadge(grade: string): string {
  return grade.replace(/\s+grade$/i, '-grade').replace(/^(\d+)/, (_, n) => n);
}

function formatWorksheetPlainText(worksheet: WorksheetGeneratorResponse): string {
  const parts = [
    worksheet.title,
    worksheet.instructions ?? '',
    worksheet.passage ? `Reading Passage\n${worksheet.passage}` : '',
    ...worksheet.sections.map((section) => {
      const items = section.items.map((item, i) => `${i + 1}. ${item.prompt}`).join('\n');
      return `${section.heading}\n${items}`;
    }),
  ];
  return parts.filter(Boolean).join('\n\n');
}

function clientFallbackWorksheet(input: WorksheetGeneratorPayload): WorksheetGeneratorResponse {
  const topic = input.topicOrText.trim() || 'this topic';
  const war = /world\s*war|ww\s*2|wwii/i.test(topic);
  if (war) {
    return {
      title: 'World War II Worksheet',
      gradeLevel: input.gradeLevel,
      instructions: 'Read the passage, then answer the questions in complete sentences.',
      passage:
        'World War II was a global conflict that lasted from 1939 to 1945. It involved most of the world’s nations and reshaped borders, governments, and daily life. Causes included unresolved tensions from World War I, economic hardship, and the rise of aggressive dictatorships. The conflict spread across Europe, Asia, Africa, and the Pacific. Its consequences included enormous loss of life, the founding of the United Nations, and a new balance of power that defined the second half of the twentieth century.',
      sections: [
        {
          heading: 'Comprehension',
          items: [
            { id: 1, prompt: 'When did World War II begin and end?' },
            { id: 2, prompt: 'Name two causes of the war mentioned in the passage.' },
            { id: 3, prompt: 'What international organization was founded after the war?' },
          ],
        },
        {
          heading: 'Vocabulary',
          items: [
            { id: 4, prompt: 'Define “dictatorship” in your own words.' },
            { id: 5, prompt: 'What does “consequences” mean in the last sentence?' },
          ],
        },
        {
          heading: 'Apply',
          items: [
            { id: 6, prompt: 'Why might unresolved tensions from an earlier war lead to a new conflict?' },
            { id: 7, prompt: 'Give one way World War II still influences the world today.' },
          ],
        },
      ],
    };
  }
  return {
    title: `${topic} Worksheet`,
    gradeLevel: input.gradeLevel,
    instructions: `Complete every section. Use complete sentences where asked.`,
    passage: `${topic} is an important idea for ${input.gradeLevel} students to understand. Read carefully, then answer the questions that follow using evidence from the text and your own reasoning.`,
    sections: [
      {
        heading: 'Comprehension',
        items: [
          { id: 1, prompt: `In your own words, what is ${topic}?` },
          { id: 2, prompt: `Name one real-world example of ${topic}.` },
        ],
      },
      {
        heading: 'Practice',
        items: [
          { id: 3, prompt: `List two key terms related to ${topic} and define each.` },
          { id: 4, prompt: `Apply ${topic} to a short classroom scenario.` },
        ],
      },
    ],
  };
}

const PASSAGE_HEADINGS: Record<string, string> = {
  Spanish: 'Pasaje de lectura',
  French: 'Texte de lecture',
  German: 'Lesetext',
  Hindi: 'पठन अंश',
  Chinese: '阅读短文',
  Arabic: 'قطعة القراءة',
  Portuguese: 'Texto de leitura',
};

function PrintableWorksheet({
  worksheet,
  title,
}: {
  worksheet: WorksheetGeneratorResponse;
  title: string;
}) {
  let number = 1;
  const language = TRANSLATE_LANGUAGES.find((item) => title.includes(`(${item.id})`))?.id;
  const passageHeading = (language && PASSAGE_HEADINGS[language]) || 'Reading Passage';
  return (
    <article className="ws-paper text-slate-900">
      <div className="mb-6 flex flex-wrap justify-between gap-4 text-sm">
        <span>
          Name <span className="inline-block min-w-[10rem] border-b border-slate-400">&nbsp;</span>
        </span>
        <span>
          Date <span className="inline-block min-w-[8rem] border-b border-slate-400">&nbsp;</span>
        </span>
      </div>
      <h1 className="text-center text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
      {worksheet.instructions ? (
        <p className="mt-3 text-sm italic text-slate-600">{worksheet.instructions}</p>
      ) : null}
      {worksheet.passage ? (
        <section className="mt-6">
          <h2 className="mb-2 text-base font-bold text-slate-900">{passageHeading}</h2>
          <p className="whitespace-pre-wrap text-sm leading-7 text-slate-800">{worksheet.passage}</p>
        </section>
      ) : null}
      <div className="mt-6 space-y-6">
        {worksheet.sections.map((section) => (
          <section key={section.heading}>
            <h2 className="mb-3 border-b border-slate-300 pb-1 text-base font-bold text-slate-900">
              {section.heading}
            </h2>
            <ol className="space-y-4">
              {section.items.map((item) => {
                const n = number;
                number += 1;
                return (
                  <li key={`${item.id}-${n}`} className="text-sm leading-relaxed">
                    <p>
                      <span className="mr-2 font-semibold">{n}.</span>
                      {item.prompt}
                    </p>
                    <div className="mt-3 space-y-3 pl-6">
                      <div className="h-px bg-slate-300" />
                      <div className="h-px bg-slate-300" />
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
      </div>
    </article>
  );
}

function WorksheetStudio({
  worksheet,
  payload,
  onReset,
  onFollowUp,
  onOpenHistory,
  onTranslate,
  busy,
}: {
  worksheet: WorksheetGeneratorResponse;
  payload: WorksheetGeneratorPayload;
  onReset: () => void;
  onFollowUp: (message: string, attachments?: string[]) => void;
  onOpenHistory: () => void;
  onTranslate: (language: string) => Promise<void>;
  busy: boolean;
}) {
  const [title, setTitle] = useState(worksheet.title);
  const [editingTitle, setEditingTitle] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [copied, setCopied] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [feedback, setFeedback] = useState<'positive' | 'negative' | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [followUp, setFollowUp] = useState('');
  const [followUpFiles, setFollowUpFiles] = useState<string[]>([]);
  const [listeningFollowUp, setListeningFollowUp] = useState(false);
  const [promptMenuOpen, setPromptMenuOpen] = useState(false);
  const [isTranslateModalOpen, setIsTranslateModalOpen] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const expandedScrollRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const followUpFileRef = useRef<HTMLInputElement>(null);
  const crumb = topicCrumb(payload.topicOrText, worksheet.title);
  const pageCount = Math.max(2, 1 + worksheet.sections.length);
  const topicShort =
    payload.topicOrText.trim().split(/\n/)[0]?.trim().slice(0, 48) || worksheet.title;

  useEffect(() => {
    setTitle(worksheet.title);
  }, [worksheet.title]);

  useEffect(() => {
    const previous = document.body.style.overflow;
    if (expanded) document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [expanded]);

  const copyDoc = async () => {
    try {
      await navigator.clipboard.writeText(formatWorksheetPlainText({ ...worksheet, title }));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  };

  const printDoc = () => {
    const node = previewRef.current;
    if (!node) return;
    const frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    frame.style.position = 'fixed';
    frame.style.width = '0';
    frame.style.height = '0';
    frame.style.border = '0';
    document.body.appendChild(frame);
    const doc = frame.contentDocument;
    if (!doc) return;
    doc.open();
    doc.write(
      `<!DOCTYPE html><html><head><title>${title}</title><style>body{font-family:Cambria,Georgia,serif;font-size:18px;padding:32px;color:#0f172a} h1,h2,h3{font-family:Cambria,Georgia,serif;text-align:center}</style></head><body>${node.innerHTML}</body></html>`,
    );
    doc.close();
    window.setTimeout(() => {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
      window.setTimeout(() => frame.remove(), 400);
    }, 250);
  };

  const speak = () => {
    const text = formatWorksheetPlainText({ ...worksheet, title });
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text.slice(0, 4000));
    window.speechSynthesis.speak(utter);
  };

  const share = async () => {
    const text = formatWorksheetPlainText({ ...worksheet, title });
    if (navigator.share) {
      try {
        await navigator.share({ title, text });
        return;
      } catch {
        /* fall through */
      }
    }
    await navigator.clipboard.writeText(text);
  };

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2800);
  };

  const sendFeedback = (rating: 'positive' | 'negative') => {
    setFeedback(rating);
    showToast('Thank you for your feedback!');
    const worksheetId = worksheet.id || title;
    void api.submitTeacherToolFeedback({ worksheetId, rating }).catch(() => undefined);
  };

  const handleTranslate = async (language: string) => {
    setIsTranslateModalOpen(false);
    setIsTranslating(true);
    try {
      await onTranslate(language);
    } catch {
      showToast('Failed to translate worksheet.');
    } finally {
      setIsTranslating(false);
    }
  };

  const handleScrollToBottom = () => {
    const scroller = expanded ? expandedScrollRef.current : scrollContainerRef.current;
    if (scroller) {
      scroller.scrollTo({
        top: scroller.scrollHeight,
        behavior: 'smooth',
      });
    }
  };

  const sendFollowUp = () => {
    const msg = followUp.trim();
    if (!msg || busy) return;
    setFollowUp('');
    setPromptMenuOpen(false);
    onFollowUp(msg, followUpFiles);
    setFollowUpFiles([]);
  };

  const statusBar = (
    <div className="mt-2 flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800">
      <span className="font-medium">
        The {title} Studio document has been created successfully.
      </span>
      <div className="flex items-center gap-1">
        <div className="relative">
          <button
            type="button"
            className="rounded-lg p-1.5 text-emerald-900 hover:bg-emerald-100"
            aria-label="Translate worksheet"
            title="Translate worksheet"
            onClick={() => setIsTranslateModalOpen((v) => !v)}
          >
            <Languages className="h-4 w-4" />
          </button>
          {isTranslateModalOpen ? (
            <div className="absolute bottom-full right-0 z-30 mb-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
              <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Translate to
              </p>
              {TRANSLATE_LANGUAGES.map((language) => (
                <button
                  key={language.id}
                  type="button"
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-slate-700 hover:bg-violet-50 hover:text-violet-800"
                  onClick={() => void handleTranslate(language.id)}
                >
                  <span>{language.id}</span>
                  <span className="text-xs text-slate-400">{language.native}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <button
          type="button"
          className="rounded-lg p-1.5 text-emerald-900 hover:bg-emerald-100"
          aria-label="Read aloud"
          onClick={speak}
        >
          <Volume2 className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={[
            'rounded-lg p-1.5 hover:bg-emerald-100',
            feedback === 'positive' ? 'text-violet-600' : 'text-emerald-900',
          ].join(' ')}
          aria-label="Thumbs up"
          aria-pressed={feedback === 'positive'}
          onClick={() => sendFeedback('positive')}
        >
          <ThumbsUp className="h-4 w-4" fill={feedback === 'positive' ? 'currentColor' : 'none'} />
        </button>
        <button
          type="button"
          className={[
            'rounded-lg p-1.5 hover:bg-emerald-100',
            feedback === 'negative' ? 'text-cyan-600' : 'text-emerald-900',
          ].join(' ')}
          aria-label="Thumbs down"
          aria-pressed={feedback === 'negative'}
          onClick={() => sendFeedback('negative')}
        >
          <ThumbsDown className="h-4 w-4" fill={feedback === 'negative' ? 'currentColor' : 'none'} />
        </button>
        <button
          type="button"
          className="rounded-lg bg-purple-600 p-1.5 text-white shadow-sm hover:bg-purple-700"
          aria-label="Scroll to bottom"
          title="Scroll to bottom"
          onClick={handleScrollToBottom}
        >
          <ArrowDown className="h-4 w-4" />
        </button>
      </div>
    </div>
  );

  const documentPaper = (
    <div ref={previewRef} className="mx-auto max-w-3xl rounded-lg bg-white p-2 shadow-md sm:p-4">
      <PrintableWorksheet worksheet={worksheet} title={title} />
    </div>
  );

  return (
    <div className="ws-studio flex h-full min-h-0 flex-col overflow-hidden p-4">
      <header className="mb-4 flex shrink-0 flex-wrap items-start justify-between gap-3">
        <nav className="flex min-w-0 flex-wrap items-center gap-1.5 text-sm text-slate-500">
          <Link to="/teacher/tools" className="font-semibold text-violet-700 hover:text-violet-900">
            Teacher Tools
          </Link>
          <ChevronRight className="h-3.5 w-3.5 shrink-0" />
          <button type="button" className="font-semibold text-slate-700 hover:text-violet-700" onClick={onReset}>
            Worksheet Generator
          </button>
          <ChevronRight className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate font-semibold text-slate-900">{crumb}</span>
        </nav>
        <div className="flex flex-wrap items-start gap-2">
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="rounded-full border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50"
              aria-label="Share worksheet"
              onClick={() => void share()}
            >
              <Share2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="rounded-full border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50"
              aria-label="Create new worksheet"
              onClick={onReset}
            >
              <Plus className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="rounded-full border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50"
              aria-label="Version history"
              onClick={onOpenHistory}
            >
              <History className="h-4 w-4" />
            </button>
          </div>
          <div className="ws-studio-badge">
            <p>
              <span className="text-slate-400">Grade Level:</span> {gradeBadge(payload.gradeLevel)}
            </p>
            <p>
              <span className="text-slate-400">Topic or text:</span> {topicShort}
            </p>
          </div>
        </div>
      </header>

      <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            {editingTitle ? (
              <input
                className="rounded-md border border-violet-300 px-2 py-1 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-violet-200"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => setEditingTitle(false)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') setEditingTitle(false);
                }}
                autoFocus
              />
            ) : (
              <h2 className="truncate text-base font-semibold text-slate-900">{title}</h2>
            )}
            <button
              type="button"
              className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Edit document title"
              onClick={() => setEditingTitle(true)}
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              className={[
                'rounded-lg p-2 hover:bg-slate-100',
                bookmarked ? 'text-amber-500' : 'text-slate-500',
              ].join(' ')}
              aria-label="Bookmark"
              onClick={() => setBookmarked((v) => !v)}
            >
              <Bookmark className="h-4 w-4" fill={bookmarked ? 'currentColor' : 'none'} />
            </button>
            <button
              type="button"
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              aria-label="Print"
              onClick={printDoc}
            >
              <Printer className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              aria-label="Copy"
              onClick={() => void copyDoc()}
            >
              <Copy className="h-4 w-4" />
            </button>
            <div className="relative">
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
                onClick={() => setExportOpen((v) => !v)}
              >
                Export <ChevronDown className="h-3.5 w-3.5" />
              </button>
              {exportOpen && (
                <div className="absolute right-0 z-20 mt-1 w-36 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                  <button
                    type="button"
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                    onClick={() => {
                      setExportOpen(false);
                      printDoc();
                    }}
                  >
                    Export PDF
                  </button>
                  <button
                    type="button"
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                    onClick={() => {
                      setExportOpen(false);
                      void copyDoc();
                    }}
                  >
                    Export text
                  </button>
                </div>
              )}
            </div>
            <button
              type="button"
              className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
              onClick={() => setEditingTitle(true)}
            >
              Edit
            </button>
          </div>
        </div>

        <p className="shrink-0 px-4 pt-3 text-xs font-medium text-slate-500">
          Page 1/{pageCount}
          {copied ? <span className="ml-2 text-emerald-600">Copied</span> : null}
        </p>

        <div className="relative min-h-0 flex-1">
          <div
            id="worksheet-document-container"
            ref={scrollContainerRef}
            className="custom-scrollbar h-full max-h-[calc(100vh-280px)] w-full overflow-x-hidden overflow-y-auto scroll-smooth rounded-xl bg-slate-100 p-6"
          >
            {documentPaper}
          </div>
          {busy || isTranslating ? (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/70">
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-lg">
                <Loader2 className="h-4 w-4 animate-spin" />
                {isTranslating ? 'Translating worksheet…' : 'Updating worksheet…'}
              </div>
            </div>
          ) : null}
          <button
            type="button"
            className="absolute left-1/2 top-1/2 z-10 inline-flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 rounded-full bg-slate-900/90 px-4 py-2 text-sm font-medium text-white shadow-lg hover:bg-slate-800"
            onClick={() => setExpanded(true)}
          >
            <Maximize2 className="h-4 w-4" /> Expand preview
          </button>
        </div>
      </section>

      {statusBar}

      <div
        id="ws-follow-up"
        ref={chatContainerRef}
        className="mt-3 shrink-0 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm"
      >
        {followUpFiles.length > 0 && (
          <ul className="mb-1 flex flex-wrap gap-1.5 px-1">
            {followUpFiles.map((name) => (
              <li key={name} className="rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-medium text-violet-700">
                {name}
              </li>
            ))}
          </ul>
        )}
        <div className="flex items-end gap-2">
          <button
            type="button"
            className="mb-1 rounded-lg p-2 text-slate-500 hover:bg-slate-100"
            aria-label="Attach extra context"
            onClick={() => followUpFileRef.current?.click()}
          >
            <Plus className="h-4 w-4" />
          </button>
          <input
            ref={followUpFileRef}
            type="file"
            accept=".pdf,.docx,.txt,application/pdf,text/plain"
            multiple
            className="hidden"
            onChange={(e) => {
              const list = e.target.files;
              if (list?.length) {
                setFollowUpFiles((prev) => {
                  const next = [...prev];
                  for (const file of Array.from(list)) {
                    if (!next.includes(file.name)) next.push(file.name);
                  }
                  return next;
                });
              }
              e.currentTarget.value = '';
            }}
          />
          <textarea
            className="max-h-28 min-h-[44px] flex-1 resize-y bg-transparent py-2 text-sm text-slate-800 outline-none placeholder:text-slate-400"
            placeholder="Continue the conversation..."
            rows={1}
            value={followUp}
            onChange={(e) => setFollowUp(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendFollowUp();
              }
            }}
          />
          <button
            type="button"
            className={['mb-1 rounded-lg p-2 hover:bg-slate-100', listeningFollowUp ? 'text-violet-700' : 'text-slate-500'].join(
              ' ',
            )}
            aria-label="Voice recording"
            onClick={() => setListeningFollowUp((v) => !v)}
          >
            <Mic className="h-4 w-4" />
          </button>
          <div className="relative">
            <button
              type="button"
              className="mb-1 rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              aria-label="Prompt assistant"
              onClick={() => setPromptMenuOpen((v) => !v)}
            >
              <Lightbulb className="h-4 w-4" />
            </button>
            {promptMenuOpen && (
              <div className="absolute bottom-10 right-0 z-20 w-72 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
                {PROMPT_SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-violet-50 hover:text-violet-800"
                    onClick={() => {
                      setFollowUp(suggestion);
                      setPromptMenuOpen(false);
                    }}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            type="button"
            disabled={busy || !followUp.trim()}
            className="mb-1 rounded-full bg-violet-600 p-2 text-white hover:bg-violet-700 disabled:opacity-50"
            aria-label="Send"
            onClick={sendFollowUp}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
      </div>
      {expanded ? (
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/70 p-4">
          <div className="mx-auto flex h-full min-h-0 w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-4 py-3">
              <h2 className="truncate text-base font-semibold text-slate-900">{title}</h2>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
                onClick={() => setExpanded(false)}
              >
                <Minimize2 className="h-4 w-4" /> Collapse preview
              </button>
            </div>
            <div
              ref={expandedScrollRef}
              className="custom-scrollbar min-h-0 flex-1 overflow-y-auto scroll-smooth bg-slate-100 p-6"
            >
              <div className="mx-auto max-w-3xl rounded-lg bg-white p-2 shadow-md sm:p-4">
                <PrintableWorksheet worksheet={worksheet} title={title} />
              </div>
            </div>
            {statusBar}
          </div>
        </div>
      ) : null}
      {toast ? (
        <div className="pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-lg">
          {toast}
        </div>
      ) : null}
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
  const [submitted, setSubmitted] = useState<WorksheetGeneratorPayload | null>(null);
  const [localFavorited, setLocalFavorited] = useState(false);
  const [history, setHistory] = useState<FormSnapshot[]>([]);
  const [savedVersions, setSavedVersions] = useState<WorksheetHistoryItem[]>(loadLocalVersions);
  const [historyOpen, setHistoryOpen] = useState(false);
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
    setSubmitted(null);
    setHistory([]);
    setHistoryOpen(false);
  };

  const rememberVersion = (request: WorksheetGeneratorPayload, next: WorksheetGeneratorResponse) => {
    const stored = { ...next, id: crypto.randomUUID() };
    const item: WorksheetHistoryItem = {
      id: stored.id as string,
      createdAt: new Date().toISOString(),
      title: stored.title,
      gradeLevel: request.gradeLevel,
      topicOrText: request.topicOrText,
      payload: request,
      worksheet: stored,
    };
    setSavedVersions((prev) => {
      const merged = [item, ...prev.filter((row) => row.id !== item.id)].slice(0, 30);
      persistLocalVersions(merged);
      return merged;
    });
    return stored;
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

  const generate = async (override?: WorksheetGeneratorPayload) => {
    const request = override ?? payload;
    if (!request.topicOrText) return;
    if (!override && overLimit) return;
    if (!override) pushHistory();
    setBusy(true);
    setError(null);
    try {
      const next = rememberVersion(request, await api.generateWorksheet(request));
      setSubmitted(request);
      setWorksheet(next);
    } catch {
      const next = rememberVersion(request, clientFallbackWorksheet(request));
      setSubmitted(request);
      setWorksheet(next);
    } finally {
      setBusy(false);
    }
  };

  const refineCurrent = async (message: string, attachments?: string[]) => {
    if (!submitted || !worksheet) return;
    setBusy(true);
    setError(null);
    const request: WorksheetGeneratorPayload = {
      ...submitted,
      topicOrText: `${submitted.topicOrText}\n\nTeacher follow-up: ${message}`,
      attachments: attachments?.length ? [...(submitted.attachments ?? []), ...attachments] : submitted.attachments,
    };
    try {
      const next = rememberVersion(
        request,
        await api.refineWorksheet({
          worksheetId: worksheet.id,
          gradeLevel: submitted.gradeLevel,
          topicOrText: submitted.topicOrText,
          instruction: message,
          attachments: request.attachments,
          currentWorksheet: worksheet,
        }),
      );
      setSubmitted(request);
      setWorksheet(next);
    } catch {
      const next = rememberVersion(request, applyWorksheetFollowUp(worksheet, message));
      setSubmitted(request);
      setWorksheet(next);
    } finally {
      setBusy(false);
    }
  };

  const translateCurrent = async (language: string) => {
    if (!worksheet || !submitted) throw new Error('No worksheet to translate');
    try {
      const next = rememberVersion(
        submitted,
        await api.translateWorksheet({
          worksheetId: worksheet.id,
          targetLanguage: language,
          currentWorksheet: worksheet,
        }),
      );
      setWorksheet(next);
    } catch {
      setWorksheet(rememberVersion(submitted, applyWorksheetTranslation(worksheet, language)));
    }
  };

  const words = countWords(topicOrText);

  if (worksheet && submitted) {
    return (
      <>
        <WorksheetStudio
          worksheet={worksheet}
          payload={submitted}
          busy={busy}
          onReset={resetAll}
          onOpenHistory={() => setHistoryOpen(true)}
          onFollowUp={(message, attachments) => {
            void refineCurrent(message, attachments);
          }}
          onTranslate={translateCurrent}
        />
        <WorksheetHistoryDrawer
          open={historyOpen}
          onClose={() => setHistoryOpen(false)}
          topic={submitted.topicOrText.split('\n')[0]}
          fallbackItems={savedVersions}
          activeId={worksheet.id}
          onSelect={(item) => {
            setWorksheet(withWorksheetId(item.worksheet));
            setSubmitted(item.payload);
            setGradeLevel(item.payload.gradeLevel);
            setTopicOrText(item.payload.topicOrText);
            setFiles(item.payload.attachments ?? []);
          }}
        />
      </>
    );
  }

  return (
    <div className="ms-quiz-form flex h-full min-h-0 w-full flex-col overflow-hidden p-4 font-sans text-slate-800">
      <div className="flex h-full min-h-0 flex-1 flex-col overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <nav className="mb-5 flex shrink-0 flex-wrap items-center justify-between gap-2 text-sm">
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

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-8 lg:h-full lg:grid-cols-12">
          <div className="flex h-full min-h-0 flex-col justify-between lg:col-span-5">
            <div className="flex min-h-0 flex-1 flex-col">
              <header className="flex shrink-0 flex-wrap items-start justify-between gap-3">
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

              <div className="mt-6 shrink-0">
                <label className="mb-1.5 block text-sm font-semibold text-slate-800">
                  Grade level:<span className="ml-0.5 text-rose-500">*</span>
                </label>
                <div className="relative">
                  <select
                    className="w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 py-2.5 pr-9 text-sm text-slate-800 shadow-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200"
                    style={{
                      fontFamily:
                        'Cambria, Georgia, serif',
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

              <div className="my-4 flex min-h-0 flex-1 flex-col">
                <label className="mb-1 block text-sm font-semibold text-slate-800">
                  Topic or text:<span className="ml-0.5 text-rose-500">*</span>
                </label>
                <div className="relative flex min-h-[220px] flex-1 flex-col overflow-hidden rounded-xl border border-purple-500/40 bg-[#0f172a] p-3 shadow-inner focus-within:ring-2 focus-within:ring-purple-500">
                  <div className="relative flex min-h-0 flex-1 flex-col">
                    <textarea
                      className="min-h-[220px] w-full flex-1 resize-none bg-transparent p-0 pr-11 text-sm text-slate-100 placeholder-slate-400 focus:outline-none"
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
                        'absolute right-0 top-0 flex h-8 w-8 items-center justify-center rounded-full border border-slate-700 bg-slate-800 p-2 text-purple-300 shadow-md transition-all hover:bg-purple-900/60 hover:text-purple-200',
                        listening ? 'border-purple-400 bg-purple-900/60 text-purple-200' : '',
                      ].join(' ')}
                      aria-label={listening ? 'Stop dictation' : 'Start recording voice prompt'}
                      onClick={toggle}
                    >
                      <Mic className="h-4 w-4 text-purple-400" />
                    </button>
                  </div>
                  {files.length > 0 && (
                    <ul className="mt-2 flex flex-wrap gap-1.5 border-t border-slate-800/80 pt-2">
                      {files.map((name) => (
                        <li
                          key={name}
                          className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs font-medium text-slate-100"
                        >
                          {name}
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="mt-2 flex items-center justify-between gap-3 border-t border-slate-800/80 pt-2">
                    <div className="relative">
                      <button
                        type="button"
                        className="flex items-center gap-1.5 rounded-lg border border-purple-500/30 bg-slate-800 px-3 py-1.5 text-xs font-medium text-purple-300 transition-colors hover:bg-slate-700 hover:text-white"
                        onClick={() => setMenuOpen((v) => !v)}
                      >
                        <FilePlus className="h-3.5 w-3.5 text-purple-400" />
                        <span className="text-purple-200">+ Add File</span>
                        <ChevronDown className="h-3 w-3 text-purple-400" />
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
                    <p
                      className={
                        overLimit
                          ? 'font-mono text-xs font-medium text-rose-400'
                          : 'font-mono text-xs text-slate-400'
                      }
                    >
                      Total word limit: {words.toLocaleString()}/{WORD_LIMIT.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-auto shrink-0 pt-4">
              <div className="mb-3 flex flex-col items-end gap-3">
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
              </div>
              <button
                type="button"
                disabled={busy || !payload.topicOrText || overLimit}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-purple-500 py-3 font-medium text-white hover:bg-purple-600 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={() => void generate()}
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Generate
              </button>
              {error && (
                <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {error}
                </p>
              )}
            </div>
          </div>

          <div className="flex h-full min-h-0 flex-col lg:col-span-7">
            <span className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Template preview
            </span>
            <div className="ws-preview-card flex h-full min-h-[500px] flex-1 flex-col justify-between overflow-y-auto rounded-xl bg-[#1a2332] p-6 text-slate-300">
              {busy && !worksheet ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-3 text-slate-400">
                  <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
                  <p className="text-sm">Generating your worksheet…</p>
                </div>
              ) : worksheet ? (
                <PrintableWorksheet worksheet={worksheet} title={worksheet.title} />
              ) : (
                <WorksheetTemplateSkeleton />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WorksheetGenerator;
