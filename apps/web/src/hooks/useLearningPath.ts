import { useCallback, useEffect, useState } from 'react';
import type { LearningPathNode, LearningPathResponse } from '@brightpath/shared';
import { api } from '@/lib/api';

export function useLearningPath(enabled: boolean, ageGroupKey?: string | null) {
  const [nodes, setNodes] = useState<LearningPathNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setNodes([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res: LearningPathResponse = await api.getLearningPath();
      setNodes(res.nodes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load path');
      setNodes([]);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh, ageGroupKey]);

  const submitAssessment = useCallback(
    async (nodeId: string, scorePercent: number) => {
      const res = await api.submitAssessment({ nodeId, scorePercent });
      setNodes(res.path);
      return res;
    },
    [],
  );

  return { nodes, loading, error, refresh, submitAssessment };
}
