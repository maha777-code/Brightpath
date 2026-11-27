import { useCallback, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Copy, FileDown, HelpCircle, Loader2, RefreshCw } from 'lucide-react';
import type { QuizGeneratorPayload, QuizGeneratorResponse } from '@brightpath/shared';
import { api } from '@/lib/api';
import { watermarkFooterHtml } from '@/lib/exportWatermark';
import { QuizGeneratorForm } from '@/components/tools/QuizGeneratorForm';
import { ToolErrorRetry } from '@/components/tools/ToolErrorRetry';
import { QuizEditor, toEditableQuestions, toQuizResponse } from '@/components/tools/QuizEditor';
import {
  TOOL_BREADCRUMB,
  TOOL_BREADCRUMB_LINK,
  TOOL_CARD,
  TOOL_MUTED,
  TOOL_PAGE,
  TOOL_PANEL,
  TOOL_SECONDARY,
  TOOL_SECTION_TITLE,
} from '@/components/tools/toolTheme';

function optionLetterFromIndex(index: number): string {
  return String.fromCharCode(65 + Math.max(0, index));
}

/** Accept the new quiz JSON and the previous { correctIndex } payload. */
export function coerceQuizResponse(raw: QuizGeneratorResponse | Record<string, unknown>): QuizGeneratorResponse {
  const record = raw as Record<string, unknown>;
  const list = Array.isArray(record.questions) ? record.questions : [];
  const questions = list.map((item, i) => {
    const q = (item ?? {}) as {
      id?: number;
      question?: string;
      options?: unknown;
      correctOption?: string;
      correctIndex?: number;
    };
    const options = Array.isArray(q.options) ? q.options.map((o) => String(o)) : [];
    let correctOption = String(q.correctOption ?? '').trim().toUpperCase().replace(/[^A-G]/g, '');
    if (!correctOption && typeof q.correctIndex === 'number') {
      correctOption = optionLetterFromIndex(q.correctIndex);
    }
    if (!correctOption) correctOption = 'A';
    return {
      id: typeof q.id === 'number' ? q.id : i + 1,
      question: String(q.question ?? '').trim() || `Question ${i + 1}`,
      options,
      correctOption,
    };
  });
  const fromModel = Array.isArray(record.answerKey)
    ? record.answerKey.map((k) => String(k).trim().toUpperCase().replace(/[^A-G]/g, '') || 'A')
    : [];
  return {
    questions,
    answerKey: questions.map((q, i) => fromModel[i] || q.correctOption),
  };
}

function formatOption(opt: string, index: number): string {
  if (/^[A-G][.)]\s+/i.test(opt.trim())) return opt.trim();
  return `${String.fromCharCode(65 + index)}. ${opt.trim()}`;
}

export function formatAnswerKeyLine(quiz: QuizGeneratorResponse): string {
  return quiz.answerKey.map((letter, i) => `${i + 1}. ${letter}`).join('  |  ');
}

export function formatQuizPlainText(quiz: QuizGeneratorResponse): string {
  const questions = quiz.questions
    .map((q, i) => {
      const stem = q.question.replace(/^\d+\.\s*/, '');
      const options = q.options.map((opt, j) => formatOption(opt, j)).join('\n');
      return `${q.id ?? i + 1}. ${stem}\n${options}`;
    })
    .join('\n\n');
  return `${questions}\n\nAnswer Key\n${formatAnswerKeyLine(quiz)}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function exportQuizPdf(quiz: QuizGeneratorResponse) {
  const body = quiz.questions
    .map((q, i) => {
      const stem = escapeHtml(q.question.replace(/^\d+\.\s*/, ''));
      const options = q.options
        .map((opt, j) => `<li>${escapeHtml(formatOption(opt, j))}</li>`)
        .join('');
      return `<section><h2>${q.id ?? i + 1}. ${stem}</h2><ol>${options}</ol></section>`;
    })
    .join('');
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Multiple Choice Quiz</title>
  <style>
    body { font-family: Cambria, Georgia, serif; font-size: 18px; color: #0f172a; padding: 32px; line-height: 1.45; }
    h1, h2, h3 { font-family: Cambria, Georgia, serif; }
    h1 { font-size: 22px; margin-bottom: 8px; }
    h2 { font-size: 16px; margin: 20px 0 8px; }
    ol { margin: 0 0 8px 0; padding-left: 0; list-style: none; }
    li { margin: 4px 0; }
    .key { margin-top: 28px; padding: 16px; border: 1px solid #cbd5e1; background: #f8fafc; }
  </style>
</head>
<body>
  <h1>Multiple Choice Quiz / Assessment</h1>
  ${body}
  <div class="key"><strong>Answer Key</strong><p>${escapeHtml(formatAnswerKeyLine(quiz))}</p></div>
  ${watermarkFooterHtml()}
</body>
</html>`;
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.position = 'fixed';
  frame.style.right = '0';
  frame.style.bottom = '0';
  frame.style.width = '0';
  frame.style.height = '0';
  frame.style.border = '0';
  document.body.appendChild(frame);
  const doc = frame.contentDocument;
  if (!doc) {
    document.body.removeChild(frame);
    return;
  }
  doc.open();
  doc.write(html);
  doc.close();
  const cleanup = () => {
    window.setTimeout(() => {
      if (frame.parentNode) document.body.removeChild(frame);
    }, 500);
  };
  frame.onload = () => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    cleanup();
  };
  window.setTimeout(() => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    cleanup();
  }, 250);
}

function QuizOutputCard({
  quiz,
  busy,
  onCopy,
  copied,
  onExportPdf,
  onRegenerate,
  onEdit,
}: {
  quiz: QuizGeneratorResponse | null;
  busy: boolean;
  copied: boolean;
  onCopy: () => void;
  onExportPdf: () => void;
  onRegenerate: () => void;
  onEdit: () => void;
}) {
  const actionClass = `${TOOL_SECONDARY} disabled:cursor-not-allowed disabled:opacity-50`;

  return (
    <section className={`${TOOL_CARD} mt-6`}>
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className={TOOL_SECTION_TITLE}>Generated Output</h2>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className={actionClass} disabled={!quiz || busy} onClick={onExportPdf}>
            <FileDown className="h-3.5 w-3.5" /> Export to PDF
          </button>
          <button type="button" className={actionClass} disabled={!quiz || busy} onClick={onCopy}>
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
          <button type="button" className={actionClass} disabled={!quiz || busy} onClick={onEdit}>
            Edit quiz
          </button>
          <button type="button" className={actionClass} disabled={!quiz || busy} onClick={onRegenerate}>
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Regenerate
          </button>
        </div>
      </header>

      {busy && !quiz ? (
        <div className={`${TOOL_PANEL} ${TOOL_MUTED} flex min-h-[240px] flex-col items-center justify-center gap-3`}>
          <Loader2 className="mv-pres-accent h-8 w-8 animate-spin" />
          <p className="text-sm font-semibold">Generating your quiz…</p>
        </div>
      ) : !quiz ? (
        <div className={`${TOOL_PANEL} flex min-h-[240px] flex-col items-center justify-center gap-3 border !border-dashed p-8 text-center`}>
          <HelpCircle className={`${TOOL_MUTED} h-8 w-8`} />
          <p className={`${TOOL_MUTED} max-w-xs text-sm leading-relaxed`}>
            Your generated quiz will appear here after you click <strong className="mv-pres-accent">Generate Quiz</strong>.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {quiz.questions.map((q, i) => (
            <article key={`${q.id}-${i}`} className={TOOL_PANEL}>
              <h3 className="text-sm font-semibold">
                {q.id ?? i + 1}. {q.question.replace(/^\d+\.\s*/, '')}
              </h3>
              <ul className="mt-3 space-y-2">
                {q.options.map((opt, j) => (
                  <li key={`${opt}-${j}`} className="flex items-start gap-2 text-sm">
                    <span className="mv-pres-accent min-w-5 font-semibold">{String.fromCharCode(65 + j)}.</span>
                    <span>{opt.replace(/^[A-G][.)]\s+/i, '')}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
          <div className={TOOL_PANEL}>
            <p className="text-sm font-semibold">Answer Key</p>
            <p className={`${TOOL_MUTED} mt-2 font-mono text-sm leading-relaxed`}>{formatAnswerKeyLine(quiz)}</p>
          </div>
        </div>
      )}
    </section>
  );
}

export function QuizGenerator({
  favorited,
  onToggleFavorite,
}: {
  favorited?: boolean;
  onToggleFavorite?: () => void;
}) {
  const payloadRef = useRef<QuizGeneratorPayload | null>(null);
  const handlePayloadChange = useCallback((payload: QuizGeneratorPayload | null) => {
    payloadRef.current = payload;
  }, []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [failedPayload, setFailedPayload] = useState<QuizGeneratorPayload | null>(null);
  const [quiz, setQuiz] = useState<QuizGeneratorResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorSession, setEditorSession] = useState(0);
  const [quizMeta, setQuizMeta] = useState({ topic: '', grade: '' });

  const runGenerate = useCallback(async (payload: QuizGeneratorPayload) => {
    const hasSource = Boolean(
      payload.topicDescription?.trim() ||
        payload.attachedDocumentContext?.trim() ||
        payload.imageFiles?.length,
    );
    if (!hasSource) return;
    payloadRef.current = payload;
    setBusy(true);
    setError(null);
    setFailedPayload(null);
    setCopied(false);
    try {
      const next = coerceQuizResponse(await api.generateQuiz(payload));
      setQuiz(next);
      setQuizMeta({
        topic: payload.topicDescription?.trim() || payload.assessmentDescription?.trim() || 'Quiz',
        grade: payload.gradeLevel,
      });
      setEditorSession((n) => n + 1);
      setEditorOpen(true);
    } catch (e) {
      setQuiz(null);
      setEditorOpen(false);
      setQuizMeta({ topic: '', grade: '' });
      setFailedPayload(payload);
      setError(e instanceof Error ? e.message : 'Failed to generate quiz');
    } finally {
      setBusy(false);
    }
  }, []);

  const copyQuiz = async () => {
    if (!quiz) return;
    try {
      await navigator.clipboard.writeText(formatQuizPlainText(quiz));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Could not copy to clipboard');
    }
  };

  const regenerateQuestion = async (_index: number) => {
    const payload = payloadRef.current;
    if (!payload) return null;
    setBusy(true);
    setError(null);
    try {
      const next = coerceQuizResponse(await api.generateQuiz({ ...payload, numberOfQuestions: 1 }));
      return next.questions[0] ?? null;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to regenerate question');
      return null;
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {quiz ? (
        <div className={editorOpen ? 'quiz-gen-shell flex h-full min-h-0 flex-col overflow-hidden bg-[#040711] font-sans text-slate-100' : 'hidden'}>
        <QuizEditor
          key={editorSession}
          topic={quizMeta.topic}
          gradeLevel={quizMeta.grade}
          initial={toEditableQuestions(quiz, quizMeta.topic)}
          onBack={() => setEditorOpen(false)}
          onSave={(draft) => {
            const next = toQuizResponse(draft.questions);
            setQuiz(next);
            try {
              const stored = JSON.parse(localStorage.getItem('mindvault_saved_quizzes') || '[]') as unknown[];
              stored.unshift({ ...draft, answerKey: next.answerKey, savedAt: new Date().toISOString() });
              localStorage.setItem('mindvault_saved_quizzes', JSON.stringify(stored.slice(0, 20)));
            } catch {
              setError('Could not save this quiz in the browser');
            }
          }}
          onRegenerateQuestion={regenerateQuestion}
        />
        </div>
      ) : null}
      <div className={TOOL_PAGE} style={editorOpen ? { display: 'none' } : undefined}>
        <nav className={TOOL_BREADCRUMB}>
          <Link to="/teacher/tools" className={TOOL_BREADCRUMB_LINK}>Teacher Tools</Link>
          <span className={TOOL_MUTED}>›</span>
          <span>Multiple Choice Quiz / Assessment Generator</span>
        </nav>
        <QuizGeneratorForm
          favorited={favorited}
          onToggleFavorite={onToggleFavorite}
          busy={busy}
          onGenerate={(payload) => void runGenerate(payload)}
          onPayloadChange={handlePayloadChange}
        />
        <ToolErrorRetry
          message={error}
          busy={busy}
          onRetry={failedPayload ? () => void runGenerate(failedPayload) : null}
        />
        <QuizOutputCard
          quiz={quiz}
          busy={busy}
          copied={copied}
          onCopy={() => void copyQuiz()}
          onExportPdf={() => quiz && exportQuizPdf(quiz)}
          onRegenerate={() => {
            const payload = payloadRef.current;
            if (payload) void runGenerate(payload);
          }}
          onEdit={() => setEditorOpen(true)}
        />
      </div>
    </>
  );
}

export default QuizGenerator;
