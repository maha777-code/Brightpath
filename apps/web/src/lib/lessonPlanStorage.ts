import type { LessonPlanResponse } from '@brightpath/shared';

const HISTORY_KEY = 'lesson_plan_history';
const FAVORITE_KEY = 'lesson_plan_favorites';
const RESOURCES_KEY = 'my_resources_lesson_plans';

export interface LessonPlanHistoryItem {
  id: string;
  title: string;
  createdAt: string;
  gradeLevel: string;
  topicPrompt: string;
  standardsSet?: string;
  additionalCriteria?: string;
  attachedFiles?: Array<{ name: string }>;
  content: string;
  plan: LessonPlanResponse;
  favorite?: boolean;
  feedback?: 'up' | 'down';
}

function readJsonArray<T>(key: string): T[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function isHistoryItem(value: LessonPlanHistoryItem): boolean {
  return Boolean(value && typeof value.id === 'string' && value.plan);
}

export function loadLessonHistory(): LessonPlanHistoryItem[] {
  return readJsonArray<LessonPlanHistoryItem>(HISTORY_KEY).filter(isHistoryItem);
}

export function saveLessonPlanToHistory(item: LessonPlanHistoryItem) {
  const existing = loadLessonHistory().filter((entry) => entry.id !== item.id);
  localStorage.setItem(HISTORY_KEY, JSON.stringify([item, ...existing].slice(0, 40)));
}

export function loadFavoriteIds(): string[] {
  return readJsonArray<string>(FAVORITE_KEY).filter((id) => typeof id === 'string');
}

export function persistFavoriteIds(ids: string[]) {
  localStorage.setItem(FAVORITE_KEY, JSON.stringify(ids.slice(0, 80)));
}

export function loadSavedLessonPlans(): LessonPlanHistoryItem[] {
  return readJsonArray<LessonPlanHistoryItem>(RESOURCES_KEY).filter(isHistoryItem);
}

/** Returns false when the plan was already in My Resources. */
export function saveLessonPlanToResources(item: LessonPlanHistoryItem): boolean {
  const existing = loadSavedLessonPlans();
  if (existing.some((entry) => entry.id === item.id)) return false;
  localStorage.setItem(RESOURCES_KEY, JSON.stringify([item, ...existing].slice(0, 80)));
  return true;
}
