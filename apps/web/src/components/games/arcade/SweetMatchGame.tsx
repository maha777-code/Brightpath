import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { ArcadeQuestion } from '@brightpath/shared';
import { Heart, Lightbulb, Play, Sparkles, Star, Zap } from 'lucide-react';
import { answerOptions, playSound, type ArcadeGameProps } from './arcadeKit';

const SIZE = 8;
const TYPES = 6;
const METER_MAX = 18;
const MAX_HEARTS = 3;

interface Candy {
  id: number;
  type: number;
  fall: number;
  fresh: boolean;
  popping: boolean;
  blast: boolean;
}

interface Popup { id: number; x: number; y: number; text: string }

interface QuestionState {
  question: ArcadeQuestion;
  options: string[];
  hint: boolean;
  picked: string | null;
}

type Phase = 'ready' | 'playing' | 'question' | 'done';

let candySeq = 0;
const makeCandy = (type: number, fall = 0, fresh = false): Candy => ({
  id: (candySeq += 1),
  type,
  fall,
  fresh,
  popping: false,
  blast: false,
});

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

function findMatches(types: number[]): Set<number> {
  const found = new Set<number>();
  for (let r = 0; r < SIZE; r += 1) {
    let run = 1;
    for (let c = 1; c <= SIZE; c += 1) {
      const same = c < SIZE && types[r * SIZE + c] === types[r * SIZE + c - 1] && types[r * SIZE + c] >= 0;
      if (same) run += 1;
      else {
        if (run >= 3) for (let k = 1; k <= run; k += 1) found.add(r * SIZE + c - k);
        run = 1;
      }
    }
  }
  for (let c = 0; c < SIZE; c += 1) {
    let run = 1;
    for (let r = 1; r <= SIZE; r += 1) {
      const same = r < SIZE && types[r * SIZE + c] === types[(r - 1) * SIZE + c] && types[r * SIZE + c] >= 0;
      if (same) run += 1;
      else {
        if (run >= 3) for (let k = 1; k <= run; k += 1) found.add((r - k) * SIZE + c);
        run = 1;
      }
    }
  }
  return found;
}

function swapped(types: number[], a: number, b: number): number[] {
  const next = [...types];
  [next[a], next[b]] = [next[b], next[a]];
  return next;
}

function hasMove(types: number[]): boolean {
  for (let i = 0; i < SIZE * SIZE; i += 1) {
    const right = i % SIZE < SIZE - 1 ? i + 1 : -1;
    const down = i + SIZE < SIZE * SIZE ? i + SIZE : -1;
    if (right >= 0 && findMatches(swapped(types, i, right)).size) return true;
    if (down >= 0 && findMatches(swapped(types, i, down)).size) return true;
  }
  return false;
}

function createBoard(): Candy[] {
  for (;;) {
    const types: number[] = [];
    for (let i = 0; i < SIZE * SIZE; i += 1) {
      const r = Math.floor(i / SIZE);
      const c = i % SIZE;
      const banned = new Set<number>();
      if (c >= 2 && types[i - 1] === types[i - 2]) banned.add(types[i - 1]);
      if (r >= 2 && types[i - SIZE] === types[i - SIZE * 2]) banned.add(types[i - SIZE]);
      const choices = Array.from({ length: TYPES }, (_, t) => t).filter((t) => !banned.has(t));
      types.push(choices[Math.floor(Math.random() * choices.length)]);
    }
    if (hasMove(types)) return types.map((type, index) => makeCandy(type, Math.floor(index / SIZE) + 1, true));
  }
}

function collapse(grid: Candy[], removed: Set<number>): Candy[] {
  const next: Candy[] = new Array(SIZE * SIZE);
  for (let c = 0; c < SIZE; c += 1) {
    const survivors: Candy[] = [];
    for (let r = SIZE - 1; r >= 0; r -= 1) {
      const index = r * SIZE + c;
      if (!removed.has(index)) survivors.push({ ...grid[index], fresh: false, popping: false, blast: false });
    }
    const empties = SIZE - survivors.length;
    for (let r = SIZE - 1, k = 0; r >= 0; r -= 1, k += 1) {
      next[r * SIZE + c] = k < survivors.length ? survivors[k] : makeCandy(Math.floor(Math.random() * TYPES), empties, true);
    }
  }
  return next;
}

export default function SweetMatchGame({ questions, muted, onFinish }: ArcadeGameProps) {
  const [grid, setGrid] = useState<Candy[]>(() => createBoard());
  const [phase, setPhase] = useState<Phase>('ready');
  const [selected, setSelected] = useState<number | null>(null);
  const [shake, setShake] = useState<number[]>([]);
  const [meter, setMeter] = useState(0);
  const [score, setScore] = useState(0);
  const [hearts, setHearts] = useState(MAX_HEARTS);
  const [streak, setStreak] = useState(0);
  const [cascade, setCascade] = useState(0);
  const [popups, setPopups] = useState<Popup[]>([]);
  const [quiz, setQuiz] = useState<QuestionState | null>(null);
  const [toast, setToast] = useState<{ id: number; title: string; text: string } | null>(null);
  const busyRef = useRef(false);
  const gridRef = useRef(grid);
  const statsRef = useRef({ score: 0, meter: 0, hearts: MAX_HEARTS, streak: 0, best: 0, correct: 0, asked: 0, missed: [] as ArcadeQuestion[] });
  const mutedRef = useRef(muted);
  const dragRef = useRef<{ index: number; x: number; y: number; moved: boolean } | null>(null);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const finishedRef = useRef(false);
  mutedRef.current = muted;

  const commit = useCallback((next: Candy[]) => {
    gridRef.current = next;
    setGrid(next);
  }, []);

  const addPoints = useCallback((points: number) => {
    statsRef.current.score += points;
    setScore(statsRef.current.score);
  }, []);

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const stats = statsRef.current;
    setPhase('done');
    playSound(stats.hearts > 0 ? 'win' : 'wrong', mutedRef.current);
    onFinish({
      score: stats.score,
      correct: stats.correct,
      total: questions.length,
      bestCombo: stats.best,
      missed: stats.missed,
    });
  }, [onFinish, questions.length]);

  const askQuestion = useCallback(() => {
    const stats = statsRef.current;
    const question = questions[stats.asked];
    if (!question) {
      finish();
      return;
    }
    playSound('boost', mutedRef.current);
    setQuiz({ question, options: answerOptions(question, 4), hint: false, picked: null });
    setPhase('question');
  }, [finish, questions]);

  const resolveBoard = useCallback(
    async (start: Candy[]) => {
      let current = start;
      let level = 1;
      for (;;) {
        const matches = findMatches(current.map((candy) => candy.type));
        if (!matches.size) break;
        setCascade(level);
        current = current.map((candy, index) => (matches.has(index) ? { ...candy, popping: true } : candy));
        commit(current);
        playSound('pop', mutedRef.current);
        const points = matches.size * 10 * level;
        addPoints(points);
        const cells = [...matches];
        const cx = cells.reduce((sum, i) => sum + (i % SIZE), 0) / cells.length;
        const cy = cells.reduce((sum, i) => sum + Math.floor(i / SIZE), 0) / cells.length;
        const popupId = Date.now() + level;
        setPopups((list) => [...list, { id: popupId, x: ((cx + 0.5) / SIZE) * 100, y: ((cy + 0.5) / SIZE) * 100, text: `+${points}` }]);
        window.setTimeout(() => setPopups((list) => list.filter((p) => p.id !== popupId)), 900);
        statsRef.current.meter = Math.min(METER_MAX, statsRef.current.meter + matches.size);
        setMeter(statsRef.current.meter);
        await wait(240);
        current = collapse(current, matches);
        commit(current);
        await wait(330);
        level += 1;
      }
      setCascade(0);
      if (!hasMove(current.map((candy) => candy.type))) {
        current = createBoard();
        commit(current);
        await wait(400);
      }
      busyRef.current = false;
      if (statsRef.current.meter >= METER_MAX && !finishedRef.current) askQuestion();
    },
    [addPoints, askQuestion, commit],
  );

  const trySwap = useCallback(
    async (a: number, b: number) => {
      if (busyRef.current || phase !== 'playing') return;
      const ar = Math.floor(a / SIZE);
      const br = Math.floor(b / SIZE);
      const adjacent = (ar === br && Math.abs(a - b) === 1) || Math.abs(a - b) === SIZE;
      if (!adjacent) return;
      busyRef.current = true;
      setSelected(null);
      const before = gridRef.current;
      const next = [...before];
      [next[a], next[b]] = [next[b], next[a]];
      commit(next);
      await wait(200);
      if (!findMatches(next.map((candy) => candy.type)).size) {
        playSound('bump', mutedRef.current);
        commit(before);
        setShake([a, b]);
        window.setTimeout(() => setShake([]), 320);
        await wait(220);
        busyRef.current = false;
        return;
      }
      await resolveBoard(next);
    },
    [commit, phase, resolveBoard],
  );

  const fireBooster = useCallback(async () => {
    busyRef.current = true;
    const current = gridRef.current;
    const counts = new Array(TYPES).fill(0);
    current.forEach((candy) => (counts[candy.type] += 1));
    const target = counts.indexOf(Math.max(...counts));
    const blast = new Set<number>();
    current.forEach((candy, index) => {
      if (candy.type === target) blast.add(index);
    });
    commit(current.map((candy, index) => (blast.has(index) ? { ...candy, popping: true, blast: true } : candy)));
    playSound('boost', mutedRef.current);
    addPoints(blast.size * 20);
    await wait(420);
    await resolveBoard(collapse(gridRef.current, blast));
  }, [addPoints, commit, resolveBoard]);

  const answer = useCallback(
    (option: string) => {
      if (!quiz || quiz.picked) return;
      const stats = statsRef.current;
      const right = option === quiz.question.answer;
      setQuiz({ ...quiz, picked: option });
      if (right) {
        stats.streak += 1;
        stats.best = Math.max(stats.best, stats.streak);
        stats.correct += 1;
        const points = Math.round(150 * Math.min(stats.streak, 5) * (quiz.hint ? 0.5 : 1));
        addPoints(points);
        playSound('correct', mutedRef.current);
        setToast({ id: Date.now(), title: `Color Blast!  +${points}`, text: quiz.question.explanation });
      } else {
        stats.streak = 0;
        stats.hearts -= 1;
        stats.missed.push(quiz.question);
        playSound('wrong', mutedRef.current);
      }
      setStreak(stats.streak);
      setHearts(stats.hearts);
    },
    [addPoints, quiz],
  );

  const closeQuestion = useCallback(() => {
    if (!quiz?.picked) return;
    const stats = statsRef.current;
    const right = quiz.picked === quiz.question.answer;
    stats.asked += 1;
    stats.meter = 0;
    setMeter(0);
    setQuiz(null);
    if (stats.hearts <= 0 || stats.asked >= questions.length) {
      if (right) {
        setPhase('playing');
        void fireBooster().then(() => window.setTimeout(finish, 600));
      } else {
        finish();
      }
      return;
    }
    setPhase('playing');
    if (right) void fireBooster();
  }, [finish, fireBooster, questions.length, quiz]);

  useEffect(() => {
    if (!quiz) return;
    if (quiz.picked && quiz.picked === quiz.question.answer) {
      const timer = window.setTimeout(closeQuestion, 1100);
      return () => window.clearTimeout(timer);
    }
  }, [closeQuestion, quiz]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const cellFromPoint = (clientX: number, clientY: number): number | null => {
    const board = boardRef.current;
    if (!board) return null;
    const rect = board.getBoundingClientRect();
    const c = Math.floor(((clientX - rect.left) / rect.width) * SIZE);
    const r = Math.floor(((clientY - rect.top) / rect.height) * SIZE);
    if (c < 0 || c >= SIZE || r < 0 || r >= SIZE) return null;
    return r * SIZE + c;
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (phase !== 'playing' || busyRef.current) return;
    const index = cellFromPoint(event.clientX, event.clientY);
    if (index === null) return;
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      /* pointer already released */
    }
    dragRef.current = { index, x: event.clientX, y: event.clientY, moved: false };
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.moved) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    const threshold = (boardRef.current?.getBoundingClientRect().width ?? 400) / SIZE / 2.5;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < threshold) return;
    drag.moved = true;
    const r = Math.floor(drag.index / SIZE);
    const c = drag.index % SIZE;
    let target = -1;
    if (Math.abs(dx) > Math.abs(dy)) target = dx > 0 && c < SIZE - 1 ? drag.index + 1 : dx < 0 && c > 0 ? drag.index - 1 : -1;
    else target = dy > 0 && r < SIZE - 1 ? drag.index + SIZE : dy < 0 && r > 0 ? drag.index - SIZE : -1;
    if (target >= 0) void trySwap(drag.index, target);
  };

  const onPointerUp = () => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag || drag.moved) return;
    if (selected === null) setSelected(drag.index);
    else if (selected === drag.index) setSelected(null);
    else {
      const prev = selected;
      const pr = Math.floor(prev / SIZE);
      const dr = Math.floor(drag.index / SIZE);
      const adjacent = (pr === dr && Math.abs(prev - drag.index) === 1) || Math.abs(prev - drag.index) === SIZE;
      if (adjacent) void trySwap(prev, drag.index);
      else setSelected(drag.index);
    }
  };

  const asked = statsRef.current.asked;

  return (
    <div className="arc-game arc-sweet">
      <div className="arc-sweet__bg" aria-hidden />
      <div className="arc-sweet__layout">
        <div
          ref={boardRef}
          className="arc-board"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={() => (dragRef.current = null)}
          role="grid"
          aria-label="Sweet Match board"
        >
          {grid.map((candy, index) => {
            const r = Math.floor(index / SIZE);
            const c = index % SIZE;
            const classes = [
              'arc-candy',
              candy.fresh ? 'is-fresh' : '',
              candy.popping ? (candy.blast ? 'is-blast' : 'is-popping') : '',
              selected === index ? 'is-selected' : '',
              shake.includes(index) ? 'is-shake' : '',
            ]
              .filter(Boolean)
              .join(' ');
            return (
              <div
                key={candy.id}
                className={classes}
                data-type={candy.type}
                style={{
                  top: `${(r / SIZE) * 100}%`,
                  left: `${(c / SIZE) * 100}%`,
                  ['--fall' as string]: candy.fall,
                  ['--delay' as string]: `${(SIZE - r) * 18}ms`,
                }}
              >
                <span className="arc-candy__body" />
              </div>
            );
          })}
          {popups.map((popup) => (
            <span key={popup.id} className="arc-popup" style={{ left: `${popup.x}%`, top: `${popup.y}%` }}>
              {popup.text}
            </span>
          ))}
          {cascade >= 2 ? <span className="arc-cascade" key={cascade}>Cascade x{cascade}!</span> : null}
        </div>

        <aside className="arc-side">
          <div className="arc-side__card">
            <p className="arc-side__label">Score</p>
            <p className="arc-side__value"><Star className="arc-pill__icon text-amber-300" />{score.toLocaleString()}</p>
          </div>
          <div className="arc-side__card">
            <p className="arc-side__label">Lives</p>
            <p className="arc-side__value">
              {Array.from({ length: MAX_HEARTS }, (_, index) => (
                <Heart key={index} className={`arc-pill__icon ${index < hearts ? 'fill-rose-500 text-rose-500' : 'text-slate-500'}`} />
              ))}
            </p>
          </div>
          <div className="arc-side__card">
            <p className="arc-side__label">Booster charge</p>
            <div className="arc-meter" data-full={meter >= METER_MAX ? 'true' : 'false'}>
              <span className="arc-meter__fill" style={{ width: `${(meter / METER_MAX) * 100}%` }} />
            </div>
            <p className="arc-side__hint">Match candies to charge it, then answer to fire a Color Blast.</p>
          </div>
          <div className="arc-side__card arc-side__card--row">
            <span><Zap className="arc-pill__icon text-yellow-300" /> Streak x{streak}</span>
            <span>Q {Math.min(asked + 1, questions.length)}/{questions.length}</span>
          </div>
        </aside>
      </div>

      {toast ? (
        <div className="arc-toast" key={toast.id}>
          <p className="arc-toast__title">{toast.title}</p>
          <p className="arc-toast__text">{toast.text}</p>
        </div>
      ) : null}

      {phase === 'ready' ? (
        <div className="arc-overlay">
          <div className="arc-modal">
            <p className="arc-modal__eyebrow">Sweet Match</p>
            <h3 className="arc-modal__title">Match candies, charge boosters!</h3>
            <ul className="arc-howto">
              <li>Swipe or tap two neighbouring candies to swap them</li>
              <li>Line up 3 or more to pop them and fill the booster bar</li>
              <li>When it is full, answer the question to fire a Color Blast</li>
            </ul>
            <button
              type="button"
              className="arc-cta"
              onClick={() => {
                playSound('tick', mutedRef.current);
                setPhase('playing');
              }}
            >
              <Play className="h-5 w-5" /> Start game
            </button>
          </div>
        </div>
      ) : null}

      {phase === 'question' && quiz ? (
        <div className="arc-overlay">
          <div className="arc-modal arc-modal--quiz">
            <p className="arc-modal__eyebrow"><Sparkles className="h-4 w-4" /> Booster ready · Question {asked + 1} of {questions.length}</p>
            <h3 className="arc-modal__title">{quiz.question.prompt}</h3>
            <div className="arc-options">
              {quiz.options.map((option, index) => {
                const state = !quiz.picked
                  ? ''
                  : option === quiz.question.answer
                    ? 'good'
                    : option === quiz.picked
                      ? 'bad'
                      : 'dim';
                return (
                  <button
                    key={option}
                    type="button"
                    className="arc-option"
                    data-state={state}
                    data-tone={index}
                    disabled={Boolean(quiz.picked)}
                    onClick={() => answer(option)}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
            {!quiz.picked && quiz.question.hint ? (
              quiz.hint ? (
                <p className="arc-modal__note"><Lightbulb className="h-4 w-4" /> {quiz.question.hint}</p>
              ) : (
                <button type="button" className="arc-link" onClick={() => setQuiz({ ...quiz, hint: true })}>
                  <Lightbulb className="h-4 w-4" /> Show hint (half points)
                </button>
              )
            ) : null}
            {quiz.picked && quiz.picked !== quiz.question.answer ? (
              <>
                <p className="arc-answer arc-answer--good">Correct answer: {quiz.question.answer}</p>
                <p className="arc-modal__text">{quiz.question.explanation}</p>
                {quiz.question.misconception ? (
                  <p className="arc-modal__note">Common mix-up: {quiz.question.misconception}</p>
                ) : null}
                <button type="button" className="arc-cta" onClick={closeQuestion} autoFocus>
                  {hearts > 0 ? 'Got it, keep matching' : 'See results'}
                </button>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}