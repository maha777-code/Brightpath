import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Bookmark,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FolderHeart,
  Copy,
  Download,
  FileText,
  History,
  Languages,
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
  type WorksheetGeneratorPayload,
  type WorksheetGeneratorResponse,
  type WorksheetHistoryItem,
} from '@brightpath/shared';
import { api } from '@/lib/api';
import { ToolErrorRetry } from '@/components/tools/ToolErrorRetry';
import { AddFileMenu } from '@/components/tools/AddFileMenu';
import { watermarkFooterHtml } from '@/lib/exportWatermark';
import { WorksheetHistoryDrawer } from '@/components/tools/WorksheetHistoryDrawer';
import {
  TOOL_ACCENT_BUTTON,
  TOOL_BREADCRUMB,
  TOOL_BREADCRUMB_LINK,
  TOOL_CARD,
  TOOL_FIELD,
  TOOL_GENERATE,
  TOOL_HINT,
  TOOL_ICON_BUTTON,
  TOOL_LABEL,
  TOOL_MIC,
  TOOL_MUTED,
  TOOL_PAGE,
  TOOL_PANEL,
  TOOL_SECONDARY,
  TOOL_SECTION_TITLE,
  TOOL_SUBTITLE,
  TOOL_TEXTAREA,
  TOOL_TITLE,
} from '@/components/tools/toolTheme';
import { VoiceListeningIndicator } from '@/components/VoiceListeningIndicator';
import { readSavedWorksheets, writeSavedWorksheets, type SavedWorksheet } from '@/lib/savedWorksheets';
import {
  documentContext,
  documentImages,
  documentsFromPayload,
  extractDocumentText,
  type AttachedDocument,
} from '@/lib/extractDocumentText';

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
const HISTORY_KEY = 'mindvault_worksheet_history';
const LEGACY_HISTORY_KEY = 'brightpath_worksheet_history';
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

function readHistoryKey(key: string): unknown[] {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function loadLocalVersions(): WorksheetHistoryItem[] {
  const seen = new Set<string>();
  const items: WorksheetHistoryItem[] = [];
  for (const raw of [...readHistoryKey(HISTORY_KEY), ...readHistoryKey(LEGACY_HISTORY_KEY)]) {
    if (!raw || typeof raw !== 'object') continue;
    const item = raw as WorksheetHistoryItem;
    if (!item.worksheet || !item.payload || !item.id || seen.has(item.id)) continue;
    seen.add(item.id);
    items.push({
      ...item,
      createdAt: item.createdAt || new Date().toISOString(),
      title: item.title || item.worksheet.title || 'Untitled Worksheet',
      gradeLevel: item.gradeLevel || item.payload.gradeLevel || 'N/A',
      topicOrText: item.topicOrText || item.payload.topicOrText || '',
    });
  }
  return items.slice(0, 30);
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
  files: AttachedDocument[];
};

function WorksheetTemplateSkeleton() {
  return (
    <div className="mv-pres-field w-full max-w-full space-y-6 rounded-xl p-6 text-sm md:p-8" aria-hidden>
      <div className={`${TOOL_MUTED} flex items-center justify-between pb-2 font-semibold`}>
        <div>
          Name: <span className="ml-2 inline-block w-44 border-b border-current opacity-50" />
        </div>
        <div>
          Date: <span className="ml-2 inline-block w-32 border-b border-current opacity-50" />
        </div>
      </div>

      <div className="py-2 text-center">
        <h2 className="text-2xl font-semibold">Worksheet Title</h2>
      </div>

      <div className="space-y-3 pt-2">
        <h3 className="mv-pres-accent text-sm font-semibold">Section</h3>
        <div className={`${TOOL_MUTED} space-y-2 pl-2`}>
          {[1, 2, 3, 4, 5].map((num) => (
            <div key={`sa-${num}`}>
              <p className="font-medium">{num}. ____________________________________________</p>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3 pt-2">
        <h3 className="mv-pres-accent text-sm font-semibold">Section</h3>
        <div className="space-y-4 pl-2">
          {[1, 2, 3, 4, 5].map((qNum) => (
            <div key={`mc-${qNum}`} className="space-y-1">
              <p className="font-semibold">{qNum}. Question prompt placeholder...</p>
              <div className={`${TOOL_MUTED} grid grid-cols-2 gap-2 pl-4 text-xs`}>
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
        <h3 className="mv-pres-accent text-sm font-semibold">Section</h3>
        <div className="space-y-2 pl-2">
          {[1, 2, 3].map((num) => (
            <div key={`ext-${num}`} className="space-y-1">
              <p className="font-medium">{num}. Extended answer prompt...</p>
              <div className={`${TOOL_MUTED} h-6 border-b border-dashed border-current opacity-40`} />
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3 pt-2">
        <h3 className="mv-pres-accent text-sm font-semibold">SectionLabel</h3>
        <div className="grid grid-cols-1 gap-2 pl-2 md:grid-cols-2">
          {[1, 2, 3, 4, 5].map((num) => (
            <div key={`sl-${num}`} className="mv-pres-card rounded-lg p-2">
              {num}. Label item description
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3 pt-2">
        <h3 className="mv-pres-accent text-sm font-semibold">Label</h3>
        <div className="grid grid-cols-1 gap-2 pl-2 md:grid-cols-2">
          {[6, 7, 8, 9, 10].map((num) => (
            <div key={`l-${num}`} className="mv-pres-card rounded-lg p-2">
              {num}. Label item description
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3 pt-2">
        <h3 className="mv-pres-accent text-sm font-semibold">Label</h3>
        <div className="grid grid-cols-1 gap-2 pl-2 md:grid-cols-2">
          {[11, 12, 13].map((num) => (
            <div key={`l2-${num}`} className="mv-pres-card rounded-lg p-2">
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

function cleanQuestionText(rawText: string): string {
  if (!rawText) return '';
  const cleaned = rawText.replace(/^(\d+[\.\)]\s*)+/g, '').trim();
  return cleaned || rawText.trim();
}

function formatWorksheetPlainText(worksheet: WorksheetGeneratorResponse): string {
  let number = 1;
  const parts = [
    worksheet.title,
    worksheet.instructions ?? '',
    worksheet.passage ? `Reading Passage\n${worksheet.passage}` : '',
    ...worksheet.sections.map((section) => {
      const items = section.items
        .map((item) => {
          const line = `${number}. ${cleanQuestionText(item.prompt)}`;
          number += 1;
          return line;
        })
        .join('\n');
      return `${section.heading}\n${items}`;
    }),
  ];
  return parts.filter(Boolean).join('\n\n');
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
            <div className="space-y-4">
              {section.items.map((item) => {
                const n = number;
                number += 1;
                return (
                  <div key={`${item.id}-${n}`} className="pl-1 text-sm leading-relaxed text-slate-700">
                    <p className="font-medium">
                      <span className="mr-1.5 font-bold text-slate-900">{n}.</span>
                      {cleanQuestionText(item.prompt)}
                    </p>
                    <div className="mt-3 space-y-3 pl-6">
                      <div className="h-px bg-slate-300" />
                      <div className="h-px bg-slate-300" />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </article>
  );
}

function AttachedFileBadges({
  files,
  onRemove,
  className = 'mb-3',
}: {
  files: AttachedDocument[];
  onRemove: (id: string) => void;
  className?: string;
}) {
  if (!files.length) return null;
  return (
    <div className={`${className} flex flex-wrap gap-2`}>
      {files.map((file) => (
        <div
          key={file.id}
          className="mv-pres-field flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs"
        >
          <FileText className="mv-pres-accent h-3.5 w-3.5" />
          <span className="max-w-[200px] truncate font-medium">{file.name}</span>
          {file.isProcessing ? (
            <Loader2 className={`${TOOL_MUTED} h-3 w-3 animate-spin`} />
          ) : (
            <button
              type="button"
              onClick={() => onRemove(file.id)}
              className={`${TOOL_ICON_BUTTON} ml-1`}
              aria-label={`Remove ${file.name}`}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      ))}
    </div>
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
  onClose,
  busy,
  actionError,
  onRetryAction,
  pane = false,
  embedded = false,
}: {
  worksheet: WorksheetGeneratorResponse;
  payload: WorksheetGeneratorPayload;
  onReset: () => void;
  onFollowUp: (
    message: string,
    attachments?: string[],
    documentContext?: string,
    imageFiles?: string[],
  ) => void;
  onOpenHistory: () => void;
  onTranslate: (language: string) => Promise<void>;
  onLoadSaved: (item: SavedWorksheet) => void;
  onEnsureWorksheetId: (id: string) => void;
  onClose?: () => void;
  busy: boolean;
  actionError?: string | null;
  onRetryAction?: (() => void) | null;
  pane?: boolean;
  embedded?: boolean;
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
  const [followUpFiles, setFollowUpFiles] = useState<AttachedDocument[]>([]);
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
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const topicShort =
    payload.topicOrText.trim().split(/\n/)[0]?.trim().slice(0, 48) || worksheet.title;

  useEffect(() => {
    setTitle(worksheet.title);
  }, [worksheet.title]);

  useEffect(() => {
    const paper = previewRef.current;
    if (!paper) return;
    const pageHeight = 1056;
    const update = () => {
      const pages = Math.max(1, Math.ceil(paper.scrollHeight / pageHeight));
      setTotalPages(pages);
      const scroller =
        (paper.closest('[data-worksheet-scroll]') as HTMLElement | null) ?? scrollContainerRef.current;
      if (!scroller) {
        setCurrentPage(1);
        return;
      }
      const paperStart =
        paper.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop;
      const intoPaper = Math.max(0, scroller.scrollTop - paperStart);
      setCurrentPage(Math.min(pages, Math.max(1, Math.floor(intoPaper / pageHeight) + 1)));
    };
    update();
    const scroller =
      (paper.closest('[data-worksheet-scroll]') as HTMLElement | null) ?? scrollContainerRef.current;
    scroller?.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    const observer = new ResizeObserver(update);
    observer.observe(paper);
    return () => {
      scroller?.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      observer.disconnect();
    };
  }, [worksheet, title]);

  const goToPage = (page: number) => {
    const paper = previewRef.current;
    const scroller =
      (paper?.closest('[data-worksheet-scroll]') as HTMLElement | null) ?? scrollContainerRef.current;
    if (!paper || !scroller) return;
    const next = Math.min(totalPages, Math.max(1, page));
    const paperStart =
      paper.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop;
    scroller.scrollTo({ top: paperStart + (next - 1) * 1056, behavior: 'smooth' });
  };

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
    const ready = followUpFiles.filter((file) => !file.isProcessing);
    const context = documentContext(ready);
    const images = documentImages(ready);
    if (followUpFiles.some((file) => file.isProcessing)) return;
    if ((!msg && !context && images.length === 0) || busy) return;
    followUpRecognitionRef.current?.stop();
    setListeningFollowUp(false);
    setFollowUp('');
    setPromptMenuOpen(false);
    onFollowUp(msg || 'Revise the worksheet using the attached document.', ready.map((file) => file.name), context, images);
    setFollowUpFiles([]);
  };

  const addFollowUpFiles = async (list: FileList | null) => {
    if (!list?.length) return;
    for (const file of Array.from(list)) {
      const id = `follow_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      setFollowUpFiles((prev) => [...prev, { id, name: file.name, extractedText: '', isProcessing: true }]);
      try {
        const extracted = await extractDocumentText(file);
        setFollowUpFiles((prev) =>
          prev.map((item) =>
            item.id === id
              ? { ...item, extractedText: extracted.text, imageDataUrl: extracted.imageDataUrl, isProcessing: false }
              : item,
          ),
        );
        showToast(`Read ${file.name}`);
      } catch (err) {
        setFollowUpFiles((prev) => prev.filter((item) => item.id !== id));
        showToast(err instanceof Error ? err.message : `Could not extract text from ${file.name}`);
      }
    }
  };

  const iconButton = `${TOOL_SECONDARY} p-2`;
  const activeIconButton = `${TOOL_SECONDARY} mv-pres-accent p-2`;
  const menuItem = `${TOOL_MUTED} flex w-full items-center justify-between px-3 py-2 text-left text-sm`;

  const statusBar = (
    <div className={`${TOOL_MUTED} mt-3 flex w-full shrink-0 flex-wrap items-center justify-between gap-3 text-xs`}>
      <span className="font-medium">
        The worksheet Studio document has been created successfully.
      </span>
      <div className="flex items-center gap-2">
        <div className="relative">
          <button
            type="button"
            className={iconButton}
            aria-label="Translate worksheet"
            title="Translate Document"
            onClick={() => setIsTranslateModalOpen((v) => !v)}
          >
            <Languages className="h-4 w-4" />
          </button>
          {isTranslateModalOpen ? (
            <div className="mv-pres-card absolute bottom-full right-0 z-30 mb-2 w-56 overflow-hidden rounded-xl py-1 shadow-xl">
              <p className={`${TOOL_MUTED} px-3 py-2 text-xs font-semibold`}>
                Translate to
              </p>
              {TRANSLATE_LANGUAGES.map((language) => (
                <button
                  key={language.id}
                  type="button"
                  className={menuItem}
                  onClick={() => void handleTranslate(language.id)}
                >
                  <span>{language.id}</span>
                  <span className="text-xs">{language.native}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <button
          type="button"
          className={isSpeaking ? `${activeIconButton} animate-pulse` : iconButton}
          aria-label={isSpeaking ? 'Stop reading' : 'Read aloud'}
          title={isSpeaking ? 'Stop Reading' : 'Read Aloud'}
          onClick={toggleSpeech}
        >
          <Volume2 className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={feedback === 'positive' ? activeIconButton : iconButton}
          aria-label="Helpful output"
          title="Helpful output"
          aria-pressed={feedback === 'positive'}
          onClick={() => sendFeedback('positive')}
        >
          <ThumbsUp className="h-4 w-4" fill={feedback === 'positive' ? 'currentColor' : 'none'} />
        </button>
        <button
          type="button"
          className={feedback === 'negative' ? `${TOOL_SECONDARY} p-2 text-rose-300` : iconButton}
          aria-label="Needs improvement"
          title="Needs improvement"
          aria-pressed={feedback === 'negative'}
          onClick={() => sendFeedback('negative')}
        >
          <ThumbsDown className="h-4 w-4" fill={feedback === 'negative' ? 'currentColor' : 'none'} />
        </button>
        <button
          type="button"
          className="mv-pres-generate inline-flex items-center justify-center rounded-lg p-2.5"
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

  const headerIcon = `${TOOL_SECONDARY} p-2`;

  return (
    <div
      className={
        pane
          ? 'flex w-full flex-col pb-12'
          : 'flex h-full min-h-0 flex-col overflow-hidden p-4'
      }
    >
      <header className="mb-6 flex w-full shrink-0 flex-wrap items-center justify-between gap-3">
        {embedded ? (
          <p className="min-w-0 truncate text-sm font-semibold">{title || crumb}</p>
        ) : (
          <nav className="flex min-w-0 flex-wrap items-center gap-2 text-sm" aria-label="Breadcrumb">
            <Link to="/teacher/tools" className={TOOL_BREADCRUMB_LINK}>Teacher Tools</Link>
            <span className={TOOL_MUTED}>›</span>
            <span>Worksheet Generator</span>
            <span className={TOOL_MUTED}>›</span>
            <span className="truncate font-semibold">{title || crumb}</span>
          </nav>
        )}
        <div className="flex items-center gap-2">
          <button
            type="button"
            className={headerIcon}
            aria-label="Share worksheet"
            title="Share Worksheet"
            onClick={() => void share()}
          >
            <Share2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            className={headerIcon}
            aria-label="Create new worksheet"
            title="Add New"
            onClick={onReset}
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            type="button"
            className={headerIcon}
            aria-label="Worksheet Generation History"
            title="Worksheet Generation History"
            onClick={onOpenHistory}
          >
            <History className="h-4 w-4" />
          </button>
          {onClose ? (
            <button
              type="button"
              className={headerIcon}
              aria-label="Close worksheet generator"
              title="Close"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </header>

      <div className="mb-4 flex w-full justify-end">
        <div className={`${TOOL_PANEL} space-y-1 text-xs`}>
          <p>
            <span className={TOOL_MUTED}>Grade Level:</span>{' '}
            <span className="font-semibold">{gradeBadge(payload.gradeLevel)}</span>
          </p>
          <p>
            <span className={TOOL_MUTED}>Topic or text:</span>{' '}
            <span className="font-semibold">{topicShort}</span>
          </p>
        </div>
      </div>

      <section
        className={
          pane
            ? `${TOOL_CARD} flex flex-col`
            : `${TOOL_CARD} flex min-h-0 flex-1 flex-col overflow-hidden`
        }
      >
        <div className="mb-6 flex shrink-0 flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <FileText className="mv-pres-accent h-4 w-4 shrink-0" />
            {editingTitle ? (
              <input
                className="mv-pres-field rounded-md px-2 py-1 text-sm font-semibold outline-none focus:border-violet-400"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => setEditingTitle(false)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') setEditingTitle(false);
                }}
                autoFocus
              />
            ) : (
              <h2 className="truncate text-sm font-semibold">{title}</h2>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={handleToggleSave}
              className={bookmarked ? `${TOOL_SECONDARY} mv-pres-accent p-2` : `${TOOL_SECONDARY} p-2`}
              title={bookmarked ? 'Saved in Library (Click to unsave)' : 'Bookmark Worksheet'}
              aria-pressed={bookmarked}
            >
              <Bookmark className={`h-4 w-4 ${bookmarked ? 'fill-current' : ''}`} />
            </button>
            <button
              type="button"
              onClick={() => {
                refreshSaved();
                setSavedOpen(true);
              }}
              className={TOOL_SECONDARY}
            >
              <FolderHeart className="mv-pres-accent h-3.5 w-3.5" />
              <span>View Saved</span>
            </button>
            <button
              type="button"
              className={`${TOOL_SECONDARY} p-2`}
              aria-label="Print"
              title="Print"
              onClick={printDoc}
            >
              <Printer className="h-4 w-4" />
            </button>
            <button
              type="button"
              className={`${TOOL_SECONDARY} p-2`}
              aria-label="Copy"
              title="Copy"
              onClick={() => void copyDoc()}
            >
              <Copy className="h-4 w-4" />
            </button>
            <div className="relative">
              <button
                type="button"
                className={TOOL_SECONDARY}
                onClick={() => setExportOpen((v) => !v)}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>Export</span>
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
              {exportOpen && (
                <div className="mv-pres-card absolute right-0 z-20 mt-1 w-36 overflow-hidden rounded-lg py-1 shadow-lg">
                  <button
                    type="button"
                    className={menuItem}
                    onClick={() => {
                      setExportOpen(false);
                      printDoc();
                    }}
                  >
                    Export PDF
                  </button>
                  <button
                    type="button"
                    className={menuItem}
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
              className={TOOL_SECONDARY}
              onClick={() => setEditingTitle(true)}
            >
              <Pencil className="h-3.5 w-3.5" />
              <span>Edit</span>
            </button>
          </div>
        </div>

        <div className={`${TOOL_PANEL} relative min-h-[480px] md:p-8`}>
          <div className={`${TOOL_MUTED} mb-4 flex items-center justify-end gap-2 text-xs`}>
            <button
              type="button"
              className={`${TOOL_ICON_BUTTON} inline-flex items-center justify-center p-1 disabled:opacity-40`}
              aria-label="Previous page"
              disabled={currentPage <= 1}
              onClick={() => goToPage(currentPage - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span>
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              className={`${TOOL_ICON_BUTTON} inline-flex items-center justify-center p-1 disabled:opacity-40`}
              aria-label="Next page"
              disabled={currentPage >= totalPages}
              onClick={() => goToPage(currentPage + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            {copied ? <span className="mv-pres-accent ml-2 font-medium">Copied</span> : null}
          </div>
          <div
            id="worksheet-document-container"
            ref={scrollContainerRef}
            data-worksheet-scroll
            className={
              pane
                ? 'custom-scrollbar max-h-[72vh] w-full overflow-x-hidden overflow-y-auto scroll-smooth'
                : 'custom-scrollbar h-full max-h-[calc(100vh-280px)] w-full overflow-x-hidden overflow-y-auto scroll-smooth rounded-xl bg-slate-100 p-6'
            }
          >
            {documentPaper}
          </div>
          {busy || isTranslating ? (
            <div className="absolute inset-0 z-20 flex items-center justify-center rounded-xl bg-black/40">
              <div className="mv-pres-card inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium shadow-lg">
                <Loader2 className="h-4 w-4 animate-spin" />
                {isTranslating ? 'Translating worksheet…' : 'Updating worksheet…'}
              </div>
            </div>
          ) : null}
          <div className="pointer-events-none absolute bottom-4 left-1/2 z-10 -translate-x-1/2">
            <button
              type="button"
              className={`${TOOL_SECONDARY} pointer-events-auto shadow-xl`}
              onClick={() => setExpanded(true)}
            >
              <Maximize2 className="h-4 w-4" /> Expand preview
            </button>
          </div>
        </div>
      </section>

      {statusBar}

      <div
        id="ws-follow-up"
        ref={chatContainerRef}
        className="mt-4 w-full shrink-0"
      >
        {listeningFollowUp ? (
          <div className="mb-2">
            <VoiceListeningIndicator isListening onStopListening={toggleFollowUpVoice} />
          </div>
        ) : null}
        <ToolErrorRetry
          message={actionError}
          busy={busy || isTranslating}
          onRetry={onRetryAction}
          className="mb-3"
        />
        {followUpFiles.length > 0 && (
          <AttachedFileBadges
            files={followUpFiles}
            onRemove={(id) => setFollowUpFiles((prev) => prev.filter((file) => file.id !== id))}
          />
        )}
        <div className="mv-pres-card flex w-full items-end gap-2 rounded-2xl p-2 shadow-2xl">
          <button
            type="button"
            onClick={() => followUpFileRef.current?.click()}
            className={`${TOOL_SECONDARY} shrink-0 p-2.5`}
            title="Attach File or Context"
            aria-label="Attach extra context"
          >
            <Plus className="h-4 w-4" />
          </button>
          <input
            ref={followUpFileRef}
            type="file"
            accept=".pdf,.doc,.docx,.txt,.md,.png,.jpg,.jpeg,.webp,.gif,application/pdf,image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              void addFollowUpFiles(e.target.files);
              e.currentTarget.value = '';
            }}
          />
          <textarea
            className="mv-pres-field max-h-32 min-h-[40px] flex-1 resize-none rounded-xl px-3 py-2.5 text-sm leading-relaxed outline-none focus:border-violet-400"
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
              className={`${TOOL_ICON_BUTTON} inline-flex items-center justify-center p-2`}
              title={listeningFollowUp ? 'Listening... Speak now' : 'Voice Input'}
              aria-label={listeningFollowUp ? 'Stop recording' : 'Voice input'}
            >
              <Mic className={`h-4 w-4 ${listeningFollowUp ? 'text-violet-300' : ''}`} />
            </button>
            <div className="relative">
              <button
                type="button"
                onClick={() => setPromptMenuOpen((v) => !v)}
                className={`${TOOL_ACCENT_BUTTON} p-2`}
                title="Prompt Assistant Ideas"
                aria-label="Prompt assistant"
              >
                <Sparkles className="h-4 w-4" />
              </button>
              {promptMenuOpen && (
                <div className="mv-pres-card absolute bottom-12 right-0 z-20 w-72 overflow-hidden rounded-xl py-1 shadow-xl">
                  {PROMPT_SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      className={menuItem}
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
              disabled={
                busy ||
                followUpFiles.some((file) => file.isProcessing) ||
                (!followUp.trim() && !documentContext(followUpFiles) && documentImages(followUpFiles).length === 0)
              }
              className="mv-pres-generate inline-flex items-center justify-center rounded-xl p-2.5 disabled:opacity-50"
              title="Send Message"
              aria-label="Send"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>
      {expanded ? (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/60 p-4">
          <div className="mv-pres-card mx-auto flex h-full min-h-0 w-full max-w-5xl flex-col overflow-hidden rounded-2xl shadow-2xl">
            <div className="flex shrink-0 items-center justify-between px-4 py-3">
              <h2 className="truncate text-base font-semibold">{title}</h2>
              <button
                type="button"
                className={TOOL_SECONDARY}
                onClick={() => setExpanded(false)}
              >
                <Minimize2 className="h-4 w-4" /> Collapse preview
              </button>
            </div>
            <div
              ref={expandedScrollRef}
              className="mv-pres-field custom-scrollbar min-h-0 flex-1 overflow-y-auto scroll-smooth p-6"
            >
              <div className="w-full max-w-full rounded-lg bg-white p-2 shadow-md sm:p-4">
                <PrintableWorksheet worksheet={worksheet} title={title} />
              </div>
            </div>
            <div className="px-4 pb-3">{statusBar}</div>
          </div>
        </div>
      ) : null}
      {toast ? (
        <div className="mv-pres-card pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full px-4 py-2 text-sm font-medium shadow-lg">
          {toast}
        </div>
      ) : null}
      {savedOpen
        ? createPortal(
            <div
              className="fixed inset-0 z-[80] flex justify-end bg-black/60 backdrop-blur-md"
              onClick={() => setSavedOpen(false)}
            >
              <div
                className="mv-presentation mv-tool-skin flex h-full w-full max-w-md flex-col p-6 shadow-2xl"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="flex items-center justify-between pb-4">
                  <div className="flex items-center gap-2 text-lg font-semibold">
                    <Bookmark className="mv-pres-accent h-5 w-5 fill-current" />
                    <span>Saved Worksheets</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSavedOpen(false)}
                    className={`${TOOL_ICON_BUTTON} p-1.5`}
                    aria-label="Close saved worksheets"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="flex-1 space-y-3 overflow-y-auto py-4">
                  {savedItems.length === 0 ? (
                    <div className={`${TOOL_MUTED} py-12 text-center text-sm`}>
                      No saved worksheets found. Bookmark a worksheet to view it here.
                    </div>
                  ) : (
                    savedItems.map((item) => (
                      <div
                        key={item.id}
                        className="mv-pres-card flex items-center justify-between rounded-xl p-4"
                      >
                        <div className="min-w-0 flex-1 space-y-1">
                          <h4 className="truncate text-sm font-semibold">{item.title}</h4>
                          <p className={`${TOOL_MUTED} truncate text-xs`}>
                            {item.gradeLevel} • {item.topic}
                          </p>
                          <p className={`${TOOL_MUTED} text-xs`}>
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
                            className={TOOL_SECONDARY}
                            title="Open Worksheet"
                          >
                            Open
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteSavedWorksheet(item.id)}
                            className={`${TOOL_ICON_BUTTON} p-2`}
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
  embedded = false,
}: {
  favorited?: boolean;
  onToggleFavorite?: () => void;
  /** When true, parent already shows the shared wizard breadcrumb / expand / close chrome. */
  embedded?: boolean;
}) {
  const [gradeLevel, setGradeLevel] = useState('9th grade');
  const [topicOrText, setTopicOrText] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<AttachedDocument[]>([]);
  const [fileNotice, setFileNotice] = useState<string | null>(null);
  const [showExemplar, setShowExemplar] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [failedRequest, setFailedRequest] = useState<WorksheetGeneratorPayload | null>(null);
  const [studioError, setStudioError] = useState<{ message: string; retry: () => void } | null>(null);
  const [worksheet, setWorksheet] = useState<WorksheetGeneratorResponse | null>(null);
  const [submitted, setSubmitted] = useState<WorksheetGeneratorPayload | null>(null);
  const [localFavorited, setLocalFavorited] = useState(false);
  const [, setHistory] = useState<FormSnapshot[]>([]);
  const [savedVersions, setSavedVersions] = useState<WorksheetHistoryItem[]>(loadLocalVersions);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyToast, setHistoryToast] = useState<string | null>(null);

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
    files: attachedFiles,
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
        setAttachedFiles([]);
        setShowExemplar(false);
        return prev;
      }
      setGradeLevel(last.gradeLevel);
      setTopicOrText(last.topicOrText);
      setAttachedFiles(last.files);
      return prev.slice(0, -1);
    });
  };

  const resetAll = () => {
    setGradeLevel('9th grade');
    setTopicOrText('');
    setAttachedFiles([]);
    setShowExemplar(false);
    setAssistantOpen(false);
    setError(null);
    setFailedRequest(null);
    setStudioError(null);
    setWorksheet(null);
    setSubmitted(null);
    setHistory([]);
    setHistoryOpen(false);
  };

  const showHistoryToast = (message: string) => {
    setHistoryToast(message);
    window.setTimeout(() => setHistoryToast((current) => (current === message ? null : current)), 2800);
  };

  const rememberVersion = (request: WorksheetGeneratorPayload, next: WorksheetGeneratorResponse) => {
    const stored = { ...next, id: next.id || `ws_hist_${Date.now()}` };
    const generatedAt = new Date().toISOString();
    const item: WorksheetHistoryItem = {
      id: stored.id as string,
      createdAt: generatedAt,
      title: stored.title || 'Untitled Worksheet',
      gradeLevel: request.gradeLevel || 'N/A',
      topicOrText: request.topicOrText || '',
      payload: { ...request, imageFiles: undefined },
      worksheet: stored,
    };
    setSavedVersions((prev) => {
      const updated = [item, ...prev.filter((row) => row.title !== item.title && row.id !== item.id)].slice(0, 30);
      persistLocalVersions(updated);
      return updated;
    });
    return stored;
  };

  const deleteHistoryItem = (id: string) => {
    setSavedVersions((prev) => {
      const updated = prev.filter((row) => row.id !== id);
      persistLocalVersions(updated);
      return updated;
    });
    showHistoryToast('Removed from history');
  };

  const sourceWords = countWords(`${topicOrText}\n${documentContext(attachedFiles)}`);
  const overLimit = sourceWords > WORD_LIMIT;
  const filesProcessing = attachedFiles.some((file) => file.isProcessing);
  const attachedContext = documentContext(attachedFiles);
  const attachedImages = documentImages(attachedFiles);
  const hasSource = Boolean(topicOrText.trim() || attachedContext || attachedImages.length);
  const payload: WorksheetGeneratorPayload = useMemo(
    () => ({
      gradeLevel,
      topicOrText: topicOrText.trim(),
      attachments: attachedFiles.map((file) => file.name),
      attachedDocumentContext: attachedContext || undefined,
      imageFiles: attachedImages.length ? attachedImages : undefined,
    }),
    [gradeLevel, topicOrText, attachedFiles, attachedContext, attachedImages],
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

  const addFiles = async (list: FileList | null) => {
    if (!list?.length) return;
    for (const file of Array.from(list)) {
      const id = `file_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      setAttachedFiles((prev) => [...prev, { id, name: file.name, extractedText: '', isProcessing: true }]);
      try {
        const extracted = await extractDocumentText(file);
        setAttachedFiles((prev) =>
          prev.map((item) =>
            item.id === id
              ? { ...item, extractedText: extracted.text, imageDataUrl: extracted.imageDataUrl, isProcessing: false }
              : item,
          ),
        );
        setFileNotice(`Read ${file.name}`);
        setError(null);
      } catch (err) {
        setAttachedFiles((prev) => prev.filter((item) => item.id !== id));
        setFileNotice(null);
        setFailedRequest(null);
        setError(err instanceof Error ? err.message : `Could not extract text from ${file.name}`);
      }
    }
  };

  const generate = async (override?: WorksheetGeneratorPayload) => {
    const request = override ?? payload;
    if (!request.topicOrText && !request.attachedDocumentContext && !request.imageFiles?.length) return;
    if (!override && overLimit) return;
    if (!override) pushHistory();
    setBusy(true);
    setError(null);
    setFailedRequest(null);
    try {
      const next = rememberVersion(request, await api.generateWorksheet(request));
      setSubmitted(request);
      setWorksheet(next);
    } catch (err) {
      setWorksheet(null);
      setSubmitted(null);
      setFailedRequest(request);
      setError(err instanceof Error ? err.message : 'Could not generate the worksheet.');
    } finally {
      setBusy(false);
    }
  };

  const refineCurrent = async (
    message: string,
    attachments?: string[],
    followUpContext?: string,
    imageFiles?: string[],
  ) => {
    if (!submitted || !worksheet) return;
    setBusy(true);
    setStudioError(null);
    const request: WorksheetGeneratorPayload = {
      ...submitted,
      topicOrText: `${submitted.topicOrText}\n\nTeacher follow-up: ${message}`,
      attachments: attachments?.length ? [...(submitted.attachments ?? []), ...attachments] : submitted.attachments,
      attachedDocumentContext: [submitted.attachedDocumentContext, followUpContext].filter(Boolean).join('\n\n') || undefined,
      imageFiles,
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
          attachedDocumentContext: followUpContext,
          imageFiles,
          currentWorksheet: worksheet,
        }),
      );
      setSubmitted(request);
      setWorksheet(next);
    } catch (err) {
      setStudioError({
        message: err instanceof Error ? err.message : 'Could not change the worksheet.',
        retry: () => void refineCurrent(message, attachments, followUpContext, imageFiles),
      });
    } finally {
      setBusy(false);
    }
  };

  const translateCurrent = async (language: string) => {
    if (!worksheet || !submitted) throw new Error('No worksheet to translate');
    setBusy(true);
    setStudioError(null);
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
    } catch (err) {
      setStudioError({
        message: err instanceof Error ? err.message : 'Could not translate the worksheet.',
        retry: () => void translateCurrent(language),
      });
    } finally {
      setBusy(false);
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
    setAttachedFiles(documentsFromPayload(item.payload));
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

  const words = sourceWords;
  const generated = Boolean(worksheet && submitted);

  return (
    <>
    <div className={TOOL_PAGE}>
        {generated ? (
          <div>
            <WorksheetStudio
              pane
              embedded={embedded}
              worksheet={worksheet!}
              payload={submitted!}
              busy={busy}
              actionError={studioError?.message}
              onRetryAction={studioError?.retry}
              onReset={resetAll}
              onClose={handleClose}
              onOpenHistory={() => setHistoryOpen(true)}
              onFollowUp={(message, attachments, context, images) => {
                void refineCurrent(message, attachments, context, images);
              }}
              onTranslate={translateCurrent}
              onLoadSaved={loadSavedWorksheet}
              onEnsureWorksheetId={(id) => {
                setWorksheet((current) => (current ? { ...current, id } : current));
              }}
            />
          </div>
        ) : (
        <>
        {embedded ? null : (
          <nav className={TOOL_BREADCRUMB} aria-label="Breadcrumb">
            <Link to="/teacher/tools" className={TOOL_BREADCRUMB_LINK}>Teacher Tools</Link>
            <span className={TOOL_MUTED}>›</span>
            <span>Worksheet Generator</span>
          </nav>
        )}

        <div className={TOOL_CARD}>
              <header className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h1 className={TOOL_TITLE}>
                    Worksheet Generator
                    <button
                      type="button"
                      className={TOOL_ICON_BUTTON}
                      aria-label={favorited ? 'Remove from favorites' : 'Add to favorites'}
                      aria-pressed={Boolean(favorited)}
                      onClick={toggleFavorite}
                    >
                      <Star className={`h-5 w-5 ${favorited ? 'fill-amber-300 text-amber-300' : TOOL_MUTED}`} />
                    </button>
                  </h1>
                  <p className={TOOL_SUBTITLE}>Generate a worksheet based on any topic or text.</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <button
                    type="button"
                    className={TOOL_SECONDARY}
                    aria-label="Undo last change"
                    onClick={undo}
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                  {embedded ? null : (
                    <button
                      type="button"
                      onClick={handleClose}
                      className={TOOL_SECONDARY}
                    >
                      <X className="h-4 w-4" />
                      <span>Close</span>
                    </button>
                  )}
                  <button
                    type="button"
                    className={TOOL_ACCENT_BUTTON}
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

              <label className={`${TOOL_LABEL} mt-6`} htmlFor="worksheet-grade">Grade level: *</label>
              <select
                id="worksheet-grade"
                className={TOOL_FIELD}
                value={gradeLevel}
                onChange={(e) => setGradeLevel(e.target.value)}
              >
                {GRADE_LEVELS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>

              <label className={TOOL_LABEL} htmlFor="worksheet-topic">Topic or text: *</label>
              <div className="relative">
                <textarea
                  id="worksheet-topic"
                  className={TOOL_TEXTAREA}
                  placeholder={TOPIC_PLACEHOLDER}
                  value={topicOrText}
                  onChange={(e) => setTopicOrText(sanitizePastedText(e.target.value))}
                  onPaste={handlePaste}
                  spellCheck
                />
                <button
                  type="button"
                  onClick={toggle}
                  className={TOOL_MIC}
                  title={listening ? 'Listening...' : 'Click to speak'}
                  aria-label={listening ? 'Stop recording' : 'Start recording voice prompt'}
                >
                  <Mic className={`h-4 w-4 ${listening ? 'text-violet-300' : ''}`} />
                </button>
              </div>
              {listening ? (
                <div className="mt-3">
                  <VoiceListeningIndicator isListening onStopListening={toggle} />
                </div>
              ) : null}
              <div className="mt-3 flex items-center justify-between gap-3 text-xs">
                <div className="relative">
                  <AddFileMenu
                    onFiles={(list) => void addFiles(list)}
                    accept=".pdf,.doc,.docx,.txt,.md,.png,.jpg,.jpeg,.webp,.gif,application/pdf,image/*"
                  />
                </div>
                <span className={overLimit ? 'text-rose-300' : TOOL_MUTED}>
                  Total word limit: {words.toLocaleString()}/{WORD_LIMIT.toLocaleString()}
                </span>
              </div>
              <AttachedFileBadges
                className="mt-3"
                files={attachedFiles}
                onRemove={(id) => setAttachedFiles((prev) => prev.filter((file) => file.id !== id))}
              />
              {fileNotice ? <p className={`${TOOL_HINT} mt-2`}>{fileNotice}</p> : null}

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  className={TOOL_ACCENT_BUTTON}
                  onClick={() => setAssistantOpen((v) => !v)}
                >
                  <Sparkles className="h-3.5 w-3.5" /> Prompt assistant
                </button>
              </div>
              {assistantOpen && (
                <div className={`${TOOL_PANEL} mt-3 text-sm`}>
                  <p className={TOOL_MUTED}>
                    Name a topic, paste source text, or attach a PDF. Say whether you want vocabulary,
                    short answer, or mixed practice.
                  </p>
                </div>
              )}

              <ToolErrorRetry
                message={error}
                busy={busy}
                onRetry={failedRequest ? () => void generate(failedRequest) : null}
              />
              <button
                type="button"
                disabled={busy || filesProcessing || !hasSource || overLimit}
                className={TOOL_GENERATE}
                onClick={() => void generate()}
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {busy ? 'Generating Worksheet...' : 'Generate Worksheet'}
              </button>
        </div>

        <section data-worksheet-scroll className={`${TOOL_CARD} mt-6`}>
          <div className="mb-4 flex w-full items-center justify-between gap-3">
            <h2 className={TOOL_SECTION_TITLE}>Template Preview</h2>
            <span className={TOOL_HINT}>Live Preview Mode</span>
          </div>
          {busy ? (
            <div className={`${TOOL_PANEL} flex min-h-[480px] w-full flex-col items-center justify-center gap-3`}>
              <Loader2 className="mv-pres-accent h-8 w-8 animate-spin" />
              <p className={`${TOOL_MUTED} text-sm`}>Generating your worksheet…</p>
            </div>
          ) : (
            <WorksheetTemplateSkeleton />
          )}
        </section>
        </>
        )}
      {historyToast ? (
        <div className="mv-pres-card pointer-events-none fixed bottom-6 left-1/2 z-[90] -translate-x-1/2 rounded-full px-4 py-2 text-sm font-medium shadow-lg">
          {historyToast}
        </div>
      ) : null}
    </div>
    <WorksheetHistoryDrawer
      open={historyOpen}
      onClose={() => setHistoryOpen(false)}
      items={savedVersions}
      activeId={worksheet?.id}
      onSelect={(item) => {
        setWorksheet(withWorksheetId(item.worksheet));
        setSubmitted(item.payload);
        setGradeLevel(item.payload.gradeLevel);
        setTopicOrText(item.payload.topicOrText);
        setAttachedFiles(documentsFromPayload(item.payload));
        setHistoryOpen(false);
        showHistoryToast(`Loaded "${item.title}" from history`);
      }}
      onDelete={deleteHistoryItem}
    />
    </>
  );
}

export default WorksheetGenerator;
