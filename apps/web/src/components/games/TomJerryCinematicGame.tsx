import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { Play, RotateCcw, Trophy, Volume2, VolumeX, X } from 'lucide-react';
import type {
  CinematicQuestionLoopScene,
  CinematicScriptScene,
  TomJerrySfxCue,
} from '@brightpath/shared';
import {
  getTemplateConfig,
  outcomeLabelsForTemplate,
  questionLoopsFromScript,
  resolveActivityScript,
  resolveActivityTemplateId,
  type TeacherActivity,
} from '@brightpath/shared';
import { pickVoice, stripForSpeech } from '@/lib/speech';
import './tomJerry.css';
import './templateStages.css';

export type TomPose = 'Tom_Idle' | 'Tom_SettingTrap' | 'Tom_GotBonked' | 'Tom_CatchingJerry';
export type JerryPose = 'Jerry_Idle' | 'Jerry_Running' | 'Jerry_Escaping' | 'Jerry_Caught';

type Phase = 'setup' | 'question' | 'input' | 'outcome' | 'completed';

function mapTomPose(trigger?: string, fallback: TomPose = 'Tom_Idle'): TomPose {
  const t = (trigger ?? '').toLowerCase();
  if (t.includes('bonk') || t.includes('flatten')) return 'Tom_GotBonked';
  if (t.includes('catch')) return 'Tom_CatchingJerry';
  if (t.includes('trap') || t.includes('setup')) return 'Tom_SettingTrap';
  return fallback;
}

function mapJerryPose(action?: string, correct?: boolean): JerryPose {
  const t = (action ?? '').toLowerCase();
  if (t.includes('escap') || (t.includes('mousehole') && !t.includes('wrong'))) return 'Jerry_Escaping';
  if (t.includes('wrong') || t.includes('caught')) return 'Jerry_Caught';
  if (t.includes('run')) return 'Jerry_Running';
  if (correct === true) return 'Jerry_Escaping';
  if (correct === false) return 'Jerry_Caught';
  return 'Jerry_Idle';
}

function findScene<T extends CinematicScriptScene['scene_type']>(
  script: CinematicScriptScene[],
  type: T,
): Extract<CinematicScriptScene, { scene_type: T }> | undefined {
  return script.find((s): s is Extract<CinematicScriptScene, { scene_type: T }> => s.scene_type === type);
}

let audioCtx: AudioContext | null = null;

function getAudioCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!audioCtx) audioCtx = new AC();
  if (audioCtx.state === 'suspended') void audioCtx.resume();
  return audioCtx;
}

function playSfx(cue: TomJerrySfxCue) {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  const master = ctx.createGain();
  master.gain.value = 0.2;
  master.connect(ctx.destination);

  const tone = (freq: number, start: number, dur: number, type: OscillatorType, gain = 0.4) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now + start);
    g.gain.setValueAtTime(gain, now + start);
    g.gain.exponentialRampToValueAtTime(0.001, now + start + dur);
    osc.connect(g);
    g.connect(master);
    osc.start(now + start);
    osc.stop(now + start + dur);
  };

  if (cue === 'TrapSet') {
    tone(220, 0, 0.08, 'square', 0.3);
    tone(90, 0.1, 0.18, 'square', 0.35);
  } else if (cue === 'MouseRunning') {
    for (let i = 0; i < 8; i += 1) tone(900 + (i % 2) * 200, i * 0.07, 0.05, 'triangle', 0.18);
  } else if (cue === 'Bonk') {
    tone(110, 0, 0.12, 'triangle', 0.5);
    tone(55, 0.05, 0.28, 'sine', 0.45);
  } else if (cue === 'Caught') {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.exponentialRampToValueAtTime(70, now + 0.45);
    g.gain.setValueAtTime(0.28, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc.connect(g);
    g.connect(master);
    osc.start(now);
    osc.stop(now + 0.5);
  } else if (cue === 'Victory') {
    [523, 659, 784, 1046].forEach((freq, i) => tone(freq, i * 0.12, 0.22, 'triangle', 0.28));
  }
}

function speakCharacter(text: string, who: 'tom' | 'jerry', enabled: boolean): Promise<void> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    const clean = stripForSpeech(text);
    if (!enabled || !clean || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      window.setTimeout(finish, 700);
      return;
    }
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(clean);
    utter.lang = 'en-US';
    utter.volume = 1;
    if (who === 'tom') {
      utter.pitch = 0.55;
      utter.rate = 0.92;
    } else {
      utter.pitch = 1.55;
      utter.rate = 1.08;
    }
    const voice =
      pickVoice('en-US') ??
      window.speechSynthesis.getVoices().find((v) => /en/i.test(v.lang)) ??
      null;
    if (voice) utter.voice = voice;
    utter.onend = finish;
    utter.onerror = finish;
    window.setTimeout(() => window.speechSynthesis.speak(utter), 40);
    window.setTimeout(finish, Math.min(10_000, 1800 + clean.length * 55));
  });
}

function CharacterSprite({
  pose,
  kind,
  hostEmoji,
  runnerEmoji,
}: {
  pose: TomPose | JerryPose;
  kind: 'tom' | 'jerry';
  hostEmoji: { idle: string; active: string; win: string; lose: string };
  runnerEmoji: { idle: string; move: string; win: string; lose: string };
}) {
  const emoji =
    kind === 'tom'
      ? pose === 'Tom_GotBonked'
        ? hostEmoji.win
        : pose === 'Tom_CatchingJerry'
          ? hostEmoji.lose
          : pose === 'Tom_SettingTrap'
            ? hostEmoji.active
            : hostEmoji.idle
      : pose === 'Jerry_Escaping'
        ? runnerEmoji.win
        : pose === 'Jerry_Caught'
          ? runnerEmoji.lose
          : pose === 'Jerry_Running'
            ? runnerEmoji.move
            : runnerEmoji.idle;
  return (
    <div className="tj-sprite" title={pose} aria-hidden>
      {emoji}
    </div>
  );
}

export interface TomJerryCinematicGameProps {
  script?: CinematicScriptScene[];
  activity?: TeacherActivity;
  title?: string;
  totalXp?: number;
  templateId?: string;
  onExit?: () => void;
  onComplete?: (xpEarned: number) => void;
}

export default function TomJerryCinematicGame({
  script: scriptProp,
  activity,
  title,
  totalXp,
  templateId: templateIdProp,
  onExit,
  onComplete,
}: TomJerryCinematicGameProps) {
  const templateId = useMemo(() => {
    if (templateIdProp) return templateIdProp;
    if (activity) return resolveActivityTemplateId(activity);
    return 'tom_and_jerry';
  }, [templateIdProp, activity]);
  const theme = useMemo(() => getTemplateConfig(templateId), [templateId]);
  const outcomeLabels = useMemo(() => outcomeLabelsForTemplate(templateId), [templateId]);

  const script = useMemo(
    () => scriptProp ?? (activity ? resolveActivityScript(activity) : []),
    [scriptProp, activity],
  );
  const loops = useMemo(() => questionLoopsFromScript(script), [script]);
  const setup = findScene(script, 'setup');
  const correctOutcome = findScene(script, 'correct_outcome');
  const incorrectOutcome = findScene(script, 'incorrect_outcome');
  const completed = findScene(script, 'completed');

  const [phase, setPhase] = useState<Phase>('setup');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);
  const [tomPose, setTomPose] = useState<TomPose>('Tom_SettingTrap');
  const [jerryPose, setJerryPose] = useState<JerryPose>('Jerry_Idle');
  const [xpEarned, setXpEarned] = useState(0);
  const [muted, setMuted] = useState(false);
  const [caption, setCaption] = useState(setup?.tom_dialogue ?? '');
  const [speaker, setSpeaker] = useState<'tom' | 'jerry'>('tom');
  const timerRef = useRef<number | null>(null);
  const completedNotified = useRef(false);

  const current = loops[questionIndex] as CinematicQuestionLoopScene | undefined;
  const statusText =
    phase === 'outcome' && lastCorrect !== null
      ? lastCorrect
        ? current?.correct_outcome_text || outcomeLabels.correct
        : current?.incorrect_outcome_text || outcomeLabels.incorrect
      : null;
  const inputStatusText = `${theme.characters.runner} is moving…`;
  const xpPerQuestion = Math.max(
    10,
    Math.round((totalXp ?? activity?.totalXp ?? loops.length * 50) / Math.max(1, loops.length)),
  );
  const heading = title ?? activity?.title ?? theme.themeName;

  const clearTimer = () => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const wait = (ms: number) =>
    new Promise<void>((resolve) => {
      clearTimer();
      timerRef.current = window.setTimeout(resolve, ms);
    });

  const beginSetup = useCallback(async () => {
    setPhase('setup');
    setQuestionIndex(0);
    setSelectedId(null);
    setLastCorrect(null);
    setXpEarned(0);
    setTomPose(mapTomPose(setup?.animation_trigger, 'Tom_SettingTrap'));
    setJerryPose('Jerry_Idle');
    setSpeaker('tom');
    setCaption(setup?.tom_dialogue ?? 'Aha! You little mouse…');
    playSfx('TrapSet');
    await speakCharacter(setup?.tom_dialogue ?? '', 'tom', !muted);
  }, [muted, setup?.animation_trigger, setup?.tom_dialogue]);

  useEffect(() => {
    void beginSetup();
    return () => {
      clearTimer();
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
    // Start once when the script loads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [script]);

  const goToQuestion = async (index: number) => {
    const loop = loops[index];
    if (!loop) {
      setPhase('completed');
      return;
    }
    setPhase('question');
    setQuestionIndex(index);
    setSelectedId(null);
    setLastCorrect(null);
    setTomPose('Tom_Idle');
    setJerryPose('Jerry_Idle');
    setSpeaker('tom');
    setCaption(loop.tom_dialogue_repeat);
    await speakCharacter(loop.tom_dialogue_repeat, 'tom', !muted);
  };

  const handleContinueFromSetup = () => {
    void goToQuestion(0);
  };

  const handleSelect = async (loop: CinematicQuestionLoopScene, optionId: string) => {
    if (phase !== 'question') return;
    const option = loop.options.find((o) => o.id === optionId);
    if (!option) return;
    setPhase('input');
    setSelectedId(optionId);
    setJerryPose('Jerry_Running');
    playSfx('MouseRunning');
    await wait(900);
    const correct = option.correct;
    setLastCorrect(correct);
    setPhase('outcome');
    setJerryPose(mapJerryPose(option.jerry_action, correct));
    if (correct) {
      setTomPose(mapTomPose(correctOutcome?.animation_outcome, 'Tom_GotBonked'));
      playSfx('Bonk');
      setSpeaker('tom');
      setCaption(correctOutcome?.tom_dialogue_on_failure ?? 'Drat!');
      setXpEarned((prev) => prev + xpPerQuestion);
      await speakCharacter(correctOutcome?.tom_dialogue_on_failure ?? 'Drat!', 'tom', !muted);
      await wait(500);
    } else {
      setTomPose(mapTomPose(incorrectOutcome?.animation_outcome, 'Tom_CatchingJerry'));
      playSfx('Caught');
      setSpeaker('tom');
      setCaption(incorrectOutcome?.tom_dialogue_on_failure ?? 'Caught you!');
      await speakCharacter(incorrectOutcome?.tom_dialogue_on_failure ?? 'Caught you!', 'tom', !muted);
    }
  };

  const handleNextAfterCorrect = () => {
    const next = questionIndex + 1;
    if (next < loops.length) {
      void goToQuestion(next);
      return;
    }
    setPhase('completed');
    setTomPose('Tom_GotBonked');
    setJerryPose('Jerry_Escaping');
    playSfx('Victory');
    confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
    const line =
      completed?.jerry_dialogue ||
      completed?.tom_dialogue ||
      `${theme.characters.runner} wins this round!`;
    setSpeaker(completed?.jerry_dialogue ? 'jerry' : 'tom');
    setCaption(line);
    void speakCharacter(line, completed?.jerry_dialogue ? 'jerry' : 'tom', !muted);
  };

  useEffect(() => {
    if (phase !== 'completed' || completedNotified.current) return;
    completedNotified.current = true;
    onComplete?.(xpEarned);
  }, [phase, xpEarned, onComplete]);

  if (loops.length === 0) {
    return (
      <div className="rounded-3xl border border-white/15 bg-slate-950/70 p-8 text-center text-cyan-100">
        This activity does not have a playable cinematic script yet.
      </div>
    );
  }

  const canChoose = phase === 'question';

  return (
    <div className="overflow-hidden rounded-3xl border border-amber-400/30 bg-[#1c1917] text-white shadow-[0_0_40px_rgba(251,191,36,0.18)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-200">
            {theme.themeName}
          </p>
          <h3 className="text-lg font-extrabold text-white">{heading}</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-amber-400/20 px-3 py-1 text-sm font-bold text-[#FDE68A]">
            {xpEarned} XP
          </span>
          <button
            type="button"
            onClick={() => setMuted((m) => !m)}
            className="rounded-xl border border-white/15 p-2 hover:bg-white/10"
            aria-label={muted ? 'Unmute' : 'Mute'}
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
          {onExit ? (
            <button
              type="button"
              onClick={onExit}
              className="rounded-xl border border-white/15 p-2 hover:bg-white/10"
              aria-label="Close game"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>

      <div className={['tj-stage', theme.stageClass].join(' ')}>
        <div className="tj-cabinet tj-cabinet-left" />
        <div className="tj-cabinet tj-cabinet-right" />
        <div className="tj-fridge" />
        <div className="tj-floor" />
        <div className={['tj-trap', phase === 'setup' ? 'is-set' : ''].join(' ')}>
          {theme.choiceEmoji}
        </div>

        {caption ? (
          <div className="tj-bubble" data-speaker={speaker}>
            <p className="text-[10px] font-bold uppercase tracking-wide text-orange-700">
              {speaker === 'tom' ? theme.characters.host : theme.characters.runner}
            </p>
            <p className="text-sm font-semibold leading-snug">{caption}</p>
          </div>
        ) : null}

        <div className="tj-tom" data-pose={tomPose}>
          <CharacterSprite
            kind="tom"
            pose={tomPose}
            hostEmoji={{
              idle: theme.hostIdle,
              active: theme.hostActive,
              win: theme.hostWin,
              lose: theme.hostLose,
            }}
            runnerEmoji={{
              idle: theme.runnerIdle,
              move: theme.runnerMove,
              win: theme.runnerWin,
              lose: theme.runnerLose,
            }}
          />
        </div>
        <div className="tj-jerry" data-pose={jerryPose} data-hole={selectedId ?? undefined}>
          <CharacterSprite
            kind="jerry"
            pose={jerryPose}
            hostEmoji={{
              idle: theme.hostIdle,
              active: theme.hostActive,
              win: theme.hostWin,
              lose: theme.hostLose,
            }}
            runnerEmoji={{
              idle: theme.runnerIdle,
              move: theme.runnerMove,
              win: theme.runnerWin,
              lose: theme.runnerLose,
            }}
          />
        </div>

        <div className="tj-holes">
          {(current?.options ?? []).map((opt) => {
            const selected = selectedId === opt.id;
            const showResult = phase === 'outcome' && selected;
            return (
              <button
                key={opt.id}
                type="button"
                disabled={!canChoose}
                onClick={() => void handleSelect(current!, opt.id)}
                className={[
                  'tj-hole',
                  showResult && lastCorrect ? 'is-correct' : '',
                  showResult && lastCorrect === false ? 'is-wrong' : '',
                ].join(' ')}
              >
                <span className="block text-lg">{opt.id}</span>
                <span className="block px-1 text-[11px] font-semibold leading-tight text-amber-50">
                  {opt.text}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-3 px-5 py-4">
        {phase === 'question' && current ? (
          <div className="text-center">
            <p className="text-base font-bold text-amber-50">{current.prompt}</p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-amber-200/70">
              {current.game_mechanics.replace(/_/g, ' ')} — click a {theme.choiceLabel.replace(/s$/, '')}
            </p>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-200/80">
            {phase === 'setup' && 'Setup'}
            {phase === 'question' && `Question ${questionIndex + 1} of ${loops.length}`}
            {phase === 'input' && inputStatusText}
            {phase === 'outcome' && statusText}
            {phase === 'completed' && 'Victory cinematic'}
          </p>
          <div className="flex flex-wrap gap-2">
            {phase === 'setup' ? (
              <button
                type="button"
                onClick={handleContinueFromSetup}
                className="inline-flex items-center gap-2 rounded-xl bg-[#FBBF24] px-4 py-2 text-sm font-bold text-stone-900"
              >
                <Play className="h-4 w-4" />
                Start chase
              </button>
            ) : null}
            {phase === 'outcome' && lastCorrect ? (
              <button
                type="button"
                onClick={handleNextAfterCorrect}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-4 py-2 text-sm font-bold text-emerald-950"
              >
                {questionIndex + 1 < loops.length ? 'Next question' : 'Victory'}
              </button>
            ) : null}
            {phase === 'outcome' && lastCorrect === false ? (
              <>
                <button
                  type="button"
                  onClick={() => void goToQuestion(questionIndex)}
                  className="inline-flex items-center gap-2 rounded-xl bg-amber-300 px-4 py-2 text-sm font-bold text-stone-900"
                >
                  <RotateCcw className="h-4 w-4" />
                  Retry
                </button>
                {onExit ? (
                  <button
                    type="button"
                    onClick={onExit}
                    className="rounded-xl border border-white/20 px-4 py-2 text-sm font-medium text-white"
                  >
                    Exit
                  </button>
                ) : null}
              </>
            ) : null}
            {phase === 'completed' ? (
              <span className="inline-flex items-center gap-2 rounded-xl bg-emerald-500/20 px-3 py-2 text-sm font-bold text-emerald-100">
                <Trophy className="h-4 w-4" />
                {xpEarned} XP earned
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
