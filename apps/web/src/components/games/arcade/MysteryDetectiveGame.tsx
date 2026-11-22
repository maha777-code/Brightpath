import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import type { ArcadeQuestion } from '@brightpath/shared';
import { Check, FileSearch, Gavel, Search, Star, X } from 'lucide-react';
import { answerOptions, isTypingTarget, playSound, shuffle, type ArcadeGameProps } from './arcadeKit';
import { CorrectToast, HeartsPill, QuizModal, ReadyModal } from './arcadeUi';
import './arcadeGames.css';

const MAX_REP = 3;

type Phase = 'ready' | 'investigate' | 'question' | 'accuse' | 'closed' | 'done';
type SpotState = 'open' | 'found' | 'missed';

const SPOTS = [
  { id: 'window', name: 'Rainy window', box: [5, 8, 21, 36] },
  { id: 'painting', name: 'Crooked painting', box: [31, 10, 15, 19] },
  { id: 'clock', name: 'Stopped clock', box: [50, 7, 9, 16] },
  { id: 'shelf', name: 'Bookshelf', box: [68, 6, 28, 50] },
  { id: 'lamp', name: 'Desk lamp', box: [32, 34, 9, 20] },
  { id: 'desk', name: 'Desk drawer', box: [29, 54, 32, 15] },
  { id: 'globe', name: 'Globe', box: [49, 40, 9, 15] },
  { id: 'safe', name: 'Wall safe', box: [5, 58, 15, 25] },
  { id: 'plant', name: 'Potted fern', box: [21, 56, 7, 29] },
  { id: 'cabinet', name: 'Filing cabinet', box: [79, 58, 16, 30] },
  { id: 'bin', name: 'Paper bin', box: [65, 72, 8, 15] },
  { id: 'rug', name: 'Rug corner', box: [34, 84, 28, 11] },
] as const;

const SUSPECTS = [
  { name: 'Ms. Ada Quill', role: 'Librarian', color: '#f472b6', hair: '#7c2d12' },
  { name: 'Mr. Basil Tock', role: 'Clockmaker', color: '#38bdf8', hair: '#1f2937' },
  { name: 'Dr. Cleo Vance', role: 'Lab director', color: '#a3e635', hair: '#facc15' },
] as const;

interface Clue { index: number; question: ArcadeQuestion }
interface Suspect { name: string; role: string; color: string; hair: string; question: ArcadeQuestion; claim: string; liar: boolean }
interface Quiz { spot: number; options: string[]; picked: string | null }

function buildSuspects(questions: ArcadeQuestion[], clues: Clue[]): Suspect[] {
  const pool = clues.length >= 3 ? clues.map((c) => c.question) : [...clues.map((c) => c.question), ...questions.filter((q) => !clues.some((c) => c.question === q))];
  const picked = shuffle(pool).slice(0, 3);
  const liar = Math.floor(Math.random() * picked.length);
  return picked.map((question, index) => ({
    ...SUSPECTS[index],
    question,
    claim: index === liar ? shuffle(question.distractors)[0] ?? question.answer : question.answer,
    liar: index === liar,
  }));
}

export default function MysteryDetectiveGame({ questions, muted, onFinish }: ArcadeGameProps) {
  const pack = useMemo(() => questions.slice(0, SPOTS.length), [questions]);
  const [phase, setPhase] = useState<Phase>('ready');
  const [spots, setSpots] = useState<SpotState[]>(() => pack.map(() => 'open'));
  const [clues, setClues] = useState<Clue[]>([]);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [rep, setRep] = useState(MAX_REP);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [toast, setToast] = useState<{ id: number; title: string; text: string } | null>(null);
  const [suspects, setSuspects] = useState<Suspect[]>([]);
  const [accused, setAccused] = useState<number | null>(null);
  const [light, setLight] = useState({ x: 50, y: 45 });
  const [boardOpen, setBoardOpen] = useState(false);
  const stats = useRef({ best: 0, correct: 0, missed: [] as ArcadeQuestion[], score: 0, rep: MAX_REP, combo: 0 });
  const mutedRef = useRef(muted);
  const finishedRef = useRef(false);
  mutedRef.current = muted;

  const finish = useCallback(
    (delay = 0) => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      const s = stats.current;
      window.setTimeout(() => {
        setPhase('done');
        onFinish({ score: s.score, correct: s.correct, total: pack.length, bestCombo: s.best, missed: s.missed });
      }, delay);
    },
    [onFinish, pack.length],
  );

  const openSpot = useCallback(
    (index: number) => {
      if (phase !== 'investigate' || spots[index] !== 'open') return;
      playSound('paper', mutedRef.current);
      setQuiz({ spot: index, options: answerOptions(pack[index], 4), picked: null });
      setPhase('question');
    },
    [pack, phase, spots],
  );

  const pick = useCallback(
    (option: string) => {
      if (!quiz || quiz.picked) return;
      const question = pack[quiz.spot];
      const s = stats.current;
      setQuiz({ ...quiz, picked: option });
      if (option === question.answer) {
        s.combo += 1;
        s.best = Math.max(s.best, s.combo);
        s.correct += 1;
        const points = 100 * Math.min(s.combo, 5);
        s.score += points;
        playSound('correct', mutedRef.current);
        setSpots((list) => list.map((v, i) => (i === quiz.spot ? 'found' : v)));
        setClues((list) => [...list, { index: quiz.spot, question }]);
        setToast({ id: Date.now(), title: `Clue found! +${points}`, text: `Evidence #${s.correct}: ${question.answer}` });
      } else {
        s.combo = 0;
        s.rep -= 1;
        s.missed.push(question);
        playSound('wrong', mutedRef.current);
        setSpots((list) => list.map((v, i) => (i === quiz.spot ? 'missed' : v)));
        setRep(s.rep);
      }
      setScore(s.score);
      setCombo(s.combo);
    },
    [pack, quiz],
  );

  const closeQuiz = useCallback(() => {
    if (!quiz?.picked) return;
    setQuiz(null);
    const s = stats.current;
    if (s.rep <= 0) {
      playSound('wrong', mutedRef.current);
      finish(300);
      return;
    }
    const remaining = spots.filter((v) => v === 'open').length;
    if (remaining === 0) {
      setSuspects(buildSuspects(pack, clues));
      setAccused(null);
      playSound('boost', mutedRef.current);
      setPhase('accuse');
      return;
    }
    if (quiz.picked === pack[quiz.spot].answer) playSound('paper', mutedRef.current);
    setPhase('investigate');
  }, [clues, finish, pack, quiz, spots]);

  useEffect(() => {
    if (!quiz?.picked || quiz.picked !== pack[quiz.spot].answer) return;
    const timer = window.setTimeout(closeQuiz, 1800);
    return () => window.clearTimeout(timer);
  }, [closeQuiz, pack, quiz]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const accuse = useCallback(
    (index: number) => {
      if (phase !== 'accuse' || accused !== null) return;
      const s = stats.current;
      setAccused(index);
      if (suspects[index].liar) {
        const bonus = 300 + 50 * s.rep;
        s.score += bonus;
        setScore(s.score);
        playSound('win', mutedRef.current);
        window.setTimeout(() => setPhase('closed'), 1400);
        finish(3600);
      } else {
        s.rep -= 1;
        setRep(s.rep);
        playSound('wrong', mutedRef.current);
      }
    },
    [accused, finish, phase, suspects],
  );

  const retryAccuse = () => {
    if (stats.current.rep <= 0) {
      finish(0);
      return;
    }
    setAccused(null);
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return;
      if (phase === 'investigate' && (event.key === 'n' || event.key === 'N')) {
        const next = spots.findIndex((v) => v === 'open');
        if (next >= 0) document.querySelector<HTMLButtonElement>(`[data-spot="${next}"]`)?.focus();
      }
      if (phase === 'accuse' && accused === null) {
        const index = Number(event.key) - 1;
        if (index >= 0 && index < suspects.length) accuse(index);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [accuse, accused, phase, spots, suspects.length]);

  const onRoomMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setLight({ x: ((event.clientX - rect.left) / rect.width) * 100, y: ((event.clientY - rect.top) / rect.height) * 100 });
  };

  const pins = clues.map((_, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    return { x: 26 + col * 48 + (row % 2 ? 4 : -2), y: 1 + row * 16.4 };
  });
  const found = spots.filter((v) => v === 'found').length;
  const accusedSuspect = accused !== null ? suspects[accused] : null;

  return (
    <div className="arc-game arc-det">
      <div className="arc-det__room" onPointerMove={onRoomMove} style={{ '--fx': `${light.x}%`, '--fy': `${light.y}%` } as CSSProperties}>
        <div className="arc-det__wall" aria-hidden />
        <div className="arc-det__floor" aria-hidden />
        {SPOTS.slice(0, pack.length).map((spot, index) => {
          const [left, top, width, height] = spot.box;
          const state = spots[index];
          return (
            <button
              key={spot.id}
              type="button"
              data-spot={index}
              className={`arc-det__spot arc-det__spot--${spot.id}`}
              data-state={state}
              style={{ left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%` }}
              onClick={() => openSpot(index)}
              disabled={phase !== 'investigate' || state !== 'open'}
              aria-label={`${spot.name}${state === 'found' ? ' (clue found)' : state === 'missed' ? ' (clue lost)' : ''}`}
            >
              <span className="arc-det__art" aria-hidden>
                <span /><span /><span /><span />
              </span>
              <span className="arc-det__badge" aria-hidden>
                {state === 'found' ? <Check /> : state === 'missed' ? <X /> : <Search />}
              </span>
              <span className="arc-det__tag">{spot.name}</span>
            </button>
          );
        })}
        <div className="arc-det__flashlight" aria-hidden />
        <div className="arc-det__rain" aria-hidden />
      </div>

      <aside className="arc-det__board" data-open={boardOpen ? 'true' : 'false'}>
        <p className="arc-det__board-title"><FileSearch className="arc-pill__icon" /> Evidence board · {found}/{pack.length}</p>
        <div className="arc-det__pins">
        <svg className="arc-det__strings" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
          {pins.slice(1).map((p, i) => (
            <line key={i} x1={pins[i].x} y1={pins[i].y + 1} x2={p.x} y2={p.y + 1} />
          ))}
        </svg>
        {clues.map((clue, i) => (
          <article
            key={clue.question.id}
            className="arc-det__card"
            style={{ left: `${pins[i].x}%`, top: `${pins[i].y}%`, '--tilt': `${((i % 3) - 1) * 2.5}deg` } as CSSProperties}
          >
            <span className="arc-det__pin" aria-hidden />
            <span className="arc-det__card-no">#{i + 1} · {SPOTS[clue.index].name}</span>
            <strong>{clue.question.answer}</strong>
            <span className="arc-det__card-text">{clue.question.explanation}</span>
          </article>
        ))}
        </div>
        {!clues.length ? <p className="arc-det__empty">Inspect the glowing spots. Each right answer pins a clue here.</p> : null}
      </aside>

      <div className="arc-hud">
        <div className="arc-hud__group">
          <span className="arc-pill"><Star className="arc-pill__icon text-amber-300" />{score.toLocaleString()}</span>
          {combo >= 2 ? <span className="arc-pill arc-pill--combo">Streak x{Math.min(combo, 5)}</span> : null}
        </div>
        <span />
        <div className="arc-hud__group">
          <button type="button" className="arc-pill arc-det__board-toggle" onClick={() => setBoardOpen((v) => !v)} aria-pressed={boardOpen}>
            <FileSearch className="arc-pill__icon" /> {found}
          </button>
          <span className="arc-det__rep-label">Reputation</span>
          <HeartsPill hearts={rep} max={MAX_REP} />
        </div>
      </div>

      {toast ? <CorrectToast key={toast.id} title={toast.title} text={toast.text} /> : null}

      {phase === 'ready' ? (
        <ReadyModal
          eyebrow="Mystery Detective · Case #042"
          title="The Case of the Missing Science Fair Trophy"
          howto={[
            <>The trophy vanished from the study overnight. Sweep the room with your flashlight.</>,
            <>Click (or <kbd>Tab</kbd> + <kbd>Enter</kbd>) a glowing spot and answer to unlock its clue; <kbd>1</kbd>–<kbd>4</kbd> pick answers</>,
            <>Wrong answers cost reputation. Then use your evidence to catch the suspect whose story doesn’t add up</>,
          ]}
          cta="Open the case file"
          onStart={() => {
            playSound('unlock', mutedRef.current);
            setPhase('investigate');
          }}
        />
      ) : null}

      {phase === 'question' && quiz ? (
        <QuizModal
          className="arc-det__quiz"
          eyebrow={<><Search className="h-4 w-4" /> {SPOTS[quiz.spot].name} · clue {spots.filter((v) => v !== 'open').length + (quiz.picked ? 0 : 1)} of {pack.length}</>}
          question={pack[quiz.spot]}
          options={quiz.options}
          picked={quiz.picked}
          onPick={pick}
          onContinue={closeQuiz}
          continueLabel={quiz.picked === pack[quiz.spot].answer ? 'Pin it to the board' : stats.current.rep > 0 ? 'Got it, keep searching' : 'See results'}
        />
      ) : null}

      {phase === 'accuse' ? (
        <div className="arc-overlay">
          <div className="arc-modal arc-det__finale">
            <p className="arc-modal__eyebrow"><Gavel className="h-4 w-4" /> The finale</p>
            <h3 className="arc-modal__title">One suspect’s story contradicts your evidence. Who is it?</h3>
            <div className="arc-det__suspects">
              {suspects.map((s, index) => {
                const state = accused === null ? '' : index === accused ? (s.liar ? 'good' : 'bad') : accusedSuspect?.liar ? 'dim' : '';
                return (
                  <button key={s.name} type="button" className="arc-det__suspect" data-state={state} onClick={() => accuse(index)} disabled={accused !== null}>
                    <span className="arc-det__face" style={{ '--skin': s.color, '--hair': s.hair } as CSSProperties} aria-hidden>
                      <span /><span />
                    </span>
                    <span className="arc-det__suspect-name"><kbd>{index + 1}</kbd> {s.name}</span>
                    <span className="arc-det__suspect-role">{s.role}</span>
                    <span className="arc-det__quote">“I was checking my notes: {s.question.prompt} It’s <strong>{s.claim}</strong>.”</span>
                  </button>
                );
              })}
            </div>
            {accusedSuspect && !accusedSuspect.liar ? (
              <>
                <p className="arc-answer arc-answer--bad">{accusedSuspect.name}’s story checks out: “{accusedSuspect.claim}” is correct.</p>
                <p className="arc-modal__note">Look for the claim that matches a common mix-up, not the evidence.</p>
                <button type="button" className="arc-cta" onClick={retryAccuse} autoFocus>
                  {rep > 0 ? 'Re-check the evidence' : 'See results'}
                </button>
              </>
            ) : null}
            {accusedSuspect?.liar ? (
              <p className="arc-answer arc-answer--good">
                Caught! “{accusedSuspect.claim}” is wrong. The evidence says {accusedSuspect.question.answer}.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {phase === 'closed' ? (
        <div className="arc-overlay arc-det__closed">
          <div className="arc-det__stamp">Case closed</div>
          <p className="arc-modal__text">The trophy was “borrowed” for a surprise display. {found} clues cracked the case.</p>
        </div>
      ) : null}
    </div>
  );
}
