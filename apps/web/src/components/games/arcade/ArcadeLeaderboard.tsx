import { useCallback, useEffect, useState } from 'react';
import type { ArcadeLeaderboardEntry, ArcadeLeaderboardResponse } from '@brightpath/shared';
import { Crown, Loader2, RefreshCw, Trophy } from 'lucide-react';
import { arcadeApi } from '@/lib/arcadeApi';
import './arcadeShare.css';

function Row({ entry }: { entry: ArcadeLeaderboardEntry }) {
  return (
    <tr data-me={entry.isMe ? 'true' : 'false'}>
      <td className="arc-lb__rank">
        {entry.rank === 1 ? <Crown className="h-3.5 w-3.5" aria-label="First place" /> : entry.rank}
      </td>
      <td className="arc-lb__name">
        <span className="arc-lb__nm">{entry.name}</span>
        {entry.isMe ? <span className="arc-lb__you">You</span> : null}
      </td>
      <td>{entry.score.toLocaleString()}</td>
      <td>{entry.accuracy}%</td>
      <td className="arc-lb__xp">{entry.xp}</td>
    </tr>
  );
}

/** Class leaderboard table; `variant="results"` matches the dark in-game results card. */
export function LeaderboardTable({
  data,
  variant = 'panel',
}: {
  data: ArcadeLeaderboardResponse;
  variant?: 'panel' | 'results';
}) {
  if (!data.entries.length) {
    return <p className="arc-lb__empty">No runs yet. Scores appear here as students finish the game.</p>;
  }
  return (
    <table className="arc-lb__table" data-variant={variant}>
      <thead>
        <tr>
          <th>#</th>
          <th>Student</th>
          <th>Score</th>
          <th title="Accuracy">Acc.</th>
          <th>XP</th>
        </tr>
      </thead>
      <tbody>
        {data.entries.map((entry) => (
          <Row key={entry.studentId} entry={entry} />
        ))}
        {data.me ? (
          <>
            <tr className="arc-lb__gap" aria-hidden="true">
              <td colSpan={5}>…</td>
            </tr>
            <Row entry={data.me} />
          </>
        ) : null}
      </tbody>
    </table>
  );
}

/** Fetches and shows the class leaderboard for one assigned arcade activity. */
export function ArcadeLeaderboard({
  assignmentId,
  initial,
  variant = 'panel',
  title = 'Class leaderboard',
}: {
  assignmentId: string;
  initial?: ArcadeLeaderboardResponse | null;
  variant?: 'panel' | 'results';
  title?: string;
}) {
  const [data, setData] = useState<ArcadeLeaderboardResponse | null>(initial ?? null);
  const [loading, setLoading] = useState(!initial);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await arcadeApi.leaderboard(assignmentId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the leaderboard');
    } finally {
      setLoading(false);
    }
  }, [assignmentId]);

  useEffect(() => {
    if (initial) {
      setData(initial);
      setLoading(false);
      return;
    }
    void load();
  }, [initial, load]);

  return (
    <div className="arc-lb" data-variant={variant}>
      <div className="arc-lb__head">
        <p className="arc-lb__title">
          <Trophy className="h-4 w-4" /> {title}
          {data ? <span className="arc-lb__count">{data.playerCount} played</span> : null}
        </p>
        <button type="button" className="arc-lb__refresh" onClick={() => void load()} disabled={loading} aria-label="Refresh leaderboard">
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
        </button>
      </div>
      {error ? <p className="arc-lb__error">{error}</p> : null}
      {data ? <LeaderboardTable data={data} variant={variant} /> : null}
    </div>
  );
}

export default ArcadeLeaderboard;
