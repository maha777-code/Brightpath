import { useCallback, useEffect, useRef, useState } from 'react';
import type { GameArcadeDocument, GamifiedActivityInsights } from '@brightpath/shared';
import { Maximize2, Minimize2, RotateCcw, Star, Trophy, Volume2, VolumeX } from 'lucide-react';
import { TOOL_CHOICE, TOOL_HINT, TOOL_MUTED, TOOL_PANEL, TOOL_SECONDARY, TOOL_SECTION_TITLE } from '@/components/tools/toolTheme';
import LaneRunnerGame from './LaneRunnerGame';
import SweetMatchGame from './SweetMatchGame';
import type { ArcadeResult } from './arcadeKit';
import './arcade.css';

type GameId = 'runner' | 'match' | 'survival' | 'space' | 'detective';

const GAMES: { id: GameId; title: string; tag: string; ready: boolean }[] = [
  { id: 'runner', title: 'Lane Runner', tag: 'Endless runner', ready: true },
  { id: 'match', title: 'Sweet Match', tag: 'Match-3 boosters', ready: true },
  { id: 'survival', title: 'Survival Island', tag: 'Battle royale · no weapons', ready: false },
  { id: 'space', title: 'Space Defender', tag: 'Space shooter', ready: false },
  { id: 'detective', title: 'Mystery Detective', tag: 'Clue puzzle', ready: false },
];

const BEST_KEY = 'mindvault.arcade.best';

function readBest(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(BEST_KEY) ?? '{}') as Record<string, number>;
  } catch {
    return {};
  }
}

export function GameArcade({ document: doc, insights }: { document: GameArcadeDocument; insights: GamifiedActivityInsights }) {
  const [gameId, setGameId] = useState<GameId>('runner');
  const [runKey, setRunKey] = useState(0);
  const [result, setResult] = useState<ArcadeResult | null>(null);
  const [muted, setMuted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [best, setBest] = useState<Record<string, number>>(readBest);
  const stageRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onChange = () => setFullscreen(window.document.fullscreenElement === stageRef.current);
    window.document.addEventListener('fullscreenchange', onChange);
    return () => window.document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggleFullscreen = () => {
    if (window.document.fullscreenElement) void window.document.exitFullscreen();
    else void stageRef.current?.requestFullscreen?.();
  };

  const restart = (next: GameId = gameId) => {
    setGameId(next);
    setResult(null);
    setRunKey((value) => value + 1);
  };

  const onFinish = useCallback(
    (run: ArcadeResult) => {
      window.setTimeout(() => setResult(run), 700);
      setBest((prev) => {
        if ((prev[gameId] ?? 0) >= run.score) return prev;
        const next = { ...prev, [gameId]: run.score };
        localStorage.setItem(BEST_KEY, JSON.stringify(next));
        return next;
      });
    },
    [gameId],
  );

  const answered = result ? result.correct + result.missed.length : 0;
  const accuracy = result ? Math.round((result.correct / Math.max(1, answered)) * 100) : 0;
  const stars = accuracy >= 90 ? 3 : accuracy >= 60 ? 2 : accuracy > 0 ? 1 : 0;
  const otherGame = GAMES.find((game) => game.ready && game.id !== gameId);

  return (
    <section className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {GAMES.map((game) => (
          <button
            key={game.id}
            type="button"
            className={`${TOOL_CHOICE} arc-pick`}
            data-active={game.id === gameId ? 'true' : 'false'}
            aria-pressed={game.id === gameId}
            disabled={!game.ready}
            onClick={() => restart(game.id)}
          >
            <span className="arc-pick__thumb">
              <img src={`/assets/arcade/${game.id}.webp`} alt="" loading="lazy" />
              {!game.ready ? <span className="arc-pick__badge">Next update</span> : null}
            </span>
            <span className="mt-2 block text-sm font-semibold">{game.title}</span>
            <span className={`${TOOL_MUTED} block text-xs`}>{game.tag}</span>
          </button>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-3">
          <div ref={stageRef} className="arc-stage" data-fullscreen={fullscreen ? 'true' : 'false'}>
            <div className="arc-stage__inner">
              {gameId === 'runner' ? (
                <LaneRunnerGame key={`runner-${runKey}`} questions={doc.questions} muted={muted} onFinish={onFinish} />
              ) : (
                <SweetMatchGame key={`match-${runKey}`} questions={doc.questions} muted={muted} onFinish={onFinish} />
              )}
              {result ? (
                <div className="arc-overlay arc-overlay--results">
                  <div className="arc-modal arc-modal--results">
                    <p className="arc-modal__eyebrow">
                      <Trophy className="h-4 w-4" /> Run complete
                    </p>
                    <div className="arc-stars" aria-label={`${stars} of 3 stars`}>
                      {[0, 1, 2].map((index) => (
                        <Star key={index} className={index < stars ? 'fill-amber-300 text-amber-300' : 'text-slate-600'} />
                      ))}
                    </div>
                    <div className="arc-stats">
                      <div><span>{result.score.toLocaleString()}</span>Score</div>
                      <div><span>{accuracy}%</span>Accuracy · {answered}/{result.total} answered</div>
                      <div><span>x{result.bestCombo}</span>Best streak</div>
                    </div>
                    {result.missed.length ? (
                      <div className="arc-review">
                        <p className="arc-review__title">Review what you missed</p>
                        <ul>
                          {result.missed.map((question) => (
                            <li key={question.id}>
                              <strong>{question.prompt}</strong>
                              <span className="arc-review__answer">{question.answer}</span>
                              <span>{question.explanation}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <p className="arc-modal__text">Perfect run! Every answer was correct.</p>
                    )}
                    <div className="arc-actions">
                      <button type="button" className="arc-cta" onClick={() => restart()}>
                        <RotateCcw className="h-5 w-5" /> Play again
                      </button>
                      {otherGame ? (
                        <button type="button" className="arc-cta arc-cta--ghost" onClick={() => restart(otherGame.id)}>
                          Try {otherGame.title}
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
            {fullscreen ? (
              <button type="button" className="arc-icon-btn arc-exit" onClick={toggleFullscreen} aria-label="Exit fullscreen">
                <Minimize2 className="h-5 w-5" />
              </button>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="mv-pres-generate inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold" onClick={toggleFullscreen}>
              <Maximize2 className="h-4 w-4" /> Play fullscreen
            </button>
            <button type="button" className={TOOL_SECONDARY} onClick={() => restart()}>
              <RotateCcw className="h-4 w-4" /> Restart
            </button>
            <button type="button" className={TOOL_SECONDARY} onClick={() => setMuted((value) => !value)} aria-pressed={muted}>
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              {muted ? 'Sound off' : 'Sound on'}
            </button>
            {best[gameId] ? <span className={`${TOOL_HINT} ml-auto`}>Best score on this device: {best[gameId].toLocaleString()}</span> : null}
          </div>
        </div>

        <aside className="space-y-3">
          <div className={TOOL_PANEL}>
            <p className={TOOL_HINT}>Mission</p>
            <p className="mt-1 text-sm leading-relaxed">{doc.missionIntro}</p>
          </div>
          <div className={TOOL_PANEL}>
            <p className={TOOL_SECTION_TITLE}>Learning content</p>
            <p className={`${TOOL_HINT} mt-2`}>Key terms</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {insights.keyTerms.slice(0, 8).map((term) => (
                <span key={term} className="arc-chip">{term}</span>
              ))}
            </div>
            <p className={`${TOOL_HINT} mt-3`}>Misconceptions targeted</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {insights.misconceptions.slice(0, 6).map((item) => (
                <span key={item} className="arc-chip arc-chip--warn">{item}</span>
              ))}
            </div>
          </div>
          <details className={TOOL_PANEL}>
            <summary className={`${TOOL_SECTION_TITLE} cursor-pointer`}>
              Question pack · {doc.questions.length} questions (teacher view)
            </summary>
            <ol className="mt-3 list-none space-y-2 pl-0 text-sm">
              {doc.questions.map((question, index) => (
                <li key={question.id}>
                  <span className="font-semibold">{index + 1}. {question.prompt}</span>
                  <span className="block mv-pres-accent">{question.answer}</span>
                  <span className={`${TOOL_MUTED} block text-xs`}>Distractors: {question.distractors.join(' · ')}</span>
                </li>
              ))}
            </ol>
          </details>
        </aside>
      </div>
    </section>
  );
}

export default GameArcade;
