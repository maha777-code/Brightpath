import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ChevronDown,
  FileText,
  FileCode,
  Globe,
  Loader2,
  Mic,
  RotateCcw,
  Sparkles,
  Bookmark,
  Printer,
  Copy,
  Pencil,
  Edit3,
  X,
  Star,
  Paperclip,
  ChevronLeft,
  ChevronRight,
  Share2,
  History,
  Languages,
  Volume2,
  ThumbsUp,
  ThumbsDown,
  Plus,
  ArrowUp,
  ExternalLink,
  Maximize2,
  Check,
} from 'lucide-react';
import {
  LESSON_PLAN_GRADE_LEVELS,
  type LessonPlanPayload,
  type LessonPlanResponse,
} from '@brightpath/shared';
import { api } from '@/lib/api';
import { ToolErrorRetry } from '@/components/tools/ToolErrorRetry';
import { AddFileMenu } from '@/components/tools/AddFileMenu';
import { AIToolHeader } from '@/components/tools/AIToolHeader';
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
  TOOL_TEXTAREA_SHORT,
  TOOL_TITLE,
} from '@/components/tools/toolTheme';
import { watermarkFooterHtml } from '@/lib/exportWatermark';
import { readKhdaAlign, subscribeKhdaAlign, writeKhdaAlign } from '@/lib/khdaAlign';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { VoiceListeningIndicator } from '@/components/VoiceListeningIndicator';
import {
  documentContext,
  documentImages,
  extractDocumentText,
  type AttachedDocument,
} from '@/lib/extractDocumentText';
import {
  loadFavoriteIds,
  loadLessonHistory,
  loadSavedLessonPlans,
  persistFavoriteIds,
  saveLessonPlanToHistory,
  saveLessonPlanToResources,
  type LessonPlanHistoryItem,
} from '@/lib/lessonPlanStorage';

const FILE_ACCEPT = '.pdf,.doc,.docx,.txt,.md,.png,.jpg,.jpeg,.gif,.webp,application/pdf,image/*';

const WORD_LIMIT = 75_000;
const EDIT_FIELD_CLASS = TOOL_FIELD;
const MENU_PANEL_CLASS = 'mv-pres-card z-50 rounded-xl border p-1.5 shadow-2xl';
const MENU_ITEM_CLASS =
  'flex w-full appearance-none items-center border-0 bg-transparent [font-family:inherit] justify-start gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors hover:bg-violet-500/15';

function StudioMenuItem({
  onClick,
  icon,
  children,
}: {
  onClick: () => void;
  icon: ReactNode;
  children: string;
}) {
  return (
    <div
      role="menuitem"
      tabIndex={0}
      className={`${MENU_ITEM_CLASS} cursor-pointer`}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick();
        }
      }}
    >
      {icon}
      <span>{children}</span>
    </div>
  );
}

const TOPIC_PLACEHOLDER =
  'topic, standard, or longer description of what you’re teaching.\n\nIf you include the full description, you can use any standard worldwide.  For example, “HS-PS1-1 Use the periodic table as a model to predict the relative properties of elements based on the patterns of electrons in the outermost energy level of atoms.';

const CRITERIA_PLACEHOLDER =
  'Students are in a unit about world regions, students last lesson was on the geography of the United States, have the lesson include group work, etc.';

const STANDARDS_PLACEHOLDER = 'Any standards worldwide (CCSS, TEKS, Ontario, MoE, Florida)';

const EXEMPLAR: FormState = {
  gradeLevel: '9th grade',
  topic:
    'HS-PS1-1 Use the periodic table as a model to predict the relative properties of elements based on the patterns of electrons in the outermost energy level of atoms.',
  criteria:
    'Students are beginning a chemistry unit on atomic structure. Yesterday they reviewed the layout of the periodic table. Include a 10-minute lab station rotation and group work.',
  standards: 'NGSS HS-PS1-1; CCSS.ELA-LITERACY.RST.9-10.3',
  topicFiles: [],
  criteriaFiles: [],
  standardsFiles: [],
};

type FormState = {
  gradeLevel: string;
  topic: string;
  criteria: string;
  standards: string;
  topicFiles: AttachedDocument[];
  criteriaFiles: AttachedDocument[];
  standardsFiles: AttachedDocument[];
};

type FieldKey = 'topic' | 'criteria' | 'standards';

function countWords(value: string): number {
  return value.trim() ? value.trim().split(/\s+/).length : 0;
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
      (window as unknown as { SpeechRecognition?: new () => SpeechRec }).SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: new () => SpeechRec }).webkitSpeechRecognition;
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

const BOOKMARK_KEY = 'brightpath_lesson_plan_bookmarks';

const SUPPORTED_LANGUAGES = [
  { code: 'hi', name: 'Hindi' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'ta', name: 'Tamil' },
  { code: 'te', name: 'Telugu' },
  { code: 'kn', name: 'Kannada' },
  { code: 'mr', name: 'Marathi' },
] as const;

interface PromptMeta {
  topic: string;
  gradeLevel: string;
  standards?: string;
  criteria?: string;
  fileNames: string[];
}

function lessonSummary(plan: LessonPlanResponse, topic: string): { summary: string; keyPoints: string[] } {
  const subject = (plan.title || topic.split('\n')[0]?.trim() || 'this lesson').replace(/[.\s]+$/, '');
  const keySection = plan.sections.find((section) => /key points/i.test(section.heading));
  const points = (keySection?.activities ?? []).map((item) => item.trim()).filter(Boolean).slice(0, 5);
  return {
    summary: `I've created a classroom-ready lesson plan for ${subject}. It is written for ${plan.gradeLevel} and fits one class period of about ${plan.durationMinutes} minutes, with an objective, assessment, guided stations, independent practice, and homework.`,
    keyPoints: points.length
      ? points
      : [
          `Learning objective: ${plan.objective}`,
          `Assessment: ${plan.assessment}`,
        ],
  };
}

function loadBookmarks(): string[] {
  try {
    const raw = localStorage.getItem(BOOKMARK_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

function persistBookmarks(ids: string[]) {
  try {
    localStorage.setItem(BOOKMARK_KEY, JSON.stringify(ids.slice(0, 80)));
  } catch {
    /* ignore quota */
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fileStem(title: string): string {
  return title.replace(/[<>:"/\\|?*]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80) || 'lesson-plan';
}

function nonempty(items: string[]): string[] {
  return items.map((item) => item.trim()).filter(Boolean);
}

function formatLessonPlanMarkdown(plan: LessonPlanResponse, title: string): string {
  const lines = [
    `# ${title}`,
    '',
    `**Grade:** ${plan.gradeLevel}`,
    `**Duration:** ${plan.durationMinutes} minutes`,
    '',
    `## Objective`,
    plan.objective,
    '',
  ];
  const standards = nonempty(plan.standards);
  const materials = nonempty(plan.materials);
  if (standards.length) {
    lines.push('## Standards', ...standards.map((item) => `- ${item}`), '');
  }
  if (materials.length) {
    lines.push('## Materials', ...materials.map((item) => `- ${item}`), '');
  }
  for (const section of plan.sections) {
    const heading = section.minutes ? `${section.heading} (${section.minutes} min)` : section.heading;
    lines.push(`## ${heading}`, ...nonempty(section.activities).map((item) => `- ${item}`), '');
  }
  lines.push('## Assessment', plan.assessment, '', '## Differentiation', plan.differentiation, '');
  return lines.join('\n');
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 500);
}

function planToPrintBody(plan: LessonPlanResponse, title: string): string {
  const sections = plan.sections
    .map((section) => {
      const heading = section.minutes ? `${escapeHtml(section.heading)} (${section.minutes} min)` : escapeHtml(section.heading);
      const items = nonempty(section.activities).map((item) => `<li>${escapeHtml(item)}</li>`).join('');
      return `<h2>${heading}</h2><ul>${items}</ul>`;
    })
    .join('');
  const standards = nonempty(plan.standards);
  const materials = nonempty(plan.materials);
  const standardsHtml = standards.length
    ? `<p><strong>Standards:</strong> ${escapeHtml(standards.join('; '))}</p>`
    : '';
  return `
    <h1>${escapeHtml(title)}</h1>
    <p>${escapeHtml(plan.gradeLevel)} · ${plan.durationMinutes} minutes</p>
    <p><strong>Objective:</strong> ${escapeHtml(plan.objective)}</p>
    ${standardsHtml}
    <p><strong>Materials:</strong> ${escapeHtml(materials.join(', '))}</p>
    ${sections}
    <p><strong>Assessment:</strong> ${escapeHtml(plan.assessment)}</p>
    <p><strong>Differentiation:</strong> ${escapeHtml(plan.differentiation)}</p>
  `;
}

function openPrintWindow(title: string, bodyHtml: string) {
  const html = `<!DOCTYPE html>
<html>
  <head>
    <title>${escapeHtml(title)}</title>
    <style>
      body { font-family: 'Cambria', Georgia, serif; padding: 40px; color: #000; background: #fff; font-size: 16px; line-height: 1.6; }
      h1, h2, h3 { color: #111; margin-top: 1.5em; }
      h1 { font-size: 26px; margin-top: 0; }
      h2 { font-size: 18px; }
      ul, ol { padding-left: 20px; }
    </style>
  </head>
  <body>${bodyHtml}${watermarkFooterHtml()}</body>
</html>`;
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    window.setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
    return;
  }
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
  doc.write(html);
  doc.close();
  window.setTimeout(() => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    window.setTimeout(() => frame.remove(), 400);
  }, 250);
}

function exportToPDF(plan: LessonPlanResponse, title: string) {
  openPrintWindow(title, planToPrintBody(plan, title));
}

function exportToDocx(markdown: string, title: string) {
  const htmlBody = markdown
    .split('\n')
    .map((line) => {
      if (line.startsWith('# ')) return `<h1>${escapeHtml(line.slice(2))}</h1>`;
      if (line.startsWith('## ')) return `<h2>${escapeHtml(line.slice(3))}</h2>`;
      if (line.startsWith('- ')) return `<li>${escapeHtml(line.slice(2))}</li>`;
      if (line.startsWith('**') && line.endsWith('**') === false) {
        return `<p>${escapeHtml(line).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')}</p>`;
      }
      if (!line.trim()) return '';
      return `<p>${escapeHtml(line).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')}</p>`;
    })
    .join('\n');
  const doc = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head>
<body style="font-family:Cambria,Georgia,serif;font-size:16px;line-height:1.6;color:#111">${htmlBody}</body></html>`;
  downloadBlob(new Blob(['\ufeff', doc], { type: 'application/msword' }), `${fileStem(title)}.doc`);
}

const ICON_BTN = `${TOOL_ICON_BUTTON} inline-flex items-center justify-center rounded-lg p-2 transition-colors hover:bg-violet-500/10 disabled:opacity-40`;

function HistoryDrawer({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (item: LessonPlanHistoryItem) => void;
}) {
  const [saved, setSaved] = useState<LessonPlanHistoryItem[]>([]);
  const [recent, setRecent] = useState<LessonPlanHistoryItem[]>([]);
  useEffect(() => {
    if (!open) return;
    setSaved(loadSavedLessonPlans());
    setRecent(loadLessonHistory());
  }, [open]);
  if (!open) return null;
  const renderItem = (item: LessonPlanHistoryItem) => (
    <button
      key={item.id}
      type="button"
      onClick={() => onSelect(item)}
      className="mv-pres-field w-full rounded-xl p-4 text-left"
    >
      <div className={`${TOOL_MUTED} mb-1 text-xs font-semibold`}>{item.gradeLevel}</div>
      <div className="line-clamp-2 text-sm font-semibold">{item.title || item.topicPrompt}</div>
      <div className={`${TOOL_HINT} mt-2`}>{new Date(item.createdAt).toLocaleString()}</div>
    </button>
  );
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="mv-pres-card h-full w-full max-w-md space-y-6 overflow-y-auto border-l p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-500/20 pb-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <History className="mv-pres-accent h-5 w-5" /> Saved Plans
          </h2>
          <button type="button" onClick={onClose} className={ICON_BTN} aria-label="Close history">
            <X className="h-5 w-5" />
          </button>
        </div>
        <section className="space-y-3">
          <h3 className={TOOL_SECTION_TITLE}>My Resources</h3>
          {saved.length === 0 ? (
            <p className={`${TOOL_MUTED} text-sm`}>No lesson plans saved to My Resources yet.</p>
          ) : (
            saved.map(renderItem)
          )}
        </section>
        <section className="space-y-3">
          <h3 className={TOOL_SECTION_TITLE}>Recent</h3>
          {recent.length === 0 ? (
            <p className={`${TOOL_MUTED} text-sm`}>No generated lesson plans yet.</p>
          ) : (
            recent.map(renderItem)
          )}
        </section>
      </div>
    </div>
  );
}

function LessonPlanResult({
  plan,
  lessonId,
  prompt,
  busy,
  onFollowUp,
  onNew,
  onHistory,
}: {
  plan: LessonPlanResponse;
  lessonId: string;
  prompt: PromptMeta;
  busy: boolean;
  onFollowUp: (instruction: string, files: AttachedDocument[]) => void;
  onNew: () => void;
  onHistory: () => void;
}) {
  const [showPrompt, setShowPrompt] = useState(true);
  const [lessonTitle, setLessonTitle] = useState(plan.title);
  const [editingTitle, setEditingTitle] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(() => loadBookmarks().includes(lessonId));
  const [isFavorite, setIsFavorite] = useState(() => loadFavoriteIds().includes(lessonId));
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [translateOpen, setTranslateOpen] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const [isTranslating, setIsTranslating] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [page, setPage] = useState(0);
  const [draft, setDraft] = useState(plan);
  const [notice, setNotice] = useState<string | null>(null);
  const [translateFailure, setTranslateFailure] = useState<{
    message: string;
    lang: { code: string; name: string };
  } | null>(null);
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [followUp, setFollowUp] = useState('');
  const [followUpFiles, setFollowUpFiles] = useState<AttachedDocument[]>([]);
  const exportRef = useRef<HTMLDivElement>(null);
  const translateRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { listening, toggle } = useDictation((text) => {
    setFollowUp((current) => (current.trim() ? `${current.trim()} ${text}` : text));
  });

  useEffect(() => {
    setLessonTitle(plan.title);
    setDraft(plan);
    setPage(0);
    setIsEditing(false);
  }, [plan]);

  useEffect(() => {
    if (!isExportOpen && !translateOpen) return;
    const onPointer = (event: MouseEvent) => {
      if (!exportRef.current?.contains(event.target as Node)) setIsExportOpen(false);
      if (!translateRef.current?.contains(event.target as Node)) setTranslateOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    return () => document.removeEventListener('mousedown', onPointer);
  }, [isExportOpen, translateOpen]);

  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  const showNotice = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(null), 2800);
  };

  const markdown = formatLessonPlanMarkdown(draft, lessonTitle);
  const summary = lessonSummary(draft, prompt.topic);
  const sectionPages: number[][] = [];
  for (let index = 0; index < draft.sections.length; index += 2) {
    sectionPages.push([index, Math.min(draft.sections.length, index + 2)]);
  }
  const pages = ['overview', 'details', ...sectionPages.map((_, index) => `sections-${index}`)];
  const safePage = Math.min(page, pages.length - 1);
  const currentKind = pages[safePage] ?? 'overview';

  const handlePrint = () => openPrintWindow(lessonTitle, planToPrintBody(draft, lessonTitle));

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      showNotice('Lesson plan copied.');
    } catch {
      showNotice('Could not copy the lesson plan.');
    }
  };

  const handleShare = async () => {
    const shareText = `${lessonTitle}\n\n${markdown}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: lessonTitle, text: shareText });
        showNotice('Share sheet opened.');
        return;
      }
      await navigator.clipboard.writeText(shareText);
      showNotice('Lesson plan copied to share.');
    } catch {
      showNotice('Share was cancelled.');
    }
  };

  const currentHistoryItem = (): LessonPlanHistoryItem => ({
    id: lessonId,
    title: lessonTitle,
    createdAt: new Date().toISOString(),
    gradeLevel: draft.gradeLevel,
    topicPrompt: prompt.topic,
    standardsSet: prompt.standards,
    additionalCriteria: prompt.criteria,
    attachedFiles: prompt.fileNames.map((name) => ({ name })),
    content: markdown,
    plan: { ...draft, title: lessonTitle },
  });

  const handleBookmark = () => {
    const added = saveLessonPlanToResources(currentHistoryItem());
    setIsBookmarked(true);
    persistBookmarks([...loadBookmarks().filter((id) => id !== lessonId), lessonId]);
    showNotice(added ? 'Saved to My Resources.' : 'Already saved in My Resources.');
    onHistory();
  };

  const handleTranslateContent = async (lang: { code: string; name: string }) => {
    setTranslateOpen(false);
    setIsTranslating(true);
    setTranslateFailure(null);
    try {
      const translated = await api.translateLessonPlan({
        targetLanguage: lang.name,
        plan: { ...draft, title: lessonTitle },
      });
      setDraft(translated);
      setLessonTitle(translated.title);
      setSelectedLanguage(lang.name);
      setPage(0);
      showNotice(`Translated lesson plan to ${lang.name}.`);
    } catch (err) {
      setTranslateFailure({
        message: err instanceof Error ? err.message : 'Could not translate the lesson plan.',
        lang,
      });
    } finally {
      setIsTranslating(false);
    }
  };

  const handleFavorite = () => {
    const next = !isFavorite;
    setIsFavorite(next);
    const ids = loadFavoriteIds();
    persistFavoriteIds(next ? [...ids.filter((id) => id !== lessonId), lessonId] : ids.filter((id) => id !== lessonId));
    showNotice(next ? 'Added to favorites.' : 'Removed from favorites.');
  };

  const handleReadAloud = () => {
    if (!('speechSynthesis' in window)) {
      showNotice('Read aloud is not available in this browser.');
      return;
    }
    if (speaking || window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(`${lessonTitle}. ${draft.objective} ${draft.assessment}`);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  const handleFeedback = (value: 'up' | 'down') => {
    const next = feedback === value ? null : value;
    setFeedback(next);
    const items = loadLessonHistory();
    const match = items.find((item) => item.id === lessonId);
    if (match) saveLessonPlanToHistory({ ...match, feedback: next ?? undefined, title: lessonTitle, plan: draft });
    showNotice(next === 'up' ? 'Marked as helpful.' : next === 'down' ? 'Marked as needs improvement.' : 'Feedback cleared.');
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
      } catch (err) {
        setFollowUpFiles((prev) => prev.filter((item) => item.id !== id));
        showNotice(err instanceof Error ? err.message : `Could not read ${file.name}`);
      }
    }
  };

  const sendFollowUp = () => {
    const instruction = followUp.trim();
    if (!instruction || followUpFiles.some((file) => file.isProcessing) || busy) return;
    onFollowUp(instruction, followUpFiles);
    setFollowUp('');
    setFollowUpFiles([]);
  };

  const overviewBody = (
    <div className="space-y-4 text-sm leading-relaxed">
      <h3 className="text-center text-lg font-semibold">{lessonTitle}</h3>
      <p className="font-semibold">Learning Objective</p>
      {isEditing ? (
        <textarea className={EDIT_FIELD_CLASS} rows={3} value={draft.objective} onChange={(e) => setDraft({ ...draft, objective: e.target.value })} />
      ) : (
        <p className={TOOL_MUTED}>{draft.objective}</p>
      )}
      <p className="font-semibold">Assessments</p>
      {isEditing ? (
        <textarea className={EDIT_FIELD_CLASS} rows={3} value={draft.assessment} onChange={(e) => setDraft({ ...draft, assessment: e.target.value })} />
      ) : (
        <p className={TOOL_MUTED}>{draft.assessment}</p>
      )}
    </div>
  );

  const detailsBody = (
    <div className="space-y-4 text-sm leading-relaxed">
      <p className="font-semibold">Standards</p>
      {isEditing ? (
        <textarea className={EDIT_FIELD_CLASS} rows={3} value={draft.standards.join('\n')} onChange={(e) => setDraft({ ...draft, standards: e.target.value.split('\n') })} />
      ) : (
        <p className={TOOL_MUTED}>{nonempty(draft.standards).join('; ') || 'Aligned to the selected grade level.'}</p>
      )}
      <p className="font-semibold">Materials</p>
      {isEditing ? (
        <textarea className={EDIT_FIELD_CLASS} rows={3} value={draft.materials.join('\n')} onChange={(e) => setDraft({ ...draft, materials: e.target.value.split('\n') })} />
      ) : (
        <p className={TOOL_MUTED}>{nonempty(draft.materials).join(', ')}</p>
      )}
      <p className="font-semibold">Differentiation</p>
      {isEditing ? (
        <textarea className={EDIT_FIELD_CLASS} rows={3} value={draft.differentiation} onChange={(e) => setDraft({ ...draft, differentiation: e.target.value })} />
      ) : (
        <p className={TOOL_MUTED}>{draft.differentiation}</p>
      )}
    </div>
  );

  const sectionsBody = (range: number[]) => (
    <div className="space-y-5 text-sm leading-relaxed">
      {draft.sections.slice(range[0], range[1]).map((section, offset) => {
        const index = (range[0] ?? 0) + offset;
        return (
          <section key={`${section.heading}-${index}`}>
            {isEditing ? (
              <input
                className={`${EDIT_FIELD_CLASS} mb-2 font-semibold`}
                value={section.heading}
                onChange={(e) => {
                  const sections = draft.sections.map((item, i) => (i === index ? { ...item, heading: e.target.value } : item));
                  setDraft({ ...draft, sections });
                }}
              />
            ) : (
              <h3 className="font-semibold">
                {section.heading}
                {section.minutes ? ` (${section.minutes} min)` : ''}
              </h3>
            )}
            {isEditing ? (
              <textarea
                className={EDIT_FIELD_CLASS}
                rows={4}
                value={section.activities.join('\n')}
                onChange={(e) => {
                  const sections = draft.sections.map((item, i) =>
                    i === index ? { ...item, activities: e.target.value.split('\n') } : item,
                  );
                  setDraft({ ...draft, sections });
                }}
              />
            ) : (
              <ul className={`${TOOL_MUTED} mt-1 list-disc space-y-1 pl-5`}>
                {nonempty(section.activities).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );

  const pageBody =
    currentKind === 'overview'
      ? overviewBody
      : currentKind === 'details'
        ? detailsBody
        : sectionsBody(sectionPages[Number(currentKind.replace('sections-', ''))] ?? [0, draft.sections.length]);

  return (
    <div className="flex w-full flex-col space-y-6">
      <div className={TOOL_CARD}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <h1 className={TOOL_TITLE}>
          <FileText className="mv-pres-accent h-5 w-5 shrink-0" />
          <span>Lesson Plan</span>
          <button type="button" onClick={handleFavorite} className={ICON_BTN} title={isFavorite ? 'Remove favorite' : 'Favorite'} aria-pressed={isFavorite}>
            <Star className={`h-5 w-5 ${isFavorite ? 'fill-amber-300 text-amber-300' : TOOL_MUTED}`} />
          </button>
          <button type="button" onClick={() => void handleShare()} className={ICON_BTN} title="Share">
            <Share2 className="h-4 w-4" />
          </button>
          <button type="button" onClick={onHistory} className={ICON_BTN} title="History">
            <History className="h-4 w-4" />
          </button>
        </h1>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onNew} className={TOOL_SECONDARY}>
            New
          </button>
          <button
            type="button"
            onClick={() => setShowPrompt((open) => !open)}
            className={TOOL_SECONDARY}
            aria-expanded={showPrompt}
          >
            <span>{showPrompt ? 'Hide prompt' : 'Show prompt'}</span>
            <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${showPrompt ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {showPrompt ? (
        <div className={`${TOOL_PANEL} mt-6 grid grid-cols-1 gap-3 text-sm md:grid-cols-2`}>
          <div>
            <span className={`${TOOL_MUTED} font-medium`}>Topic, Standard, or Objective:</span>{' '}
            <span className="font-semibold">{prompt.topic}</span>
            {prompt.fileNames.length > 0 ? (
              <span className="mv-pres-field ml-2 inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium">
                <Paperclip className="h-3 w-3" /> {prompt.fileNames.length} file{prompt.fileNames.length === 1 ? '' : 's'}
              </span>
            ) : null}
          </div>
          <div>
            <span className={`${TOOL_MUTED} font-medium`}>Grade Level:</span>{' '}
            <span className="font-semibold">{prompt.gradeLevel}</span>
          </div>
          {prompt.standards ? (
            <div>
              <span className={`${TOOL_MUTED} font-medium`}>Standards Set to Align to:</span>{' '}
              <span className="font-semibold">{prompt.standards}</span>
            </div>
          ) : null}
          {prompt.criteria ? (
            <div>
              <span className={`${TOOL_MUTED} font-medium`}>Additional Criteria:</span>{' '}
              <span className="font-semibold">{prompt.criteria}</span>
            </div>
          ) : null}
        </div>
      ) : null}
      </div>

      <div className={TOOL_CARD}>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-500/20 pb-4">
          <div className="flex min-w-0 flex-1 items-center gap-2 text-sm font-semibold">
            <button type="button" className={ICON_BTN} title="Rename" aria-label="Rename lesson plan" onClick={() => setEditingTitle(true)}>
              <Pencil className="mv-pres-accent h-4 w-4" />
            </button>
            {editingTitle ? (
              <input
                className={`${EDIT_FIELD_CLASS} !mt-0 min-w-0 flex-1 font-semibold`}
                value={lessonTitle}
                autoFocus
                onChange={(e) => setLessonTitle(e.target.value)}
                onBlur={() => setEditingTitle(false)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === 'Escape') setEditingTitle(false);
                }}
              />
            ) : (
              <span className="truncate">{lessonTitle}</span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <button type="button" onClick={() => void handleBookmark()} className={ICON_BTN} title="Bookmark" aria-pressed={isBookmarked}>
              <Bookmark className={`h-4 w-4 ${isBookmarked ? 'mv-pres-accent fill-current' : ''}`} />
            </button>
            <button type="button" onClick={handlePrint} className={ICON_BTN} title="Print">
              <Printer className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => void handleCopy()} className={ICON_BTN} title="Copy">
              <Copy className="h-4 w-4" />
            </button>
            <div className="relative" ref={exportRef}>
              <button
                type="button"
                onClick={() => setIsExportOpen((open) => !open)}
                className={TOOL_SECONDARY}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>Export</span>
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
              {isExportOpen ? (
                <div className={`${MENU_PANEL_CLASS} absolute right-0 z-20 mt-2 w-52`}>
                  <StudioMenuItem icon={<FileText className="mv-pres-accent h-4 w-4" />} onClick={() => { exportToPDF(draft, lessonTitle); setIsExportOpen(false); }}>
                    Export as PDF
                  </StudioMenuItem>
                  <StudioMenuItem icon={<FileCode className="mv-pres-accent h-4 w-4" />} onClick={() => { exportToDocx(markdown, lessonTitle); setIsExportOpen(false); }}>
                    Export as Word (.docx)
                  </StudioMenuItem>
                  <StudioMenuItem
                    icon={<Globe className="mv-pres-accent h-4 w-4" />}
                    onClick={() => {
                      void navigator.clipboard.writeText(markdown).then(() => {
                        window.open('https://docs.google.com/document/create', '_blank', 'noopener,noreferrer');
                        showNotice('Copied. Paste into the new Google Doc.');
                      });
                      setIsExportOpen(false);
                    }}
                  >
                    Export to Google Docs
                  </StudioMenuItem>
                </div>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => setIsEditing((value) => !value)}
              className={
                isEditing
                  ? 'mv-pres-generate inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold'
                  : TOOL_SECONDARY
              }
            >
              <Edit3 className="h-3.5 w-3.5" />
              <span>{isEditing ? 'Done' : 'Edit'}</span>
            </button>
          </div>
        </div>

        <div className={`${TOOL_PANEL} relative min-h-[380px] md:p-8`}>
          <div className={`${TOOL_MUTED} mb-4 flex items-center justify-end gap-2 text-xs`}>
            <button type="button" className={ICON_BTN} aria-label="Previous page" disabled={safePage <= 0} onClick={() => setPage((value) => Math.max(0, value - 1))}>
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span>Page {safePage + 1} of {pages.length}</span>
            <button type="button" className={ICON_BTN} aria-label="Next page" disabled={safePage >= pages.length - 1} onClick={() => setPage((value) => Math.min(pages.length - 1, value + 1))}>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          {isTranslating ? (
            <div className="mv-pres-accent flex items-center justify-center gap-2 py-16 text-sm font-semibold">
              <Loader2 className="h-5 w-5 animate-spin" /> Translating lesson plan...
            </div>
          ) : (
            pageBody
          )}
          <div className="mt-8 flex justify-center">
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className={TOOL_SECONDARY}
            >
              <Maximize2 className="h-4 w-4" /> Expand preview
            </button>
          </div>
          {busy ? (
            <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/40">
              <span className="mv-pres-card inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" /> Updating lesson plan…
              </span>
            </div>
          ) : null}
        </div>
      </div>

      <div className={`${TOOL_CARD} space-y-5`}>
      <div className="space-y-3 text-sm leading-relaxed">
        <p>{summary.summary}</p>
        <ol className={`${TOOL_MUTED} list-decimal space-y-1.5 pl-5`}>
          {summary.keyPoints.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ol>
      </div>

      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <div className="relative" ref={translateRef}>
            <button
              type="button"
              onClick={() => setTranslateOpen((open) => !open)}
              disabled={isTranslating}
              className={`${TOOL_SECONDARY} disabled:opacity-60`}
            >
              <Languages className="mv-pres-accent h-4 w-4" />
              <span>Translate ({selectedLanguage})</span>
              <ChevronDown className="h-3 w-3" />
            </button>
            {translateOpen ? (
              <div className={`${MENU_PANEL_CLASS} absolute bottom-10 left-0 z-30 w-48 space-y-1 text-xs`}>
                <div className={`${TOOL_MUTED} mb-1 border-b border-slate-500/20 px-2 py-1 font-semibold`}>Select Language</div>
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => void handleTranslateContent(lang)}
                    className={`${MENU_ITEM_CLASS} cursor-pointer !justify-between !px-2 !py-1.5 !text-xs`}
                  >
                    <span>{lang.name}</span>
                    {selectedLanguage === lang.name ? <Check className="mv-pres-accent h-3.5 w-3.5" /> : null}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <button type="button" onClick={handleReadAloud} className={TOOL_SECONDARY}>
            <Volume2 className="h-4 w-4" /> {speaking ? 'Stop' : 'Listen'}
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => handleFeedback('up')} className={ICON_BTN} title="Helpful">
            <ThumbsUp className={`h-4 w-4 ${feedback === 'up' ? 'text-emerald-500' : ''}`} />
          </button>
          <button type="button" onClick={() => handleFeedback('down')} className={ICON_BTN} title="Needs improvement">
            <ThumbsDown className={`h-4 w-4 ${feedback === 'down' ? 'text-rose-500' : ''}`} />
          </button>
        </div>
      </div>

      {notice ? <p className={`${TOOL_PANEL} mv-pres-accent py-2 text-sm`}>{notice}</p> : null}
      <ToolErrorRetry
        message={translateFailure?.message}
        busy={isTranslating}
        onRetry={translateFailure ? () => void handleTranslateContent(translateFailure.lang) : null}
        className="mb-3"
      />

      <div>
        {followUpFiles.length > 0 ? (
          <div className="mb-2 flex flex-wrap gap-2">
            {followUpFiles.map((file) => (
              <span key={file.id} className="mv-pres-field inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs">
                {file.isProcessing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Paperclip className="h-3 w-3" />}
                {file.name}
              </span>
            ))}
          </div>
        ) : null}
        <input
          value={followUp}
          onChange={(e) => setFollowUp(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') sendFollowUp();
          }}
          placeholder="Continue the conversation..."
          className={`${TOOL_FIELD} !mt-0`}
        />
        <div className="mt-2 flex items-center justify-between">
          <button type="button" onClick={() => fileRef.current?.click()} className={ICON_BTN} title="Attach a file" aria-label="Attach a file">
            <Plus className="h-4 w-4" />
          </button>
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            accept={FILE_ACCEPT}
            multiple
            onChange={(event) => {
              void addFollowUpFiles(event.target.files);
              event.currentTarget.value = '';
            }}
          />
          <div className="flex items-center gap-2">
            <button type="button" onClick={toggle} className={ICON_BTN} title={listening ? 'Stop recording' : 'Voice input'} aria-label="Voice input">
              <Mic className={`h-4 w-4 ${listening ? 'text-violet-300' : ''}`} />
            </button>
            <button
              type="button"
              onClick={sendFollowUp}
              disabled={!followUp.trim() || busy}
              className="mv-pres-generate inline-flex items-center justify-center rounded-xl p-2 disabled:opacity-50"
              aria-label="Send"
            >
              <ArrowUp className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
      </div>

      {expanded ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setExpanded(false)}>
          <div className="mv-pres-card max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border p-8" onClick={(event) => event.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">{lessonTitle}</h2>
              <button type="button" onClick={() => setExpanded(false)} className={ICON_BTN} aria-label="Close preview">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-6 text-sm">
              {overviewBody}
              {detailsBody}
              {sectionsBody([0, draft.sections.length])}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function StudioComposer({
  id,
  label,
  value,
  onChange,
  placeholder,
  files,
  onAddFiles,
  onRemoveFile,
  assistantHint,
  short = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
  files: AttachedDocument[];
  onAddFiles: (list: FileList | null) => void;
  onRemoveFile: (id: string) => void;
  assistantHint?: string;
  short?: boolean;
}) {
  const [assistantOpen, setAssistantOpen] = useState(false);
  const { listening, toggle } = useDictation((text) => {
    onChange(value.trim() ? `${value.trim()} ${text}` : text);
  });
  const words = countWords(value);
  const overLimit = words > WORD_LIMIT;

  return (
    <>
      {assistantHint ? (
        <div className="mt-6 flex items-center justify-between gap-3">
          <label className={TOOL_SECTION_TITLE} htmlFor={id}>{label}</label>
          <button
            type="button"
            className={TOOL_ACCENT_BUTTON}
            aria-expanded={assistantOpen}
            onClick={() => setAssistantOpen((v) => !v)}
          >
            <Sparkles className="h-3.5 w-3.5" /> Prompt assistant
          </button>
        </div>
      ) : (
        <label className={TOOL_LABEL} htmlFor={id}>{label}</label>
      )}
      {assistantHint && assistantOpen ? (
        <div className={`${TOOL_PANEL} mt-2 text-sm`}>
          <p className={TOOL_MUTED}>{assistantHint}</p>
        </div>
      ) : null}
      <div className="relative">
        <textarea
          id={id}
          className={short ? TOOL_TEXTAREA_SHORT : TOOL_TEXTAREA}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={5}
          spellCheck
        />
        <button
          type="button"
          title={listening ? 'Listening... Click to stop' : 'Voice Input'}
          className={TOOL_MIC}
          aria-label={listening ? 'Stop recording' : 'Dictate with microphone'}
          aria-pressed={listening}
          onClick={toggle}
        >
          <Mic className={`h-4 w-4 ${listening ? 'text-violet-300' : ''}`} />
        </button>
      </div>
      {listening ? <VoiceListeningIndicator className="mt-3" isListening onStopListening={toggle} /> : null}
      {files.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {files.map((file) => (
            <div key={file.id} className="mv-pres-field flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs">
              {file.isProcessing ? (
                <Loader2 className="mv-pres-accent h-3.5 w-3.5 animate-spin" />
              ) : (
                <FileText className="mv-pres-accent h-3.5 w-3.5" />
              )}
              <span className="max-w-[180px] truncate font-medium">{file.name}</span>
              <button
                type="button"
                onClick={() => onRemoveFile(file.id)}
                className={TOOL_ICON_BUTTON}
                title="Remove file"
                aria-label={`Remove ${file.name}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : null}
      <div className="mt-3 flex items-center justify-between gap-3 text-xs">
        <AddFileMenu accept={FILE_ACCEPT} onFiles={onAddFiles} />
        <span className={overLimit ? 'text-rose-400' : TOOL_MUTED}>
          Total word limit: {words.toLocaleString()}/{WORD_LIMIT.toLocaleString()}
        </span>
      </div>
    </>
  );
}

function KhdaAlignOption() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(readKhdaAlign());
    return subscribeKhdaAlign(() => setEnabled(readKhdaAlign()));
  }, []);

  return (
    <div className="mt-6">
      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 accent-violet-500"
          checked={enabled}
          onChange={(event) => {
            writeKhdaAlign(event.target.checked);
            setEnabled(event.target.checked);
          }}
        />
        <span>
          <span className="block font-semibold">Align lessons to a Dubai private school (KHDA)</span>
          <span className={`${TOOL_MUTED} mt-1 block leading-relaxed`}>
            Lesson plans then keep Arabic, Islamic Education, and social and moral studies on the UAE Ministry of Education curriculum, and keep every other subject on the school’s licensed curriculum. The teacher still reviews the plan. This does not rate or certify the school.
          </span>
        </span>
      </label>
      <p className="mt-2 pl-7 text-sm">
        <Link to="/khda" className="mv-pres-link font-semibold">
          KHDA safety, curriculum, and wellbeing alignment
        </Link>
      </p>
    </div>
  );
}

type FailedPlanRequest = {
  payload: LessonPlanPayload;
  fileNames: string[];
  criteriaText: string;
  followUp: boolean;
};

export default function LessonPlanGenerator({ embedded = false }: { embedded?: boolean }) {
  const location = useLocation();
  const [gradeLevel, setGradeLevel] = useState('9th grade');
  const [topic, setTopic] = useState('');
  const [criteria, setCriteria] = useState('');
  const [standards, setStandards] = useState('');
  const [topicFiles, setTopicFiles] = useState<AttachedDocument[]>([]);
  const [criteriaFiles, setCriteriaFiles] = useState<AttachedDocument[]>([]);
  const [standardsFiles, setStandardsFiles] = useState<AttachedDocument[]>([]);
  const [isExtractingFile, setIsExtractingFile] = useState(false);
  const [fileNotice, setFileNotice] = useState<string | null>(null);
  const [, setHistory] = useState<FormState[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [failedPlan, setFailedPlan] = useState<FailedPlanRequest | null>(null);
  const [plan, setPlan] = useState<LessonPlanResponse | null>(null);
  const [lessonId, setLessonId] = useState<string | null>(null);
  const [activePrompt, setActivePrompt] = useState<PromptMeta | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const generateRef = useRef<HTMLButtonElement>(null);

  const snapshot = (): FormState => ({
    gradeLevel,
    topic,
    criteria,
    standards,
    topicFiles,
    criteriaFiles,
    standardsFiles,
  });

  const pushHistory = () => setHistory((prev) => [...prev.slice(-19), snapshot()]);

  const applyState = (next: FormState) => {
    setGradeLevel(next.gradeLevel);
    setTopic(next.topic);
    setCriteria(next.criteria);
    setStandards(next.standards);
    setTopicFiles(next.topicFiles);
    setCriteriaFiles(next.criteriaFiles);
    setStandardsFiles(next.standardsFiles);
  };

  const updateField = (key: FieldKey, value: string) => {
    pushHistory();
    if (key === 'topic') setTopic(value);
    if (key === 'criteria') setCriteria(value);
    if (key === 'standards') setStandards(value);
  };

  const handleReset = () => {
    pushHistory();
    applyState({
      gradeLevel: '9th grade',
      topic: '',
      criteria: '',
      standards: '',
      topicFiles: [],
      criteriaFiles: [],
      standardsFiles: [],
    });
    setPlan(null);
    setLessonId(null);
    setError(null);
    setFailedPlan(null);
  };

  const handleShowExemplar = () => {
    pushHistory();
    applyState(EXEMPLAR);
    setPlan(null);
    setLessonId(null);
    setError(null);
    setFailedPlan(null);
  };

  const fileSetters = {
    topic: setTopicFiles,
    criteria: setCriteriaFiles,
    standards: setStandardsFiles,
  } as const;

  const attachFiles = async (field: FieldKey, list: FileList | null) => {
    if (!list?.length) return;
    pushHistory();
    setIsExtractingFile(true);
    setError(null);
    const added: string[] = [];
    for (const [index, file] of Array.from(list).entries()) {
      const id = `file_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 6)}`;
      const setFiles = fileSetters[field];
      setFiles((prev) => [...prev, { id, name: file.name, extractedText: '', isProcessing: true }]);
      try {
        const extracted = await extractDocumentText(file);
        setFiles((prev) =>
          prev.map((item) =>
            item.id === id
              ? { ...item, extractedText: extracted.text, imageDataUrl: extracted.imageDataUrl, isProcessing: false }
              : item,
          ),
        );
        added.push(file.name);
      } catch (err) {
        setFiles((prev) => prev.filter((item) => item.id !== id));
        setFileNotice(null);
        setError(err instanceof Error ? err.message : `Could not extract text from ${file.name}`);
      }
    }
    if (added.length) setFileNotice(`${added.length} file${added.length === 1 ? '' : 's'} attached`);
    setIsExtractingFile(false);
  };

  const removeFile = (field: FieldKey, id: string) => {
    pushHistory();
    fileSetters[field]((prev) => prev.filter((file) => file.id !== id));
    setFileNotice(null);
  };

  const attachedFiles = [...topicFiles, ...criteriaFiles, ...standardsFiles];
  const filesProcessing = isExtractingFile || attachedFiles.some((file) => file.isProcessing);
  const overLimit =
    countWords(topic) > WORD_LIMIT || countWords(criteria) > WORD_LIMIT || countWords(standards) > WORD_LIMIT;
  const canGenerate = topic.trim().length > 2 && Boolean(gradeLevel) && !overLimit && !busy && !filesProcessing;

  const publishPlan = (result: LessonPlanResponse, payload: LessonPlanPayload, fileNames: string[], criteriaText: string) => {
    const id = crypto.randomUUID();
    setLessonId(id);
    setPlan(result);
    setActivePrompt({
      topic: payload.topic,
      gradeLevel: payload.gradeLevel,
      standards: payload.standards,
      criteria: criteriaText || undefined,
      fileNames,
    });
    saveLessonPlanToHistory({
      id,
      title: result.title,
      createdAt: new Date().toISOString(),
      gradeLevel: payload.gradeLevel,
      topicPrompt: payload.topic,
      standardsSet: payload.standards,
      additionalCriteria: criteriaText || undefined,
      attachedFiles: fileNames.map((name) => ({ name })),
      content: formatLessonPlanMarkdown(result, result.title),
      plan: result,
    });
  };

  const submitPlan = async (request: FailedPlanRequest) => {
    setBusy(true);
    setError(null);
    setFailedPlan(null);
    try {
      publishPlan(await api.generateLessonPlan(request.payload), request.payload, request.fileNames, request.criteriaText);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate the lesson plan.';
      if (!request.followUp) {
        setPlan(null);
        setLessonId(null);
      }
      setError(message);
      if (!/readable chapter content|could not read the attached file/i.test(message)) setFailedPlan(request);
    } finally {
      setBusy(false);
    }
  };

  const generate = async (extra?: { instruction?: string; files?: AttachedDocument[] }) => {
    if (!extra && !canGenerate) return;
    if (extra && (topic.trim().length < 3 || busy)) return;
    const files = [...attachedFiles, ...(extra?.files ?? [])];
    const criteriaText = [criteria.trim(), extra?.instruction?.trim()].filter(Boolean).join('\n\n');
    const images = documentImages(files);
    const fileText = documentContext(files).slice(0, 180_000);
    const payload: LessonPlanPayload = {
      gradeLevel,
      topic: topic.trim(),
      additionalCriteria: criteriaText || undefined,
      standards: standards.trim() || undefined,
      attachments: files.map((file) => file.name),
      attachedDocumentContext: fileText || undefined,
      imageFiles: images.length ? images : undefined,
      khdaAlign: readKhdaAlign(),
    };
    await submitPlan({ payload, fileNames: files.map((file) => file.name), criteriaText, followUp: Boolean(extra) });
  };

  const errorNotice = (
    <ToolErrorRetry
      message={error}
      busy={busy}
      onRetry={failedPlan ? () => void submitPlan(failedPlan) : null}
      className={plan ? 'mb-4' : ''}
    />
  );

  const openHistoryItem = (item: LessonPlanHistoryItem) => {
    setPlan(item.plan);
    setLessonId(item.id);
    setGradeLevel(item.gradeLevel);
    setTopic(item.topicPrompt);
    setCriteria(item.additionalCriteria ?? '');
    setStandards(item.standardsSet ?? '');
    setActivePrompt({
      topic: item.topicPrompt,
      gradeLevel: item.gradeLevel,
      standards: item.standardsSet,
      criteria: item.additionalCriteria,
      fileNames: (item.attachedFiles ?? []).map((file) => file.name),
    });
    setHistoryOpen(false);
  };

  const openedSaved = useRef(false);
  useEffect(() => {
    if (openedSaved.current) return;
    const saved = (location.state as { savedPlan?: LessonPlanHistoryItem } | null)?.savedPlan;
    if (!saved?.plan) return;
    openedSaved.current = true;
    openHistoryItem(saved);
  }, [location.state]);

  const studio = (
      <div
        ref={scrollRef}
        className={`${TOOL_PAGE} lesson-plan-studio custom-scrollbar flex-1 overflow-y-auto`}
      >
        <nav className={TOOL_BREADCRUMB}>
          <Link to="/teacher/tools" className={TOOL_BREADCRUMB_LINK}>Teacher Tools</Link>
          <span className={TOOL_MUTED}>›</span>
          <span>Lesson Plan Generator</span>
        </nav>
        {plan && lessonId && activePrompt ? errorNotice : null}
        {plan && lessonId && activePrompt ? (
          <LessonPlanResult
            key={lessonId}
            plan={plan}
            lessonId={lessonId}
            prompt={activePrompt}
            busy={busy}
            onFollowUp={(instruction, files) => void generate({ instruction, files })}
            onNew={() => {
              setPlan(null);
              setLessonId(null);
              setError(null);
              setFailedPlan(null);
            }}
            onHistory={() => setHistoryOpen(true)}
          />
        ) : (
          <div className={TOOL_CARD}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className={TOOL_TITLE}>Lesson Plan Generator</h1>
                <p className={TOOL_SUBTITLE}>Generate a lesson plan based on a standard, topic, or objective.</p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <button
                  type="button"
                  onClick={() => setHistoryOpen(true)}
                  title="Lesson plan history"
                  aria-label="Lesson plan history"
                  className={TOOL_SECONDARY}
                >
                  <History className="h-4 w-4" />
                  History
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  title="Reset form"
                  aria-label="Reset form"
                  className={TOOL_SECONDARY}
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
                <button type="button" onClick={handleShowExemplar} className={TOOL_ACCENT_BUTTON}>
                  Show exemplar
                </button>
              </div>
            </div>

            <label className={`${TOOL_LABEL} mt-6`} htmlFor="lesson-plan-grade">Grade level: *</label>
            <select
              id="lesson-plan-grade"
              className={TOOL_FIELD}
              value={gradeLevel}
              onChange={(e) => {
                pushHistory();
                setGradeLevel(e.target.value);
              }}
            >
              {LESSON_PLAN_GRADE_LEVELS.map((grade) => (
                <option key={grade} value={grade}>
                  {grade}
                </option>
              ))}
            </select>

            <StudioComposer
              id="lesson-plan-topic"
              label="Topic, Standard, or Objective: *"
              value={topic}
              onChange={(next) => updateField('topic', next)}
              placeholder={TOPIC_PLACEHOLDER}
              files={topicFiles}
              onAddFiles={(list) => void attachFiles('topic', list)}
              onRemoveFile={(id) => removeFile('topic', id)}
              assistantHint="Name the standard, topic, or learning objective. Paste the full wording if you want alignment to a specific framework (NGSS, CCSS, TEKS, and others). Attached PDFs, Word files, text, and images are read into the lesson."
            />

            <StudioComposer
              id="lesson-plan-criteria"
              label="Additional Criteria:"
              value={criteria}
              onChange={(next) => updateField('criteria', next)}
              placeholder={CRITERIA_PLACEHOLDER}
              files={criteriaFiles}
              onAddFiles={(list) => void attachFiles('criteria', list)}
              onRemoveFile={(id) => removeFile('criteria', id)}
              assistantHint="Add class context: prior lesson, grouping, materials, timing, or instructional must-haves."
              short
            />

            <StudioComposer
              id="lesson-plan-standards"
              label="Standards Set to Align to:"
              value={standards}
              onChange={(next) => updateField('standards', next)}
              placeholder={STANDARDS_PLACEHOLDER}
              files={standardsFiles}
              onAddFiles={(list) => void attachFiles('standards', list)}
              onRemoveFile={(id) => removeFile('standards', id)}
              short
            />

            <KhdaAlignOption />

            {fileNotice ? <p className={`${TOOL_HINT} mt-4`}>{fileNotice}</p> : null}
            {errorNotice}

            <button
              ref={generateRef}
              type="button"
              disabled={!canGenerate}
              className={TOOL_GENERATE}
              onClick={() => void generate()}
            >
              {busy || filesProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              <span>{filesProcessing ? 'Reading files...' : busy ? 'Generating Lesson Plan...' : 'Generate Lesson Plan'}</span>
            </button>
          </div>
        )}
        <HistoryDrawer open={historyOpen} onClose={() => setHistoryOpen(false)} onSelect={openHistoryItem} />
      </div>
  );
  if (embedded) return studio;
  return (
    <DashboardLayout>
      <AIToolHeader
        toolName="Lesson Plan Generator"
        description="Generate a lesson plan based on a standard, topic, or objective."
        className="flex h-full min-h-0 flex-1 flex-col px-4 pt-4 sm:px-6"
        contentClassName="flex h-full min-h-0 flex-col"
      >
        {studio}
      </AIToolHeader>
    </DashboardLayout>
  );
}
