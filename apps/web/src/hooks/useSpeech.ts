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
  /** Fired when listening stops with the captured text (may be empty). */
  onListeningEnd?: (text: string) => void;
}

function readResults(event: SpeechRecognitionEvent): string {
  let text = '';
  for (let i = 0; i < event.results.length; i++) {
    text += event.results[i][0]?.transcript ?? '';
  }
  return text.trim();
}

export function useSpeech({ locale, voiceEnabled, onListeningEnd }: UseSpeechOptions) {
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [supported] = useState(() => speechSupported());

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const speakQueueRef = useRef<string[]>([]);
  const speakingRef = useRef(false);
  const transcriptRef = useRef('');
  const onListeningEndRef = useRef(onListeningEnd);
  const keepListeningRef = useRef(false);
  onListeningEndRef.current = onListeningEnd;

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
    keepListeningRef.current = false;
    const rec = recognitionRef.current;
    if (rec) {
      try {
        rec.stop();
      } catch {
        setListening(false);
        onListeningEndRef.current?.(transcriptRef.current);
      }
    } else {
      setListening(false);
      onListeningEndRef.current?.(transcriptRef.current);
    }
  }, []);

  const startListening = useCallback(async () => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setSpeechError('Speech recognition is not supported in this browser. Try Chrome.');
      return;
    }

    stopSpeaking();
    setSpeechError(null);
    transcriptRef.current = '';
    setTranscript('');

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setSpeechError('Microphone access denied. Allow the mic in browser settings.');
      return;
    }

    try {
      recognitionRef.current?.abort();
    } catch {
      /* ignore */
    }

    const recognition = new Ctor();
    recognition.lang = lang;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const text = readResults(event);
      transcriptRef.current = text;
      setTranscript(text);
      if (text) setSpeechError(null);
    };

    recognition.onerror = (event: Event) => {
      const err = event as SpeechRecognitionErrorEvent;
      const code = err.error ?? 'unknown';
      if (code === 'no-speech') {
        setSpeechError('No speech heard — try again and speak clearly.');
      } else if (code === 'not-allowed') {
        setSpeechError('Microphone blocked. Allow access and retry.');
      } else if (code !== 'aborted') {
        setSpeechError(`Speech error: ${code}`);
      }
      if (code !== 'aborted') {
        keepListeningRef.current = false;
      }
    };

    recognition.onend = () => {
      if (keepListeningRef.current) {
        try {
          recognition.start();
        } catch {
          keepListeningRef.current = false;
          setListening(false);
          onListeningEndRef.current?.(transcriptRef.current);
        }
        return;
      }
      setListening(false);
      onListeningEndRef.current?.(transcriptRef.current);
    };

    recognitionRef.current = recognition;
    keepListeningRef.current = true;
    setListening(true);

    try {
      recognition.start();
    } catch {
      keepListeningRef.current = false;
      setSpeechError('Could not start microphone. Tap 🎤 again.');
      setListening(false);
    }
  }, [lang, stopSpeaking]);

  const toggleListening = useCallback(() => {
    if (listening) stopListening();
    else void startListening();
  }, [listening, startListening, stopListening]);

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const loadVoices = () => pickVoice(lang);
    window.speechSynthesis.getVoices();
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
  }, [lang]);

  useEffect(
    () => () => {
      try {
        recognitionRef.current?.abort();
      } catch {
        /* ignore */
      }
      stopSpeaking();
    },
    [stopSpeaking],
  );

  return {
    supported,
    listening,
    speaking,
    transcript,
    speechError,
    speak,
    stopSpeaking,
    startListening,
    stopListening,
    toggleListening,
  };
}
