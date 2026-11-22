import type { GameArcadeDocument } from '@brightpath/shared';

/** Built by `vite.arcade.config.ts` into public/; the placeholders below are filled per download. */
export const ARCADE_TEMPLATE_URL = '/arcade-player/template.html';
const PACK_PLACEHOLDER = '__ARCADE_PACK_JSON__';
const TITLE_PLACEHOLDER = '__ARCADE_TITLE__';

export interface ArcadeExportPack {
  gameId: string;
  document: GameArcadeDocument;
}

/** JSON that is safe inside <script type="application/json">. */
function scriptSafeJson(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);
}

function fileStem(title: string): string {
  return title.replace(/[^\w]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'arcade-game';
}

export async function buildArcadeHtml(pack: ArcadeExportPack): Promise<string> {
  const res = await fetch(ARCADE_TEMPLATE_URL, { cache: 'no-cache' });
  const template = res.ok ? await res.text() : '';
  if (!template.includes(PACK_PLACEHOLDER)) {
    throw new Error('The offline game player is not built yet. Run `npm run build` in apps/web, then try again.');
  }
  return template
    .replace(TITLE_PLACEHOLDER, () => escapeHtml(pack.document.title))
    .replace(PACK_PLACEHOLDER, () => scriptSafeJson(pack));
}

export async function downloadArcadeHtml(pack: ArcadeExportPack): Promise<number> {
  const html = await buildArcadeHtml(pack);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${fileStem(pack.document.title)}-${pack.gameId}.html`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  return blob.size;
}
