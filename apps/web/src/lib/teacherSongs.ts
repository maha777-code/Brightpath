import {
  FREE_SONGS_PER_WEEK,
  PLUS_SONGS_PER_WEEK,
  lyricsPreview,
  nextMondayIso,
  type TeacherSong,
  type TeacherSongsListResponse,
} from '@brightpath/shared';

const STORAGE_KEY = 'brightpath_teacher_songs';

export function albumArtDataUrl(topic: string): string {
  const seed = [...topic].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  const hue = seed % 360;
  const hue2 = (hue + 48) % 360;
  const initials = topic
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue},70%,58%)"/><stop offset="1" stop-color="hsl(${hue2},72%,42%)"/></linearGradient></defs><rect width="160" height="160" rx="18" fill="url(#g)"/><circle cx="80" cy="78" r="28" fill="rgba(255,255,255,0.18)"/><path d="M72 58v44l36-10V64z" fill="#fff"/><text x="80" y="148" text-anchor="middle" font-size="18" font-family="Georgia, serif" fill="#fff">${initials}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function startOfWeekMonday(from = new Date()): Date {
  const date = new Date(from);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function readLocalSongs(): TeacherSong[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as TeacherSong[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeLocalSongs(songs: TeacherSong[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(songs.slice(0, 100)));
  } catch {
    /* quota */
  }
}

export function upsertLocalSong(song: TeacherSong): TeacherSong[] {
  const next = [song, ...readLocalSongs().filter((item) => item.id !== song.id)];
  writeLocalSongs(next);
  return next;
}

export function removeLocalSong(id: string): TeacherSong[] {
  const next = readLocalSongs().filter((item) => item.id !== id);
  writeLocalSongs(next);
  return next;
}

export function localSongsResponse(): TeacherSongsListResponse {
  const items = readLocalSongs().sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  const weekStart = startOfWeekMonday();
  return {
    items,
    usedThisWeek: items.filter((item) => new Date(item.createdAt) >= weekStart).length,
    weeklyLimit: FREE_SONGS_PER_WEEK,
    resetsAt: nextMondayIso(),
    plusLimit: PLUS_SONGS_PER_WEEK,
  };
}

export function formatResetLabel(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

export function formatCreatedAt(iso: string): string {
  const created = new Date(iso);
  const diffMs = Date.now() - created.getTime();
  const hours = Math.floor(diffMs / 3_600_000);
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
  return created.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export { lyricsPreview };
