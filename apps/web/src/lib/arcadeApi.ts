import type {
  ArcadeAssignmentDetail,
  ArcadeAssignmentLookup,
  ArcadeAssignmentSummary,
  ArcadeAttemptInput,
  ArcadeAttemptResponse,
  ArcadeLeaderboardResponse,
  GameArcadeDocument,
  StudentArcadeAssignment,
} from '@brightpath/shared';
import { request } from '@/lib/api';

const post = (body: unknown): RequestInit => ({ method: 'POST', body: JSON.stringify(body) });

export const arcadeApi = {
  assign: (body: { classBatchId: string; gameId: string; document: GameArcadeDocument }) =>
    request<{ assignment: ArcadeAssignmentDetail }>('/arcade/assignments', post(body)),
  managed: (classBatchId?: string) =>
    request<{ assignments: ArcadeAssignmentSummary[] }>(
      `/arcade/assignments${classBatchId ? `?classBatchId=${encodeURIComponent(classBatchId)}` : ''}`,
    ),
  mine: () => request<{ assignments: StudentArcadeAssignment[] }>('/arcade/assignments/mine'),
  get: (id: string) => request<ArcadeAssignmentLookup>(`/arcade/assignments/${encodeURIComponent(id)}`),
  remove: (id: string) =>
    request<{ id: string; removedAt: string }>(`/arcade/assignments/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  submit: (id: string, attempt: ArcadeAttemptInput) =>
    request<ArcadeAttemptResponse>(`/arcade/assignments/${encodeURIComponent(id)}/attempts`, post(attempt)),
  leaderboard: (id: string) =>
    request<ArcadeLeaderboardResponse>(`/arcade/assignments/${encodeURIComponent(id)}/leaderboard`),
};
