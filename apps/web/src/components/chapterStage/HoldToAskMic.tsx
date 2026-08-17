import { useCallback, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, X, Send } from 'lucide-react';
import { api } from '@/lib/api';

type Props = {
  onRecordingChange?: (active: boolean) => void;
};

export default function HoldToAskMic({ onRecordingChange }: Props) {
  const [holding, setHolding] = useState(false);
  const [doubtOpen, setDoubtOpen] = useState(false);
  const [transcriptGuess, setTranscriptGuess] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const holdTimerRef = useRef<number | null>(null);

  const stopTracks = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const startRecording = useCallback(async () => {
    setError(null);
    setAnswer(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stopTracks();
        setHolding(false);
        onRecordingChange?.(false);
        setDoubtOpen(true);
        setTranscriptGuess('Can you explain the Golgi apparatus in simpler words?');
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setHolding(true);
      onRecordingChange?.(true);
    } catch {
      setError('Microphone access is required to ask a doubt.');
      setHolding(false);
      onRecordingChange?.(false);
    }
  }, [onRecordingChange]);

  const stopRecording = useCallback(() => {
    const rec = mediaRecorderRef.current;
    if (rec && rec.state !== 'inactive') {
      rec.stop();
    } else {
      stopTracks();
      setHolding(false);
      onRecordingChange?.(false);
    }
  }, [onRecordingChange]);

  const onPointerDown = () => {
    holdTimerRef.current = window.setTimeout(() => {
      void startRecording();
    }, 280);
  };

  const onPointerUp = () => {
    if (holdTimerRef.current) {
      window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    if (holding) stopRecording();
  };

  const submitDoubt = async () => {
    if (!transcriptGuess.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api.doubtAssistant(transcriptGuess.trim());
      setAnswer(res.answer);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not resolve doubt');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <motion.button
        type="button"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        onPointerCancel={onPointerUp}
        className="relative z-40 flex select-none flex-col items-center gap-1.5 rounded-full px-6 py-3 text-white shadow-lg outline-none"
        style={{
          background: 'linear-gradient(135deg, #FF6B4A, #FF3B5C)',
        }}
        animate={
          holding
            ? { scale: 1.06, boxShadow: '0 0 0 10px rgba(255,59,92,0.25)' }
            : {
                boxShadow: [
                  '0 0 0 0 rgba(255,59,92,0.45)',
                  '0 0 0 14px rgba(255,59,92,0)',
                  '0 0 0 0 rgba(255,59,92,0.45)',
                ],
              }
        }
        transition={{ duration: holding ? 0.2 : 1.8, repeat: holding ? 0 : Infinity }}
        whileTap={{ scale: 0.97 }}
      >
        <Mic className={`h-6 w-6 ${holding ? 'animate-pulse' : ''}`} />
        <span className="text-[11px] font-bold uppercase tracking-wide">
          {holding ? 'Listening…' : 'Hold to Ask Doubt'}
        </span>
      </motion.button>

      <AnimatePresence>
        {doubtOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-5 shadow-2xl"
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 24, opacity: 0 }}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">Doubt Resolution</h3>
                <button
                  type="button"
                  onClick={() => {
                    setDoubtOpen(false);
                    setAnswer(null);
                  }}
                  className="rounded-full p-1 text-slate-400 hover:bg-white/10 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <p className="mt-1 text-sm text-slate-400">
                Your recording was captured. Confirm or edit your question for Sarah.
              </p>
              <textarea
                value={transcriptGuess}
                onChange={(e) => setTranscriptGuess(e.target.value)}
                rows={3}
                className="mt-3 w-full resize-none rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/50"
              />
              {error && <p className="mt-2 text-sm text-rose-400">{error}</p>}
              {answer && (
                <div className="mt-3 rounded-xl border border-cyan-500/20 bg-cyan-950/40 p-3 text-sm leading-relaxed text-cyan-50">
                  {answer}
                </div>
              )}
              <button
                type="button"
                disabled={busy}
                onClick={() => void submitDoubt()}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 py-2.5 text-sm font-bold text-white disabled:opacity-60"
              >
                <Send className="h-4 w-4" />
                {busy ? 'Asking Sarah…' : 'Ask Sarah'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {error && !doubtOpen && (
        <p className="absolute bottom-24 left-1/2 z-40 -translate-x-1/2 rounded-lg bg-rose-950/90 px-3 py-1.5 text-xs text-rose-200">
          {error}
        </p>
      )}
    </>
  );
}
