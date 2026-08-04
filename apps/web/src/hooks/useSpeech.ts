import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getSpeechRecognitionCtor,
  localeToSpeechLang,
  looksLikeHallucinatedTranscript,
  pickVoice,
  readWebSpeechResults,
  speechSupported,
  stripForSpeech,
} from '@/lib/speech';

export interface UseSpeechOptions {
  locale: string;
  voiceEnabled: boolean;
  sttEnabled: boolean;
  /** Gemini fallback — server picks best of Deepgram / browser / Gemini */
  transcribeAudio: (
    blob: Blob,
    mimeType: string,
    locale: string,
    browserTranscript?: string,
    durationSec?: number,
  ) => Promise<string>;
  onTranscribed?: (text: string) => void;
  onLiveTranscript?: (text: string) => void;
}

function pickRecorderMimeType(): string {
  const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
  for (const type of types) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return 'audio/webm';
}

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((t) => t.stop());
}

function delay(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

export function useSpeech({
  locale,
  voiceEnabled,
  sttEnabled,
  transcribeAudio,
  onTranscribed,
  onLiveTranscript,
}: UseSpeechOptions) {
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [speechError, setSpeechError] = useState<string | null>(null);

  const voiceEnabledRef = useRef(voiceEnabled);
  voiceEnabledRef.current = voiceEnabled;

  const browserCanRecord =
    typeof navigator !== 'undefined' &&
    Boolean(navigator.mediaDevices?.getUserMedia) &&
    typeof MediaRecorder !== 'undefined';

  const browserWebSpeech = Boolean(getSpeechRecognitionCtor());

  const supported = {
    stt: browserCanRecord,
    tts: speechSupported().tts,
  };
  const sttReady = sttEnabled && browserCanRecord;

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const mimeTypeRef = useRef('audio/webm');
  const maxDurationRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recordingStartedRef = useRef(0);
  const speakQueueRef = useRef<string[]>([]);
  const speakingRef = useRef(false);
  const webSpeechRef = useRef<SpeechRecognition | null>(null);
  const webTranscriptRef = useRef('');
  const keepWebListeningRef = useRef(false);
  const onTranscribedRef = useRef(onTranscribed);
  const onLiveTranscriptRef = useRef(onLiveTranscript);
  const transcribeAudioRef = useRef(transcribeAudio);
  onTranscribedRef.current = onTranscribed;
  onLiveTranscriptRef.current = onLiveTranscript;
  transcribeAudioRef.current = transcribeAudio;

  const lang = localeToSpeechLang(locale);

  const stopSpeaking = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    speakQueueRef.current = [];
    speakingRef.current = false;
    setSpeaking(false);
  }, []);

  useEffect(() => {
    if (!voiceEnabled) stopSpeaking();
  }, [voiceEnabled, stopSpeaking]);

  const stopWebSpeech = useCallback(() => {
    keepWebListeningRef.current = false;
    const rec = webSpeechRef.current;
    if (rec) {
      try {
        rec.stop();
      } catch {
        try {
          rec.abort();
        } catch {
          /* ignore */
        }
      }
    }
    webSpeechRef.current = null;
  }, []);

  /** Must run synchronously inside the mic click handler (Chrome user-gesture rule). */
  const startWebSpeechSync = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return false;

    try {
      webSpeechRef.current?.abort();
    } catch {
      /* ignore */
    }

    webTranscriptRef.current = '';
    setLiveTranscript('');

    const rec = new Ctor();
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onresult = (event: SpeechRecognitionEvent) => {
      const text = readWebSpeechResults(event);
      webTranscriptRef.current = text;
      setLiveTranscript(text);
      onLiveTranscriptRef.current?.(text);
    };

    rec.onerror = (event: Event) => {
      const code = (event as SpeechRecognitionErrorEvent).error;
      if (code !== 'aborted' && code !== 'no-speech') {
        console.warn('[STT] Web Speech error:', code);
      }
    };

    rec.onend = () => {
      if (keepWebListeningRef.current && webSpeechRef.current === rec) {
        try {
          rec.start();
        } catch {
          keepWebListeningRef.current = false;
        }
      }
    };

    webSpeechRef.current = rec;
    keepWebListeningRef.current = true;

    try {
      rec.start();
      return true;
    } catch (err) {
      console.warn('[STT] Web Speech start failed:', err);
      keepWebListeningRef.current = false;
      webSpeechRef.current = null;
      return false;
    }
  }, [lang]);

  const drainSpeakQueue = useCallback(() => {
    if (speakingRef.current || speakQueueRef.current.length === 0) return;
    if (!voiceEnabledRef.current || !supported.tts) {
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
  }, [lang, supported.tts]);

  const speak = useCallback(
    (text: string) => {
      if (!voiceEnabledRef.current) return;
      const cleaned = stripForSpeech(text);
      if (!cleaned || !supported.tts) return;
      speakQueueRef.current.push(cleaned);
      drainSpeakQueue();
    },
    [drainSpeakQueue, supported.tts],
  );

  const applyTranscript = useCallback((text: string, source: string) => {
    const trimmed = text.trim();
    if (!trimmed) return false;
    if (looksLikeHallucinatedTranscript(trimmed)) {
      setSpeechError(
        'That doesn\'t look right — likely picked up Ms. Bright\'s voice. Tap 🔇 to mute, use headphones, then try 🎤 again.',
      );
      return false;
    }
    console.info(`[STT] Final (${source}):`, trimmed.slice(0, 100));
    setSpeechError(null);
    onTranscribedRef.current?.(trimmed);
    return true;
  }, []);

  const finishRecording = useCallback(async () => {
    if (maxDurationRef.current) {
      clearTimeout(maxDurationRef.current);
      maxDurationRef.current = null;
    }

    setRecording(false);
    setTranscribing(true);

    stopWebSpeech();
    await delay(400);

    const webText = webTranscriptRef.current.trim();
    setLiveTranscript('');

    const recorder = recorderRef.current;
    const mimeType = mimeTypeRef.current;

    if (recorder && recorder.state !== 'inactive') {
      await new Promise<void>((resolve) => {
        const onStop = () => {
          recorder.removeEventListener('stop', onStop);
          resolve();
        };
        recorder.addEventListener('stop', onStop);
        try {
          recorder.stop();
        } catch {
          recorder.removeEventListener('stop', onStop);
          resolve();
        }
      });
    }

    stopStream(streamRef.current);
    streamRef.current = null;
    recorderRef.current = null;

    const blob = new Blob(chunksRef.current, { type: mimeType });
    chunksRef.current = [];

    if (blob.size < 200 && webText.length < 2) {
      setTranscribing(false);
      setSpeechError('Recording too short — tap 🎤, speak, then tap 🎤 again.');
      return;
    }

    const durationSec =
      recordingStartedRef.current > 0
        ? Math.max(1, Math.round((Date.now() - recordingStartedRef.current) / 1000))
        : undefined;

    try {
      const text = await transcribeAudioRef.current(
        blob,
        mimeType,
        locale,
        webText || undefined,
        durationSec,
      );
      applyTranscript(text, 'server');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not transcribe speech';
      setSpeechError(msg);
    } finally {
      setTranscribing(false);
    }
  }, [applyTranscript, locale, stopWebSpeech]);

  const startMediaRecorder = useCallback(async () => {
    await delay(700);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
      });
      streamRef.current = stream;

      const mimeType = pickRecorderMimeType();
      mimeTypeRef.current = mimeType;

      const recorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 128_000,
      });
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorderRef.current = recorder;
      recorder.start(200);

      maxDurationRef.current = setTimeout(() => {
        void finishRecording();
      }, 15000);
    } catch {
      stopWebSpeech();
      setRecording(false);
      setSpeechError('Microphone access denied. Allow the mic in Chrome settings.');
    }
  }, [finishRecording, stopWebSpeech]);

  const toggleRecording = useCallback(() => {
    if (transcribing) return;

    if (recording) {
      void finishRecording();
      return;
    }

    if (!sttReady) {
      setSpeechError('AI tutor is not ready yet — wait for “AI live”, then try 🎤 again.');
      return;
    }

    stopSpeaking();
    setSpeechError(null);
    chunksRef.current = [];
    setRecording(true);
    recordingStartedRef.current = Date.now();

    if (browserWebSpeech) {
      startWebSpeechSync();
    }

    void startMediaRecorder();
  }, [
    browserWebSpeech,
    finishRecording,
    recording,
    startMediaRecorder,
    startWebSpeechSync,
    stopSpeaking,
    sttReady,
    transcribing,
  ]);

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const loadVoices = () => pickVoice(lang);
    window.speechSynthesis.getVoices();
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
  }, [lang]);

  useEffect(
    () => () => {
      if (maxDurationRef.current) clearTimeout(maxDurationRef.current);
      stopWebSpeech();
      try {
        recorderRef.current?.stop();
      } catch {
        /* ignore */
      }
      stopStream(streamRef.current);
      stopSpeaking();
    },
    [stopSpeaking, stopWebSpeech],
  );

  return {
    supported,
    sttReady,
    recording,
    transcribing,
    liveTranscript,
    listening: recording || transcribing,
    speaking,
    speechError,
    speak,
    stopSpeaking,
    toggleListening: toggleRecording,
    stopListening: () => {
      if (recording) void finishRecording();
    },
  };
}
