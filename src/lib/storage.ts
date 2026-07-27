import type { LearnerProfile, SkillProgress, SessionState } from '@/types';

const PROFILE_KEY = 'brightpath_profile';
const PROGRESS_KEY = 'brightpath_progress';
const SESSION_KEY = 'brightpath_session';

export function loadProfile(): LearnerProfile | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? (JSON.parse(raw) as LearnerProfile) : null;
  } catch {
    return null;
  }
}

export function saveProfile(profile: LearnerProfile): void {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export function loadProgress(): SkillProgress[] {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    return raw ? (JSON.parse(raw) as SkillProgress[]) : [];
  } catch {
    return [];
  }
}

export function saveProgress(progress: SkillProgress[]): void {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
}

export function updateProgressAfterLesson(
  subject: import('@/types').Subject,
  correctRatio: number,
): SkillProgress[] {
  const existing = loadProgress();
  const idx = existing.findIndex((p) => p.subject === subject);
  const today = new Date().toISOString().slice(0, 10);

  if (idx >= 0) {
    const prev = existing[idx];
    const lastDay = prev.lastSession?.slice(0, 10);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    let streak = prev.streakDays;
    if (lastDay === today) {
      // same day, keep streak
    } else if (lastDay === yesterdayStr) {
      streak += 1;
    } else {
      streak = 1;
    }

    existing[idx] = {
      ...prev,
      lessonsCompleted: prev.lessonsCompleted + 1,
      streakDays: streak,
      lastSession: new Date().toISOString(),
      masteryPercent: Math.min(100, Math.round(prev.masteryPercent + correctRatio * 8)),
    };
  } else {
    existing.push({
      subject,
      lessonsCompleted: 1,
      streakDays: 1,
      lastSession: new Date().toISOString(),
      masteryPercent: Math.round(correctRatio * 20),
    });
  }

  saveProgress(existing);
  return existing;
}

export function loadSession(): SessionState | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as SessionState) : null;
  } catch {
    return null;
  }
}

export function saveSession(session: SessionState | null): void {
  if (session) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } else {
    sessionStorage.removeItem(SESSION_KEY);
  }
}
