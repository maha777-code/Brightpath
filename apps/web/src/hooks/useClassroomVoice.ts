import { useCallback, useEffect, useRef, useState } from 'react';
import { getSpeechRecognitionCtor, pickVoice, stripForSpeech } from '@/lib/speech';

type ListenHandlers = {
  onInterim: (text: string) => void;
  onFinal: (text: string) => void;
  onError?: (message: string) => void;
};

/** Friendly teacher TTS + browser mic STT for the AI Classroom. */
export function useClassroomVoice() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [sttSupported, setSttSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const handlersRef = useRef<ListenHandlers | null>(null);
  const latestTranscriptRef = useRef('');
  const submittedRef = useRef(false);

  useEffect(() => {
    setSttSupported(Boolean(getSpeechRecognitionCtor()));
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
    }
    return () => {
      window.speechSynthesis?.cancel();
      try {
        recognitionRef.current?.abort();
      } catch {
        /* ignore */
      }
    };
  }, []);

  const speakText = useCallback((message: string, attempt = 0) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const clean = stripForSpeech(message);
    if (!clean) return;

    // Wait until mic session releases the audio device
    if (recognitionRef.current && attempt < 12) {
      window.setTimeout(() => speakText(message, attempt + 1), 350);
      return;
    }

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

    window.setTimeout(() => {
      window.speechSynthesis.speak(utter);
    }, 40);
  }, []);

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
  }, []);

  const stopListening = useCallback(() => {
    try {
      recognitionRef.current?.stop();
    } catch {
      /* ignore */
    }
    setIsListening(false);
  }, []);

  const startListening = useCallback(async (opts: ListenHandlers) => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      opts.onError?.(
        'Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.',
      );
      return;
    }

    handlersRef.current = opts;
    latestTranscriptRef.current = '';
    submittedRef.current = false;

    // Stop TTS — Chrome cannot recognize speech while synthesizing
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);

    // Explicit mic permission (more reliable than SpeechRecognition alone)
    try {
      if (navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((t) => t.stop());
      }
    } catch {
      opts.onError?.(
        'Microphone access was denied! Please allow microphone permissions in your browser address bar.',
      );
      setIsListening(false);
      return;
    }

    try {
      recognitionRef.current?.abort();
    } catch {
      /* ignore */
    }

    const recognition = new Ctor();
    recognitionRef.current = recognition;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0]?.transcript ?? '';
      }
      // Also rebuild full transcript from all results (more reliable for interim+final)
      let full = '';
      for (let i = 0; i < event.results.length; i++) {
        full += event.results[i][0]?.transcript ?? '';
      }
      const text = (full || transcript).trim();
      if (!text) return;

      latestTranscriptRef.current = text;
      handlersRef.current?.onInterim(text);

      const last = event.results[event.results.length - 1];
      if (last?.isFinal && text && !submittedRef.current) {
        submittedRef.current = true;
        handlersRef.current?.onFinal(text);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      setIsListening(false);
      const code = event.error;
      if (code === 'aborted') return;
      if (code === 'no-speech') {
        handlersRef.current?.onError?.('No speech detected. Tap the mic and try again.');
        return;
      }
      if (code === 'not-allowed' || code === 'service-not-allowed') {
        handlersRef.current?.onError?.(
          'Microphone access was denied! Please allow microphone permissions in your browser address bar.',
        );
        return;
      }
      if (code === 'audio-capture') {
        handlersRef.current?.onError?.('No microphone found. Please plug in a mic and try again.');
        return;
      }
      handlersRef.current?.onError?.(`Mic error: ${code}. Please try again.`);
    };

    recognition.onend = () => {
      setIsListening(false);
      const text = latestTranscriptRef.current.trim();
      // Auto-submit on silence end if we never got an isFinal callback
      if (text && !submittedRef.current) {
        submittedRef.current = true;
        handlersRef.current?.onFinal(text);
      }
      recognitionRef.current = null;
    };

    try {
      // Small delay after canceling TTS so the audio device is free
      await new Promise((r) => setTimeout(r, 120));
      recognition.start();
      setIsListening(true);
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      setIsListening(false);
      opts.onError?.('Could not start the microphone. Please try again.');
    }
  }, []);

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
