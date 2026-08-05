/** Shared study-time / streak helpers (used by API + web). */

/** Format seconds → `45m` or `8h 15m` */
export function formatStudyTime(totalSeconds: number): string {
  const secs = Math.max(0, Math.floor(totalSeconds));
  const totalMins = Math.floor(secs / 60);
  if (totalMins < 60) return `${totalMins}m`;
  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

/** Flame emoji count by streak length */
export function streakFlames(days: number): string {
  if (days <= 0) return '';
  if (days <= 3) return '🔥';
  if (days <= 7) return '🔥🔥';
  return '🔥🔥🔥';
}

/** Local calendar date YYYY-MM-DD for a Date in a given timezone (fallback: UTC). */
export function toLocalDateString(date: Date, timeZone?: string): string {
  try {
    if (timeZone) {
      const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).formatToParts(date);
      const y = parts.find((p) => p.type === 'year')?.value;
      const m = parts.find((p) => p.type === 'month')?.value;
      const d = parts.find((p) => p.type === 'day')?.value;
      if (y && m && d) return `${y}-${m}-${d}`;
    }
  } catch {
    /* fall through */
  }
  return date.toISOString().slice(0, 10);
}

/** Monday 00:00 of the week containing `dateStr` (YYYY-MM-DD), as YYYY-MM-DD. */
export function startOfWeekMonday(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const day = dt.getUTCDay(); // 0 Sun … 6 Sat
  const diffToMon = day === 0 ? -6 : 1 - day;
  dt.setUTCDate(dt.getUTCDate() + diffToMon);
  return dt.toISOString().slice(0, 10);
}

export function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

export function daysBetween(earlier: string, later: string): number {
  const a = new Date(`${earlier}T12:00:00Z`).getTime();
  const b = new Date(`${later}T12:00:00Z`).getTime();
  return Math.round((b - a) / 86_400_000);
}
