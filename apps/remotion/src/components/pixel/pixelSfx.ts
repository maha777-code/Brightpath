/** Tiny 8-bit-style WAV data URIs for Remotion Audio (no binary assets). */

function wavDataUri(freq: number, durationMs: number, volume = 0.28, decay = true): string {
  const sampleRate = 8000;
  const n = Math.max(8, Math.floor((sampleRate * durationMs) / 1000));
  const data = new Int16Array(n);
  for (let i = 0; i < n; i++) {
    const env = decay ? 1 - i / n : 1;
    const wobble = freq * (1 + 0.04 * Math.sin(i / 12));
    data[i] = Math.round(Math.sin((2 * Math.PI * wobble * i) / sampleRate) * volume * env * 32767);
  }
  const bytes = data.length * 2;
  const buffer = new ArrayBuffer(44 + bytes);
  const view = new DataView(buffer);
  const writeStr = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + bytes, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, bytes, true);
  for (let i = 0; i < data.length; i++) view.setInt16(44 + i * 2, data[i], true);
  const u8 = new Uint8Array(buffer);
  let bin = '';
  for (let i = 0; i < u8.length; i++) bin += String.fromCharCode(u8[i]);
  return `data:audio/wav;base64,${btoa(bin)}`;
}

export function sfxSrc(trigger: string | undefined): string {
  const t = String(trigger ?? '').toLowerCase();
  if (t.includes('glitch') || t.includes('error')) return wavDataUri(140, 220, 0.32);
  if (t.includes('chime') || t.includes('success') || t.includes('compile')) return wavDataUri(880, 180, 0.22);
  if (t.includes('neural') || t.includes('power')) return wavDataUri(420, 320, 0.26);
  if (t.includes('boss') || t.includes('fanfare')) return wavDataUri(330, 420, 0.3);
  if (t.includes('click') || t.includes('button')) return wavDataUri(760, 70, 0.2, false);
  return wavDataUri(520, 90, 0.18, false);
}

export function sfxFlashColor(trigger: string | undefined): string {
  const t = String(trigger ?? '').toLowerCase();
  if (t.includes('glitch') || t.includes('error')) return 'rgba(244, 63, 94, 0.28)';
  if (t.includes('neural') || t.includes('power')) return 'rgba(167, 139, 250, 0.28)';
  if (t.includes('boss')) return 'rgba(250, 204, 21, 0.3)';
  if (t.includes('success') || t.includes('compile') || t.includes('chime')) return 'rgba(52, 211, 153, 0.25)';
  return 'rgba(34, 211, 238, 0.18)';
}
