import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getSpeechRecognitionCtor,
  pickVoice,
  readWebSpeechResults,
  stripForSpeech,
} from '@/lib/speech';

/** Friendly teacher TTS + browser mic STT for the AI Classroom. */
export function useClassroomVoice() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [sttSupported, setSttSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const voicesReady = useRef(false);

  useEffect(() => {
    setSttSupported(Boolean(getSpeechRecognitionCtor()));
    const warm = () => {
      voicesReady.current = true;
    };
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.addEventListener('voiceschanged', warm);
    }
    return () => {
      window.speechSynthesis?.removeEventListener('voiceschanged', warm);
      window.speechSynthesis?.cancel();
      recognitionRef.current?.abort();
    };
  }, []);

  const speakText = useCallback((message: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const clean = stripForSpeech(message);
    if (!clean) return;

    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(clean);
    utter.lang = 'en-US';
    utter.pitch = 1.1;
    utter.rate = 1.0;
    utter.volume = 1;

    const voice =
      pickVoice('en-US') ??
      pickVoice('en-GB') ??
      pickVoice('en-IN') ??
      window.speechSynthesis.getVoices().find((v) => /en/i.test(v.lang)) ??
      null;
    if (voice) utter.voice = voice;

    utter.onstart = () => setIsSpeaking(true);
    utter.onend = () => setIsSpeaking(false);
    utter.onerror = () => setIsSpeaking(false);

    // Chrome sometimes needs a tick after cancel before speak
    window.setTimeout(() => {
      window.speechSynthesis.speak(utter);
    }, 40);
  }, []);

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
  }, []);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  const startListening = useCallback(
    (opts: {
      onInterim: (text: string) => void;
      onFinal: (text: string) => void;
      onError?: (message: string) => void;
    }) => {
      const Ctor = getSpeechRecognitionCtor();
      if (!Ctor) {
        opts.onError?.('Speech recognition is not supported in this browser. Try Chrome.');
        return;
      }

      recognitionRef.current?.abort();
      const recognition = new Ctor();
      recognitionRef.current = recognition;
      recognition.lang = 'en-US';
      recognition.interimResults = true;
      recognition.continuous = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => setIsListening(true);

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const text = readWebSpeechResults(event);
        opts.onInterim(text);
        const last = event.results[event.results.length - 1];
        if (last?.isFinal && text.trim()) {
          opts.onFinal(text.trim());
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        setIsListening(false);
        if (event.error !== 'aborted' && event.error !== 'no-speech') {
          opts.onError?.(
            event.error === 'not-allowed'
              ? 'Microphone permission denied. Please allow mic access.'
              : `Mic error: ${event.error}`,
          );
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      try {
        recognition.start();
      } catch {
        setIsListening(false);
        opts.onError?.('Could not start the microphone. Please try again.');
      }
    },
    [],
  );

  return {
    isSpeaking,
    isListening,
    sttSupported,
    speakText,
    stopSpeaking,
    startListening,
    stopListening,
  };
}
