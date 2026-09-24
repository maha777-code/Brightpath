const KEY = 'brightpath.exportWatermark';

export function readExportWatermark(): string {
  try {
    return localStorage.getItem(KEY)?.trim() ?? '';
  } catch {
    return '';
  }
}

export function writeExportWatermark(value: string) {
  localStorage.setItem(KEY, value.trim());
}

export function watermarkFooterHtml(): string {
  const text = readExportWatermark();
  if (!text) return '';
  const safe = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  return `<p style="margin-top:32px;font-size:11px;letter-spacing:0.04em;color:#64748b;text-align:center">${safe}</p>`;
}
