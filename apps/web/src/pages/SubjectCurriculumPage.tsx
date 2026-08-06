import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronRight,
  Lock,
  PlayCircle,
  ClipboardList,
} from 'lucide-react';
import type { SubjectCurriculumResponse } from '@brightpath/shared';
import { api } from '@/lib/api';

export default function SubjectCurriculumPage() {
  const { subjectId } = useParams<{ subjectId: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<SubjectCurriculumResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!subjectId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.getSubjectCurriculum(subjectId);
      setData(res);
      const firstOpen =
        res.chapters.find((c) => c.status === 'IN_PROGRESS' || c.status === 'UNLOCKED') ??
        res.chapters[0];
      setOpenId((prev) => prev ?? firstOpen?.id ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load subject');
    } finally {
      setLoading(false);
    }
  }, [subjectId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="page">
        <p className="text-slate-500">Loading chapters…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="page">
        <button type="button" className="btn btn-ghost" onClick={() => navigate('/dashboard')}>
          ← Dashboard
        </button>
        <p className="mt-4 text-red-600">{error ?? 'Subject not found'}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-dvh max-w-3xl bg-gradient-to-b from-slate-50 to-white px-4 py-6 sm:px-6">
      <button
        type="button"
        className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900"
        onClick={() => navigate('/dashboard')}
      >
        <ArrowLeft className="h-4 w-4" /> Back to dashboard
      </button>

      <header className="mb-6">
        <p className="text-sm font-semibold" style={{ color: data.color }}>
          My Subjects
        </p>
        <h1 className="text-2xl font-extrabold text-slate-900">{data.subjectName}</h1>
        <p className="mt-1 text-sm text-slate-500">
          Watch all 5 videos in each chapter (no skipping), then pass the chapter test (≥80%).
        </p>
        <div className="mt-4">
          <div className="mb-1 flex justify-between text-sm font-semibold">
            <span>Subject progress</span>
            <span style={{ color: data.color }}>{data.masteryPercentage}% Mastered</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${data.masteryPercentage}%`, background: data.color }}
            />
          </div>
          <p className="mt-1 text-xs text-slate-400">
            50% from videos completed + 50% from chapter tests passed
          </p>
        </div>
      </header>

      <div className="space-y-3">
        {data.chapters.map((ch) => {
          const open = openId === ch.id;
          const locked = ch.status === 'LOCKED';
          return (
            <div
              key={ch.id}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
            >
              <button
                type="button"
                className="flex w-full items-center gap-3 px-4 py-4 text-left"
                onClick={() => setOpenId(open ? null : ch.id)}
              >
                {open ? (
                  <ChevronDown className="h-5 w-5 text-slate-400" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-slate-400" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-slate-800">
                    Chapter {ch.sequenceOrder}: {ch.title}
                  </p>
                  <p className="text-xs text-slate-500">
                    {ch.videos.filter((v) => v.isCompleted).length}/5 videos
                    {ch.quizPassed ? ' · Test passed' : ''}
                  </p>
                </div>
                {locked ? (
                  <Lock className="h-4 w-4 text-slate-400" />
                ) : ch.quizPassed || ch.status === 'COMPLETED' ? (
                  <Check className="h-5 w-5 text-emerald-600" />
                ) : null}
              </button>

              {open && (
                <div className="space-y-2 border-t border-slate-100 px-4 py-3">
                  {locked && (
                    <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-500">
                      Pass the previous chapter test to unlock this chapter.
                    </p>
                  )}
                  {ch.videos.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      disabled={v.isLocked}
                      onClick={() =>
                        navigate(`/dashboard/subjects/${data.subjectId}/videos/${v.id}`)
                      }
                      className={[
                        'flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left text-sm transition',
                        v.isLocked
                          ? 'cursor-not-allowed border-dashed border-slate-200 bg-slate-50 text-slate-400'
                          : 'border-slate-200 bg-white hover:border-teal-300 hover:shadow-sm',
                      ].join(' ')}
                    >
                      {v.isCompleted ? (
                        <Check className="h-4 w-4 text-emerald-600" />
                      ) : v.isLocked ? (
                        <Lock className="h-4 w-4" />
                      ) : (
                        <PlayCircle className="h-4 w-4 text-indigo-600" />
                      )}
                      <span className="flex-1 font-semibold">
                        Video {v.sequenceOrder}: {v.title}
                      </span>
                      <span className="text-xs text-slate-400">{v.durationInSeconds}s</span>
                    </button>
                  ))}

                  <Link
                    to={
                      ch.quizUnlocked
                        ? `/dashboard/chapters/${ch.id}/test`
                        : '#'
                    }
                    onClick={(e) => {
                      if (!ch.quizUnlocked) e.preventDefault();
                    }}
                    className={[
                      'mt-2 flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-white',
                      ch.quizUnlocked
                        ? 'bg-indigo-600 hover:bg-indigo-700'
                        : 'cursor-not-allowed bg-slate-300',
                    ].join(' ')}
                  >
                    {ch.quizUnlocked ? (
                      <ClipboardList className="h-4 w-4" />
                    ) : (
                      <Lock className="h-4 w-4" />
                    )}
                    {ch.quizPassed
                      ? `Retake Chapter Test (${ch.quizScore}%)`
                      : 'Take Chapter Test'}
                    {!ch.quizUnlocked && ' — finish all 5 videos'}
                  </Link>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
