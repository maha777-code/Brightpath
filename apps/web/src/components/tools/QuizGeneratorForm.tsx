import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import {
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
import { VoiceListeningIndicator } from '@/components/VoiceListeningIndicator';
import {
  TOOL_ACCENT_BUTTON,
  TOOL_CARD,
  TOOL_ERROR,
  TOOL_FIELD,
  TOOL_GENERATE,
  TOOL_ICON_BUTTON,
  TOOL_LABEL,
  TOOL_MIC,
  TOOL_MUTED,
  TOOL_PANEL,
  TOOL_SECTION_TITLE,
  TOOL_SUBTITLE,
  TOOL_TEXTAREA,
  TOOL_TEXTAREA_SHORT,
  TOOL_TITLE,
} from '@/components/tools/toolTheme';
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
  const id = useId();
  return (
    <div className="flex flex-col justify-between">
      <label className={TOOL_LABEL} htmlFor={id}>
        {label}
        {required ? ' *' : ''}
      </label>
      <select id={id} className={TOOL_FIELD} value={value} onChange={(e) => onChange(e.target.value)}>
        {children}
      </select>
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
  headerAction,
  belowHeader,
  short,
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
  examples: string[];
  files: AttachedDocument[];
  onAddFiles: (files: FileList | null) => void;
  onRemoveFile: (id: string) => void;
  /** Renders the label as a section heading with this control on the right. */
  headerAction?: ReactNode;
  belowHeader?: ReactNode;
  short?: boolean;
}) {
  const id = useId();
  const words = sourceWords(value, files);
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
      {headerAction ? (
        <div className="mt-6 flex items-center justify-between gap-3">
          <h2 className={TOOL_SECTION_TITLE}>
            <label htmlFor={id}>
              {label}
              {required ? ' *' : ''}
            </label>
          </h2>
          {headerAction}
        </div>
      ) : (
        <label className={TOOL_LABEL} htmlFor={id}>
          {label}
          {required ? ' *' : ''}
        </label>
      )}
      {belowHeader}
      <div className="relative">
        <textarea
          id={id}
          className={`${short ? TOOL_TEXTAREA_SHORT : TOOL_TEXTAREA} pb-10`}
          aria-label={label}
          value={value}
          onChange={handleTextChange}
          onPaste={handlePaste}
          placeholder={examples.join('\n')}
          spellCheck
        />
        <button
          type="button"
          className={TOOL_MIC}
          aria-label={listening ? 'Stop recording' : 'Dictate with microphone'}
          aria-pressed={listening}
          title={listening ? 'Stop recording' : 'Start voice input'}
          onClick={toggle}
        >
          <Mic className={`h-4 w-4 ${listening ? 'text-violet-300' : ''}`} />
        </button>
      </div>
      {listening ? (
        <div className="mt-2">
          <VoiceListeningIndicator isListening onStopListening={toggle} />
        </div>
      ) : null}
      {files.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-2">
          {files.map((file) => (
            <li key={file.id} className="mv-pres-field inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs">
              {file.isProcessing ? (
                <Loader2 className={`${TOOL_MUTED} h-3.5 w-3.5 animate-spin`} />
              ) : (
                <FileText className={`${TOOL_MUTED} h-3.5 w-3.5`} />
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
                className={TOOL_ICON_BUTTON}
                aria-label={`Remove ${file.name}`}
                onClick={() => onRemoveFile(file.id)}
              >
                <X className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="mt-3 flex items-center justify-between gap-3 text-xs">
        <AddFileMenu accept={FILE_ACCEPT} onFiles={onAddFiles} />
        <span className={words > WORD_LIMIT ? 'text-rose-300' : TOOL_MUTED}>
          Total file word count: {words.toLocaleString()}/{WORD_LIMIT.toLocaleString()}
        </span>
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
  const [assessmentFiles, setAssessmentFiles] = useState<AttachedDocument[]>([]);
  const [standardsFiles, setStandardsFiles] = useState<AttachedDocument[]>([]);
  const [showExemplar, setShowExemplar] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [localFavorited, setLocalFavorited] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  const favoriteTouchedRef = useRef(false);

  useEffect(() => {
    if (favoritedProp !== undefined) return;
    void api
      .teacherTools()
      .then((res) => {
        if (!favoriteTouchedRef.current) setLocalFavorited(res.favoriteIds.includes('quiz-generator'));
      })
      .catch(() => undefined);
  }, [favoritedProp]);

  const favorited = favoritedProp ?? localFavorited;

  const toggleFavorite = () => {
    if (onToggleFavorite) {
      onToggleFavorite();
      return;
    }
    favoriteTouchedRef.current = true;
    const next = !localFavorited;
    setLocalFavorited(next);
    void api
      .toggleTeacherToolFavorite('quiz-generator')
      .then((res) => {
        if (res.toolId === 'quiz-generator') setLocalFavorited(res.favorited);
      })
      .catch(() => setLocalFavorited(!next));
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

  const beforeExemplarRef = useRef<{
    gradeLevel: string;
    numberOfQuestions: number;
    optionsPerQuestion: number;
    topicDescription: string;
  } | null>(null);

  const toggleExemplar = () => {
    if (showExemplar) {
      const previous = beforeExemplarRef.current;
      setShowExemplar(false);
      beforeExemplarRef.current = null;
      if (!previous) return;
      setGradeLevel(previous.gradeLevel);
      setNumberOfQuestions(previous.numberOfQuestions);
      setOptionsPerQuestion(previous.optionsPerQuestion);
      setTopicDescription(previous.topicDescription);
      return;
    }
    beforeExemplarRef.current = { gradeLevel, numberOfQuestions, optionsPerQuestion, topicDescription };
    setShowExemplar(true);
    setGradeLevel('9th grade');
    setNumberOfQuestions(5);
    setOptionsPerQuestion(4);
    setTopicDescription(EXEMPLAR_TOPIC);
  };

  const assistant = (
    <button
      type="button"
      className={TOOL_ACCENT_BUTTON}
      onClick={() => setAssistantOpen((open) => !open)}
      aria-expanded={assistantOpen}
    >
      <Sparkles className="h-3.5 w-3.5" />
      Prompt assistant
    </button>
  );

  return (
    <div className={TOOL_CARD}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className={TOOL_TITLE}>
            Multiple Choice Quiz / Assessment Generator
            {onToggleFavorite || favoritedProp === undefined ? (
              <button
                type="button"
                className={TOOL_ICON_BUTTON}
                aria-label={favorited ? 'Remove from favorites' : 'Add to favorites'}
                aria-pressed={Boolean(favorited)}
                onClick={toggleFavorite}
              >
                <Star className={`h-5 w-5 ${favorited ? 'fill-amber-300 text-amber-300' : TOOL_MUTED}`} />
              </button>
            ) : null}
          </h1>
          <p className={TOOL_SUBTITLE}>
            Generate a multiple choice assessment, quiz, or test based on any topic, standard(s), or criteria.
          </p>
        </div>
        <button
          type="button"
          className={`${TOOL_ACCENT_BUTTON} shrink-0`}
          aria-pressed={showExemplar}
          onClick={toggleExemplar}
        >
          {showExemplar ? 'Hide exemplar' : 'Show exemplar'}
        </button>
      </div>

      <div className="mt-1 grid gap-4 md:grid-cols-3">
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
      </div>

      <RichTextArea
        label="Topic, Standard, Text, or Description of the Assessment (be specific):"
        required
        value={topicDescription}
        onChange={setTopicDescription}
        examples={TOPIC_EXAMPLES}
        files={assessmentFiles}
        onAddFiles={(files) => void addFiles(setAssessmentFiles, files)}
        onRemoveFile={(id) => setAssessmentFiles((prev) => prev.filter((file) => file.id !== id))}
      />

      <RichTextArea
        label="Standards Set to Align to:"
        value={standardsAlignment}
        onChange={setStandardsAlignment}
        examples={STANDARDS_EXAMPLES}
        files={standardsFiles}
        onAddFiles={(files) => void addFiles(setStandardsFiles, files)}
        onRemoveFile={(id) => setStandardsFiles((prev) => prev.filter((file) => file.id !== id))}
        short
        headerAction={assistant}
        belowHeader={
          assistantOpen ? (
            <div className={`${TOOL_PANEL} ${TOOL_MUTED} mt-2 text-sm leading-relaxed`}>
              Pick an example, or replace it with a standard, a passage, or a vocabulary list.
              An uploaded file is read in full and every question is written from that source.
            </div>
          ) : null
        }
      />

      {fileError ? <p className={TOOL_ERROR}>{fileError}</p> : null}

      <button
        type="button"
        disabled={busy || !hasSource || overLimit || filesProcessing}
        className={TOOL_GENERATE}
        onClick={() => onGenerate(payload)}
      >
        {busy || filesProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {busy ? 'Generating Quiz...' : filesProcessing ? 'Reading file...' : 'Generate Quiz'}
      </button>
    </div>
  );
}
