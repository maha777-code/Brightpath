import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import {
  ChevronDown,
  FileText,
  Loader2,
  Mic,
  Sparkles,
  Star,
  X,
} from 'lucide-react';
import type { QuizGeneratorPayload } from '@brightpath/shared';
import { api } from '@/lib/api';
import { AddFileMenu } from '@/components/tools/AddFileMenu';
import { CYBER_FONT_STYLE } from '@/lib/theme';
import { VoiceListeningIndicator } from '@/components/VoiceListeningIndicator';
import {
  documentContext,
  documentImages,
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

const QUESTION_COUNTS = [5, 10, 15, 20] as const;
const OPTION_COUNTS = [3, 4, 5, 6, 7] as const;
const WORD_LIMIT = 75_000;
const FILE_ACCEPT = '.pdf,.doc,.docx,.txt,.md,.png,.jpg,.jpeg,.webp,.gif,application/pdf,image/*';

const TOPIC_EXAMPLES = [
  'Diagnostic assessment about the following standards...',
  'Large block of text that is an excerpt from the Great Gatsby or other text',
  'Mitosis',
  'Vocabulary quiz for these words: Chromosomes, Cytokinesis, Metaphase, Centromere, Spindle Fibers',
];

const STANDARDS_EXAMPLES = ['Any standards worldwide (CCSS, TEKS, Ontario, Florida)'];

const EXEMPLAR_TOPIC = 'Data analysis in spreadsheets and Python DataFrames';

const TOOL_TEXTAREA_STYLE: CSSProperties = {
  fontFamily: CYBER_FONT_STYLE.fontFamily,
  WebkitTextFillColor: '#ecfeff',
};

function countWords(value: string): number {
  return value.trim() ? value.trim().split(/\s+/).length : 0;
}

function sourceWords(value: string, files: AttachedDocument[]): number {
  const fileWords = files.reduce((sum, file) => sum + countWords(file.extractedText), 0);
  return countWords(value) + fileWords;
}

function sanitizePastedText(text: string): string {
  return text
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '')
    .normalize('NFC');
}

function sectionContext(label: string, files: AttachedDocument[]): string {
  const body = documentContext(files);
  return body ? `${label}\n${body}` : '';
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

function FieldLabel({ children, required }: { children: ReactNode; required?: boolean }) {
  return (
    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-300">
      {children}
      {required ? <span className="ml-0.5 text-rose-500">*</span> : null}
    </label>
  );
}

function QuizMicButton({ listening, onClick }: { listening: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      className={
        listening
          ? 'relative inline-flex h-11 w-11 shrink-0 cursor-pointer appearance-none items-center justify-center rounded-full border border-rose-200/80 bg-gradient-to-br from-rose-400 via-rose-500 to-fuchsia-600 text-white shadow-[0_8px_24px_rgba(244,63,94,0.5)] ring-4 ring-rose-400/30'
          : 'relative inline-flex h-11 w-11 shrink-0 cursor-pointer appearance-none items-center justify-center rounded-full border border-cyan-100/50 bg-gradient-to-br from-cyan-300 via-sky-500 to-indigo-600 text-white shadow-[0_8px_22px_rgba(34,211,238,0.42)] ring-4 ring-cyan-400/20 transition-transform duration-200 hover:scale-105 hover:shadow-[0_10px_28px_rgba(34,211,238,0.6)]'
      }
      aria-label={listening ? 'Stop recording' : 'Dictate with microphone'}
      aria-pressed={listening}
      title={listening ? 'Stop recording' : 'Start voice input'}
      onClick={onClick}
    >
      <span className="pointer-events-none absolute inset-[3px] rounded-full bg-gradient-to-b from-white/40 to-transparent" />
      {listening ? (
        <span className="pointer-events-none absolute -inset-1 animate-ping rounded-full bg-rose-400/30" />
      ) : null}
      <Mic className={`relative h-[18px] w-[18px] drop-shadow-sm ${listening ? 'animate-pulse' : ''}`} strokeWidth={2.4} />
    </button>
  );
}

function ExampleGlyph() {
  return (
    <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-cyan-400/30 bg-cyan-500/10 text-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.2)]">
      <Sparkles className="h-3 w-3" strokeWidth={2.25} />
    </span>
  );
}

function ExampleHints({
  examples,
  onPick,
}: {
  examples: string[];
  onPick: (value: string) => void;
}) {
  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col gap-3.5 overflow-hidden">
      {examples.map((example, index) => (
        <button
          key={example}
          type="button"
          className={`pointer-events-auto flex cursor-pointer appearance-none items-start gap-2.5 border-0 bg-transparent p-0 text-left text-sm leading-relaxed transition-colors hover:text-slate-200 ${
            index === 0 ? 'text-slate-300' : 'text-slate-500'
          }`}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onPick(example)}
        >
          {index === 0 ? <ExampleGlyph /> : <span className="inline-block h-5 w-5 shrink-0" aria-hidden />}
          <span>{example}</span>
        </button>
      ))}
    </div>
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
  children: ReactNode;
}) {
  return (
    <div>
      <FieldLabel required={required}>{label}</FieldLabel>
      <div className="relative">
        <select
          className="w-full cursor-pointer appearance-none rounded-xl border border-slate-800 bg-[#0b101d] px-3.5 py-2.5 pr-9 text-sm text-white shadow-none outline-none transition-all hover:border-slate-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50"
          style={{
            fontFamily: CYBER_FONT_STYLE.fontFamily,
            backgroundColor: '#0b101d',
            color: '#fff',
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
  examples,
  files,
  onAddFiles,
  onRemoveFile,
  promptAssistant,
  minHeight = 168,
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
  examples: string[];
  files: AttachedDocument[];
  onAddFiles: (files: FileList | null) => void;
  onRemoveFile: (id: string) => void;
  promptAssistant?: ReactNode;
  minHeight?: number;
}) {
  const words = sourceWords(value, files);
  const { listening, toggle } = useDictation((text) => {
    const next = value.trim() ? `${value.trim()} ${text}` : text;
    onChange(sanitizePastedText(next));
  });
  const showExamples = !value.trim();

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
      <div className="space-y-3 rounded-xl border border-slate-800 bg-[#0b101d] p-3 transition-all hover:border-slate-700 focus-within:border-cyan-500/60 focus-within:ring-1 focus-within:ring-cyan-500/50">
        <div className="flex items-start gap-3">
          <div className="relative flex-1" style={{ minHeight }}>
            <textarea
              className="w-full resize-none bg-transparent p-0 text-sm leading-relaxed text-white focus:outline-none"
              style={{ ...TOOL_TEXTAREA_STYLE, minHeight }}
              aria-label={label}
              value={value}
              onChange={handleTextChange}
              onPaste={handlePaste}
              spellCheck
            />
            {showExamples ? <ExampleHints examples={examples} onPick={onChange} /> : null}
          </div>
          <QuizMicButton listening={listening} onClick={toggle} />
        </div>
        {listening ? <VoiceListeningIndicator isListening onStopListening={toggle} /> : null}
        {files.length > 0 ? (
          <ul className="flex flex-wrap gap-1.5 border-t border-slate-800 pt-2">
            {files.map((file) => (
              <li
                key={file.id}
                className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/25 bg-cyan-950/40 px-2.5 py-1 text-xs font-medium text-cyan-100"
              >
                {file.isProcessing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-300" />
                ) : (
                  <FileText className="h-3.5 w-3.5 text-cyan-300" />
                )}
                <span>
                  {file.name}
                  {file.isProcessing
                    ? ' · reading'
                    : file.extractedText.trim()
                      ? ` · ${countWords(file.extractedText).toLocaleString()} words`
                      : ''}
                </span>
                <button
                  type="button"
                  className="cursor-pointer appearance-none rounded-full border-0 bg-transparent p-0.5 text-cyan-200 hover:bg-cyan-500/20 hover:text-white"
                  aria-label={`Remove ${file.name}`}
                  onClick={() => onRemoveFile(file.id)}
                >
                  <X className="h-3 w-3" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <div className="flex items-center justify-between gap-3 border-t border-slate-800/80 pt-2">
          <AddFileMenu accept={FILE_ACCEPT} onFiles={onAddFiles} />
          <p className={words > WORD_LIMIT ? 'text-[11px] font-medium text-rose-400' : 'text-[11px] font-medium text-slate-500'}>
            Total file word count: {words.toLocaleString()}/{WORD_LIMIT.toLocaleString()}
          </p>
        </div>
      </div>
      {promptAssistant}
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
  const [assessmentFiles, setAssessmentFiles] = useState<AttachedDocument[]>([]);
  const [standardsFiles, setStandardsFiles] = useState<AttachedDocument[]>([]);
  const [showExemplar, setShowExemplar] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [localFavorited, setLocalFavorited] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

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

  const topicWords = sourceWords(topicDescription, assessmentFiles);
  const standardsWords = sourceWords(standardsAlignment, standardsFiles);
  const overLimit = topicWords > WORD_LIMIT || standardsWords > WORD_LIMIT;
  const filesProcessing = [...assessmentFiles, ...standardsFiles].some((file) => file.isProcessing);

  const payload: QuizGeneratorPayload = useMemo(() => {
    const attachedDocumentContext = [
      sectionContext('ASSESSMENT SOURCE — base every question on this file', assessmentFiles),
      sectionContext('STANDARDS FILE — align the quiz to this document', standardsFiles),
    ]
      .filter(Boolean)
      .join('\n\n');
    const imageFiles = documentImages([...assessmentFiles, ...standardsFiles]);
    return {
      gradeLevel,
      numberOfQuestions,
      optionsPerQuestion,
      topicDescription: topicDescription.trim(),
      assessmentDescription: topicDescription.trim(),
      standardsAlignment: standardsAlignment.trim() || undefined,
      attachments: [...assessmentFiles, ...standardsFiles].map((file) => file.name),
      attachedDocumentContext: attachedDocumentContext || undefined,
      imageFiles: imageFiles.length ? imageFiles : undefined,
    };
  }, [
    gradeLevel,
    numberOfQuestions,
    optionsPerQuestion,
    topicDescription,
    standardsAlignment,
    assessmentFiles,
    standardsFiles,
  ]);

  const hasSource = Boolean(
    payload.topicDescription?.trim() || payload.attachedDocumentContext?.trim() || payload.imageFiles?.length,
  );

  useEffect(() => {
    onPayloadChange?.(hasSource ? payload : null);
  }, [payload, onPayloadChange, hasSource]);

  const addFiles = async (
    setter: typeof setAssessmentFiles,
    files: FileList | null,
  ) => {
    if (!files?.length) return;
    for (const file of Array.from(files)) {
      const id = `file_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      setter((prev) => [...prev, { id, name: file.name, extractedText: '', isProcessing: true }]);
      try {
        const extracted = await extractDocumentText(file);
        setter((prev) =>
          prev.map((item) =>
            item.id === id
              ? {
                  ...item,
                  extractedText: extracted.text,
                  imageDataUrl: extracted.imageDataUrl,
                  isProcessing: false,
                }
              : item,
          ),
        );
        setFileError(null);
      } catch (err) {
        setter((prev) => prev.filter((item) => item.id !== id));
        setFileError(err instanceof Error ? err.message : `Could not read ${file.name}`);
      }
    }
  };

  const loadExemplar = () => {
    setShowExemplar(true);
    setGradeLevel('9th grade');
    setNumberOfQuestions(5);
    setOptionsPerQuestion(4);
    setTopicDescription(EXEMPLAR_TOPIC);
  };

  const assistant = (
    <div className="flex justify-end pt-2">
      <button
        type="button"
        className="inline-flex cursor-pointer appearance-none items-center gap-1.5 border-0 bg-transparent p-0 text-xs font-semibold text-slate-400 transition-colors hover:text-cyan-300"
        onClick={() => setAssistantOpen((open) => !open)}
        aria-expanded={assistantOpen}
      >
        <Sparkles className="h-3.5 w-3.5 text-cyan-300" />
        Prompt assistant
      </button>
    </div>
  );

  return (
    <div className="ms-quiz-form space-y-5 font-sans text-slate-100">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black tracking-tight text-white">
              Multiple Choice Quiz / Assessment
            </h2>
            {onToggleFavorite || favoritedProp === undefined ? (
              <button
                type="button"
                className={`cursor-pointer appearance-none border-0 bg-transparent p-0 ${favorited ? 'text-amber-400' : 'text-slate-600 hover:text-amber-400'}`}
                aria-label={favorited ? 'Remove from favorites' : 'Add to favorites'}
                aria-pressed={Boolean(favorited)}
                onClick={toggleFavorite}
              >
                <Star className="h-5 w-5" fill={favorited ? 'currentColor' : 'none'} />
              </button>
            ) : null}
          </div>
          <p className="mt-1 max-w-2xl text-xs font-medium leading-relaxed text-slate-400">
            Generate a multiple choice assessment, quiz, or test based on any topic, standard(s), or
            criteria.
          </p>
        </div>
        <button
          type="button"
          className="shrink-0 cursor-pointer appearance-none rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 text-xs font-bold text-cyan-400 transition-all hover:bg-cyan-500/20"
          onClick={loadExemplar}
        >
          {showExemplar ? 'Exemplar loaded' : 'Show exemplar'}
        </button>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SelectField label="Grade level" required value={gradeLevel} onChange={setGradeLevel}>
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
      </div>

      <div className="space-y-5">
        <RichTextArea
          label="Topic, Standard, Text, or Description of the Assessment (be specific):"
          required
          value={topicDescription}
          onChange={setTopicDescription}
          examples={TOPIC_EXAMPLES}
          files={assessmentFiles}
          minHeight={220}
          onAddFiles={(files) => void addFiles(setAssessmentFiles, files)}
          onRemoveFile={(id) => setAssessmentFiles((prev) => prev.filter((file) => file.id !== id))}
          promptAssistant={
            <>
              {assistant}
              {assistantOpen ? (
                <div className="mt-2 rounded-xl border border-slate-800 bg-[#0b101d] px-4 py-3 text-sm leading-relaxed text-slate-300">
                  Pick an example, or replace it with a standard, a passage, or a vocabulary list.
                  An uploaded file is read in full and every question is written from that source.
                </div>
              ) : null}
            </>
          }
        />

        <RichTextArea
          label="Standards Set to Align to:"
          value={standardsAlignment}
          onChange={setStandardsAlignment}
          examples={STANDARDS_EXAMPLES}
          files={standardsFiles}
          onAddFiles={(files) => void addFiles(setStandardsFiles, files)}
          onRemoveFile={(id) => setStandardsFiles((prev) => prev.filter((file) => file.id !== id))}
          minHeight={88}
        />
      </div>

      {fileError ? (
        <p className="rounded-xl border border-rose-500/40 bg-rose-950/50 px-4 py-3 text-sm text-rose-200">
          {fileError}
        </p>
      ) : null}

      <button
        type="button"
        disabled={busy || !hasSource || overLimit || filesProcessing}
        className="inline-flex w-full cursor-pointer appearance-none items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 py-3.5 text-sm font-black uppercase tracking-wider text-slate-950 shadow-lg shadow-cyan-500/20 transition-all hover:from-cyan-400 hover:to-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
        onClick={() => onGenerate(payload)}
      >
        {busy || filesProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {busy ? 'Generating Quiz...' : filesProcessing ? 'Reading file...' : 'Generate Quiz'}
      </button>
    </div>
  );
}
