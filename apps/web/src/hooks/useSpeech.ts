import { useCallback, useEffect, useRef, useState } from 'react';
import { localeToSpeechLang, pickVoice, speechSupported, stripForSpeech } from '@/lib/speech';

export interface UseSpeechOptions {
  locale: string;
  voiceEnabled: boolean;
  /** Server-side STT (Gemini). When false, mic is hidden. */
  sttEnabled: boolean;
  transcribeAudio: (blob: Blob, mimeType: string, locale: string) => Promise<string>;
  onTranscribed?: (text: string) => void;
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

export function useSpeech({
  locale,
  voiceEnabled,
  sttEnabled,
  transcribeAudio,
  onTranscribed,
}: UseSpeechOptions) {
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [supported] = useState(() => ({
    stt: sttEnabled && typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia),
    tts: speechSupported().tts,
  }));

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const mimeTypeRef = useRef('audio/webm');
  const maxDurationRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speakQueueRef = useRef<string[]>([]);
  const speakingRef = useRef(false);
  const onTranscribedRef = useRef(onTranscribed);
  const transcribeAudioRef = useRef(transcribeAudio);
  onTranscribedRef.current = onTranscribed;
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

  const finishRecording = useCallback(async () => {
    if (maxDurationRef.current) {
      clearTimeout(maxDurationRef.current);
      maxDurationRef.current = null;
    }

    const recorder = recorderRef.current;
    const mimeType = mimeTypeRef.current;

    if (!recorder || recorder.state === 'inactive') {
      setRecording(false);
      return;
    }

    setRecording(false);
    setTranscribing(true);

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

    stopStream(streamRef.current);
    streamRef.current = null;
    recorderRef.current = null;

    const blob = new Blob(chunksRef.current, { type: mimeType });
    chunksRef.current = [];

    if (blob.size < 200) {
      setTranscribing(false);
      setSpeechError('Recording too short — tap 🎤, speak, then tap 🎤 again.');
      return;
    }

    try {
      const text = await transcribeAudioRef.current(blob, mimeType, locale);
      setSpeechError(null);
      onTranscribedRef.current?.(text);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not transcribe speech';
      setSpeechError(msg);
    } finally {
      setTranscribing(false);
    }
  }, [locale]);

  const startRecording = useCallback(() => {
    if (!supported.stt || recording || transcribing) return;

    stopSpeaking();
    setSpeechError(null);
    chunksRef.current = [];

    void (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;

        const mimeType = pickRecorderMimeType();
        mimeTypeRef.current = mimeType;

        const recorder = new MediaRecorder(stream, { mimeType });
        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) chunksRef.current.push(event.data);
        };

        recorderRef.current = recorder;
        recorder.start(200);
        setRecording(true);

        maxDurationRef.current = setTimeout(() => {
          void finishRecording();
        }, 15000);
      } catch {
        setSpeechError('Microphone access denied. Allow the mic in Chrome settings.');
      }
    })();
  }, [finishRecording, recording, supported.stt, transcribing, stopSpeaking]);

  const toggleRecording = useCallback(() => {
    if (transcribing) return;
    if (recording) void finishRecording();
    else startRecording();
  }, [finishRecording, recording, startRecording, transcribing]);

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
      try {
        recorderRef.current?.stop();
      } catch {
        /* ignore */
      }
      stopStream(streamRef.current);
      stopSpeaking();
    },
    [stopSpeaking],
  );

  return {
    supported,
    recording,
    transcribing,
    /** @deprecated use recording */
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
