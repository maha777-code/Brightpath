import type { GameArcadeDocument } from './gamifiedActivityTool.js';

/** A Game Arcade question pack plus the game the teacher picked, assigned to one class. */
export interface ArcadeAssignmentSummary {
  id: string;
  title: string;
  gameId: string;
  classBatchId: string;
  className: string;
  questionCount: number;
  createdAt: string;
  /** Students with at least one saved run. */
  playerCount: number;
}

export interface ArcadeAssignmentDetail extends ArcadeAssignmentSummary {
  document: GameArcadeDocument;
}

/** Returned instead of the detail when the teacher has unassigned the activity. */
export interface ArcadeRemovedAssignment {
  id: string;
  title: string;
  className: string;
  removedAt: string;
}

export type ArcadeAssignmentLookup =
  | { status: 'active'; assignment: ArcadeAssignmentDetail; access: 'teacher' | 'student' }
  | { status: 'removed'; removed: ArcadeRemovedAssignment; access: 'teacher' | 'student' };

/** Student-side list entry with the student's own best run. */
export interface StudentArcadeAssignment extends ArcadeAssignmentSummary {
  myBestScore: number | null;
  myXp: number;
}

export interface ArcadeAttemptInput {
  score: number;
  correct: number;
  total: number;
  bestStreak: number;
  missedQuestionIds: string[];
}

export interface ArcadeAttempt extends ArcadeAttemptInput {
  id: string;
  accuracy: number;
  xp: number;
  createdAt: string;
}

export interface ArcadeLeaderboardEntry {
  rank: number;
  studentId: string;
  name: string;
  score: number;
  accuracy: number;
  bestStreak: number;
  /** XP from the student's best-XP run on this activity; replays never stack XP. */
  xp: number;
  attempts: number;
  isMe: boolean;
}

export interface ArcadeLeaderboardResponse {
  assignmentId: string;
  entries: ArcadeLeaderboardEntry[];
  /** The signed-in student's row when they are outside the top list. */
  me: ArcadeLeaderboardEntry | null;
  playerCount: number;
}

export interface ArcadeAttemptResponse {
  attempt: ArcadeAttempt;
  leaderboard: ArcadeLeaderboardResponse;
}

/** Same accuracy rule as the arcade results screen: correct out of answered questions. */
export function arcadeAccuracy(correct: number, missedCount: number): number {
  return Math.round((correct / Math.max(1, correct + missedCount)) * 100);
}

/** 10 XP per correct answer, an accuracy bonus, and 2 XP per streak step (capped at 10). */
export function arcadeAttemptXp(input: { correct: number; accuracy: number; bestStreak: number }): number {
  const bonus = input.accuracy >= 90 ? 30 : input.accuracy >= 60 ? 15 : 0;
  return Math.max(0, input.correct) * 10 + bonus + Math.min(Math.max(0, input.bestStreak), 10) * 2;
}

export function arcadePlayPath(assignmentId: string): string {
  return `/play/${encodeURIComponent(assignmentId)}`;
}
