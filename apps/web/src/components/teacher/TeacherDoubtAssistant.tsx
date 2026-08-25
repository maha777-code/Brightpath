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
    <section className="td-card rounded-3xl p-5 sm:p-6">
      <h2 className="mb-1 text-lg font-extrabold text-white">AI & Student Doubt Monitor</h2>
      <p className="mb-4 text-sm text-[#A5F3FC]">
        Review AI answers grounded in textbook sources before they reach students.
      </p>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Lesson media preview */}
        <div className="overflow-hidden rounded-2xl border border-cyan-400/20 bg-slate-950">
          {previewSubtopic?.videoUrl && !/commondatastorage|ForBigger/i.test(previewSubtopic.videoUrl) ? (
            <video
              title={previewSubtopic.videoTitle ?? 'Lesson preview'}
              src={previewSubtopic.videoUrl}
              controls
              playsInline
              className="aspect-video w-full bg-black"
            />
          ) : (
            <div className="flex aspect-video flex-col items-center justify-center px-4 text-center text-[#A5F3FC]">
              <Sparkles className="mb-2 h-8 w-8 text-[#22D3EE]" />
              <p className="text-sm font-bold text-white">Lesson media preview</p>
              <p className="mt-1 text-xs text-[#A5F3FC]">
                Attach a Video Explainer on a subtopic to preview it here.
              </p>
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-[#1E293B] px-3 py-2">
            <p className="text-xs font-semibold text-white">
              {previewSubtopic
                ? `${previewSubtopic.code} · ${previewSubtopic.title}`
                : 'No subtopic selected'}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onContinue}
                className="rounded-lg bg-[#10B981]/80 px-3 py-1.5 text-[11px] font-bold text-white"
              >
                Continue
              </button>
              <button
                type="button"
                onClick={onAssignActivity}
                className="rounded-lg bg-[#FBBF24]/80 px-3 py-1.5 text-[11px] font-bold text-white"
              >
                Assign Activity
              </button>
            </div>
          </div>
          {engagementNote && (
            <p className="bg-[#312E81] px-3 py-2 text-xs font-semibold text-[#A5F3FC]">{engagementNote}</p>
          )}
        </div>

        {/* Doubts sidebar */}
        <div className="flex min-h-[280px] flex-col rounded-2xl border border-cyan-400/20 bg-slate-950/50">
          <div className="border-b border-cyan-400/20 px-3 py-2">
            <p className="text-xs font-extrabold uppercase tracking-wide text-[#A5F3FC]">
              Teacher&apos;s Doubt Queue ({doubts.length})
            </p>
          </div>
          <div className="max-h-40 space-y-1 overflow-y-auto border-b border-cyan-400/20 p-2">
            {doubts.length === 0 && (
              <p className="px-2 py-4 text-center text-xs text-[#A5F3FC]">No student doubts yet.</p>
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
                  selected?.id === d.id
                    ? 'bg-gradient-to-r from-cyan-500 to-indigo-500 text-white'
                    : 'bg-slate-900/70 text-[#A5F3FC] hover:bg-cyan-400/10',
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
              <p className="text-xs font-bold text-white">Q: {selected.question}</p>
              <div className="rounded-xl border border-cyan-400/20 bg-[#312E81]/70 p-2.5 text-xs text-[#A5F3FC]">
                <p className="mb-1 font-extrabold text-white">AI draft (textbook-grounded)</p>
                <p>{selected.aiResponse?.answerText ?? 'No AI answer yet.'}</p>
                {selected.aiResponse && (
                  <p className="mt-2 text-[10px] font-semibold text-cyan-200">
                    Sources: {selected.aiResponse.groundedSources.join(' · ')} · confidence{' '}
                    {Math.round(selected.aiResponse.confidence * 100)}%
                  </p>
                )}
              </div>
              <label className="text-[11px] font-bold text-[#A5F3FC]">
                Teacher override / notes
                <textarea
                  value={overrideText}
                  onChange={(e) => setOverrideText(e.target.value)}
                  rows={3}
                  className="td-input mt-1 w-full rounded-xl px-2.5 py-2 text-xs outline-none"
                />
              </label>
              <label className="flex items-center justify-between text-[11px] font-bold text-[#A5F3FC]">
                Gamification points
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={points}
                  onChange={(e) => setPoints(Number(e.target.value))}
                  className="td-input w-20 rounded-lg px-2 py-1 text-right text-xs"
                />
              </label>
              <div className="mt-auto flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void review('approve')}
                  className="inline-flex flex-1 items-center justify-center gap-1 rounded-xl bg-[#10B981]/80 px-3 py-2 text-xs font-bold text-white"
                >
                  <Check className="h-3.5 w-3.5" /> Approve AI
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void review('override')}
                  className="td-btn-cta inline-flex flex-1 items-center justify-center gap-1 rounded-xl px-3 py-2 text-xs font-bold"
                >
                  <PencilLine className="h-3.5 w-3.5" /> Override
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void review('reject')}
                  className="inline-flex items-center justify-center gap-1 rounded-xl border border-rose-400/40 bg-rose-500/80 px-3 py-2 text-xs font-bold text-white"
                >
                  <X className="h-3.5 w-3.5" /> Reject
                </button>
              </div>
            </div>
          ) : (
            <p className="p-4 text-center text-xs text-[#A5F3FC]">Select a doubt to review.</p>
          )}
        </div>
      </div>
    </section>
  );
}
