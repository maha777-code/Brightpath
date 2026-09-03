import { useMemo, useState } from 'react';
import { Clapperboard, Code2, Play, X } from 'lucide-react';
import type { CinematicScriptScene, TeacherActivity, TeacherSubtopic } from '@brightpath/shared';
import { questionLoopsFromScript, resolveActivityScript } from '@brightpath/shared';
import TomJerryCinematicGame from '@/components/games/TomJerryCinematicGame';

interface ActivityReviewModalProps {
  subtopic: TeacherSubtopic;
  activity: TeacherActivity;
  onClose: () => void;
  onRegenerate: () => void;
  regenerating: boolean;
}

type ReviewTab = 'timeline' | 'play' | 'json'; // teacher preview tabs

function sceneLabel(scene: CinematicScriptScene, questionNumber: number): string {
  switch (scene.scene_type) {
    case 'setup':
      return 'Setup';
    case 'question_loop':
      return `Question ${questionNumber}`;
    case 'correct_outcome':
      return 'Correct cinematic';
    case 'incorrect_outcome':
      return 'Incorrect cinematic';
    case 'completed':
      return 'Finale';
    default:
      return 'Scene';
  }
}

function sceneBody(scene: CinematicScriptScene): string {
  switch (scene.scene_type) {
    case 'setup':
      return scene.tom_dialogue;
    case 'question_loop':
      return scene.prompt;
    case 'correct_outcome':
    case 'incorrect_outcome':
      return scene.tom_dialogue_on_failure;
    case 'completed':
      return scene.jerry_dialogue || scene.tom_dialogue || 'Victory';
    default:
      return '';
  }
}

function sceneMeta(scene: CinematicScriptScene): string {
  switch (scene.scene_type) {
    case 'setup':
      return scene.animation_trigger;
    case 'question_loop':
      return `${scene.game_mechanics} · ${scene.options.length} mouseholes`;
    case 'correct_outcome':
    case 'incorrect_outcome':
      return scene.animation_outcome;
    case 'completed':
      return scene.animation_trigger ?? 'jerry_victory_dance';
    default:
      return '';
  }
}

export default function ActivityReviewModal({
  subtopic,
  activity,
  onClose,
  onRegenerate,
  regenerating,
}: ActivityReviewModalProps) {
  const [tab, setTab] = useState<ReviewTab>('timeline');
  const script = useMemo(() => resolveActivityScript(activity), [activity]);
  const loops = questionLoopsFromScript(script);
  let questionCursor = 0;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/70 p-4">
      <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-3xl border border-amber-400/30 bg-[#312E81] p-8 text-white shadow-[0_0_40px_rgba(251,191,36,0.2)]">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-amber-200">{subtopic.code}</p>
            <h3 className="text-2xl font-extrabold">{activity.title}</h3>
            <p className="mt-1 text-base text-cyan-100/80">
              {loops.length} chase questions · {activity.totalXp} XP · cinematic script
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

        <div className="mb-5 flex flex-wrap gap-2">
          {(
            [
              { id: 'timeline', label: 'Script timeline', icon: Clapperboard },
              { id: 'play', label: 'Play preview', icon: Play },
              { id: 'json', label: 'JSON script', icon: Code2 },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={[
                'inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold',
                tab === item.id
                  ? 'bg-[#FBBF24] text-stone-900'
                  : 'border border-white/15 bg-white/5 text-cyan-50',
              ].join(' ')}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </button>
          ))}
        </div>

        {tab === 'timeline' ? (
          <ol className="relative space-y-3 border-l border-amber-300/30 pl-6">
            {script.map((scene, index) => {
              if (scene.scene_type === 'question_loop') questionCursor += 1;
              const qn = questionCursor;
              return (
                <li key={`${scene.scene_type}-${index}`} className="relative">
                  <span className="absolute -left-[1.85rem] top-3 h-3 w-3 rounded-full bg-[#FBBF24] ring-4 ring-[#312E81]" />
                  <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-amber-400/20 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-amber-100">
                        {sceneLabel(scene, qn)}
                      </span>
                      <span className="text-xs font-semibold text-cyan-200/70">{sceneMeta(scene)}</span>
                    </div>
                    <p className="text-sm font-semibold text-white">{sceneBody(scene)}</p>
                    {scene.scene_type === 'question_loop' ? (
                      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                        {scene.options.map((opt) => (
                          <li
                            key={opt.id}
                            className={[
                              'rounded-xl px-3 py-2 text-sm',
                              opt.correct
                                ? 'bg-emerald-500/20 font-semibold text-emerald-100 ring-1 ring-emerald-400/40'
                                : 'bg-white/5 text-cyan-100/90',
                            ].join(' ')}
                          >
                            {opt.id}. {opt.text}
                            <span className="mt-1 block text-[11px] font-medium text-amber-100/70">
                              {opt.jerry_action}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ol>
        ) : null}

        {tab === 'play' ? (
          <TomJerryCinematicGame
            key={activity.id}
            activity={activity}
            script={script}
            title={activity.title}
            totalXp={activity.totalXp}
          />
        ) : null}

        {tab === 'json' ? (
          <pre className="max-h-[50vh] overflow-auto rounded-2xl border border-white/10 bg-slate-950/70 p-4 text-xs leading-relaxed text-amber-50">
            {JSON.stringify(script, null, 2)}
          </pre>
        ) : null}

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
