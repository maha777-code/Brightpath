export const PIXEL_FONT =
  '"Courier New", "Lucida Console", ui-monospace, monospace';

export const PIXEL_COLORS = {
  bgTop: '#0b1020',
  bgBottom: '#1a0a2e',
  grid: 'rgba(56, 189, 248, 0.18)',
  hud: '#041016',
  hudBorder: '#22d3ee',
  terminal: '#07140c',
  terminalText: '#86efac',
  mana: '#38bdf8',
  exp: '#facc15',
  cpu: '#fb7185',
  hero: '#fde68a',
  companion: '#a78bfa',
  wall: '#64748b',
  hazard: '#f43f5e',
  path: '#34d399',
};

export function parseHudNumber(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const n = parseFloat(String(raw).replace(/[^\d.]/g, ''));
  return Number.isFinite(n) ? n : fallback;
}

export function actionLabel(action: string | undefined): string {
  const a = String(action ?? 'idle').toLowerCase();
  if (a.includes('wall')) return 'HARDCODED FAIL';
  if (a.includes('loop')) return 'LOOPING';
  if (a.includes('dodge') || a.includes('fail')) return 'NOISE HIT';
  if (a.includes('feed') || a.includes('train')) return 'TRAINING';
  if (a.includes('co_op') || a.includes('coop') || a.includes('clear')) return 'CO-OP CLEAR';
  if (a.includes('jump')) return 'JUMP';
  if (a.includes('compil')) return 'COMPILE';
  if (a.includes('celebr')) return 'LEVEL UP';
  return a.replace(/_/g, ' ').toUpperCase();
}
