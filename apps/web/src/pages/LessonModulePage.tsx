import { useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { LearningPathNode } from '@brightpath/shared';

/**
 * Lightweight module launch page when a path node has no learnRoute.
 * Lets the student practice and submit a quick mastery score to update the path.
 */
export default function LessonModulePage() {
  const { nodeId } = useParams<{ nodeId: string }>();
  const navigate = useNavigate();
  const [node, setNode] = useState<LearningPathNode | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const { nodes } = await api.getLearningPath();
        if (cancelled) return;
        const found = nodes.find((n) => n.id === nodeId) ?? null;
        setNode(found);
        if (found?.learnRoute) {
          navigate(found.learnRoute, { replace: true });
        }
      } catch {
        if (!cancelled) setMessage('Could not load module.');
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [navigate, nodeId]);

  const practice = async (score: number) => {
    if (!nodeId) return;
    setBusy(true);
    setMessage('');
    try {
      await api.submitAssessment({ nodeId, scorePercent: score });
      setMessage(
        score >= 80
          ? 'Great work — module completed! Returning to dashboard…'
          : score < 50
            ? 'Let’s review the foundation — check your path for a Review node.'
            : 'Progress saved. Keep practicing!',
      );
      window.setTimeout(() => navigate('/dashboard'), 1200);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page">
      <button type="button" className="btn btn-ghost" onClick={() => navigate('/dashboard')}>
        ← Back to dashboard
      </button>
      <div className="page-header">
        <h1 className="page-title">{node?.title ?? 'Module'}</h1>
        <p className="page-subtitle">
          {node?.subjectCategory ?? 'Practice'} · Current mastery {node?.masteryScore ?? 0}%
        </p>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <p style={{ marginBottom: 12 }}>
          Practice this module with Ms. Bright, then mark how you did to update your personalized
          path.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy}
            onClick={() => void practice(90)}
          >
            I got it (≥80% — complete)
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={busy}
            onClick={() => void practice(55)}
          >
            Still learning (~55%)
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            disabled={busy}
            onClick={() => void practice(35)}
          >
            Need a foundation review (&lt;50%)
          </button>
        </div>
        {message && (
          <p style={{ marginTop: 14, color: 'var(--indigo)', fontWeight: 600 }}>{message}</p>
        )}
      </div>
    </div>
  );
}
