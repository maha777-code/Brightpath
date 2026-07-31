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
  return 'en-IN';
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
