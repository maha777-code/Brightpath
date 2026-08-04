/** Browser speech helpers — STT (SpeechRecognition) + TTS (speechSynthesis). */

export function stripForSpeech(text: string): string {
  return text
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function localeToSpeechLang(locale: string): string {
  if (locale.startsWith('hi')) return 'hi-IN';
  if (locale.startsWith('ar')) return 'ar-KW';
  if (locale === 'en-US') return 'en-US';
  // en-IN recognition can be flaky in Chrome — en-US understands Indian English well
  return 'en-US';
}

export function getSpeechRecognitionCtor(): (new () => SpeechRecognition) | null {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

export function speechSupported(): { stt: boolean; tts: boolean } {
  if (typeof window === 'undefined') return { stt: false, tts: false };
  return {
    stt: Boolean(getSpeechRecognitionCtor()),
    tts: 'speechSynthesis' in window,
  };
}

export function pickVoice(lang: string): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  const langPrefix = lang.split('-')[0];
  return (
    voices.find((v) => v.lang === lang) ??
    voices.find((v) => v.lang.startsWith(langPrefix)) ??
    voices.find((v) => v.default) ??
    voices[0] ??
    null
  );
}

/** Read full transcript from a Web Speech API result event. */
export function readWebSpeechResults(event: SpeechRecognitionEvent): string {
  let text = '';
  for (let i = 0; i < event.results.length; i++) {
    text += event.results[i][0]?.transcript ?? '';
  }
  return text.trim();
}

/** Detect obvious model hallucinations (not human speech). */
export function looksLikeHallucinatedTranscript(text: string): boolean {
  const lower = text.toLowerCase();
  const bad = [
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
    'github.com',
    'happy life',
    'tie it to a goal',
    'not to people or things',
  ];
  if (bad.some((p) => lower.includes(p))) return true;
  // Long motivational / quote-like text (> 12 words) when user spoke briefly
  if (lower.split(/\s+/).length > 12 && !lower.includes('mahalakshmi') && !lower.includes('explain')) {
    return true;
  }
  return false;
}
