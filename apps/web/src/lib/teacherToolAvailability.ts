const STORAGE_KEY = 'brightpath.adminToolActive';

function readMap(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, boolean>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

/** Admin enable flag. Missing entries stay on, matching the catalog default. */
export function isTeacherToolEnabled(toolId: string): boolean {
  const value = readMap()[toolId];
  return value !== false;
}

export function setTeacherToolEnabled(toolId: string, active: boolean): void {
  const next = { ...readMap(), [toolId]: active };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}
