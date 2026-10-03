const STORAGE_KEY = 'brightpath.adminToolActive';
const SEED_KEY = 'brightpath.adminToolActive.seed';
const SEED_VERSION = 'curriculum-studio-active';

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

function seedActiveTools(): void {
  try {
    if (localStorage.getItem(SEED_KEY) === SEED_VERSION) return;
    const next = { ...readMap(), 'curriculum-studio': true };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    localStorage.setItem(SEED_KEY, SEED_VERSION);
  } catch {
    // Storage can be unavailable in private mode.
  }
}

seedActiveTools();

/** Admin enable flag. Missing entries stay on, matching the catalog default. */
export function isTeacherToolEnabled(toolId: string): boolean {
  const value = readMap()[toolId];
  return value !== false;
}

export function setTeacherToolEnabled(toolId: string, active: boolean): void {
  const next = { ...readMap(), [toolId]: active };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}
