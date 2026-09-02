import { X } from 'lucide-react';
import type { TeacherActivity, TeacherSubtopic } from '@brightpath/shared';

interface ActivityReviewModalProps {
  subtopic: TeacherSubtopic;
  activity: TeacherActivity;
  onClose: () => void;
  onRegenerate: () => void;
  regenerating: boolean;
}

export default function ActivityReviewModal({
  subtopic,
  activity,
  onClose,
  onRegenerate,
  regenerating,
}: ActivityReviewModalProps) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/70 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-amber-400/30 bg-[#312E81] p-8 text-white shadow-[0_0_40px_rgba(251,191,36,0.2)]">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-amber-200">{subtopic.code}</p>
            <h3 className="text-2xl font-extrabold">{activity.title}</h3>
            <p className="mt-1 text-base text-cyan-100/80">
              {activity.questions.length} questions · {activity.totalXp} XP
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/20 p-2 text-white hover:bg-white/10"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <ol className="space-y-4">
          {activity.questions.map((q, qi) => (
            <li key={`${qi}-${q.questionText}`} className="rounded-2xl border border-white/10 bg-slate-950/40 p-5">
              <p className="font-bold text-white">
                {qi + 1}. {q.questionText}
              </p>
              <ul className="mt-3 space-y-2">
                {q.options.map((opt, oi) => {
                  const correct = oi === q.correctAnswerIndex;
                  return (
                    <li
                      key={`${qi}-${oi}`}
                      className={[
                        'rounded-xl px-3 py-2 text-sm',
                        correct
                          ? 'bg-emerald-500/20 font-semibold text-emerald-100 ring-1 ring-emerald-400/40'
                          : 'bg-white/5 text-cyan-100/90',
                      ].join(' ')}
                    >
                      {String.fromCharCode(65 + oi)}. {opt}
                    </li>
                  );
                })}
              </ul>
              <p className="mt-3 text-sm text-amber-100/90">{q.explanation}</p>
              <p className="mt-1 text-xs font-semibold text-[#FDE68A]">{q.xpReward} XP</p>
            </li>
          ))}
        </ol>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/20 px-5 py-2.5 text-sm font-medium text-white"
          >
            Close
          </button>
          <button
            type="button"
            onClick={onRegenerate}
            disabled={regenerating}
            className="rounded-xl bg-[#FBBF24]/80 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60"
          >
            {regenerating ? 'Generating Activity...' : 'Regenerate Activity'}
          </button>
        </div>
      </div>
    </div>
  );
}
