import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
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
import { AddFileMenu } from '@/components/tools/AddFileMenu';
import { AIToolHeader } from '@/components/tools/AIToolHeader';
import { watermarkFooterHtml } from '@/lib/exportWatermark';
import { CYBER_FONT_STYLE } from '@/lib/theme';
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
const FONT: CSSProperties = {
  fontFamily: CYBER_FONT_STYLE.fontFamily,
  fontSize: 18,
};
const LABEL_FONT: CSSProperties = {
  ...FONT,
  fontSize: 20,
};
const EDIT_FIELD_STYLE: CSSProperties = {
  fontFamily: CYBER_FONT_STYLE.fontFamily,
  color: '#f8fafc',
  backgroundColor: '#020617',
  caretColor: '#f8fafc',
};
const EDIT_FIELD_CLASS =
  'lesson-plan-edit-input w-full rounded-xl border border-cyan-500/50 bg-slate-950 p-4 text-base font-normal text-slate-100 placeholder:text-slate-500 placeholder:font-normal placeholder:italic placeholder:opacity-60 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400';
const MENU_PANEL_CLASS =
  'lesson-plan-menu z-50 rounded-xl border border-slate-700 bg-slate-900 p-1.5 shadow-2xl';
const MENU_ITEM_CLASS =
  'lesson-plan-menu-item flex w-full appearance-none items-center justify-start gap-2.5 rounded-lg border-0 bg-slate-900 px-3 py-2.5 text-left text-sm font-medium text-slate-100 shadow-none transition-colors hover:bg-cyan-800 hover:text-white';
const MENU_ITEM_STYLE: CSSProperties = {
  appearance: 'none',
  WebkitAppearance: 'none',
  backgroundColor: '#0f172a',
  backgroundImage: 'none',
  color: '#f1f5f9',
  WebkitTextFillColor: '#f1f5f9',
  border: 'none',
  boxShadow: 'none',
};
const STUDIO_CONTRAST_CSS = `
.lesson-plan-studio .lesson-plan-menu {
  background-color: #0f172a !important;
  border-color: #334155 !important;
  color: #f1f5f9 !important;
}
.lesson-plan-studio .lesson-plan-menu-item {
  appearance: none !important;
  -webkit-appearance: none !important;
  background-color: #0f172a !important;
  background-image: none !important;
  color: #f1f5f9 !important;
  -webkit-text-fill-color: #f1f5f9 !important;
  border: none !important;
  box-shadow: none !important;
}
.lesson-plan-studio .lesson-plan-menu-item span {
  color: #f1f5f9 !important;
  -webkit-text-fill-color: #f1f5f9 !important;
  background-color: transparent !important;
}
.lesson-plan-studio .lesson-plan-menu-item:hover {
  background-color: rgb(88 28 135) !important;
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
}
.lesson-plan-studio .lesson-plan-menu-item:hover span {
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
  background-color: transparent !important;
}
.lesson-plan-studio .lesson-plan-edit-input,
.lesson-plan-studio textarea,
.lesson-plan-studio input[type="text"] {
  color: #f8fafc !important;
  background-color: #020617 !important;
  caret-color: #f8fafc !important;
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "SF Pro", Inter, system-ui, sans-serif !important;
}
.lesson-plan-studio .lesson-plan-edit-input:not(:placeholder-shown),
.lesson-plan-studio textarea:not(:placeholder-shown),
.lesson-plan-studio input[type="text"]:not(:placeholder-shown) {
  -webkit-text-fill-color: #f8fafc !important;
}
.lesson-plan-studio textarea::placeholder,
.lesson-plan-studio input::placeholder {
  color: #64748b !important;
  -webkit-text-fill-color: #64748b !important;
  opacity: 0.65 !important;
  font-weight: 400 !important;
  font-style: italic;
}
`;

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
      style={MENU_ITEM_STYLE}
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

const STANDARDS_PLACEHOLDER = 'Any standards worldwide (CCSS, TEKS, Ontario, Florida)';

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

function fallbackLessonPlan(input: LessonPlanPayload): LessonPlanResponse {
  const topic = input.topic.trim() || input.attachments?.[0] || 'this topic';
  const excerpt = input.attachedDocumentContext?.replace(/\s+/g, ' ').trim().slice(0, 280);
  return {
    title: `${topic.split('\n')[0]?.slice(0, 72) || topic} — Lesson Plan`,
    gradeLevel: input.gradeLevel,
    objective: `Students will explain ${topic.slice(0, 120)} with an example and apply it in a short group task.`,
    standards: input.standards
      ? input.standards.split(/[;,\n]/).map((s) => s.trim()).filter(Boolean)
      : [`Aligned to ${input.gradeLevel} classroom objectives`],
    durationMinutes: 50,
    materials: [
      ...(input.attachments?.length ? [`Attached source: ${input.attachments.join(', ')}`] : []),
      'Whiteboard or slide deck',
      'Student notebooks',
      'Exit ticket slips',
    ],
    sections: [
      {
        heading: 'Warm-up',
        minutes: 5,
        activities: [`Activate prior knowledge related to ${topic.slice(0, 80)}.`, 'Share one idea with a partner.'],
      },
      {
        heading: 'Mini-lesson',
        minutes: 12,
        activities: [
          excerpt
            ? `Model the core idea using this source excerpt: "${excerpt}"`
            : 'Model the core idea with a worked example.',
          'Check for understanding with two cold-call questions.',
        ],
      },
      {
        heading: 'Guided / group practice',
        minutes: 18,
        activities: [
          input.additionalCriteria?.trim() || 'Students complete a collaborative task using the objective.',
          'Teacher circulates with a success-criteria checklist.',
        ],
      },
      {
        heading: 'Independent practice',
        minutes: 8,
        activities: ['Students apply the idea to one new example in writing.'],
      },
      {
        heading: 'Closing',
        minutes: 7,
        activities: ['Exit ticket: explain the idea in one sentence and give one example.'],
      },
    ],
    assessment: 'Exit ticket plus teacher observation during group work.',
    differentiation: 'Provide sentence starters for emerging writers; extension asks students to connect the idea to a real-world case.',
  };
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
  const subject = (topic.split('\n')[0]?.trim().slice(0, 140) || plan.title).replace(/[.\s]+$/, '');
  const procedure = plan.sections
    .slice(0, 3)
    .map((section) => `${section.heading.toLowerCase()} (${section.activities[0] || 'a classroom task'})`)
    .join(', ');
  return {
    summary: `I've created a concise, classroom-ready lesson plan for ${subject}. It is written for ${plan.gradeLevel} and fits one class period of about ${plan.durationMinutes} minutes, with a clear objective, an assessment, and a procedure students can follow.`,
    keyPoints: [
      `Starting with a clear objective: ${plan.objective}`,
      `Including an assessment that checks understanding: ${plan.assessment}`,
      procedure
        ? `Building the period as ${procedure}.`
        : 'Building instruction through warm-up, practice, and a closing check.',
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

const ICON_BTN =
  'inline-flex cursor-pointer appearance-none items-center justify-center rounded-lg border-0 bg-transparent p-2 text-slate-400 shadow-none transition-colors hover:bg-slate-800 hover:text-white';

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
      className="w-full cursor-pointer appearance-none rounded-xl border border-slate-800 bg-slate-950/80 p-4 text-left text-slate-200 shadow-none transition-all hover:border-cyan-500/50 hover:bg-slate-900"
    >
      <div className="mb-1 text-xs font-semibold text-cyan-400">{item.gradeLevel}</div>
      <div className="line-clamp-2 text-sm font-bold">{item.title || item.topicPrompt}</div>
      <div className="mt-2 text-[11px] text-slate-500">{new Date(item.createdAt).toLocaleString()}</div>
    </button>
  );
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="h-full w-full max-w-md space-y-6 overflow-y-auto border-l border-slate-800 bg-slate-900 p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <h2 className="flex items-center gap-2 text-lg font-bold text-white">
            <History className="h-5 w-5 text-cyan-400" /> Saved Plans
          </h2>
          <button type="button" onClick={onClose} className={ICON_BTN} aria-label="Close history">
            <X className="h-5 w-5" />
          </button>
        </div>
        <section className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400">My Resources</h3>
          {saved.length === 0 ? (
            <p className="text-sm text-slate-500">No lesson plans saved to My Resources yet.</p>
          ) : (
            saved.map(renderItem)
          )}
        </section>
        <section className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400">Recent</h3>
          {recent.length === 0 ? (
            <p className="text-sm text-slate-500">No generated lesson plans yet.</p>
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
    } catch {
      showNotice('Failed to translate the lesson plan.');
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
    <div className="space-y-4 text-sm leading-relaxed text-slate-300">
      <h3 className="text-center text-lg font-bold text-slate-100">{lessonTitle}</h3>
      <p className="font-semibold text-slate-200">Learning Objective</p>
      {isEditing ? (
        <textarea className={EDIT_FIELD_CLASS} style={EDIT_FIELD_STYLE} rows={3} value={draft.objective} onChange={(e) => setDraft({ ...draft, objective: e.target.value })} />
      ) : (
        <p className="text-slate-400">{draft.objective}</p>
      )}
      <p className="font-semibold text-slate-200">Assessments</p>
      {isEditing ? (
        <textarea className={EDIT_FIELD_CLASS} style={EDIT_FIELD_STYLE} rows={3} value={draft.assessment} onChange={(e) => setDraft({ ...draft, assessment: e.target.value })} />
      ) : (
        <p className="text-slate-400">{draft.assessment}</p>
      )}
    </div>
  );

  const detailsBody = (
    <div className="space-y-4 text-sm leading-relaxed text-slate-300">
      <p className="font-semibold text-slate-200">Standards</p>
      {isEditing ? (
        <textarea className={EDIT_FIELD_CLASS} style={EDIT_FIELD_STYLE} rows={3} value={draft.standards.join('\n')} onChange={(e) => setDraft({ ...draft, standards: e.target.value.split('\n') })} />
      ) : (
        <p className="text-slate-400">{nonempty(draft.standards).join('; ') || 'Aligned to the selected grade level.'}</p>
      )}
      <p className="font-semibold text-slate-200">Materials</p>
      {isEditing ? (
        <textarea className={EDIT_FIELD_CLASS} style={EDIT_FIELD_STYLE} rows={3} value={draft.materials.join('\n')} onChange={(e) => setDraft({ ...draft, materials: e.target.value.split('\n') })} />
      ) : (
        <p className="text-slate-400">{nonempty(draft.materials).join(', ')}</p>
      )}
      <p className="font-semibold text-slate-200">Differentiation</p>
      {isEditing ? (
        <textarea className={EDIT_FIELD_CLASS} style={EDIT_FIELD_STYLE} rows={3} value={draft.differentiation} onChange={(e) => setDraft({ ...draft, differentiation: e.target.value })} />
      ) : (
        <p className="text-slate-400">{draft.differentiation}</p>
      )}
    </div>
  );

  const sectionsBody = (range: number[]) => (
    <div className="space-y-5 text-sm leading-relaxed text-slate-300">
      {draft.sections.slice(range[0], range[1]).map((section, offset) => {
        const index = (range[0] ?? 0) + offset;
        return (
          <section key={`${section.heading}-${index}`}>
            {isEditing ? (
              <input
                className={`${EDIT_FIELD_CLASS} mb-2 p-2 font-semibold text-slate-100`}
                style={EDIT_FIELD_STYLE}
                value={section.heading}
                onChange={(e) => {
                  const sections = draft.sections.map((item, i) => (i === index ? { ...item, heading: e.target.value } : item));
                  setDraft({ ...draft, sections });
                }}
              />
            ) : (
              <h3 className="font-semibold text-slate-100">
                {section.heading}
                {section.minutes ? ` (${section.minutes} min)` : ''}
              </h3>
            )}
            {isEditing ? (
              <textarea
                className={EDIT_FIELD_CLASS}
                style={EDIT_FIELD_STYLE}
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
              <ul className="mt-1 list-disc space-y-1 pl-5 text-slate-400">
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
    <div className="relative mx-auto flex w-[min(82%,100%)] flex-col space-y-6 px-2 py-6 pb-24">
      <div className="pointer-events-none absolute left-1/2 top-0 h-[280px] w-[min(700px,100%)] -translate-x-1/2 rounded-full bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-teal-500/10 blur-3xl" />
      <div className="relative z-10 flex items-center justify-between rounded-2xl border border-slate-800/80 bg-slate-900/80 p-4 shadow-lg backdrop-blur-md">
        <div className="flex min-w-0 items-center gap-2 text-base font-semibold text-slate-200">
          <FileText className="h-5 w-5 shrink-0 text-cyan-400" />
          <span>Lesson Plan</span>
          <button type="button" onClick={handleFavorite} className={ICON_BTN} title={isFavorite ? 'Remove favorite' : 'Favorite'} aria-pressed={isFavorite}>
            <Star className={`h-4 w-4 ${isFavorite ? 'fill-amber-400 text-amber-400' : ''}`} />
          </button>
          <button type="button" onClick={() => void handleShare()} className={ICON_BTN} title="Share">
            <Share2 className="h-4 w-4" />
          </button>
          <button type="button" onClick={onHistory} className={ICON_BTN} title="History">
            <History className="h-4 w-4" />
          </button>
        </div>
        <div className="flex items-center gap-3">
          <button type="button" onClick={onNew} className="cursor-pointer appearance-none border-0 bg-transparent text-xs font-semibold text-slate-400 hover:text-cyan-300">
            New
          </button>
          <button
            type="button"
            onClick={() => setShowPrompt((open) => !open)}
            className="inline-flex cursor-pointer appearance-none items-center gap-1.5 border-0 bg-transparent text-xs font-semibold text-slate-400 transition-colors hover:text-cyan-400"
            aria-expanded={showPrompt}
          >
            <span>{showPrompt ? 'Hide prompt' : 'Show prompt'}</span>
            <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${showPrompt ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {showPrompt ? (
        <div className="relative z-10 grid grid-cols-1 gap-3 rounded-2xl border border-slate-800/80 bg-slate-900/70 p-5 text-sm text-slate-300 shadow-lg backdrop-blur-md md:grid-cols-2">
          <div>
            <span className="font-medium text-slate-400">Topic, Standard, or Objective:</span>{' '}
            <span className="font-semibold text-slate-100">{prompt.topic}</span>
            {prompt.fileNames.length > 0 ? (
              <span className="ml-2 inline-flex items-center gap-1 rounded-md border border-cyan-500/30 bg-cyan-950 px-2 py-0.5 text-xs font-medium text-cyan-300">
                <Paperclip className="h-3 w-3" /> {prompt.fileNames.length} file{prompt.fileNames.length === 1 ? '' : 's'}
              </span>
            ) : null}
          </div>
          <div>
            <span className="font-medium text-slate-400">Grade Level:</span>{' '}
            <span className="font-semibold text-slate-100">{prompt.gradeLevel}</span>
          </div>
          {prompt.standards ? (
            <div>
              <span className="font-medium text-slate-400">Standards Set to Align to:</span>{' '}
              <span className="font-semibold text-slate-100">{prompt.standards}</span>
            </div>
          ) : null}
          {prompt.criteria ? (
            <div>
              <span className="font-medium text-slate-400">Additional Criteria:</span>{' '}
              <span className="font-semibold text-slate-100">{prompt.criteria}</span>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="relative z-10 rounded-3xl border border-slate-800 bg-gradient-to-b from-slate-900/90 via-slate-900/80 to-slate-950/90 p-6 shadow-2xl backdrop-blur-xl md:p-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex min-w-0 items-center gap-2 text-sm font-semibold text-slate-200">
            <button type="button" className={ICON_BTN} title="Rename" aria-label="Rename lesson plan" onClick={() => setEditingTitle(true)}>
              <Pencil className="h-4 w-4 text-cyan-400" />
            </button>
            {editingTitle ? (
              <input
                className={`${EDIT_FIELD_CLASS} min-w-0 flex-1 p-2 text-sm font-semibold`}
                style={EDIT_FIELD_STYLE}
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
              <Bookmark className={`h-4 w-4 ${isBookmarked ? 'fill-amber-400 text-amber-400' : ''}`} />
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
                className="inline-flex cursor-pointer appearance-none items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>Export</span>
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
              {isExportOpen ? (
                <div className={`${MENU_PANEL_CLASS} absolute right-0 z-20 mt-2 w-52`}>
                  <StudioMenuItem icon={<FileText className="h-4 w-4 text-cyan-400" />} onClick={() => { exportToPDF(draft, lessonTitle); setIsExportOpen(false); }}>
                    Export as PDF
                  </StudioMenuItem>
                  <StudioMenuItem icon={<FileCode className="h-4 w-4 text-cyan-400" />} onClick={() => { exportToDocx(markdown, lessonTitle); setIsExportOpen(false); }}>
                    Export as Word (.docx)
                  </StudioMenuItem>
                  <StudioMenuItem
                    icon={<Globe className="h-4 w-4 text-cyan-400" />}
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
              className={`inline-flex cursor-pointer appearance-none items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                isEditing
                  ? 'border-cyan-400 bg-cyan-500 text-slate-950'
                  : 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20'
              }`}
            >
              <Edit3 className="h-3.5 w-3.5" />
              <span>{isEditing ? 'Done' : 'Edit'}</span>
            </button>
          </div>
        </div>

        <div className="relative min-h-[380px] rounded-xl border border-slate-800/80 bg-slate-950/80 p-6 md:p-8">
          <div className="mb-4 flex items-center justify-end gap-2 text-xs text-slate-400">
            <button type="button" className={ICON_BTN} aria-label="Previous page" disabled={safePage <= 0} onClick={() => setPage((value) => Math.max(0, value - 1))}>
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span>Page {safePage + 1} of {pages.length}</span>
            <button type="button" className={ICON_BTN} aria-label="Next page" disabled={safePage >= pages.length - 1} onClick={() => setPage((value) => Math.min(pages.length - 1, value + 1))}>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          {isTranslating ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm font-semibold text-cyan-300">
              <Loader2 className="h-5 w-5 animate-spin" /> Translating lesson plan...
            </div>
          ) : (
            pageBody
          )}
          <div className="mt-8 flex justify-center">
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="inline-flex cursor-pointer appearance-none items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-200 shadow-xl hover:bg-slate-800"
            >
              <Maximize2 className="h-4 w-4" /> Expand preview
            </button>
          </div>
          {busy ? (
            <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-slate-950/70">
              <span className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm text-white">
                <Loader2 className="h-4 w-4 animate-spin" /> Updating lesson plan…
              </span>
            </div>
          ) : null}
        </div>
      </div>

      <div className="space-y-3 text-sm leading-relaxed text-slate-300">
        <p>{summary.summary}</p>
        <ol className="list-decimal space-y-1.5 pl-5">
          {summary.keyPoints.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ol>
      </div>

      <div className="flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-3">
          <div className="relative" ref={translateRef}>
            <button
              type="button"
              onClick={() => setTranslateOpen((open) => !open)}
              disabled={isTranslating}
              className="inline-flex cursor-pointer appearance-none items-center gap-1.5 border-0 bg-transparent text-xs font-semibold text-slate-400 hover:text-cyan-300 disabled:opacity-60"
            >
              <Languages className="h-4 w-4 text-cyan-400" />
              <span>Translate ({selectedLanguage})</span>
              <ChevronDown className="h-3 w-3" />
            </button>
            {translateOpen ? (
              <div className="absolute bottom-8 left-0 z-30 w-48 space-y-1 rounded-xl border border-slate-800 bg-slate-900 p-2 text-xs shadow-2xl">
                <div className="mb-1 border-b border-slate-800 px-2 py-1 font-bold text-slate-500">Select Language</div>
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => void handleTranslateContent(lang)}
                    className="flex w-full cursor-pointer appearance-none items-center justify-between rounded-lg border-0 bg-transparent px-2 py-1.5 text-left text-slate-200 hover:bg-slate-800"
                  >
                    <span>{lang.name}</span>
                    {selectedLanguage === lang.name ? <Check className="h-3.5 w-3.5 text-cyan-400" /> : null}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <button type="button" onClick={handleReadAloud} className="inline-flex cursor-pointer appearance-none items-center gap-1 border-0 bg-transparent text-slate-400 hover:text-white">
            <Volume2 className="h-4 w-4" /> {speaking ? 'Stop' : 'Listen'}
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => handleFeedback('up')} className={`${ICON_BTN} ${feedback === 'up' ? 'text-emerald-400' : ''}`} title="Helpful">
            <ThumbsUp className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => handleFeedback('down')} className={`${ICON_BTN} ${feedback === 'down' ? 'text-rose-400' : ''}`} title="Needs improvement">
            <ThumbsDown className="h-4 w-4" />
          </button>
        </div>
      </div>

      {notice ? <p className="rounded-xl border border-cyan-500/30 bg-cyan-950/40 px-4 py-2 text-sm text-cyan-200">{notice}</p> : null}

      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 shadow-xl">
        {followUpFiles.length > 0 ? (
          <div className="mb-2 flex flex-wrap gap-2">
            {followUpFiles.map((file) => (
              <span key={file.id} className="inline-flex items-center gap-1 rounded-lg border border-cyan-500/30 bg-cyan-950/60 px-2 py-1 text-xs text-cyan-300">
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
          className="w-full border-0 bg-transparent text-sm text-slate-200 outline-none placeholder:text-slate-500"
          style={{ color: '#e2e8f0', WebkitTextFillColor: '#e2e8f0' }}
        />
        <div className="mt-2 flex items-center justify-between border-t border-slate-800/60 pt-2">
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
              <Mic className={`h-4 w-4 ${listening ? 'text-cyan-300' : ''}`} />
            </button>
            <button
              type="button"
              onClick={sendFollowUp}
              disabled={!followUp.trim() || busy}
              className="inline-flex cursor-pointer appearance-none items-center justify-center rounded-xl bg-cyan-500 p-2 text-slate-950 hover:bg-cyan-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-500"
              aria-label="Send"
            >
              <ArrowUp className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {expanded ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setExpanded(false)}>
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-800 bg-slate-950 p-8" onClick={(event) => event.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-100">{lessonTitle}</h2>
              <button type="button" onClick={() => setExpanded(false)} className={ICON_BTN} aria-label="Close preview">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-6 text-sm text-slate-300">
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
  value,
  onChange,
  placeholder,
  files,
  onAddFiles,
  onRemoveFile,
  assistantHint,
  minHeight = 168,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
  files: AttachedDocument[];
  onAddFiles: (list: FileList | null) => void;
  onRemoveFile: (id: string) => void;
  assistantHint?: string;
  minHeight?: number;
}) {
  const [assistantOpen, setAssistantOpen] = useState(false);
  const { listening, toggle } = useDictation((text) => {
    onChange(value.trim() ? `${value.trim()} ${text}` : text);
  });
  const words = countWords(value);
  const overLimit = words > WORD_LIMIT;

  return (
    <div
      className="w-full space-y-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl backdrop-blur-xl transition-all duration-300 focus-within:border-cyan-500/60 focus-within:ring-2 focus-within:ring-cyan-500/20"
      style={FONT}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          title={listening ? 'Listening... Click to stop' : 'Click to dictate prompt with voice'}
          className={`flex shrink-0 cursor-pointer appearance-none items-center justify-center rounded-xl p-2.5 shadow-md transition-all duration-300 ${
            listening
              ? 'animate-pulse border border-rose-400/60 bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-[0_0_20px_rgba(244,63,94,0.45)] ring-2 ring-rose-400/30'
              : 'border border-cyan-500/30 bg-slate-950/90 text-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.15)] hover:scale-105 hover:border-cyan-400 hover:bg-cyan-950/50 hover:text-cyan-300'
          }`}
          aria-label={listening ? 'Stop recording' : 'Dictate with microphone'}
          aria-pressed={listening}
          onClick={toggle}
        >
          <Mic className={`h-4 w-4 ${listening ? 'animate-bounce text-white' : 'text-cyan-400'}`} />
        </button>
        <textarea
          className="w-full flex-1 resize-y bg-transparent px-1 text-base leading-relaxed text-slate-100 outline-none placeholder:font-normal placeholder:italic placeholder:text-slate-500 placeholder:opacity-60"
          style={{ ...FONT, minHeight }}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={5}
          spellCheck
        />
      </div>
      {listening ? <VoiceListeningIndicator className="mt-3" isListening onStopListening={toggle} /> : null}
      {files.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-800 pt-3">
          {files.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-2 rounded-lg border border-cyan-500/30 bg-cyan-950/60 px-3 py-1.5 text-xs text-cyan-300 shadow-sm"
            >
              {file.isProcessing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-400" />
              ) : (
                <FileText className="h-3.5 w-3.5 text-cyan-400" />
              )}
              <span className="max-w-[180px] truncate font-medium">{file.name}</span>
              <button
                type="button"
                onClick={() => onRemoveFile(file.id)}
                className="appearance-none p-0.5 text-slate-400 transition-colors hover:text-rose-400"
                title="Remove file"
                aria-label={`Remove ${file.name}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/80 pt-3 text-xs text-slate-400">
        <AddFileMenu accept={FILE_ACCEPT} onFiles={onAddFiles} />
        <div className="flex flex-wrap items-center gap-4">
          <span className={overLimit ? 'text-xs font-medium text-rose-300' : 'text-xs text-slate-400'}>
            Total word limit: {words.toLocaleString()}/{WORD_LIMIT.toLocaleString()}
          </span>
          {assistantHint ? (
            <button
              type="button"
              className="inline-flex cursor-pointer appearance-none items-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-950/60 px-4 py-2 text-sm font-semibold text-cyan-300 shadow-sm transition-all hover:border-cyan-400"
              onClick={() => setAssistantOpen((v) => !v)}
            >
              <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
              <span>Prompt assistant</span>
            </button>
          ) : null}
        </div>
      </div>
      {assistantHint && assistantOpen ? (
        <p className="mt-3 rounded-lg border border-cyan-500/30 bg-slate-950 px-3 py-2 text-sm text-slate-200">
          {assistantHint}
        </p>
      ) : null}
    </div>
  );
}

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
  };

  const handleShowExemplar = () => {
    pushHistory();
    applyState(EXEMPLAR);
    setPlan(null);
    setLessonId(null);
    setError(null);
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

  const generate = async (extra?: { instruction?: string; files?: AttachedDocument[] }) => {
    if (!extra && !canGenerate) return;
    if (extra && (topic.trim().length < 3 || busy)) return;
    setBusy(true);
    setError(null);
    const files = [...attachedFiles, ...(extra?.files ?? [])];
    const criteriaText = [criteria.trim(), extra?.instruction?.trim()].filter(Boolean).join('\n\n');
    const images = documentImages(files);
    const payload: LessonPlanPayload = {
      gradeLevel,
      topic: topic.trim(),
      additionalCriteria: criteriaText || undefined,
      standards: standards.trim() || undefined,
      attachments: files.map((file) => file.name),
      attachedDocumentContext: documentContext(files) || undefined,
      imageFiles: images.length ? images : undefined,
    };
    try {
      publishPlan(await api.generateLessonPlan(payload), payload, files.map((file) => file.name), criteriaText);
    } catch {
      publishPlan(fallbackLessonPlan(payload), payload, files.map((file) => file.name), criteriaText);
    } finally {
      setBusy(false);
    }
  };

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
        className="lesson-plan-studio custom-scrollbar flex h-full max-h-full min-h-0 w-full flex-1 flex-col overflow-y-auto bg-[#0d131f] text-slate-100"
        style={{ ...FONT, colorScheme: 'dark' }}
      >
        <style>{STUDIO_CONTRAST_CSS}</style>
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
            }}
            onHistory={() => setHistoryOpen(true)}
          />
        ) : (
        <div className="mx-auto flex w-full max-w-[70rem] flex-col space-y-8 px-5 py-6 pb-24 sm:px-8">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 flex-wrap items-center gap-3">
                <p className="text-[18px] text-slate-300" style={FONT}>
                  Generate a lesson plan based on a standard, topic, or objective.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setHistoryOpen(true)}
                  title="Lesson plan history"
                  aria-label="Lesson plan history"
                  className="inline-flex cursor-pointer appearance-none items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm font-medium text-cyan-300 hover:border-cyan-500 hover:text-white"
                >
                  <History className="h-4 w-4" />
                  History
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  title="Reset form"
                  aria-label="Reset form"
                  className="rounded-lg border border-slate-700 bg-slate-900 p-2 text-cyan-300 transition-colors hover:border-cyan-500 hover:text-white"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={handleShowExemplar}
                  className="rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-1.5 text-sm font-medium text-cyan-300 transition-colors hover:border-cyan-500 hover:text-white"
                >
                  Show exemplar
                </button>
              </div>
            </div>

            <label className="mb-6 block">
              <span className="mb-2 block font-semibold text-slate-100" style={LABEL_FONT}>
                Grade level: <span className="text-rose-400">*</span>
              </span>
              <div className="relative max-w-xl">
                <select
                  className="w-full appearance-none rounded-xl border border-white/15 bg-[#151c2b] px-4 py-3 pr-10 text-[18px] text-slate-100 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/40"
                  style={FONT}
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
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              </div>
            </label>

            <div className="mb-8">
              <span className="mb-2 block font-semibold text-slate-100" style={LABEL_FONT}>
                Topic, Standard, or Objective: <span className="text-rose-400">*</span>
              </span>
              <StudioComposer
                value={topic}
                onChange={(next) => updateField('topic', next)}
                placeholder={TOPIC_PLACEHOLDER}
                files={topicFiles}
                onAddFiles={(list) => void attachFiles('topic', list)}
                onRemoveFile={(id) => removeFile('topic', id)}
                minHeight={200}
                assistantHint="Name the standard, topic, or learning objective. Paste the full wording if you want alignment to a specific framework (NGSS, CCSS, TEKS, and others). Attached PDFs, Word files, text, and images are read into the lesson."
              />
            </div>

            <div className="mb-8">
              <span className="mb-2 block font-semibold text-slate-100" style={LABEL_FONT}>
                Additional Criteria:
              </span>
              <StudioComposer
                value={criteria}
                onChange={(next) => updateField('criteria', next)}
                placeholder={CRITERIA_PLACEHOLDER}
                files={criteriaFiles}
                onAddFiles={(list) => void attachFiles('criteria', list)}
                onRemoveFile={(id) => removeFile('criteria', id)}
                assistantHint="Add class context: prior lesson, grouping, materials, timing, or instructional must-haves."
              />
            </div>

            <div className="mb-10">
              <span className="mb-2 block font-semibold text-slate-100" style={LABEL_FONT}>
                Standards Set to Align to:
              </span>
              <StudioComposer
                value={standards}
                onChange={(next) => updateField('standards', next)}
                placeholder={STANDARDS_PLACEHOLDER}
                files={standardsFiles}
                onAddFiles={(list) => void attachFiles('standards', list)}
                onRemoveFile={(id) => removeFile('standards', id)}
                minHeight={140}
              />
            </div>

            {fileNotice ? (
              <p className="rounded-xl border border-cyan-500/30 bg-cyan-950/40 px-4 py-3 text-sm text-cyan-200">
                {fileNotice}
              </p>
            ) : null}
            {error ? (
              <p className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-rose-200">{error}</p>
            ) : null}

            <div className="flex items-center justify-end gap-3 border-t border-slate-800/80 pt-4">
              <button
                ref={generateRef}
                type="button"
                disabled={!canGenerate}
                className={`inline-flex cursor-pointer appearance-none items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-bold transition-all ${
                  canGenerate
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:from-cyan-400 hover:to-blue-400'
                    : 'cursor-not-allowed border border-slate-700/50 bg-slate-800 text-slate-500'
                }`}
                onClick={() => void generate()}
              >
                {busy || filesProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {filesProcessing ? 'Reading files...' : 'Generate Lesson Plan'}
              </button>
            </div>
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
