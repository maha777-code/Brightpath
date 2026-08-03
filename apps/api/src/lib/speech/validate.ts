/** Reject transcripts that look like model hallucinations or tutor-echo bleed. */
export function looksLikeBadTranscript(text: string): boolean {
  const lower = text.toLowerCase().trim();
  if (lower.length < 1) return true;

  const badPhrases = [
    'sound driver',
    'sound underscore',
    'dashboard parameter',
    'underscore driver',
    'environment variable',
    'npm install',
    'http://',
    'https://',
    'configure your',
    'bright shiny star',
    'shiny star',
    'a bright shiny',
    'letter sounds adventure',
    'welcome to your letter',
    'ms bright',
    'mrs bright',
    'api documentation',
    'stack overflow',
  ];

  if (badPhrases.some((p) => lower.includes(p))) return true;

  // Single-word "bright" alone is often echo from "Ms. Bright" TTS
  if (/^bright\.?$/i.test(lower)) return true;

  return false;
}

/** Prefer longer, sentence-like browser text over suspicious short echo. */
export function pickBestTranscript(
  candidates: { text: string; source: string }[],
): { text: string; source: string } | null {
  const valid = candidates.filter((c) => c.text.trim().length >= 1 && !looksLikeBadTranscript(c.text));
  if (valid.length === 0) return null;

  // Prefer deepgram, then browser with 3+ words, then others
  const rank = (source: string) => {
    if (source === 'deepgram') return 0;
    if (source === 'browser') return 1;
    if (source === 'gemini') return 2;
    return 3;
  };

  valid.sort((a, b) => {
    const wordDiff = b.text.trim().split(/\s+/).length - a.text.trim().split(/\s+/).length;
    if (Math.abs(wordDiff) >= 2) return wordDiff;
    return rank(a.source) - rank(b.source);
  });

  return valid[0] ?? null;
}
