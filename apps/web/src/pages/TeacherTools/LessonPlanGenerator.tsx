import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import {
  ChevronDown,
  FilePlus,
  FileText,
  FileCode,
  Globe,
  Loader2,
  Mic,
  RotateCcw,
  Sparkles,
  ArrowDown,
  Bookmark,
  Printer,
  Copy,
  Download,
  Pencil,
  Edit3,
} from 'lucide-react';
import {
  LESSON_PLAN_GRADE_LEVELS,
  type LessonPlanPayload,
  type LessonPlanResponse,
} from '@brightpath/shared';
import { api } from '@/lib/api';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

const WORD_LIMIT = 75_000;
const FONT: CSSProperties = {
  fontFamily: 'Cambria, Georgia, serif',
  fontSize: 18,
};
const LABEL_FONT: CSSProperties = {
  ...FONT,
  fontSize: 20,
};
const EDIT_FIELD_STYLE: CSSProperties = {
  fontFamily: 'Cambria, Georgia, serif',
  color: '#f8fafc',
  backgroundColor: '#020617',
  caretColor: '#f8fafc',
};
const EDIT_FIELD_CLASS =
  'lesson-plan-edit-input w-full rounded-xl border border-purple-500/50 bg-slate-950 p-4 text-base font-normal text-slate-100 placeholder:text-slate-500 placeholder:font-normal placeholder:italic placeholder:opacity-60 focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-400';
const MENU_PANEL_CLASS =
  'lesson-plan-menu z-50 rounded-xl border border-slate-700 bg-slate-900 p-1.5 shadow-2xl';
const MENU_ITEM_CLASS =
  'lesson-plan-menu-item flex w-full appearance-none items-center justify-start gap-2.5 rounded-lg border-0 bg-slate-900 px-3 py-2.5 text-left text-sm font-medium text-slate-100 shadow-none transition-colors hover:bg-purple-800 hover:text-white';
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
  font-family: Cambria, Georgia, serif !important;
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
  topicFiles: string[];
  criteriaFiles: string[];
  standardsFiles: string[];
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
  const topic = input.topic.trim() || 'this topic';
  return {
    title: `${topic.split('\n')[0]?.slice(0, 72) || topic} — Lesson Plan`,
    gradeLevel: input.gradeLevel,
    objective: `Students will explain ${topic.slice(0, 120)} with an example and apply it in a short group task.`,
    standards: input.standards
      ? input.standards.split(/[;,\n]/).map((s) => s.trim()).filter(Boolean)
      : [`Aligned to ${input.gradeLevel} classroom objectives`],
    durationMinutes: 50,
    materials: ['Whiteboard or slide deck', 'Student notebooks', 'Exit ticket slips'],
    sections: [
      {
        heading: 'Warm-up',
        minutes: 5,
        activities: [`Activate prior knowledge related to ${topic.slice(0, 80)}.`, 'Share one idea with a partner.'],
      },
      {
        heading: 'Mini-lesson',
        minutes: 12,
        activities: ['Model the core idea with a worked example.', 'Check for understanding with two cold-call questions.'],
      },
      {
        heading: 'Guided / group practice',
        minutes: 18,
        activities: [
          input.criteria?.trim() || 'Students complete a collaborative task using the objective.',
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
  <body>${bodyHtml}</body>
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

function LessonPlanOutput({ plan, lessonId }: { plan: LessonPlanResponse; lessonId: string }) {
  const [lessonTitle, setLessonTitle] = useState(plan.title);
  const [editingTitle, setEditingTitle] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(() => loadBookmarks().includes(lessonId));
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [draft, setDraft] = useState(plan);
  const [toast, setToast] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLessonTitle(plan.title);
    setDraft(plan);
    setIsEditing(false);
  }, [plan]);

  useEffect(() => {
    if (!isExportOpen) return;
    const onPointer = (event: MouseEvent) => {
      if (!exportRef.current?.contains(event.target as Node)) setIsExportOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    return () => document.removeEventListener('mousedown', onPointer);
  }, [isExportOpen]);

  const lessonPlanContent = formatLessonPlanMarkdown(draft, lessonTitle);

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2800);
  };

  const handlePrint = () => {
    openPrintWindow(lessonTitle, planToPrintBody(draft, lessonTitle));
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(lessonPlanContent);
      showToast('Lesson plan copied to clipboard!');
    } catch {
      showToast('Failed to copy content.');
    }
  };

  const handleBookmark = async () => {
    const next = !isBookmarked;
    setIsBookmarked(next);
    const ids = loadBookmarks();
    persistBookmarks(next ? [...ids.filter((id) => id !== lessonId), lessonId] : ids.filter((id) => id !== lessonId));
    try {
      await api.bookmarkLessonPlan(lessonId, next, lessonTitle);
    } catch {
      /* local bookmark still saved */
    }
    showToast(next ? 'Saved to bookmarks' : 'Removed from bookmarks');
  };

  const handleExportPDF = () => {
    exportToPDF(draft, lessonTitle);
    setIsExportOpen(false);
  };

  const handleExportDocx = () => {
    exportToDocx(lessonPlanContent, lessonTitle);
    setIsExportOpen(false);
  };

  const handleExportGoogleDocs = async () => {
    try {
      await navigator.clipboard.writeText(lessonPlanContent);
      window.open('https://docs.google.com/document/create', '_blank', 'noopener,noreferrer');
      showToast('Copied. Paste into the new Google Doc (Ctrl+V).');
    } catch {
      showToast('Could not open Google Docs.');
    }
    setIsExportOpen(false);
  };

  return (
    <div className="mb-8 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/90 shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-t-2xl border-b border-slate-800 bg-slate-900/90 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            className="shrink-0 text-slate-400 hover:text-purple-400"
            aria-label="Rename lesson plan"
            title="Rename lesson plan"
            onClick={() => setEditingTitle(true)}
          >
            <Pencil className="h-4 w-4" />
          </button>
          {editingTitle ? (
            <input
              type="text"
              className={`${EDIT_FIELD_CLASS} min-w-0 flex-1 p-2 text-lg font-semibold`}
              style={EDIT_FIELD_STYLE}
              value={lessonTitle}
              onChange={(e) => setLessonTitle(e.target.value)}
              onBlur={() => setEditingTitle(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === 'Escape') setEditingTitle(false);
              }}
              autoFocus
            />
          ) : (
            <h2
              className="truncate text-lg font-semibold text-slate-100"
              onClick={() => setEditingTitle(true)}
              title="Rename lesson plan"
            >
              {lessonTitle}
            </h2>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void handleBookmark()}
            title="Bookmark lesson plan"
            className={`rounded-lg border bg-slate-950 p-2 transition-colors ${
              isBookmarked
                ? 'border-amber-500/50 text-amber-400'
                : 'border-slate-700 text-slate-300 hover:text-white'
            }`}
          >
            <Bookmark className="h-4 w-4" fill={isBookmarked ? 'currentColor' : 'none'} />
          </button>
          <button
            type="button"
            onClick={handlePrint}
            title="Print lesson plan"
            className="rounded-lg border border-slate-700 bg-slate-950 p-2 text-slate-300 transition-colors hover:border-purple-500 hover:text-white"
          >
            <Printer className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => void handleCopy()}
            title="Copy text"
            className="rounded-lg border border-slate-700 bg-slate-950 p-2 text-slate-300 transition-colors hover:border-purple-500 hover:text-white"
          >
            <Copy className="h-4 w-4" />
          </button>
          <div className="relative" ref={exportRef}>
            <button
              type="button"
              onClick={() => setIsExportOpen((open) => !open)}
              className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm font-medium text-slate-200 transition-colors hover:border-purple-500 hover:text-white"
            >
              <Download className="h-4 w-4 text-purple-400" />
              <span>Export</span>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            </button>
            {isExportOpen ? (
              <div role="menu" className={`${MENU_PANEL_CLASS} absolute right-0 top-full mt-2 w-52`}>
                <StudioMenuItem icon={<FileText className="h-4 w-4 text-purple-400" />} onClick={handleExportPDF}>
                  Export as PDF
                </StudioMenuItem>
                <StudioMenuItem icon={<FileCode className="h-4 w-4 text-purple-400" />} onClick={handleExportDocx}>
                  Export as Word (.docx)
                </StudioMenuItem>
                <StudioMenuItem
                  icon={<Globe className="h-4 w-4 text-purple-400" />}
                  onClick={() => void handleExportGoogleDocs()}
                >
                  Export to Google Docs
                </StudioMenuItem>
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => setIsEditing((value) => !value)}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
              isEditing
                ? 'border-purple-500 bg-purple-600 text-white'
                : 'border-slate-700 bg-slate-950 text-slate-200 hover:border-purple-500 hover:text-white'
            }`}
          >
            <Edit3 className="h-4 w-4" />
            <span>{isEditing ? 'Done Editing' : 'Edit'}</span>
          </button>
        </div>
      </div>

      <article ref={printRef} className="p-6 text-slate-100" style={FONT}>
        <p className="text-slate-300">
          {draft.gradeLevel} · {draft.durationMinutes} minutes
        </p>
        <div className="mt-4">
          <span className="font-semibold">Objective: </span>
          {isEditing ? (
            <textarea
              className={`${EDIT_FIELD_CLASS} mt-1 min-h-[4rem]`}
              style={EDIT_FIELD_STYLE}
              value={draft.objective}
              onChange={(e) => setDraft({ ...draft, objective: e.target.value })}
              rows={3}
            />
          ) : (
            <p className="mt-1 text-base leading-relaxed text-slate-200">{draft.objective}</p>
          )}
        </div>
        <div className="mt-2">
          <span className="font-semibold">Standards: </span>
          {isEditing ? (
            <textarea
              className={`${EDIT_FIELD_CLASS} mt-1 min-h-[3rem]`}
              style={EDIT_FIELD_STYLE}
              value={draft.standards.join('\n')}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  standards: e.target.value.split('\n'),
                })
              }
              rows={3}
            />
          ) : (
            <p className="mt-1 text-base leading-relaxed text-slate-200">{draft.standards.join('; ')}</p>
          )}
        </div>
        <div className="mt-2">
          <span className="font-semibold">Materials: </span>
          {isEditing ? (
            <textarea
              className={`${EDIT_FIELD_CLASS} mt-1 min-h-[3rem]`}
              style={EDIT_FIELD_STYLE}
              value={draft.materials.join('\n')}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  materials: e.target.value.split('\n'),
                })
              }
              rows={3}
            />
          ) : (
            <p className="mt-1 text-base leading-relaxed text-slate-200">{draft.materials.join(', ')}</p>
          )}
        </div>
        <div className="mt-5 space-y-4">
          {draft.sections.map((section, index) => (
            <section key={`${section.heading}-${index}`}>
              {isEditing ? (
                <input
                  type="text"
                  className={`${EDIT_FIELD_CLASS} mb-2 p-2 text-[20px] font-semibold text-violet-200`}
                  style={{ ...EDIT_FIELD_STYLE, ...LABEL_FONT, WebkitTextFillColor: '#ddd6fe' }}
                  value={section.heading}
                  onChange={(e) => {
                    const sections = draft.sections.map((item, i) =>
                      i === index ? { ...item, heading: e.target.value } : item,
                    );
                    setDraft({ ...draft, sections });
                  }}
                />
              ) : (
                <h3 className="text-[20px] font-semibold text-violet-200" style={LABEL_FONT}>
                  {section.heading}
                  {section.minutes ? ` (${section.minutes} min)` : ''}
                </h3>
              )}
              {isEditing ? (
                <textarea
                  className={`${EDIT_FIELD_CLASS} min-h-[5rem]`}
                  style={EDIT_FIELD_STYLE}
                  value={section.activities.join('\n')}
                  onChange={(e) => {
                    const sections = draft.sections.map((item, i) =>
                      i === index
                        ? {
                            ...item,
                            activities: e.target.value.split('\n'),
                          }
                        : item,
                    );
                    setDraft({ ...draft, sections });
                  }}
                  rows={4}
                />
              ) : (
                <ul className="mt-1 list-disc space-y-1 pl-6 text-slate-200">
                  {section.activities.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
        <div className="mt-5">
          <span className="font-semibold">Assessment: </span>
          {isEditing ? (
            <textarea
              className={`${EDIT_FIELD_CLASS} mt-1 min-h-[3rem]`}
              style={EDIT_FIELD_STYLE}
              value={draft.assessment}
              onChange={(e) => setDraft({ ...draft, assessment: e.target.value })}
              rows={3}
            />
          ) : (
            <p className="mt-1 text-base leading-relaxed text-slate-200">{draft.assessment}</p>
          )}
        </div>
        <div className="mt-2">
          <span className="font-semibold">Differentiation: </span>
          {isEditing ? (
            <textarea
              className={`${EDIT_FIELD_CLASS} mt-1 min-h-[3rem]`}
              style={EDIT_FIELD_STYLE}
              value={draft.differentiation}
              onChange={(e) => setDraft({ ...draft, differentiation: e.target.value })}
              rows={3}
            />
          ) : (
            <p className="mt-1 text-base leading-relaxed text-slate-200">{draft.differentiation}</p>
          )}
        </div>
      </article>

      {toast ? (
        <div className="border-t border-slate-800 bg-slate-950 px-6 py-2 text-sm text-purple-200">{toast}</div>
      ) : null}
    </div>
  );
}

function StudioComposer({
  value,
  onChange,
  placeholder,
  files,
  onFiles,
  assistantHint,
  minHeight = 168,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
  files: string[];
  onFiles: (names: string[]) => void;
  assistantHint?: string;
  minHeight?: number;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { listening, toggle } = useDictation((text) => {
    onChange(value.trim() ? `${value.trim()} ${text}` : text);
  });
  const words = countWords(value);
  const overLimit = words > WORD_LIMIT;

  return (
    <div className="relative rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl" style={FONT}>
      <div className="relative">
        <button
          type="button"
          title="Voice Input"
          className={[
            'absolute left-3 top-3 z-10 cursor-pointer rounded-lg border border-slate-700 bg-slate-900 p-2 text-purple-400 shadow-md transition-colors hover:bg-purple-600/40 hover:text-white',
            listening ? 'border-purple-500 bg-purple-600/40 text-white' : '',
          ].join(' ')}
          aria-label={listening ? 'Stop dictation' : 'Dictate with microphone'}
          onClick={toggle}
        >
          <Mic className="h-4 w-4" />
        </button>
        <textarea
          className="w-full resize-y rounded-xl border border-slate-700/80 bg-slate-950 p-3 pl-14 text-base text-slate-100 placeholder:text-slate-500 placeholder:font-normal placeholder:italic placeholder:opacity-60 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
          style={{ ...FONT, minHeight }}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={5}
          spellCheck
        />
      </div>
      {files.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {files.map((name) => (
            <li
              key={name}
              className="rounded-full border border-slate-700 bg-slate-950 px-2.5 py-0.5 text-sm text-slate-200"
            >
              {name}
            </li>
          ))}
        </ul>
      ) : null}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="relative">
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-lg border border-purple-500/30 bg-slate-950 px-3 py-1.5 text-xs font-medium text-purple-300 transition-colors hover:bg-slate-800 hover:text-white"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <FilePlus className="h-3.5 w-3.5 text-purple-400" />
            <span>+ Add File</span>
            <ChevronDown className="h-3 w-3" />
          </button>
          {menuOpen ? (
            <div role="menu" className={`${MENU_PANEL_CLASS} absolute bottom-full left-0 mb-2 w-56`}>
              <StudioMenuItem
                icon={<FileText className="h-4 w-4 text-purple-400" />}
                onClick={() => {
                  setMenuOpen(false);
                  fileRef.current?.click();
                }}
              >
                Upload PDF or document
              </StudioMenuItem>
            </div>
          ) : null}
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.doc,.docx,.txt,.md,application/pdf"
            multiple
            className="hidden"
            onChange={(e) => {
              const names = Array.from(e.target.files ?? []).map((f) => f.name);
              if (names.length) onFiles([...files, ...names]);
              e.currentTarget.value = '';
            }}
          />
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <span className={overLimit ? 'text-xs font-medium text-rose-300' : 'text-xs text-slate-400'}>
            Total word limit: {words.toLocaleString()}/{WORD_LIMIT.toLocaleString()}
          </span>
          {assistantHint ? (
            <button
              type="button"
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-purple-500/30 bg-slate-900 px-3 py-1.5 text-sm font-medium text-purple-300 shadow-sm transition-colors hover:border-purple-500 hover:text-white"
              onClick={() => setAssistantOpen((v) => !v)}
            >
              <Sparkles className="h-3.5 w-3.5 text-purple-400" />
              <span>Prompt assistant</span>
            </button>
          ) : null}
        </div>
      </div>
      {assistantHint && assistantOpen ? (
        <p className="mt-3 rounded-lg border border-purple-500/30 bg-slate-950 px-3 py-2 text-sm text-slate-200">
          {assistantHint}
        </p>
      ) : null}
    </div>
  );
}

export default function LessonPlanGenerator() {
  const [gradeLevel, setGradeLevel] = useState('9th grade');
  const [topic, setTopic] = useState('');
  const [criteria, setCriteria] = useState('');
  const [standards, setStandards] = useState('');
  const [topicFiles, setTopicFiles] = useState<string[]>([]);
  const [criteriaFiles, setCriteriaFiles] = useState<string[]>([]);
  const [standardsFiles, setStandardsFiles] = useState<string[]>([]);
  const [history, setHistory] = useState<FormState[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<LessonPlanResponse | null>(null);
  const [lessonId, setLessonId] = useState<string | null>(null);
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

  const overLimit =
    countWords(topic) > WORD_LIMIT || countWords(criteria) > WORD_LIMIT || countWords(standards) > WORD_LIMIT;
  const canGenerate = topic.trim().length > 2 && Boolean(gradeLevel) && !overLimit && !busy;

  const generate = async () => {
    if (!canGenerate) return;
    setBusy(true);
    setError(null);
    const payload: LessonPlanPayload = {
      gradeLevel,
      topic: topic.trim(),
      additionalCriteria: criteria.trim() || undefined,
      standards: standards.trim() || undefined,
      attachments: [...topicFiles, ...criteriaFiles, ...standardsFiles],
    };
    try {
      const result = await api.generateLessonPlan(payload);
      const id = crypto.randomUUID();
      setLessonId(id);
      setPlan(result);
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    } catch {
      const id = crypto.randomUUID();
      setLessonId(id);
      setPlan(fallbackLessonPlan(payload));
      setError(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <DashboardLayout>
      <div
        className="lesson-plan-studio flex min-h-0 flex-1 flex-col overflow-hidden bg-[#0d131f] text-slate-100"
        style={{ ...FONT, colorScheme: 'dark' }}
      >
        <style>{STUDIO_CONTRAST_CSS}</style>
        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-5xl px-5 py-5 sm:px-8">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <p className="text-[18px] text-slate-300" style={FONT}>
                Generate a lesson plan based on a standard, topic, or objective.
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleReset}
                  title="Reset form"
                  aria-label="Reset form"
                  className="rounded-lg border border-slate-700 bg-slate-900 p-2 text-purple-300 transition-colors hover:border-purple-500 hover:text-white"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={handleShowExemplar}
                  className="rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-1.5 text-sm font-medium text-purple-300 transition-colors hover:border-purple-500 hover:text-white"
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
                  className="w-full appearance-none rounded-xl border border-white/15 bg-[#151c2b] px-4 py-3 pr-10 text-[18px] text-slate-100 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-500/40"
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
                onFiles={setTopicFiles}
                minHeight={200}
                assistantHint="Name the standard, topic, or learning objective. Paste the full wording if you want alignment to a specific framework (NGSS, CCSS, TEKS, and others)."
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
                onFiles={setCriteriaFiles}
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
                onFiles={setStandardsFiles}
                minHeight={140}
              />
            </div>

            {plan && lessonId ? <LessonPlanOutput key={lessonId} plan={plan} lessonId={lessonId} /> : null}
            {error ? (
              <p className="mb-6 rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-rose-200">{error}</p>
            ) : null}
          </div>
        </div>

        <div className="relative shrink-0 bg-[#0d131f] px-5 pb-5 pt-3 sm:px-8">
          <button
            type="button"
            className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-purple-300 shadow-lg transition-colors hover:border-purple-500 hover:text-white"
            aria-label="Scroll down"
            onClick={() => {
              const el = scrollRef.current;
              if (!el) return;
              el.scrollBy({ top: Math.round(el.clientHeight * 0.72), behavior: 'smooth' });
            }}
          >
            <ArrowDown className="h-5 w-5" />
          </button>
          <button
            ref={generateRef}
            type="button"
            disabled={!canGenerate}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 py-3.5 text-lg font-medium text-white hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
            style={{ ...FONT, fontSize: 20 }}
            onClick={() => void generate()}
          >
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
            Generate
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
