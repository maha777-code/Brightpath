import '@/styles/curriculum-studio.css';
import { useState } from 'react';
import { Check, PencilLine, X, Sparkles } from 'lucide-react';
import type { StudentDoubt, TeacherSubtopic } from '@brightpath/shared';
import { isActivityPlayable } from '@brightpath/shared';
import { api } from '@/lib/api';
import { CinematicScriptPreview } from './CinematicScriptPreview';

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
    <section className="td-card w-full rounded-3xl p-8">
      <h2 className="cs-h mb-1 text-2xl font-bold">AI & Student Doubt Monitor</h2>
      <p className="cs-muted mb-6 text-base">
        Review AI answers grounded in textbook sources before they reach students.
      </p>

      <div className="grid w-full grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Lesson media preview */}
        <div className="cs-media overflow-hidden rounded-2xl">
          {previewSubtopic && isActivityPlayable(previewSubtopic.activity) && previewSubtopic.activity ? (
            <div className="min-h-[240px] px-6 py-5">
              <p className="cs-h mb-3 text-sm font-bold">Activity script preview</p>
              <CinematicScriptPreview activity={previewSubtopic.activity} compact />
            </div>
          ) : previewSubtopic?.videoUrl && !/commondatastorage|ForBigger/i.test(previewSubtopic.videoUrl) ? (
            <video
              title={previewSubtopic.videoTitle ?? 'Lesson preview'}
              src={previewSubtopic.videoUrl}
              controls
              playsInline
              className="aspect-video w-full bg-black"
            />
          ) : (
            <div className="flex aspect-video flex-col items-center justify-center px-8 text-center">
              <Sparkles className="cs-icon mb-3 h-10 w-10" />
              <p className="cs-h text-xl font-bold">Lesson media preview</p>
              <p className="cs-muted mt-2 text-base">
                Attach a Video Explainer or generate a Cinematic Tom & Jerry activity to preview it here.
              </p>
            </div>
          )}
          <div className="cs-media-bar flex flex-wrap items-center justify-between gap-3 px-6 py-4">
            <p className="cs-h text-base font-semibold">
              {previewSubtopic
                ? `${previewSubtopic.code} · ${previewSubtopic.title}`
                : 'No subtopic selected'}
            </p>
            <div className="flex gap-3">
              <button type="button" onClick={onContinue} className="cs-btn" data-tone="success">
                Continue
              </button>
              <button type="button" onClick={onAssignActivity} className="cs-btn" data-tone="warning">
                Assign Activity
              </button>
            </div>
          </div>
          {engagementNote && <p className="cs-note px-6 py-3 text-base font-semibold">{engagementNote}</p>}
        </div>

        {/* Doubts sidebar */}
        <div className="cs-inset flex min-h-[320px] flex-col rounded-2xl">
          <div className="cs-divider border-b px-6 py-4">
            <p className="cs-eyebrow">Teacher&apos;s Doubt Queue ({doubts.length})</p>
          </div>
          <div className="cs-divider max-h-48 space-y-2 overflow-y-auto border-b p-4">
            {doubts.length === 0 && (
              <p className="cs-muted px-2 py-4 text-center text-base">No student doubts yet.</p>
            )}
            {doubts.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => {
                  setSelectedId(d.id);
                  setOverrideText(d.teacherOverrideText || d.aiResponse?.answerText || '');
                }}
                className="cs-doubt w-full rounded-xl px-4 py-3 text-left text-base transition"
                data-active={selected?.id === d.id ? 'true' : 'false'}
              >
                <span className="font-bold">{d.studentName}</span>
                <span className="mt-0.5 block line-clamp-2 opacity-90">{d.question}</span>
                <span className="mt-1 inline-block rounded-full bg-black/10 px-3 py-0.5 text-sm font-semibold">
                  {d.status}
                </span>
              </button>
            ))}
          </div>

          {selected ? (
            <div className="flex flex-1 flex-col gap-3 p-6">
              <p className="cs-h text-base font-bold">Q: {selected.question}</p>
              <div className="cs-note rounded-xl p-4 text-base">
                <p className="mb-2 font-extrabold">AI draft (textbook-grounded)</p>
                <p>{selected.aiResponse?.answerText ?? 'No AI answer yet.'}</p>
                {selected.aiResponse && (
                  <p className="mt-2 text-sm font-semibold opacity-90">
                    Sources: {selected.aiResponse.groundedSources.join(' · ')} · confidence{' '}
                    {Math.round(selected.aiResponse.confidence * 100)}%
                  </p>
                )}
              </div>
              <label className="cs-text text-sm font-semibold">
                Teacher override / notes
                <textarea
                  value={overrideText}
                  onChange={(e) => setOverrideText(e.target.value)}
                  rows={3}
                  className="td-input mt-2 w-full rounded-xl p-4 text-lg outline-none"
                />
              </label>
              <label className="cs-text flex items-center justify-between text-base font-semibold">
                Gamification points
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={points}
                  onChange={(e) => setPoints(Number(e.target.value))}
                  className="td-input w-24 rounded-lg p-4 text-right text-lg"
                />
              </label>
              <div className="mt-auto flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void review('approve')}
                  className="cs-btn flex-1"
                  data-tone="success"
                >
                  <Check className="h-5 w-5" /> Approve AI
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void review('override')}
                  className="cs-btn flex-1"
                  data-tone="primary"
                >
                  <PencilLine className="h-5 w-5" /> Override
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void review('reject')}
                  className="cs-btn"
                  data-tone="danger"
                >
                  <X className="h-5 w-5" /> Reject
                </button>
              </div>
            </div>
          ) : (
            <p className="cs-muted p-8 text-center text-base">Select a doubt to review.</p>
          )}
        </div>
      </div>
    </section>
  );
}
