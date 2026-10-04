import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Bookmark,
  ChevronDown,
  FolderHeart,
  ChevronRight,
  Copy,
  Download,
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
  Trash2,
  Volume2,
  X,
} from 'lucide-react';
import {
  applyWorksheetFollowUp,
  applyWorksheetTranslation,
  type WorksheetGeneratorPayload,
  type WorksheetGeneratorResponse,
  type WorksheetHistoryItem,
} from '@brightpath/shared';
import { api } from '@/lib/api';
import { AddFileMenu } from '@/components/tools/AddFileMenu';
import { watermarkFooterHtml } from '@/lib/exportWatermark';
import { CYBER_FONT_STYLE } from '@/lib/theme';
import { WorksheetHistoryDrawer } from '@/components/tools/WorksheetHistoryDrawer';
import { VoiceListeningIndicator } from '@/components/VoiceListeningIndicator';
import { readSavedWorksheets, writeSavedWorksheets, type SavedWorksheet } from '@/lib/savedWorksheets';

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
  fontFamily: CYBER_FONT_STYLE.fontFamily,
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

type SpeechResultItem = ArrayLike<{ transcript?: string }> & { isFinal?: boolean };

type SpeechRec = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onstart: (() => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onresult: ((event: { resultIndex: number; results: ArrayLike<SpeechResultItem> }) => void) | null;
  onend: (() => void) | null;
};

function speechRecognitionCtor(): (new () => SpeechRec) | null {
  const win = window as unknown as {
    SpeechRecognition?: new () => SpeechRec;
    webkitSpeechRecognition?: new () => SpeechRec;
  };
  return win.SpeechRecognition ?? win.webkitSpeechRecognition ?? null;
}

function useDictation(onAppend: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const recRef = useRef<{ stop: () => void } | null>(null);

  const toggle = () => {
    const Ctor = speechRecognitionCtor();

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
    <div className="w-full max-w-full space-y-6 rounded-2xl border border-slate-800/90 bg-slate-900/90 p-8 font-sans text-slate-200 shadow-2xl md:p-10" aria-hidden>
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="text-sm font-semibold text-slate-300">
          Name: <span className="ml-2 inline-block w-44 border-b border-slate-700" />
        </div>
        <div className="text-sm font-semibold text-slate-300">
          Date: <span className="ml-2 inline-block w-32 border-b border-slate-700" />
        </div>
      </div>

      <div className="py-2 text-center">
        <h2 className="text-2xl font-bold tracking-wide text-white">Worksheet Title</h2>
        <div className="mx-auto mt-2 h-1 w-24 rounded-full bg-cyan-500/40" />
      </div>

      <div className="space-y-3 pt-2">
        <h3 className="text-base font-bold uppercase tracking-wider text-cyan-400">Section</h3>
        <div className="space-y-2 pl-2">
          {[1, 2, 3, 4, 5].map((num) => (
            <div key={`sa-${num}`} className="text-sm text-slate-300">
              <p className="font-medium">{num}. ____________________________________________</p>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3 pt-2">
        <h3 className="text-base font-bold uppercase tracking-wider text-cyan-400">Section</h3>
        <div className="space-y-4 pl-2">
          {[1, 2, 3, 4, 5].map((qNum) => (
            <div key={`mc-${qNum}`} className="space-y-1 text-sm text-slate-300">
              <p className="font-semibold">{qNum}. Question prompt placeholder...</p>
              <div className="grid grid-cols-2 gap-2 pl-4 text-xs text-slate-400">
                <span>A. Option A</span>
                <span>B. Option B</span>
                <span>C. Option C</span>
                <span>D. Option D</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3 pt-2">
        <h3 className="text-base font-bold uppercase tracking-wider text-cyan-400">Section</h3>
        <div className="space-y-2 pl-2">
          {[1, 2, 3].map((num) => (
            <div key={`ext-${num}`} className="space-y-1 text-sm text-slate-300">
              <p className="font-medium">{num}. Extended answer prompt...</p>
              <div className="h-6 border-b border-dashed border-slate-800" />
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3 pt-2">
        <h3 className="text-base font-bold uppercase tracking-wider text-cyan-400">SectionLabel</h3>
        <div className="grid grid-cols-1 gap-2 pl-2 text-sm text-slate-300 md:grid-cols-2">
          {[1, 2, 3, 4, 5].map((num) => (
            <div key={`sl-${num}`} className="rounded-lg border border-slate-800/60 bg-slate-950/40 p-2">
              {num}. Label item description
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3 pt-2">
        <h3 className="text-base font-bold uppercase tracking-wider text-cyan-400">Label</h3>
        <div className="grid grid-cols-1 gap-2 pl-2 text-sm text-slate-300 md:grid-cols-2">
          {[6, 7, 8, 9, 10].map((num) => (
            <div key={`l-${num}`} className="rounded-lg border border-slate-800/60 bg-slate-950/40 p-2">
              {num}. Label item description
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3 pt-2">
        <h3 className="text-base font-bold uppercase tracking-wider text-cyan-400">Label</h3>
        <div className="grid grid-cols-1 gap-2 pl-2 text-sm text-slate-300 md:grid-cols-2">
          {[11, 12, 13].map((num) => (
            <div key={`l2-${num}`} className="rounded-lg border border-slate-800/60 bg-slate-950/40 p-2">
              {num}. Label item description
            </div>
          ))}
        </div>
      </div>
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
  onLoadSaved,
  onEnsureWorksheetId,
  busy,
  pane = false,
}: {
  worksheet: WorksheetGeneratorResponse;
  payload: WorksheetGeneratorPayload;
  onReset: () => void;
  onFollowUp: (message: string, attachments?: string[]) => void;
  onOpenHistory: () => void;
  onTranslate: (language: string) => Promise<void>;
  onLoadSaved: (item: SavedWorksheet) => void;
  onEnsureWorksheetId: (id: string) => void;
  busy: boolean;
  pane?: boolean;
}) {
  const [title, setTitle] = useState(worksheet.title);
  const [editingTitle, setEditingTitle] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [savedOpen, setSavedOpen] = useState(false);
  const [savedItems, setSavedItems] = useState<SavedWorksheet[]>([]);
  const [copied, setCopied] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [feedback, setFeedback] = useState<'positive' | 'negative' | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
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
  const followUpRecognitionRef = useRef<SpeechRec | null>(null);
  const followUpTranscriptRef = useRef('');
  const crumb = topicCrumb(payload.topicOrText, worksheet.title);
  const pageCount = Math.max(2, 1 + worksheet.sections.length);
  const topicShort =
    payload.topicOrText.trim().split(/\n/)[0]?.trim().slice(0, 48) || worksheet.title;

  useEffect(() => {
    setTitle(worksheet.title);
  }, [worksheet.title]);

  useEffect(() => {
    const id = worksheet.id;
    setBookmarked(Boolean(id && readSavedWorksheets().some((item) => item.id === id)));
  }, [worksheet.id]);

  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
      followUpRecognitionRef.current?.stop();
    };
  }, []);

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
      `<!DOCTYPE html><html><head><title>${title}</title><style>body{font-family:Cambria,Georgia,serif;font-size:18px;padding:32px;color:#0f172a} h1,h2,h3{font-family:Cambria,Georgia,serif;text-align:center}</style></head><body>${node.innerHTML}${watermarkFooterHtml()}</body></html>`,
    );
    doc.close();
    window.setTimeout(() => {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
      window.setTimeout(() => frame.remove(), 400);
    }, 250);
  };

  const toggleSpeech = () => {
    if (!('speechSynthesis' in window)) {
      showToast('Text-to-speech is not supported in this browser.');
      return;
    }
    if (isSpeaking || window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    const textToRead = formatWorksheetPlainText({ ...worksheet, title });
    const utterance = new SpeechSynthesisUtterance(textToRead.slice(0, 4000));
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  const handleDownloadDoc = () => {
    const previewElement = document.getElementById('worksheet-template-preview');
    if (!previewElement) {
      showToast('No generated worksheet content available to download.');
      return;
    }
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showToast('Please allow popups to download the document PDF.');
      return;
    }
    const safeTitle = title.replace(/[&<>"']/g, (ch) =>
      ch === '&' ? '&amp;' : ch === '<' ? '&lt;' : ch === '>' ? '&gt;' : ch === '"' ? '&quot;' : '&#39;',
    );
    printWindow.document.write(
      `<!DOCTYPE html><html><head><title>${safeTitle}</title><style>body{font-family:Arial,sans-serif;padding:30px;color:#1e293b}h1,h2{text-align:center;color:#0f172a}.header-line{display:flex;justify-content:space-between;border-bottom:2px solid #cbd5e1;padding-bottom:10px;margin-bottom:20px}.section{margin-top:20px;font-weight:bold;font-size:16px;border-bottom:1px solid #e2e8f0;padding-bottom:4px}.question{margin:12px 0;font-size:14px}.options{margin-left:20px;margin-top:6px;display:grid;grid-template-columns:1fr 1fr;gap:8px}</style></head><body>${previewElement.innerHTML}${watermarkFooterHtml()}</body></html>`,
    );
    printWindow.document.close();
    printWindow.focus();
    window.setTimeout(() => {
      printWindow.print();
    }, 250);
    printWindow.onafterprint = () => printWindow.close();
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

  const saveIdRef = useRef<string | null>(null);

  useEffect(() => {
    saveIdRef.current = worksheet.id || null;
  }, [worksheet.id]);

  const refreshSaved = () => setSavedItems(readSavedWorksheets());

  const handleToggleSave = () => {
    const id = worksheet.id || saveIdRef.current || `ws_${Date.now()}`;
    if (!worksheet.id) {
      saveIdRef.current = id;
      onEnsureWorksheetId(id);
    }
    const existing = readSavedWorksheets();
    if (bookmarked) {
      writeSavedWorksheets(existing.filter((item) => item.id !== id));
      setBookmarked(false);
      refreshSaved();
      showToast('Removed from saved worksheets');
      return;
    }
    const topic = payload.topicOrText.trim().split('\n')[0]?.trim() || 'General';
    const entry: SavedWorksheet = {
      id,
      title: title || 'Worksheet',
      gradeLevel: payload.gradeLevel || 'N/A',
      topic,
      content: formatWorksheetPlainText({ ...worksheet, title }),
      savedAt: new Date().toISOString(),
      worksheet: { ...worksheet, id, title },
      payload,
    };
    writeSavedWorksheets([entry, ...existing.filter((item) => item.id !== id)]);
    setBookmarked(true);
    refreshSaved();
    showToast('Worksheet saved to your Saved Library!');
  };

  const deleteSavedWorksheet = (id: string) => {
    writeSavedWorksheets(readSavedWorksheets().filter((item) => item.id !== id));
    if (id === worksheet.id) setBookmarked(false);
    refreshSaved();
    showToast('Removed from saved worksheets');
  };

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2800);
  };

  const sendFeedback = (rating: 'positive' | 'negative') => {
    const next = feedback === rating ? null : rating;
    setFeedback(next);
    if (!next) {
      showToast('Rating cleared.');
      return;
    }
    showToast(
      next === 'positive'
        ? 'Thanks for your positive rating!'
        : 'Feedback recorded. We will improve this generator.',
    );
    const worksheetId = worksheet.id || title;
    void api.submitTeacherToolFeedback({ worksheetId, rating: next }).catch(() => {
      showToast('Feedback saved on this page.');
    });
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

  const toggleFollowUpVoice = () => {
    const Ctor = speechRecognitionCtor();
    if (!Ctor) {
      showToast('Voice input is not supported in this browser. Please use Chrome or Edge.');
      return;
    }
    if (listeningFollowUp) {
      followUpRecognitionRef.current?.stop();
      setListeningFollowUp(false);
      return;
    }

    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    followUpTranscriptRef.current = followUp.trim() ? `${followUp.trim()} ` : '';

    recognition.onstart = () => setListeningFollowUp(true);
    recognition.onresult = (event) => {
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const transcript = result?.[0]?.transcript ?? '';
        if (result?.isFinal) followUpTranscriptRef.current += `${transcript} `;
        else interimTranscript += transcript;
      }
      setFollowUp((followUpTranscriptRef.current + interimTranscript).trimStart());
    };
    recognition.onerror = () => setListeningFollowUp(false);
    recognition.onend = () => setListeningFollowUp(false);
    followUpRecognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      setListeningFollowUp(false);
      showToast('Voice input is not supported in this browser. Please use Chrome or Edge.');
    }
  };

  const sendFollowUp = () => {
    const msg = followUp.trim();
    if (!msg || busy) return;
    followUpRecognitionRef.current?.stop();
    setListeningFollowUp(false);
    setFollowUp('');
    setPromptMenuOpen(false);
    onFollowUp(msg, followUpFiles);
    setFollowUpFiles([]);
  };

  const glassIconButton =
    'inline-flex cursor-pointer appearance-none items-center justify-center rounded-xl border border-slate-700/60 bg-slate-900/80 p-2 text-slate-300 shadow-md transition-all hover:border-cyan-500/50 hover:text-cyan-400';

  const statusBar = (
    <div className="mt-2 flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-4 text-sm text-emerald-300">
      <span className="font-medium">
        The {title} Studio document has been created successfully.
      </span>
      <div className="flex items-center gap-2">
        <div className="relative">
          <button
            type="button"
            className={glassIconButton}
            aria-label="Translate worksheet"
            title="Translate Document"
            onClick={() => setIsTranslateModalOpen((v) => !v)}
          >
            <Languages className="h-4 w-4" />
          </button>
          {isTranslateModalOpen ? (
            <div className="absolute bottom-full right-0 z-30 mb-2 w-56 overflow-hidden rounded-xl border border-slate-700/60 bg-slate-900 py-1 shadow-xl">
              <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Translate to
              </p>
              {TRANSLATE_LANGUAGES.map((language) => (
                <button
                  key={language.id}
                  type="button"
                  className="flex w-full cursor-pointer appearance-none items-center justify-between bg-transparent px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-800 hover:text-cyan-300"
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
          className={
            isSpeaking
              ? 'inline-flex cursor-pointer appearance-none items-center justify-center animate-pulse rounded-xl border border-cyan-400 bg-cyan-500/20 p-2 text-cyan-400 transition-all'
              : glassIconButton
          }
          aria-label={isSpeaking ? 'Stop reading' : 'Read aloud'}
          title={isSpeaking ? 'Stop Reading' : 'Read Aloud'}
          onClick={toggleSpeech}
        >
          <Volume2 className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={
            feedback === 'positive'
              ? 'inline-flex cursor-pointer appearance-none items-center justify-center rounded-xl border border-emerald-400 bg-emerald-500/20 p-2 text-emerald-400 transition-all'
              : 'inline-flex cursor-pointer appearance-none items-center justify-center rounded-xl border border-slate-700/60 bg-slate-900/80 p-2 text-slate-300 shadow-md transition-all hover:border-emerald-500/50 hover:text-emerald-400'
          }
          aria-label="Helpful output"
          title="Helpful output"
          aria-pressed={feedback === 'positive'}
          onClick={() => sendFeedback('positive')}
        >
          <ThumbsUp className="h-4 w-4" fill={feedback === 'positive' ? 'currentColor' : 'none'} />
        </button>
        <button
          type="button"
          className={
            feedback === 'negative'
              ? 'inline-flex cursor-pointer appearance-none items-center justify-center rounded-xl border border-rose-400 bg-rose-500/20 p-2 text-rose-400 transition-all'
              : 'inline-flex cursor-pointer appearance-none items-center justify-center rounded-xl border border-slate-700/60 bg-slate-900/80 p-2 text-slate-300 shadow-md transition-all hover:border-rose-500/50 hover:text-rose-400'
          }
          aria-label="Needs improvement"
          title="Needs improvement"
          aria-pressed={feedback === 'negative'}
          onClick={() => sendFeedback('negative')}
        >
          <ThumbsDown className="h-4 w-4" fill={feedback === 'negative' ? 'currentColor' : 'none'} />
        </button>
        <button
          type="button"
          className="inline-flex cursor-pointer appearance-none items-center justify-center rounded-xl bg-cyan-500 p-2.5 font-bold text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all hover:bg-cyan-400"
          aria-label="Download worksheet"
          title="Download Worksheet PDF / Doc"
          onClick={handleDownloadDoc}
        >
          <Download className="h-4 w-4" />
        </button>
      </div>
    </div>
  );

  const documentPaper = (
    <div id="worksheet-template-preview" ref={previewRef} className="w-full max-w-full rounded-lg bg-white p-2 shadow-md sm:p-4">
      <PrintableWorksheet worksheet={worksheet} title={title} />
    </div>
  );

  return (
    <div
      className={
        pane
          ? 'ws-studio flex w-full flex-col pb-12'
          : 'ws-studio flex h-full min-h-0 flex-col overflow-hidden p-4'
      }
    >
      <header className="mb-4 flex shrink-0 flex-wrap items-start justify-between gap-3">
        {pane ? (
          <p className="min-w-0 truncate text-xs font-semibold uppercase tracking-wider text-slate-400">{crumb}</p>
        ) : (
          <nav className="flex min-w-0 flex-wrap items-center gap-1.5 text-sm text-slate-500">
            <Link to="/teacher/tools" className="font-semibold text-cyan-700 hover:text-cyan-900">
              Teacher Tools
            </Link>
            <ChevronRight className="h-3.5 w-3.5 shrink-0" />
            <button type="button" className="font-semibold text-slate-700 hover:text-cyan-700" onClick={onReset}>
              Worksheet Generator
            </button>
            <ChevronRight className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate font-semibold text-slate-900">{crumb}</span>
          </nav>
        )}
        <div className="flex flex-wrap items-start gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="inline-flex cursor-pointer appearance-none items-center justify-center rounded-xl border border-slate-700/60 bg-slate-900/80 p-2.5 text-slate-300 shadow-md transition-all hover:border-cyan-500/50 hover:text-cyan-400"
              aria-label="Share worksheet"
              title="Share Worksheet"
              onClick={() => void share()}
            >
              <Share2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="inline-flex cursor-pointer appearance-none items-center justify-center rounded-xl border border-slate-700/60 bg-slate-900/80 p-2.5 text-slate-300 shadow-md transition-all hover:border-cyan-500/50 hover:text-cyan-400"
              aria-label="Create new worksheet"
              title="Add New"
              onClick={onReset}
            >
              <Plus className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="inline-flex cursor-pointer appearance-none items-center justify-center rounded-xl border border-slate-700/60 bg-slate-900/80 p-2.5 text-slate-300 shadow-md transition-all hover:border-cyan-500/50 hover:text-cyan-400"
              aria-label="Version history"
              title="Version history"
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

      <section
        className={
          pane
            ? 'flex w-full min-h-[1000px] flex-col rounded-2xl border border-slate-800/90 bg-white text-slate-900 shadow-2xl'
            : 'flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm'
        }
      >
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            {editingTitle ? (
              <input
                className="rounded-md border border-cyan-300 px-2 py-1 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-cyan-200"
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
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={handleToggleSave}
              className={`inline-flex cursor-pointer appearance-none items-center justify-center rounded-xl border p-2.5 shadow-sm transition-all ${
                bookmarked
                  ? 'border-amber-500/50 bg-amber-500/20 text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                  : 'border-slate-700/60 bg-slate-900/80 text-slate-300 hover:border-amber-500/40 hover:text-amber-400'
              }`}
              title={bookmarked ? 'Saved in Library (Click to unsave)' : 'Bookmark Worksheet'}
              aria-pressed={bookmarked}
            >
              <Bookmark className={`h-4 w-4 ${bookmarked ? 'fill-amber-400' : ''}`} />
            </button>
            <button
              type="button"
              onClick={() => {
                refreshSaved();
                setSavedOpen(true);
              }}
              className="inline-flex cursor-pointer appearance-none items-center gap-1.5 rounded-xl border border-slate-700/60 bg-slate-900/80 px-3 py-1.5 text-xs font-semibold text-slate-300 transition-all hover:border-cyan-500/40 hover:text-cyan-400"
            >
              <FolderHeart className="h-3.5 w-3.5 text-cyan-400" />
              <span>View Saved</span>
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
            className={
              pane
                ? 'w-full min-h-[1000px] bg-transparent p-2 sm:p-4'
                : 'custom-scrollbar h-full max-h-[calc(100vh-280px)] w-full overflow-x-hidden overflow-y-auto scroll-smooth rounded-xl bg-slate-100 p-6'
            }
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
          {pane ? null : (
            <button
              type="button"
              className="absolute left-1/2 top-1/2 z-10 inline-flex -translate-x-1/2 -translate-y-1/2 cursor-pointer appearance-none items-center gap-1.5 rounded-full bg-slate-900/90 px-4 py-2 text-sm font-medium text-white shadow-lg hover:bg-slate-800"
              onClick={() => setExpanded(true)}
            >
              <Maximize2 className="h-4 w-4" /> Expand preview
            </button>
          )}
        </div>
      </section>

      {statusBar}

      <div
        id="ws-follow-up"
        ref={chatContainerRef}
        className="mx-auto mt-3 w-full max-w-full shrink-0"
      >
        {listeningFollowUp ? (
          <div className="mb-2">
            <VoiceListeningIndicator isListening onStopListening={toggleFollowUpVoice} />
          </div>
        ) : null}
        {followUpFiles.length > 0 && (
          <ul className="mb-2 flex flex-wrap gap-1.5 px-1">
            {followUpFiles.map((name) => (
              <li key={name} className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-0.5 text-xs font-medium text-cyan-300">
                {name}
              </li>
            ))}
          </ul>
        )}
        <div className="flex w-full items-end gap-2 rounded-2xl border border-slate-800/90 bg-slate-900/90 p-2 shadow-2xl backdrop-blur-xl transition-all focus-within:border-cyan-500/50 focus-within:ring-1 focus-within:ring-cyan-500/30">
          <button
            type="button"
            onClick={() => followUpFileRef.current?.click()}
            className="inline-flex shrink-0 cursor-pointer appearance-none items-center justify-center rounded-xl border border-slate-800 bg-slate-950/60 p-2.5 text-slate-400 transition-all hover:border-slate-700 hover:bg-slate-800 hover:text-cyan-400"
            title="Attach File or Context"
            aria-label="Attach extra context"
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
            className="max-h-32 min-h-[40px] flex-1 resize-none bg-transparent px-2 py-2.5 text-sm leading-relaxed text-slate-200 outline-none placeholder:text-slate-500"
            style={{ color: '#e2e8f0', WebkitTextFillColor: '#e2e8f0' }}
            placeholder="Continue the conversation or modify worksheet..."
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
          <div className="flex shrink-0 items-center gap-1.5 pb-0.5">
            <button
              type="button"
              onClick={toggleFollowUpVoice}
              className={`inline-flex cursor-pointer appearance-none items-center justify-center rounded-xl p-2 transition-all ${
                listeningFollowUp
                  ? 'animate-pulse border border-rose-500/50 bg-rose-500/20 text-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.4)]'
                  : 'border border-slate-800 bg-slate-950/60 text-slate-400 hover:border-cyan-500/40 hover:bg-cyan-500/20 hover:text-cyan-400'
              }`}
              title={listeningFollowUp ? 'Listening... Speak now' : 'Voice Input'}
              aria-label={listeningFollowUp ? 'Stop recording' : 'Voice input'}
            >
              <Mic className="h-4 w-4" />
            </button>
            <div className="relative">
              <button
                type="button"
                onClick={() => setPromptMenuOpen((v) => !v)}
                className="inline-flex cursor-pointer appearance-none items-center justify-center rounded-xl border border-slate-800 bg-slate-950/60 p-2 text-slate-400 transition-all hover:border-amber-500/40 hover:bg-amber-500/20 hover:text-amber-400"
                title="Prompt Assistant Ideas"
                aria-label="Prompt assistant"
              >
                <Lightbulb className="h-4 w-4" />
              </button>
              {promptMenuOpen && (
                <div className="absolute bottom-12 right-0 z-20 w-72 overflow-hidden rounded-xl border border-slate-700/60 bg-slate-900 py-1 shadow-xl">
                  {PROMPT_SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      className="block w-full cursor-pointer appearance-none bg-transparent px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-800 hover:text-cyan-300"
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
              onClick={sendFollowUp}
              disabled={busy || !followUp.trim()}
              className={`inline-flex cursor-pointer appearance-none items-center justify-center rounded-xl p-2.5 font-bold shadow-md transition-all ${
                followUp.trim() && !busy
                  ? 'bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:scale-105 hover:bg-cyan-400'
                  : 'cursor-not-allowed border border-slate-700/50 bg-slate-800 text-slate-600'
              }`}
              title="Send Message"
              aria-label="Send"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
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
              <div className="w-full max-w-full rounded-lg bg-white p-2 shadow-md sm:p-4">
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
      {savedOpen
        ? createPortal(
            <div
              className="fixed inset-0 z-[80] flex justify-end bg-slate-950/80 backdrop-blur-md"
              onClick={() => setSavedOpen(false)}
            >
              <div
                className="flex h-full w-full max-w-md flex-col border-l border-slate-800 bg-slate-900 p-6 shadow-2xl"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div className="flex items-center gap-2 text-lg font-bold text-cyan-400">
                    <Bookmark className="h-5 w-5 fill-cyan-400" />
                    <span>Saved Worksheets</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSavedOpen(false)}
                    className="cursor-pointer appearance-none rounded-lg border-0 bg-transparent p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
                    aria-label="Close saved worksheets"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="flex-1 space-y-3 overflow-y-auto py-4">
                  {savedItems.length === 0 ? (
                    <div className="py-12 text-center text-sm text-slate-500">
                      No saved worksheets found. Bookmark a worksheet to view it here.
                    </div>
                  ) : (
                    savedItems.map((item) => (
                      <div
                        key={item.id}
                        className="group flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 p-4 transition-all hover:border-cyan-500/40"
                      >
                        <div className="min-w-0 flex-1 space-y-1">
                          <h4 className="truncate text-sm font-bold text-slate-200 group-hover:text-cyan-400">{item.title}</h4>
                          <p className="truncate text-xs text-slate-500">
                            {item.gradeLevel} • {item.topic}
                          </p>
                          <p className="text-[10px] text-slate-600">
                            Saved on {new Date(item.savedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="ml-2 flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              onLoadSaved(item);
                              setSavedOpen(false);
                            }}
                            className="cursor-pointer appearance-none rounded-lg border-0 bg-cyan-500/10 px-2 py-2 text-xs font-semibold text-cyan-400 transition-all hover:bg-cyan-500 hover:text-slate-950"
                            title="Open Worksheet"
                          >
                            Open
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteSavedWorksheet(item.id)}
                            className="cursor-pointer appearance-none rounded-lg border-0 bg-transparent p-2 text-slate-500 transition-colors hover:text-rose-400"
                            title="Delete"
                            aria-label={`Delete ${item.title}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
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
  const [, setHistory] = useState<FormSnapshot[]>([]);
  const [savedVersions, setSavedVersions] = useState<WorksheetHistoryItem[]>(loadLocalVersions);
  const [historyOpen, setHistoryOpen] = useState(false);

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

  const navigate = useNavigate();
  const location = useLocation();
  const loadSavedWorksheet = (item: SavedWorksheet) => {
    if (!item.worksheet || !item.payload) return;
    const next = withWorksheetId({ ...item.worksheet, title: item.title || item.worksheet.title });
    setWorksheet(next);
    setSubmitted(item.payload);
    setGradeLevel(item.payload.gradeLevel);
    setTopicOrText(item.payload.topicOrText);
    setFiles(item.payload.attachments ?? []);
  };

  useEffect(() => {
    const fromRoute = (location.state as { savedWorksheetId?: string } | null)?.savedWorksheetId;
    let fromSession: string | null = null;
    try {
      fromSession = sessionStorage.getItem('mindvault_open_saved_worksheet');
      if (fromSession) sessionStorage.removeItem('mindvault_open_saved_worksheet');
    } catch {
      fromSession = null;
    }
    const savedId = fromRoute || fromSession;
    if (!savedId) return;
    const item = readSavedWorksheets().find((row) => row.id === savedId);
    if (item) loadSavedWorksheet(item);
  }, [location.state]);

  const handleClose = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate('/teacher/tools');
  };

  const words = countWords(topicOrText);

  return (
    <>
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-slate-950 font-sans text-slate-100">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <nav className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-800/80 bg-slate-900/90 px-6 py-3 text-xs text-slate-400 backdrop-blur-xl">
          <div className="flex flex-wrap items-center gap-2">
            <Link to="/teacher/tools" className="hover:text-white">
              Teacher Tools
            </Link>
            <ChevronRight className="h-3.5 w-3.5 text-slate-600" />
            <span className="font-bold text-cyan-400">Worksheet Generator</span>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="inline-flex cursor-pointer appearance-none items-center gap-1.5 rounded-xl border border-slate-700/60 bg-slate-800/80 px-3 py-1.5 text-xs font-semibold text-slate-300 transition-all hover:border-rose-500/40 hover:bg-rose-500/20 hover:text-rose-400"
          >
            <X className="h-4 w-4" />
            <span>Close</span>
          </button>
        </nav>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-0 overflow-y-auto lg:grid-cols-12 lg:overflow-hidden">
          <div className="flex min-h-0 flex-col justify-between border-r border-slate-800/80 bg-slate-900/50 p-6 lg:col-span-4 lg:overflow-y-auto">
            <div className="flex min-h-0 flex-1 flex-col">
              <header className="flex shrink-0 flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="flex items-center gap-2.5 text-2xl font-black tracking-tight text-white">Worksheet Generator</h2>
                    <button
                      type="button"
                      className={`cursor-pointer appearance-none border-0 bg-transparent p-0 ${favorited ? 'text-amber-400' : 'text-slate-600 hover:text-amber-400'}`}
                      aria-label={favorited ? 'Remove from favorites' : 'Add to favorites'}
                      aria-pressed={Boolean(favorited)}
                      onClick={toggleFavorite}
                    >
                      <Star className="h-5 w-5" fill={favorited ? 'currentColor' : 'none'} />
                    </button>
                  </div>
                  <p className="mt-1 text-xs font-medium leading-relaxed text-slate-400">Generate a worksheet based on any topic or text.</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    className="cursor-pointer appearance-none rounded-xl border border-slate-700/60 bg-slate-800/80 p-2 text-slate-300 transition-all hover:bg-slate-700"
                    aria-label="Undo last change"
                    onClick={undo}
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="cursor-pointer appearance-none rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3.5 py-1.5 text-xs font-bold text-cyan-400 transition-all hover:bg-cyan-500/20"
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
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-300">
                  Grade level <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <select
                    className="w-full cursor-pointer appearance-none rounded-xl border border-slate-800 bg-[#0b101d] px-4 py-3 pr-9 text-sm text-white outline-none transition-all hover:border-slate-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50"
                    style={{ backgroundColor: '#0b101d', color: '#fff' }}
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
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-300">
                  Topic or text <span className="text-rose-400">*</span>
                </label>
                <div className="relative flex min-h-[260px] flex-1 flex-col justify-between space-y-3 rounded-xl border border-slate-800 bg-[#0b101d] p-4 transition-all hover:border-slate-700 focus-within:border-cyan-500/60">
                  <div className="relative flex min-h-0 flex-1 flex-col">
                    <textarea
                      className="min-h-[180px] w-full flex-1 resize-none bg-transparent p-0 pr-12 text-sm leading-relaxed text-white placeholder-slate-500 focus:outline-none"
                      style={TOOL_TEXTAREA_STYLE}
                      placeholder={TOPIC_PLACEHOLDER}
                      value={topicOrText}
                      onChange={(e) => setTopicOrText(sanitizePastedText(e.target.value))}
                      onPaste={handlePaste}
                      spellCheck
                    />
                    <button
                      type="button"
                      onClick={toggle}
                      className={`absolute right-3 top-3 cursor-pointer appearance-none rounded-xl p-2 shadow-lg backdrop-blur-md transition-all duration-300 ${
                        listening
                          ? 'animate-pulse border border-rose-500/50 bg-rose-500/20 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.4)]'
                          : 'border border-slate-700/60 bg-slate-800/80 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.15)] hover:scale-105 hover:border-cyan-500/40 hover:bg-cyan-500/20 hover:text-cyan-300'
                      }`}
                      title={listening ? 'Listening...' : 'Click to speak'}
                      aria-label={listening ? 'Stop recording' : 'Start recording voice prompt'}
                    >
                      <Mic className="h-4 w-4" />
                    </button>
                  </div>
                  {listening ? <VoiceListeningIndicator isListening onStopListening={toggle} /> : null}
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
                      <AddFileMenu onFiles={addFiles} />
                    </div>
                    <p
                      className={
                        overLimit
                          ? 'text-xs font-medium tracking-tight text-rose-400'
                          : 'text-[11px] font-medium text-slate-500'
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
                  className="inline-flex cursor-pointer appearance-none items-center gap-1.5 self-end rounded-xl border border-slate-800 bg-slate-900 px-4 py-2 text-xs font-bold text-cyan-400 transition-all hover:bg-slate-800"
                  onClick={() => setAssistantOpen((v) => !v)}
                >
                  <Lightbulb className="h-4 w-4" /> Prompt assistant
                </button>
                {assistantOpen && (
                  <div className="w-full rounded-xl border border-slate-800 bg-[#0b101d] px-4 py-3 text-sm text-slate-300">
                    Name a topic, paste source text, or attach a PDF. Say whether you want vocabulary,
                    short answer, or mixed practice.
                  </div>
                )}
              </div>
              <button
                type="button"
                disabled={busy || !payload.topicOrText || overLimit}
                className="inline-flex w-full cursor-pointer appearance-none items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 py-3.5 text-sm font-black uppercase tracking-wider text-slate-950 shadow-lg shadow-cyan-500/20 transition-all hover:from-cyan-400 hover:to-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={() => void generate()}
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {busy ? 'Generating Worksheet...' : 'Generate Worksheet'}
              </button>
              {error && (
                <p className="mt-4 rounded-xl border border-rose-500/40 bg-rose-950/50 px-4 py-3 text-sm text-rose-200">
                  {error}
                </p>
              )}
            </div>
          </div>

          <div
            data-worksheet-scroll
            className="custom-scrollbar flex min-h-0 w-full flex-col items-stretch bg-slate-950/90 p-6 lg:col-span-8 lg:overflow-y-auto"
          >
            <div className="mb-4 flex w-full max-w-full items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Template Preview
              </span>
              <span className="text-xs text-slate-500">Live Preview Mode</span>
            </div>
            <div className="w-full max-w-full space-y-8 pb-12">
              {worksheet && submitted ? (
                <WorksheetStudio
                  pane
                  worksheet={worksheet}
                  payload={submitted}
                  busy={busy}
                  onReset={resetAll}
                  onOpenHistory={() => setHistoryOpen(true)}
                  onFollowUp={(message, attachments) => {
                    void refineCurrent(message, attachments);
                  }}
                  onTranslate={translateCurrent}
                  onLoadSaved={loadSavedWorksheet}
                  onEnsureWorksheetId={(id) => {
                    setWorksheet((current) => (current ? { ...current, id } : current));
                  }}
                />
              ) : busy ? (
                <div className="flex min-h-[1000px] w-full flex-col items-center justify-center gap-3 rounded-2xl border border-slate-800/90 bg-slate-900/90 text-slate-400 shadow-2xl">
                  <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
                  <p className="text-sm">Generating your worksheet…</p>
                </div>
              ) : (
                <WorksheetTemplateSkeleton />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
    <WorksheetHistoryDrawer
      open={historyOpen}
      onClose={() => setHistoryOpen(false)}
      topic={(submitted?.topicOrText ?? topicOrText).split('\n')[0]}
      fallbackItems={savedVersions}
      activeId={worksheet?.id}
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

export default WorksheetGenerator;
