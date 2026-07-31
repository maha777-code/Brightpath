import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getSpeechRecognitionCtor,
  localeToSpeechLang,
  pickVoice,
  speechSupported,
  stripForSpeech,
} from '@/lib/speech';

export interface UseSpeechOptions {
  locale: string;
  voiceEnabled: boolean;
  /** Called when the user finishes speaking (final transcript). */
  onFinalTranscript?: (text: string) => void;
  /** Live partial transcript while the mic is on. */
  onInterimTranscript?: (text: string) => void;
}

export function useSpeech({
  locale,
  voiceEnabled,
  onFinalTranscript,
  onInterimTranscript,
}: UseSpeechOptions) {
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [supported] = useState(() => speechSupported());

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const speakQueueRef = useRef<string[]>([]);
  const speakingRef = useRef(false);
  const callbacksRef = useRef({ onFinalTranscript, onInterimTranscript });
  callbacksRef.current = { onFinalTranscript, onInterimTranscript };

  const lang = localeToSpeechLang(locale);

  const stopSpeaking = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    speakQueueRef.current = [];
    speakingRef.current = false;
    setSpeaking(false);
  }, []);

  const drainSpeakQueue = useCallback(() => {
    if (speakingRef.current || speakQueueRef.current.length === 0) return;
    if (!voiceEnabled || !supported.tts) {
      speakQueueRef.current = [];
      return;
    }

    const next = speakQueueRef.current.shift();
    if (!next) return;

    const utterance = new SpeechSynthesisUtterance(next);
    utterance.lang = lang;
    utterance.rate = 0.95;
    utterance.pitch = 1.05;
    const voice = pickVoice(lang);
    if (voice) utterance.voice = voice;

    speakingRef.current = true;
    setSpeaking(true);

    utterance.onend = () => {
      speakingRef.current = false;
      setSpeaking(false);
      drainSpeakQueue();
    };
    utterance.onerror = () => {
      speakingRef.current = false;
      setSpeaking(false);
      drainSpeakQueue();
    };

    window.speechSynthesis.speak(utterance);
  }, [lang, supported.tts, voiceEnabled]);

  const speak = useCallback(
    (text: string) => {
      const cleaned = stripForSpeech(text);
      if (!cleaned || !supported.tts) return;
      speakQueueRef.current.push(cleaned);
      drainSpeakQueue();
    },
    [drainSpeakQueue, supported.tts],
  );

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  const startListening = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return;

    stopSpeaking();

    const recognition = new Ctor();
    recognition.lang = lang;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      let finalText = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0]?.transcript ?? '';
        if (result.isFinal) finalText += transcript;
        else interim += transcript;
      }

      const live = (finalText || interim).trim();
      if (live) callbacksRef.current.onInterimTranscript?.(live);

      if (finalText.trim()) {
        callbacksRef.current.onFinalTranscript?.(finalText.trim());
      }
    };

    recognition.onerror = () => {
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;
    setListening(true);
    callbacksRef.current.onInterimTranscript?.('');
    recognition.start();
  }, [lang, stopSpeaking]);

  const toggleListening = useCallback(() => {
    if (listening) stopListening();
    else startListening();
  }, [listening, startListening, stopListening]);

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const loadVoices = () => pickVoice(lang);
    window.speechSynthesis.getVoices();
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
  }, [lang]);

  useEffect(() => () => {
    recognitionRef.current?.abort();
    stopSpeaking();
  }, [stopSpeaking]);

  return {
    supported,
    listening,
    speaking,
    speak,
    stopSpeaking,
    startListening,
    stopListening,
    toggleListening,
  };
}
