import { useState } from 'react';
import { Check, PencilLine, X, Sparkles } from 'lucide-react';
import type { StudentDoubt, TeacherSubtopic } from '@brightpath/shared';
import { api } from '@/lib/api';

interface TeacherDoubtAssistantProps {
  doubts: StudentDoubt[];
  previewSubtopic: TeacherSubtopic | null;
  engagementNote: string | null;
  onReviewed: () => void;
  onContinue: () => void;
  onAssignActivity: () => void;
}

export function TeacherDoubtAssistant({
  doubts,
  previewSubtopic,
  engagementNote,
  onReviewed,
  onContinue,
  onAssignActivity,
}: TeacherDoubtAssistantProps) {
  const [selectedId, setSelectedId] = useState<string | null>(doubts[0]?.id ?? null);
  const [overrideText, setOverrideText] = useState('');
  const [busy, setBusy] = useState(false);
  const [points, setPoints] = useState(12);

  const selected = doubts.find((d) => d.id === selectedId) ?? doubts[0] ?? null;

  const review = async (action: 'approve' | 'override' | 'reject') => {
    if (!selected) return;
    setBusy(true);
    try {
      await api.reviewDoubt(selected.id, {
        action,
        teacherOverrideText: action === 'override' ? overrideText || selected.aiResponse?.answerText : undefined,
        pointsAwarded: action === 'reject' ? 0 : points,
      });
      onReviewed();
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-3xl border border-indigo-100 bg-white p-5 shadow-soft sm:p-6">
      <h2 className="mb-1 text-lg font-extrabold text-slate-800">AI & Student Doubt Monitor</h2>
      <p className="mb-4 text-sm text-slate-500">
        Review AI answers grounded in textbook sources before they reach students.
      </p>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Lesson media preview */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-900">
          {previewSubtopic?.videoUrl ? (
            <iframe
              title={previewSubtopic.videoTitle ?? 'Lesson preview'}
              src={previewSubtopic.videoUrl}
              className="aspect-video w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <div className="flex aspect-video flex-col items-center justify-center px-4 text-center text-slate-300">
              <Sparkles className="mb-2 h-8 w-8 text-indigo-300" />
              <p className="text-sm font-bold">Lesson media preview</p>
              <p className="mt-1 text-xs text-slate-400">
                Attach a Video Explainer on a subtopic to preview it here.
              </p>
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-800 px-3 py-2">
            <p className="text-xs font-semibold text-slate-200">
              {previewSubtopic
                ? `${previewSubtopic.code} · ${previewSubtopic.title}`
                : 'No subtopic selected'}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onContinue}
                className="rounded-lg bg-emerald-500 px-3 py-1.5 text-[11px] font-bold text-white"
              >
                Continue
              </button>
              <button
                type="button"
                onClick={onAssignActivity}
                className="rounded-lg bg-amber-400 px-3 py-1.5 text-[11px] font-bold text-amber-950"
              >
                Assign Activity
              </button>
            </div>
          </div>
          {engagementNote && (
            <p className="bg-indigo-950 px-3 py-2 text-xs font-semibold text-indigo-100">{engagementNote}</p>
          )}
        </div>

        {/* Doubts sidebar */}
        <div className="flex min-h-[280px] flex-col rounded-2xl border border-slate-200 bg-slate-50">
          <div className="border-b border-slate-200 px-3 py-2">
            <p className="text-xs font-extrabold uppercase tracking-wide text-slate-500">
              Teacher&apos;s Doubt Queue ({doubts.length})
            </p>
          </div>
          <div className="max-h-40 space-y-1 overflow-y-auto border-b border-slate-200 p-2">
            {doubts.length === 0 && (
              <p className="px-2 py-4 text-center text-xs text-slate-500">No student doubts yet.</p>
            )}
            {doubts.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => {
                  setSelectedId(d.id);
                  setOverrideText(d.teacherOverrideText || d.aiResponse?.answerText || '');
                }}
                className={[
                  'w-full rounded-xl px-2.5 py-2 text-left text-xs transition',
                  selected?.id === d.id ? 'bg-[#5B46BA] text-white' : 'bg-white text-slate-700 hover:bg-indigo-50',
                ].join(' ')}
              >
                <span className="font-bold">{d.studentName}</span>
                <span className="mt-0.5 block line-clamp-2 opacity-90">{d.question}</span>
                <span className="mt-1 inline-block rounded-full bg-black/10 px-1.5 py-0.5 text-[10px] font-bold">
                  {d.status}
                </span>
              </button>
            ))}
          </div>

          {selected ? (
            <div className="flex flex-1 flex-col gap-2 p-3">
              <p className="text-xs font-bold text-slate-800">Q: {selected.question}</p>
              <div className="rounded-xl border border-violet-100 bg-violet-50 p-2.5 text-xs text-violet-900">
                <p className="mb-1 font-extrabold">AI draft (textbook-grounded)</p>
                <p>{selected.aiResponse?.answerText ?? 'No AI answer yet.'}</p>
                {selected.aiResponse && (
                  <p className="mt-2 text-[10px] font-semibold text-violet-600">
                    Sources: {selected.aiResponse.groundedSources.join(' · ')} · confidence{' '}
                    {Math.round(selected.aiResponse.confidence * 100)}%
                  </p>
                )}
              </div>
              <label className="text-[11px] font-bold text-slate-500">
                Teacher override / notes
                <textarea
                  value={overrideText}
                  onChange={(e) => setOverrideText(e.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-700 outline-none focus:border-indigo-400"
                />
              </label>
              <label className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                Gamification points
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={points}
                  onChange={(e) => setPoints(Number(e.target.value))}
                  className="w-20 rounded-lg border border-slate-200 px-2 py-1 text-right text-xs"
                />
              </label>
              <div className="mt-auto flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void review('approve')}
                  className="inline-flex flex-1 items-center justify-center gap-1 rounded-xl bg-emerald-500 px-3 py-2 text-xs font-bold text-white"
                >
                  <Check className="h-3.5 w-3.5" /> Approve AI
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void review('override')}
                  className="inline-flex flex-1 items-center justify-center gap-1 rounded-xl bg-[#5B46BA] px-3 py-2 text-xs font-bold text-white"
                >
                  <PencilLine className="h-3.5 w-3.5" /> Override
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void review('reject')}
                  className="inline-flex items-center justify-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700"
                >
                  <X className="h-3.5 w-3.5" /> Reject
                </button>
              </div>
            </div>
          ) : (
            <p className="p-4 text-center text-xs text-slate-500">Select a doubt to review.</p>
          )}
        </div>
      </div>
    </section>
  );
}
