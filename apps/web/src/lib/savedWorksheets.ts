import type { WorksheetGeneratorPayload, WorksheetGeneratorResponse } from '@brightpath/shared';

export const SAVED_WORKSHEETS_KEY = 'mindvault_saved_worksheets';

export interface SavedWorksheet {
  id: string;
  title: string;
  gradeLevel: string;
  topic: string;
  content: string;
  savedAt: string;
  worksheet?: WorksheetGeneratorResponse;
  payload?: WorksheetGeneratorPayload;
}

export function readSavedWorksheets(): SavedWorksheet[] {
  try {
    const raw = localStorage.getItem(SAVED_WORKSHEETS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => item && typeof item.id === 'string' && typeof item.title === 'string');
  } catch {
    return [];
  }
}

export function writeSavedWorksheets(items: SavedWorksheet[]) {
  try {
    localStorage.setItem(SAVED_WORKSHEETS_KEY, JSON.stringify(items.slice(0, 40)));
  } catch {
    /* ignore quota */
  }
}
