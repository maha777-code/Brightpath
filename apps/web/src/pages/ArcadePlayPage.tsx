import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type {
  ArcadeAssignmentDetail,
  ArcadeAssignmentLookup,
  ArcadeAttempt,
  ArcadeLeaderboardResponse,
  ArcadeRemovedAssignment,
  GamifiedActivityInsights,
} from '@brightpath/shared';
import { Archive, ArrowLeft, Gamepad2, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { arcadeApi } from '@/lib/arcadeApi';
import { GameArcade } from '@/components/games/arcade/GameArcade';
import { ArcadeLeaderboard } from '@/components/games/arcade/ArcadeLeaderboard';
import type { ArcadeResult } from '@/components/games/arcade/arcadeKit';
import { TOOL_CARD, TOOL_HINT, TOOL_PAGE, TOOL_SUBTITLE, TOOL_TITLE } from '@/components/tools/toolTheme';

const NO_INSIGHTS: GamifiedActivityInsights = { keyTerms: [], learningObjectives: [], misconceptions: [] };

type SaveState =
  | { status: 'idle' }
  | { status: 'saving' }
  | { status: 'saved'; attempt: ArcadeAttempt; leaderboard: ArcadeLeaderboardResponse }
  | { status: 'error'; message: string };

/** Student player for an assigned arcade activity: same game components, saved runs, class leaderboard. */
export function ArcadePlayView({
  assignment,
  access,
  submit,
}: {
  assignment: ArcadeAssignmentDetail;
  access: 'teacher' | 'student';
  submit: (run: ArcadeResult) => Promise<{ attempt: ArcadeAttempt; leaderboard: ArcadeLeaderboardResponse }>;
}) {
  const [save, setSave] = useState<SaveState>({ status: 'idle' });

  const onRunComplete = useCallback(
    (run: ArcadeResult) => {
      if (access !== 'student') return;
      setSave({ status: 'saving' });
      submit(run)
        .then((res) => setSave({ status: 'saved', ...res }))
        .catch((err: unknown) =>
          setSave({ status: 'error', message: err instanceof Error ? err.message : 'Could not save this run' }),
        );
    },
    [access, submit],
  );

  const renderResultsExtra = () => (
    <>
      {access === 'teacher' ? (
        <p className="arc-save" data-tone="muted">Teacher preview · this run is not saved.</p>
      ) : save.status === 'saving' ? (
        <p className="arc-save" data-tone="muted">Saving your score…</p>
      ) : save.status === 'saved' ? (
        <p className="arc-save">Score saved · +{save.attempt.xp} XP</p>
      ) : save.status === 'error' ? (
        <p className="arc-save" data-tone="error">{save.message}</p>
      ) : null}
      {save.status === 'saving' ? null : (
        <ArcadeLeaderboard
          key={save.status === 'saved' ? save.attempt.id : 'board'}
          assignmentId={assignment.id}
          initial={save.status === 'saved' ? save.leaderboard : null}
          variant="results"
        />
      )}
    </>
  );

  return (
    <>
      <header>
        <p className={`${TOOL_HINT} uppercase tracking-wider`}>
          {assignment.className} · {assignment.document.subject} · {assignment.document.gradeLabel}
        </p>
        <h1 className={`${TOOL_TITLE} mt-1`}>
          <Gamepad2 className="h-6 w-6 text-violet-300" /> {assignment.title}
        </h1>
        <p className={TOOL_SUBTITLE}>{assignment.questionCount} questions · your best runs count towards the class leaderboard.</p>
      </header>
      <div className="mt-6">
        <GameArcade
          document={assignment.document}
          insights={NO_INSIGHTS}
          initialGameId={assignment.gameId}
          lockGame
          studentMode
          onRunComplete={onRunComplete}
          renderResultsExtra={renderResultsExtra}
        />
      </div>
    </>
  );
}

/** Shown when the teacher has unassigned the activity. */
export function ArcadeUnavailableView({
  removed,
  access,
  homePath,
}: {
  removed: ArcadeRemovedAssignment;
  access: 'teacher' | 'student';
  homePath: string;
}) {
  return (
    <div className="arc-unavailable" role="status">
      <span className="arc-unavailable__icon" aria-hidden>
        <Archive className="h-6 w-6" />
      </span>
      <h1 className={`${TOOL_TITLE} mt-3 justify-center`}>This game is no longer available</h1>
      <p className={`${TOOL_SUBTITLE} mt-2`}>
        {access === 'teacher'
          ? `You unassigned “${removed.title}” from ${removed.className}. Students can no longer open it.`
          : `Your teacher removed “${removed.title}” from ${removed.className}. Check your dashboard for other games to play.`}
      </p>
      <Link to={homePath} className="mv-pres-generate arc-unavailable__cta no-underline">
        <ArrowLeft className="h-4 w-4" /> Back to dashboard
      </Link>
    </div>
  );
}

export default function ArcadePlayPage() {
  const { id = '' } = useParams();
  const { homePath } = useAuth();
  const [data, setData] = useState<ArcadeAssignmentLookup | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    arcadeApi
      .get(id)
      .then((res) => live && setData(res))
      .catch((err: unknown) => live && setError(err instanceof Error ? err.message : 'Could not open this game'));
    return () => {
      live = false;
    };
  }, [id]);

  const submit = useCallback(
    (run: ArcadeResult) =>
      arcadeApi.submit(id, {
        score: run.score,
        correct: run.correct,
        total: run.total,
        bestStreak: run.bestCombo,
        missedQuestionIds: run.missed.map((question) => question.id),
      }),
    [id],
  );

  return (
    <div className={TOOL_PAGE}>
      <Link to={homePath} className="mv-pres-link mb-4 inline-flex items-center gap-1 text-sm no-underline">
        <ArrowLeft className="h-4 w-4" /> Back to dashboard
      </Link>
      <section className={TOOL_CARD}>
        {data?.status === 'removed' ? (
          <ArcadeUnavailableView removed={data.removed} access={data.access} homePath={homePath} />
        ) : data ? (
          <ArcadePlayView assignment={data.assignment} access={data.access} submit={submit} />
        ) : error ? (
          <p className="text-sm text-rose-300">{error}</p>
        ) : (
          <p className={`${TOOL_HINT} inline-flex items-center gap-2`}>
            <Loader2 className="h-4 w-4 animate-spin" /> Loading your game…
          </p>
        )}
      </section>
    </div>
  );
}
