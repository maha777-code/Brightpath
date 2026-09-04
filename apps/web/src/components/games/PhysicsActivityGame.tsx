import { useCallback, useMemo, useRef, useState } from 'react';
import { Play, RotateCcw, Trophy, X } from 'lucide-react';
import {
  buildPhysicsWorldForTemplate,
  extractPhysicsWorldFromContent,
  getTemplateConfig,
  outcomeLabelsForTemplate,
  questionLoopsFromScript,
  resolveActivityScript,
  resolveActivityTemplateId,
  type Box3DWorld,
  type CinematicQuestionLoopScene,
  type CinematicScriptScene,
  type PhysicsBodyState,
  type TeacherActivity,
} from '@brightpath/shared';
import Box3DCanvas from '@/components/physics/Box3DCanvas';

interface PhysicsActivityGameProps {
  activity: TeacherActivity;
  script?: CinematicScriptScene[];
  title?: string;
  totalXp?: number;
  onExit?: () => void;
  onComplete?: (xpEarned: number) => void;
}

/**
 * Physics-driven activity player: launch the player body into option targets.
 * Collision `contact-start` resolves the answer for the active question.
 */
export default function PhysicsActivityGame({
  activity,
  script: scriptProp,
  title,
  totalXp,
  onExit,
  onComplete,
}: PhysicsActivityGameProps) {
  const templateId = resolveActivityTemplateId(activity);
  const theme = getTemplateConfig(templateId);
  const labels = outcomeLabelsForTemplate(templateId);
  const script = useMemo(
    () => scriptProp ?? resolveActivityScript(activity),
    [scriptProp, activity],
  );
  const loops = useMemo(() => questionLoopsFromScript(script), [script]);

  const [questionIndex, setQuestionIndex] = useState(0);
  const [xpEarned, setXpEarned] = useState(0);
  const [status, setStatus] = useState('Launch into an answer block');
  const [phase, setPhase] = useState<'ready' | 'flying' | 'outcome' | 'done'>('ready');
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);
  const worldRef = useRef<Box3DWorld | null>(null);
  const resolvingRef = useRef(false);
  const completedRef = useRef(false);

  const current = loops[questionIndex] as CinematicQuestionLoopScene | undefined;
  const xpPer = Math.max(
    10,
    Math.round((totalXp ?? activity.totalXp ?? loops.length * 50) / Math.max(1, loops.length)),
  );

  const worldSpec = useMemo(() => {
    const opts = (current?.options ?? []).map((o) => ({ id: o.id, correct: o.correct }));
    const fromActivity =
      activity.physicsWorld ??
      extractPhysicsWorldFromContent(activity.content, templateId, opts);
    return buildPhysicsWorldForTemplate(templateId, opts, {
      ...fromActivity,
      targets: fromActivity.targets?.map((t, i) => ({
        ...t,
        id: opts[i]?.id ?? t.id,
        isCorrect: Boolean(opts[i]?.correct ?? t.isCorrect),
      })),
    });
  }, [activity.content, activity.physicsWorld, current?.options, templateId, questionIndex]);

  const handleAnswerSubmit = useCallback(
    (optionId: string) => {
      if (!current || resolvingRef.current || phase === 'done') return;
      const opt = current.options.find((o) => o.id === optionId);
      if (!opt) return;
      resolvingRef.current = true;
      const correct = Boolean(opt.correct);
      setLastCorrect(correct);
      setPhase('outcome');
      setStatus(
        correct
          ? current.correct_outcome_text || labels.correct
          : current.incorrect_outcome_text || labels.incorrect,
      );
      if (correct) setXpEarned((x) => x + xpPer);

      window.setTimeout(() => {
        resolvingRef.current = false;
        const next = questionIndex + 1;
        if (next >= loops.length) {
          setPhase('done');
          setStatus('Physics challenge complete!');
          if (!completedRef.current) {
            completedRef.current = true;
            onComplete?.(xpEarned + (correct ? xpPer : 0));
          }
          return;
        }
        setQuestionIndex(next);
        setPhase('ready');
        setLastCorrect(null);
        setStatus('Launch into an answer block');
        worldRef.current?.resetPlayer(worldSpec.playerSpawn);
      }, 1400);
    },
    [
      current,
      labels.correct,
      labels.incorrect,
      loops.length,
      onComplete,
      phase,
      questionIndex,
      worldSpec.playerSpawn,
      xpEarned,
      xpPer,
    ],
  );

  const onContactStart = useCallback(
    (bodyA: PhysicsBodyState, bodyB: PhysicsBodyState) => {
      const player = bodyA.isPlayer ? bodyA : bodyB.isPlayer ? bodyB : null;
      const target = bodyA.isOptionTarget ? bodyA : bodyB.isOptionTarget ? bodyB : null;
      if (player && target?.optionId) {
        handleAnswerSubmit(target.optionId);
      }
    },
    [handleAnswerSubmit],
  );

  const launchAt = (optionId: string) => {
    const world = worldRef.current;
    const target = world?.getBodies().find((b) => b.optionId === optionId);
    if (!world || !target || phase !== 'ready') return;
    setPhase('flying');
    setStatus(`${theme.characters.runner} launched…`);
    const speed = templateId === 'space_shooter' ? 18 : templateId === 'sweetrush_quest' ? 12 : 14;
    world.launchPlayerToward(target.position, speed);
    if (templateId === 'space_shooter') {
      world.applyImpulse('player', [0, 2.5, 0]);
    }
  };

  return (
    <div className="flex h-full min-h-[520px] flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-950 text-white">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-cyan-200/70">
            Box3D · {theme.themeName}
          </p>
          <h3 className="text-lg font-extrabold">{title ?? activity.title}</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-amber-500/20 px-3 py-1 text-sm font-bold text-amber-100">
            XP {xpEarned}
          </span>
          {onExit ? (
            <button
              type="button"
              onClick={onExit}
              className="rounded-xl border border-white/20 p-2 hover:bg-white/10"
              aria-label="Exit"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>

      <div className="relative flex-1 bg-black/40 p-4">
        <Box3DCanvas
          key={`${templateId}-${questionIndex}`}
          worldSpec={worldSpec}
          templateId={templateId}
          onContactStart={onContactStart}
          onWorldReady={(w) => {
            worldRef.current = w;
          }}
        />
      </div>

      <div className="space-y-3 border-t border-white/10 px-5 py-4">
        {phase !== 'done' && current ? (
          <p className="text-center text-base font-bold text-amber-50">{current.prompt}</p>
        ) : (
          <p className="inline-flex w-full items-center justify-center gap-2 text-center text-base font-bold text-emerald-200">
            <Trophy className="h-5 w-5" /> Physics challenge complete
          </p>
        )}
        <p
          className={[
            'text-center text-xs font-semibold uppercase tracking-wide',
            lastCorrect === true
              ? 'text-emerald-300'
              : lastCorrect === false
                ? 'text-rose-300'
                : 'text-cyan-200/80',
          ].join(' ')}
        >
          {status}
        </p>
        {phase === 'ready' && current ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {current.options.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => launchAt(opt.id)}
                className="rounded-xl border border-cyan-400/30 bg-cyan-500/15 px-3 py-2 text-sm font-bold text-cyan-50 hover:bg-cyan-500/25"
              >
                <Play className="mr-1 inline h-3.5 w-3.5" />
                Launch {opt.id}
              </button>
            ))}
          </div>
        ) : null}
        {phase === 'done' ? (
          <button
            type="button"
            onClick={() => {
              completedRef.current = false;
              setQuestionIndex(0);
              setXpEarned(0);
              setPhase('ready');
              setLastCorrect(null);
              setStatus('Launch into an answer block');
              worldRef.current?.resetPlayer(worldSpec.playerSpawn);
            }}
            className="mx-auto flex items-center gap-2 rounded-xl bg-[#FBBF24] px-4 py-2 text-sm font-bold text-stone-900"
          >
            <RotateCcw className="h-4 w-4" />
            Play again
          </button>
        ) : null}
        <p className="text-center text-[11px] text-slate-400">
          Question {Math.min(questionIndex + 1, loops.length)} / {loops.length} · gravity{' '}
          {worldSpec.gravity.join(', ')}
        </p>
      </div>
    </div>
  );
}
