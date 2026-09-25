import { useCallback, useRef, useState } from 'react';
import { Check, Copy, FileDown, HelpCircle, Loader2, RefreshCw } from 'lucide-react';
import type { QuizGeneratorPayload, QuizGeneratorResponse } from '@brightpath/shared';
import { api } from '@/lib/api';
import { watermarkFooterHtml } from '@/lib/exportWatermark';
import { QuizGeneratorForm } from '@/components/tools/QuizGeneratorForm';

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
}: {
  quiz: QuizGeneratorResponse | null;
  busy: boolean;
  copied: boolean;
  onCopy: () => void;
  onExportPdf: () => void;
  onRegenerate: () => void;
}) {
  const actionClass = quiz && !busy
    ? 'inline-flex cursor-pointer appearance-none items-center gap-1.5 rounded-lg border border-cyan-500/30 bg-slate-800 px-3 py-1.5 text-xs font-bold text-cyan-400 transition-all hover:bg-slate-700'
    : 'inline-flex cursor-not-allowed appearance-none items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-1.5 text-xs font-bold text-slate-500';

  return (
    <section className="quiz-gen-output flex h-full min-h-0 flex-col overflow-y-auto bg-[#03060d] p-6 custom-scrollbar">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Generated Output</h3>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className={actionClass} disabled={!quiz || busy} onClick={onExportPdf}>
            <FileDown className="h-3.5 w-3.5" /> Export to PDF
          </button>
          <button type="button" className={actionClass} disabled={!quiz || busy} onClick={onCopy}>
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
          <button type="button" className={actionClass} disabled={!quiz || busy} onClick={onRegenerate}>
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Regenerate
          </button>
        </div>
      </header>

      <div className="flex min-h-[400px] flex-1 flex-col justify-center rounded-2xl border border-slate-800/90 bg-[#080d1a] p-6 shadow-xl">
        {busy && !quiz ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
            <p className="text-sm font-semibold">Generating your quiz…</p>
          </div>
        ) : !quiz ? (
          <div className="flex h-full flex-col items-center justify-center space-y-3 rounded-xl border-2 border-dashed border-slate-800/80 p-8 text-center">
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-3">
              <HelpCircle className="h-8 w-8 text-slate-600" />
            </div>
            <p className="max-w-xs text-sm font-semibold leading-relaxed text-slate-400">
              Your generated quiz will appear here after you click <strong className="text-cyan-400">Generate Quiz</strong>.
            </p>
          </div>
        ) : (
          <div className="space-y-5 overflow-y-auto">
            {quiz.questions.map((q, i) => (
              <article key={`${q.id}-${i}`} className="rounded-xl border border-slate-800 bg-[#0b101d] p-4">
                <h4 className="text-base font-bold text-white">
                  {q.id ?? i + 1}. {q.question.replace(/^\d+\.\s*/, '')}
                </h4>
                <ul className="mt-3 space-y-2">
                  {q.options.map((opt, j) => (
                    <li
                      key={`${opt}-${j}`}
                      className="flex items-start gap-2 rounded-lg border border-slate-800 bg-[#060911] px-3 py-2 text-sm text-slate-200"
                    >
                      <span className="mt-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-cyan-500/10 text-[11px] font-bold text-cyan-300">
                        {String.fromCharCode(65 + j)}
                      </span>
                      <span>{opt.replace(/^[A-G][.)]\s+/i, '')}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-4">
              <p className="text-xs font-black uppercase tracking-wider text-emerald-300">Answer Key</p>
              <p className="mt-2 font-mono text-sm font-semibold leading-relaxed text-emerald-100">
                {formatAnswerKeyLine(quiz)}
              </p>
            </div>
          </div>
        )}
      </div>
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
  const [quiz, setQuiz] = useState<QuizGeneratorResponse | null>(null);
  const [copied, setCopied] = useState(false);

  const runGenerate = useCallback(async (payload: QuizGeneratorPayload) => {
    if (!payload.topicDescription?.trim()) return;
    payloadRef.current = payload;
    setBusy(true);
    setError(null);
    setCopied(false);
    try {
      const next = coerceQuizResponse(await api.generateQuiz(payload));
      setQuiz(next);
    } catch (e) {
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

  return (
    <div className="quiz-gen-shell flex h-full min-h-0 flex-col overflow-hidden bg-[#040711] font-sans text-slate-100">
      <div className="quiz-gen-split min-h-0 flex-1 divide-y divide-slate-800/80 lg:divide-x lg:divide-y-0">
        <div className="custom-scrollbar min-h-0 space-y-5 overflow-y-auto bg-[#060911] p-6">
          <QuizGeneratorForm
            favorited={favorited}
            onToggleFavorite={onToggleFavorite}
            busy={busy}
            onGenerate={(payload) => void runGenerate(payload)}
            onPayloadChange={handlePayloadChange}
          />
          {error ? (
            <p className="rounded-xl border border-rose-500/40 bg-rose-950/50 px-4 py-3 text-sm text-rose-200">
              {error}
            </p>
          ) : null}
        </div>
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
        />
      </div>
    </div>
  );
}

export default QuizGenerator;
