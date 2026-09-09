import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import {
  ChevronDown,
  FilePlus,
  Lightbulb,
  Loader2,
  Mic,
  Sparkles,
  Star,
} from 'lucide-react';
import type { QuizGeneratorPayload } from '@brightpath/shared';
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

const QUESTION_COUNTS = [5, 10, 15, 20] as const;
const OPTION_COUNTS = [3, 4, 5, 6, 7] as const;
const WORD_LIMIT = 75_000;

const EXEMPLAR_TOPIC = 'Data analysis in spreadsheets and Python DataFrames';
const TOPIC_PLACEHOLDER = 'Enter topic, standard, or source text...';
const STANDARDS_PLACEHOLDER = 'Any standards worldwide (CCSS, TEKS, Ontario, Florida)';

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

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="mb-1.5 block text-sm font-semibold text-slate-800">
      {children}
      {required ? <span className="ml-0.5 text-rose-500">*</span> : null}
    </label>
  );
}

function SelectField({
  label,
  required,
  value,
  onChange,
  children,
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <FieldLabel required={required}>{label}</FieldLabel>
      <div className="relative">
        <select
          className="w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 py-2.5 pr-9 text-sm text-slate-800 shadow-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200"
          style={{
            fontFamily:
              "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          }}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      </div>
    </div>
  );
}

function RichTextArea({
  label,
  required,
  value,
  onChange,
  placeholder,
  attachments,
  onAddFiles,
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  attachments: string[];
  onAddFiles: (files: FileList | null) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const words = countWords(value);
  const { listening, toggle } = useDictation((text) => {
    const next = value.trim() ? `${value.trim()} ${text}` : text;
    onChange(sanitizePastedText(next));
  });

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(sanitizePastedText(e.target.value));
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    const pasted = sanitizePastedText(e.clipboardData.getData('text/plain'));
    const el = e.currentTarget;
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    onChange(sanitizePastedText(value.slice(0, start) + pasted + value.slice(end)));
  };

  return (
    <div>
      <FieldLabel required={required}>{label}</FieldLabel>
      <div className="overflow-hidden rounded-lg border border-slate-700 bg-slate-900 shadow-sm focus-within:ring-2 focus-within:ring-purple-500">
        <div className="relative">
          <textarea
            className="h-32 w-full resize-y rounded-lg border border-slate-700 bg-[#0f172a] p-3 pr-11 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            style={TOOL_TEXTAREA_STYLE}
            placeholder={placeholder}
            value={value}
            onChange={handleTextChange}
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
        {attachments.length > 0 && (
          <ul className="flex flex-wrap gap-1.5 border-t border-slate-700 px-3 py-2">
            {attachments.map((name) => (
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
                onAddFiles(e.target.files);
                e.currentTarget.value = '';
              }}
            />
          </div>
          <p className={words > WORD_LIMIT ? 'text-xs font-medium text-rose-400' : 'text-xs text-slate-400'}>
            Total word limit: {words.toLocaleString()}/{WORD_LIMIT.toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}

export function QuizGeneratorForm({
  favorited: favoritedProp,
  onToggleFavorite,
  busy,
  onGenerate,
  onPayloadChange,
}: {
  favorited?: boolean;
  onToggleFavorite?: () => void;
  busy?: boolean;
  onGenerate: (payload: QuizGeneratorPayload) => void;
  onPayloadChange?: (payload: QuizGeneratorPayload | null) => void;
}) {
  const [gradeLevel, setGradeLevel] = useState('9th grade');
  const [numberOfQuestions, setNumberOfQuestions] = useState(5);
  const [optionsPerQuestion, setOptionsPerQuestion] = useState(4);
  const [topicDescription, setTopicDescription] = useState('');
  const [standardsAlignment, setStandardsAlignment] = useState('');
  const [assessmentFiles, setAssessmentFiles] = useState<string[]>([]);
  const [standardsFiles, setStandardsFiles] = useState<string[]>([]);
  const [showExemplar, setShowExemplar] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [localFavorited, setLocalFavorited] = useState(false);

  useEffect(() => {
    if (favoritedProp !== undefined) return;
    void api
      .teacherTools()
      .then((res) => setLocalFavorited(res.favoriteIds.includes('quiz-generator')))
      .catch(() => undefined);
  }, [favoritedProp]);

  const favorited = favoritedProp ?? localFavorited;

  const toggleFavorite = () => {
    if (onToggleFavorite) {
      onToggleFavorite();
      return;
    }
    setLocalFavorited((v) => !v);
    void api.toggleTeacherToolFavorite('quiz-generator').then((res) => {
      setLocalFavorited(res.favorited);
    });
  };

  const overLimit =
    countWords(topicDescription) > WORD_LIMIT || countWords(standardsAlignment) > WORD_LIMIT;

  const payload: QuizGeneratorPayload = useMemo(
    () => ({
      gradeLevel,
      numberOfQuestions,
      optionsPerQuestion,
      topicDescription: topicDescription.trim(),
      assessmentDescription: topicDescription.trim(),
      standardsAlignment: standardsAlignment.trim() || undefined,
      attachments: [...assessmentFiles, ...standardsFiles],
    }),
    [
      gradeLevel,
      numberOfQuestions,
      optionsPerQuestion,
      topicDescription,
      standardsAlignment,
      assessmentFiles,
      standardsFiles,
    ],
  );

  useEffect(() => {
    onPayloadChange?.(payload.topicDescription ? payload : null);
  }, [payload, onPayloadChange]);

  const addFiles = (setter: typeof setAssessmentFiles, files: FileList | null) => {
    if (!files?.length) return;
    setter((prev) => {
      const next = [...prev];
      for (const file of Array.from(files)) {
        if (!next.includes(file.name)) next.push(file.name);
      }
      return next;
    });
  };

  const loadExemplar = () => {
    setShowExemplar(true);
    setGradeLevel('9th grade');
    setNumberOfQuestions(5);
    setOptionsPerQuestion(4);
    setTopicDescription(EXEMPLAR_TOPIC);
  };

  return (
    <div className="ms-quiz-form font-sans text-slate-800">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
              Multiple Choice Quiz / Assessment
            </h2>
            {onToggleFavorite || favoritedProp === undefined ? (
              <button
                type="button"
                className={favorited ? 'text-amber-400' : 'text-slate-300 hover:text-amber-400'}
                aria-label={favorited ? 'Remove from favorites' : 'Add to favorites'}
                aria-pressed={Boolean(favorited)}
                onClick={toggleFavorite}
              >
                <Star className="h-5 w-5" fill={favorited ? 'currentColor' : 'none'} />
              </button>
            ) : null}
          </div>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Generate a multiple choice assessment, quiz, or test based on any topic, standard(s), or
            criteria.
          </p>
        </div>
        <button
          type="button"
          className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-violet-700 shadow-sm hover:bg-violet-50"
          onClick={loadExemplar}
        >
          {showExemplar ? 'Exemplar loaded' : 'Show exemplar'}
        </button>
      </header>

      <div className="mt-6 space-y-4">
        <SelectField label="Grade level:" required value={gradeLevel} onChange={setGradeLevel}>
          {GRADE_LEVELS.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </SelectField>

        <SelectField
          label="Number of Questions:"
          required
          value={String(numberOfQuestions)}
          onChange={(v) => setNumberOfQuestions(Number(v))}
        >
          {QUESTION_COUNTS.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </SelectField>

        <SelectField
          label="Number of Options per Question:"
          required
          value={String(optionsPerQuestion)}
          onChange={(v) => setOptionsPerQuestion(Number(v))}
        >
          {OPTION_COUNTS.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </SelectField>

        <RichTextArea
          label="Topic, Standard, Text, or Description of the Assessment (be specific):"
          required
          value={topicDescription}
          onChange={setTopicDescription}
          placeholder={TOPIC_PLACEHOLDER}
          attachments={assessmentFiles}
          onAddFiles={(files) => addFiles(setAssessmentFiles, files)}
        />

        <RichTextArea
          label="Standards Set to Align to:"
          value={standardsAlignment}
          onChange={setStandardsAlignment}
          placeholder={STANDARDS_PLACEHOLDER}
          attachments={standardsFiles}
          onAddFiles={(files) => addFiles(setStandardsFiles, files)}
        />
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
            Be specific: name the standard, paste a short source excerpt, or list vocabulary. Say
            whether this is diagnostic, formative, or a summative test.
          </div>
        )}
        <button
          type="button"
          disabled={busy || !payload.topicDescription || overLimit}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 py-3 font-medium text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
          onClick={() => onGenerate(payload)}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Generate
        </button>
      </div>
    </div>
  );
}
