import { useCallback, useEffect, useState } from 'react';
import type { UserAnalyticsResponse, SkillAssessmentRequest } from '@brightpath/shared';
import { api } from '@/lib/api';

export function useAnalytics(enabled: boolean, ageGroupKey?: string | null) {
  const [data, setData] = useState<UserAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.getAnalytics();
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh, ageGroupKey]);

  const submitSkillAssessment = useCallback(async (body: SkillAssessmentRequest) => {
    const res = await api.submitSkillAssessment(body);
    setData(res);
    return res;
  }, []);

  const completeGoal = useCallback(async (goalId: string) => {
    const res = await api.completeGoal(goalId);
    if (res.analytics) setData(res.analytics);
    return res;
  }, []);

  return { data, loading, error, refresh, submitSkillAssessment, completeGoal };
}
