import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { ChapterQuizResponse } from '@brightpath/shared';
import { api } from '@/lib/api';

export default function ChapterTestPage() {
  const { chapterId } = useParams<{ chapterId: string }>();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState<ChapterQuizResponse | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    scorePercentage: number;
    isPassed: boolean;
    correct: number;
    total: number;
    masteryPercentage: number;
    subjectId: string;
  } | null>(null);

  useEffect(() => {
    if (!chapterId) return;
    let cancelled = false;
    async function load() {
      try {
        const res = await api.getChapterQuiz(chapterId!);
        if (!cancelled) setQuiz(res);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Quiz unavailable');
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [chapterId]);

  const submit = async () => {
    if (!quiz || !chapterId) return;
    if (quiz.questions.some((q) => answers[q.id] == null)) {
      setError('Please answer every question.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.submitChapterQuiz(chapterId, {
        answers: quiz.questions.map((q) => ({
          questionId: q.id,
          selectedIndex: answers[q.id],
        })),
      });
      setResult({ ...res.result, masteryPercentage: res.masteryPercentage, subjectId: res.subjectId });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submit failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (error && !quiz) {
    return (
      <div className="page">
        <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}>
          ← Back
        </button>
        <p className="mt-4 text-red-600">{error}</p>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="page">
        <p className="text-slate-500">Loading chapter test…</p>
      </div>
    );
  }

  if (result) {
    return (
      <div className="mx-auto max-w-xl px-4 py-10 text-center">
        <h1 className="text-2xl font-extrabold text-slate-900">
          {result.isPassed ? 'Chapter passed! 🎉' : 'Keep practicing'}
        </h1>
        <p className="mt-2 text-lg font-bold text-indigo-600">
          Score: {result.scorePercentage}% ({result.correct}/{result.total})
        </p>
        <p className="mt-1 text-sm text-slate-500">
          {result.isPassed
            ? 'Next chapter unlocked. Subject progress updated.'
            : 'You need 80% or higher to pass. Review the videos and try again.'}
        </p>
        <p className="mt-3 text-sm font-semibold text-slate-700">
          Subject mastery now: {result.masteryPercentage}%
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => navigate(`/dashboard/subjects/${result.subjectId}`)}
          >
            Back to chapters
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/dashboard')}>
            Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-dvh max-w-xl px-4 py-6">
      <button
        type="button"
        className="mb-4 text-sm font-semibold text-slate-600"
        onClick={() => navigate(`/dashboard/subjects/${quiz.subjectId}`)}
      >
        ← Back to chapters
      </button>
      <h1 className="text-xl font-extrabold text-slate-900">Chapter Test</h1>
      <p className="mb-6 text-sm text-slate-500">
        {quiz.subjectName} · {quiz.chapterTitle} · Pass with 80%+
      </p>

      <div className="space-y-5">
        {quiz.questions.map((q, i) => (
          <fieldset key={q.id} className="rounded-2xl border border-slate-200 bg-white p-4">
            <legend className="px-1 text-sm font-bold text-slate-800">
              {i + 1}. {q.prompt}
            </legend>
            <div className="mt-2 space-y-2">
              {q.options.map((opt, idx) => (
                <label
                  key={opt}
                  className={[
                    'flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm',
                    answers[q.id] === idx
                      ? 'border-indigo-400 bg-indigo-50 font-semibold'
                      : 'border-slate-100 hover:bg-slate-50',
                  ].join(' ')}
                >
                  <input
                    type="radio"
                    name={q.id}
                    checked={answers[q.id] === idx}
                    onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: idx }))}
                  />
                  {opt}
                </label>
              ))}
            </div>
          </fieldset>
        ))}
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <button
        type="button"
        className="btn btn-primary mt-6 w-full"
        disabled={submitting}
        onClick={() => void submit()}
      >
        {submitting ? 'Submitting…' : 'Submit test'}
      </button>
    </div>
  );
}
