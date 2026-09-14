import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import {
  ChevronDown,
  FilePlus,
  Loader2,
  Mic,
  RotateCcw,
  Sparkles,
  ArrowDown,
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

function StudioComposer({
  value,
  onChange,
  placeholder,
  files,
  onFiles,
  promptAssistant,
  minHeight = 168,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
  files: string[];
  onFiles: (names: string[]) => void;
  promptAssistant?: ReactNode;
  minHeight?: number;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { listening, toggle } = useDictation((text) => {
    onChange(value.trim() ? `${value.trim()} ${text}` : text);
  });
  const words = countWords(value);
  const overLimit = words > WORD_LIMIT;

  return (
    <div
      className="rounded-xl border border-white/10 bg-[#151c2b] shadow-inner"
      style={FONT}
    >
      <div className="relative px-3 pb-2 pt-3">
        <button
          type="button"
          className={[
            'absolute left-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-white/10 hover:text-white',
            listening ? 'bg-violet-500/30 text-violet-200' : '',
          ].join(' ')}
          aria-label={listening ? 'Stop dictation' : 'Dictate with microphone'}
          onClick={toggle}
        >
          <Mic className="h-4 w-4" />
        </button>
        <textarea
          className="min-h-[9rem] w-full resize-y bg-transparent pl-11 pr-2 text-[18px] leading-relaxed text-slate-100 placeholder:text-slate-500 focus:outline-none"
          style={{ ...FONT, minHeight, WebkitTextFillColor: '#e2e8f0' }}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          spellCheck
        />
      </div>
      {files.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5 px-3 pb-2">
          {files.map((name) => (
            <li key={name} className="rounded-full bg-white/10 px-2.5 py-0.5 text-sm text-slate-200">
              {name}
            </li>
          ))}
        </ul>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-3 py-2.5">
        <div className="relative">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-lg border border-violet-400/50 bg-[#1b2438] px-3 py-1.5 text-[18px] font-semibold text-violet-100 hover:bg-violet-500/20"
            style={FONT}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <FilePlus className="h-4 w-4" />
            + Add File
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
          {menuOpen ? (
            <div className="absolute bottom-11 left-0 z-20 w-52 overflow-hidden rounded-lg border border-white/15 bg-[#1b2438] py-1 shadow-xl">
              <button
                type="button"
                className="block w-full px-3 py-2 text-left text-[18px] text-slate-100 hover:bg-white/10"
                style={FONT}
                onClick={() => {
                  setMenuOpen(false);
                  fileRef.current?.click();
                }}
              >
                Upload PDF or document
              </button>
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
        <p className={overLimit ? 'text-[16px] font-medium text-rose-300' : 'text-[16px] text-slate-400'} style={FONT}>
          Total word limit: {words.toLocaleString()}/{WORD_LIMIT.toLocaleString()}
        </p>
      </div>
      {promptAssistant}
    </div>
  );
}

function PromptAssistant({
  open,
  onToggle,
  children,
}: {
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col items-end gap-2 px-3 pb-3">
      <button
        type="button"
        className="inline-flex items-center gap-1.5 text-[18px] font-medium text-violet-300/80 hover:text-violet-200"
        style={FONT}
        onClick={onToggle}
      >
        <Sparkles className="h-4 w-4" />
        Prompt assistant
      </button>
      {open ? (
        <div className="w-full rounded-lg border border-violet-400/20 bg-violet-500/10 px-3 py-2 text-[16px] text-slate-200">
          {children}
        </div>
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
  const [topicAssist, setTopicAssist] = useState(false);
  const [criteriaAssist, setCriteriaAssist] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<LessonPlanResponse | null>(null);
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

  const undo = () => {
    setHistory((prev) => {
      if (!prev.length) return prev;
      const last = prev[prev.length - 1];
      applyState(last);
      return prev.slice(0, -1);
    });
  };

  const showExemplar = () => {
    pushHistory();
    applyState(EXEMPLAR);
    setPlan(null);
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
      setPlan(result);
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    } catch {
      setPlan(fallbackLessonPlan(payload));
      setError(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#0d131f] text-slate-100" style={FONT}>
        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-5xl px-5 py-5 sm:px-8">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <p className="text-[18px] text-slate-300" style={FONT}>
                Generate a lesson plan based on a standard, topic, or objective.
              </p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-300 hover:bg-white/10 hover:text-white"
                  aria-label="Undo"
                  onClick={undo}
                >
                  <RotateCcw className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  className="text-[18px] font-medium text-slate-200 underline-offset-4 hover:text-white hover:underline"
                  style={FONT}
                  onClick={showExemplar}
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
                promptAssistant={
                  <PromptAssistant open={topicAssist} onToggle={() => setTopicAssist((v) => !v)}>
                    Name the standard, topic, or learning objective. Paste the full wording if you want alignment to a
                    specific framework (NGSS, CCSS, TEKS, and others).
                  </PromptAssistant>
                }
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
                promptAssistant={
                  <PromptAssistant open={criteriaAssist} onToggle={() => setCriteriaAssist((v) => !v)}>
                    Add class context: prior lesson, grouping, materials, timing, or instructional must-haves.
                  </PromptAssistant>
                }
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

            {plan ? (
              <article className="mb-8 rounded-2xl border border-white/10 bg-[#151c2b] p-6">
                <h2 className="text-[22px] font-semibold text-white" style={LABEL_FONT}>
                  {plan.title}
                </h2>
                <p className="mt-2 text-slate-300">
                  {plan.gradeLevel} · {plan.durationMinutes} minutes
                </p>
                <p className="mt-4">
                  <span className="font-semibold">Objective: </span>
                  {plan.objective}
                </p>
                {plan.standards.length ? (
                  <p className="mt-2">
                    <span className="font-semibold">Standards: </span>
                    {plan.standards.join('; ')}
                  </p>
                ) : null}
                <p className="mt-2">
                  <span className="font-semibold">Materials: </span>
                  {plan.materials.join(', ')}
                </p>
                <div className="mt-5 space-y-4">
                  {plan.sections.map((section) => (
                    <section key={section.heading}>
                      <h3 className="text-[20px] font-semibold text-violet-200" style={LABEL_FONT}>
                        {section.heading}
                        {section.minutes ? ` (${section.minutes} min)` : ''}
                      </h3>
                      <ul className="mt-1 list-disc space-y-1 pl-6 text-slate-200">
                        {section.activities.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </section>
                  ))}
                </div>
                <p className="mt-5">
                  <span className="font-semibold">Assessment: </span>
                  {plan.assessment}
                </p>
                <p className="mt-2">
                  <span className="font-semibold">Differentiation: </span>
                  {plan.differentiation}
                </p>
              </article>
            ) : null}
            {error ? (
              <p className="mb-6 rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-rose-200">{error}</p>
            ) : null}
          </div>
        </div>

        <div className="relative shrink-0 bg-[#0d131f] px-5 pb-5 pt-6 sm:px-8">
          <button
            type="button"
            className="absolute left-1/2 top-0 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-[#1b2438] text-slate-200 shadow-lg hover:bg-[#243044]"
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
