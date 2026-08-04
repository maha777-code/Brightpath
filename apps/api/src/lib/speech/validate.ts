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
    'happy life',
    'tie it to a goal',
    'not to people or things',
    'albert einstein',
    'inspirational quote',
    'motivational',
  ];

  if (badPhrases.some((p) => lower.includes(p))) return true;

  if (/^bright\.?$/i.test(lower)) return true;

  return false;
}

/** Kids/tutor answers are short — long text is almost always hallucination or echo. */
export function looksTooLongForSpeech(text: string, maxWords = 24): boolean {
  const words = text.trim().split(/\s+/).filter(Boolean);
  return words.length > maxWords;
}

export type SttSource = 'deepgram' | 'browser';

export function validateTranscript(text: string, source: SttSource): string | null {
  const trimmed = text.trim();
  if (trimmed.length < 1) return null;
  if (looksLikeBadTranscript(trimmed)) return null;
  if (looksTooLongForSpeech(trimmed)) return null;
  return trimmed;
}
