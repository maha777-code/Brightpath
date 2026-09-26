import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import {
  ArrowLeft,
  Camera,
  HelpCircle,
  Loader2,
  Mic,
  Pause,
  Play,
  Send,
  Settings,
  Star,
} from 'lucide-react';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/context/AuthContext';
import { useAiClassroomSession } from '@/hooks/useAiClassroomSession';
import { useClassroomVoice } from '@/hooks/useClassroomVoice';
import { HabitatDragAndDrop } from '@/components/games/HabitatDragAndDrop';
import { DashboardSettingsDrawer } from '@/components/dashboard/DashboardSettingsDrawer';

interface VideoClip {
  id: string;
  title: string;
  durationSec: number;
  caption: string;
  summary?: {
    title: string;
    description: string;
    category?: 'concept' | 'formula' | 'rule';
  };
}

const DOUBT_CHIPS = [
  {
    id: 'share',
    label: '🎬 Generate video: How do atoms share electrons?',
    video: {
      id: 'share',
      title: '✨ AI Video: Atoms Sharing Electrons',
      durationSec: 105,
      caption: 'Watch how two atoms share electron pairs to form a covalent bond.',
      summary: {
        title: 'Covalent Bond',
        description: 'Atoms share electrons in pairs to achieve stability.',
        category: 'concept' as const,
      },
    },
    reply:
      'Great question! Let me generate a video showing how atoms share electron pairs to form covalent bonds!',
  },
  {
    id: 'vs',
    label: '💥 Show video on covalent vs ionic bonding',
    video: {
      id: 'vs',
      title: '✨ AI Video: Covalent vs Ionic Bonds',
      durationSec: 98,
      caption: 'Covalent = share. Ionic = give & take. Different friendship styles for atoms!',
      summary: {
        title: 'Covalent vs Ionic',
        description: 'Covalent bonds share electrons; ionic bonds transfer them.',
        category: 'concept' as const,
      },
    },
    reply:
      'Awesome! Watch closely — covalent shares electrons, ionic transfers them. Water uses covalent bonds!',
  },
  {
    id: 'shells',
    label: '🧪 Explain electron shells with a cartoon video',
    video: {
      id: 'shells',
      title: '✨ AI Video: Electron Shell Cartoon',
      durationSec: 112,
      caption: 'Orbit rings around the nucleus — shells fill from the inside out.',
      summary: {
        title: 'Electron Shells',
        description: 'Electrons orbit in shells; outer shells want to be full (octet rule).',
        category: 'rule' as const,
      },
    },
    reply:
      'Love this one! Electron shells are like racetracks — Oxygen wants 8 electrons in its outer shell!',
  },
] as const;

function formatTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function tutorReplyForDoubt(text: string): string {
  const t = text.toLowerCase();
  if (t.includes('ionic') || t.includes('covalent')) {
    return 'Covalent bonds share electrons. Ionic bonds give and take. Great doubt — keep exploring!';
  }
  if (t.includes('shell') || t.includes('electron')) {
    return 'Electron shells fill from the inside out. Oxygen needs 2 more electrons to feel complete!';
  }
  if (t.includes('water') || t.includes('h2o') || t.includes('h₂o')) {
    return 'Water is H₂O — two Hydrogen atoms covalently bonded to one Oxygen. Try building it on the board!';
  }
  return `Great question! Let's think step by step: atoms share or transfer electrons to become stable. Want a video? Tap a doubt chip!`;
}

export default function AiTutorPage() {
  const navigate = useNavigate();
  const { profile } = useProfile();
  const { parent } = useAuth();
  const learnerName = profile?.name || parent?.name?.split(' ')[0] || 'Student';

  const {
    isSpeaking,
    isListening,
    sttSupported,
    speakText,
    stopSpeaking,
    startListening,
    stopListening,
  } = useClassroomVoice();

  const {
    transcript,
    summaryNotes,
    transcriptEndRef,
    appendTranscript,
    addSummaryNote,
    replyAsTutor,
  } = useAiClassroomSession(learnerName, { onTutorSpeak: speakText });

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [bubble, setBubble] = useState(
    "Hi there! Ask a doubt or tap a chip — I'll explain with a video.",
  );
  const [stars, setStars] = useState(0);
  const [mistake, setMistake] = useState<{ wrong: string; fix: string } | null>(null);
  const location = useLocation();
  const [doubtDraft, setDoubtDraft] = useState('');

  useEffect(() => {
    const incoming = (location.state as { prompt?: string } | null)?.prompt?.trim();
    if (incoming) setDoubtDraft(incoming);
  }, [location.state]);
  const [doubtBusy, setDoubtBusy] = useState(false);
  const [voiceHint, setVoiceHint] = useState<string | null>(null);

  const [rendering, setRendering] = useState(false);
  const [renderPct, setRenderPct] = useState(0);
  const [video, setVideo] = useState<VideoClip | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [completeFlash, setCompleteFlash] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const greetedRef = useRef(false);
  const submitDoubtRef = useRef<(raw: string) => void>(() => {});

  useEffect(() => {
    if (!playing || !video) return;
    const id = window.setInterval(() => {
      setProgress((p) => {
        if (p >= video.durationSec) {
          setPlaying(false);
          return video.durationSec;
        }
        return p + 0.25;
      });
    }, 250);
    return () => window.clearInterval(id);
  }, [playing, video]);

  // Speak greeting once when the classroom opens
  useEffect(() => {
    if (greetedRef.current) return;
    greetedRef.current = true;
    const hello = `Hi ${learnerName}! I'm Prof. Spark. Today we'll build water from atoms. Ready?`;
    setBubble(hello);
    const id = window.setTimeout(() => speakText(hello), 400);
    return () => window.clearTimeout(id);
  }, [learnerName, speakText]);

  const runVideoEngine = useCallback(
    (
      clip: VideoClip,
      studentLine: string,
      sparkReply: string,
      options?: { skipStudentMessage?: boolean },
    ) => {
      if (!options?.skipStudentMessage) {
        appendTranscript('student', studentLine, { isDoubtTrigger: true });
      }
      setRendering(true);
      setRenderPct(0);
      setVideo(null);
      setPlaying(false);
      setProgress(0);
      setBubble("Hang tight — I'm rendering a custom molecular animation for you!");
      speakText("Hang tight — I'm rendering a custom molecular animation for you!");

      let pct = 0;
      const tick = window.setInterval(() => {
        pct += 8 + Math.random() * 10;
        if (pct >= 100) {
          window.clearInterval(tick);
          setRenderPct(100);
          setRendering(false);
          setVideo(clip);
          setPlaying(true);
          setBubble(sparkReply);
          replyAsTutor(sparkReply, 300);
          if (clip.summary) {
            addSummaryNote({
              title: clip.summary.title,
              description: clip.summary.description,
              category: clip.summary.category,
            });
          }
        } else {
          setRenderPct(Math.min(99, Math.floor(pct)));
        }
      }, 180);
    },
    [addSummaryNote, appendTranscript, replyAsTutor, speakText],
  );

  const onChip = (chip: (typeof DOUBT_CHIPS)[number]) => {
    runVideoEngine(chip.video, chip.label, chip.reply);
  };

  const submitDoubt = useCallback(
    (raw: string) => {
      const text = raw.trim();
      if (!text || doubtBusy) return;
      setDoubtBusy(true);
      appendTranscript('student', text, { isDoubtTrigger: true });
      setDoubtDraft('');
      setBubble('Great doubt — thinking…');

      const matched = DOUBT_CHIPS.find((c) =>
        text.toLowerCase().includes(c.id === 'share' ? 'share' : c.id === 'vs' ? 'ionic' : 'shell'),
      );

      window.setTimeout(() => {
        if (matched) {
          runVideoEngine(matched.video, matched.label, matched.reply, {
            skipStudentMessage: true,
          });
        } else {
          const reply = tutorReplyForDoubt(text);
          setBubble(reply);
          replyAsTutor(reply, 100);
        }
        setDoubtBusy(false);
      }, 500);
    },
    [appendTranscript, doubtBusy, replyAsTutor, runVideoEngine],
  );

  submitDoubtRef.current = submitDoubt;

  const onAskDoubt = () => {
    if (doubtDraft.trim()) {
      submitDoubt(doubtDraft);
      return;
    }
    const chip = DOUBT_CHIPS[0];
    runVideoEngine(chip.video, chip.label, chip.reply);
  };

  const onMicToggle = () => {
    if (isListening) {
      stopListening();
      setVoiceHint(null);
      return;
    }
    if (!sttSupported) {
      window.alert(
        'Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.',
      );
      setVoiceHint('Speech recognition needs Chrome, Edge, or Safari.');
      return;
    }

    setVoiceHint('Listening… speak your doubt clearly.');
    setDoubtDraft('');
    stopSpeaking();

    void startListening({
      onInterim: (text) => {
        setDoubtDraft(text);
        setVoiceHint('Hearing you… keep talking!');
      },
      onFinal: (text) => {
        const trimmed = text.trim();
        setDoubtDraft(trimmed);
        setVoiceHint(null);
        // Brief pause so the child sees the words, then ask Prof. Spark
        window.setTimeout(() => {
          if (trimmed) submitDoubtRef.current(trimmed);
        }, 500);
      },
      onError: (message) => {
        setVoiceHint(message);
        if (/denied/i.test(message)) {
          window.alert(message);
        }
      },
    });
  };

  const onCameraClick = () => {
    fileInputRef.current?.click();
  };

  const onFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    appendTranscript('student', `📷 Image Uploaded: ${file.name}`, { isDoubtTrigger: true });
    setBubble('Thanks for uploading! Let me analyze this diagram for you.');
    replyAsTutor('Thanks for uploading! Let me analyze this diagram for you.', 400);
    addSummaryNote({
      title: 'Homework Photo',
      description: `Uploaded diagram: ${file.name}. Prof. Spark is ready to help explain it.`,
      category: 'concept',
    });
  };

  const avatarActive = isSpeaking || isListening;

  const handleCompleteLesson = () => {
    setCompleteFlash(true);
    confetti({ particleCount: 160, spread: 55, origin: { y: 0.4 } });
    confetti({ particleCount: 90, angle: 60, spread: 55, origin: { x: 0.1, y: 0.6 } });
    confetti({ particleCount: 90, angle: 120, spread: 55, origin: { x: 0.9, y: 0.6 } });
    replyAsTutor('🎉 Lesson complete! You earned Super Chemist status!', 200);
    addSummaryNote({
      title: 'Lesson Mastery',
      description: 'You practiced atoms, covalent bonding, and building H₂O!',
      category: 'concept',
    });
    window.setTimeout(() => setCompleteFlash(false), 4000);
  };

  const masteryPct = useMemo(() => Math.round((stars / 15) * 100), [stars]);

  return (
    <div className="flex min-h-dvh flex-col bg-[#040711] p-4 text-slate-100 sm:p-6">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800/80 bg-[#0b0e1a]/80 px-4 py-3.5 shadow-2xl backdrop-blur-xl sm:px-6">
        <div className="flex min-w-0 items-center gap-4">
          <button
            type="button"
            onClick={() => navigate('/student/dashboard')}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Map View
          </button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-base font-bold text-white">
                Interactive Science Session with Prof. Spark
              </h1>
              <span className="rounded-full border border-cyan-800/60 bg-cyan-950 px-2.5 py-0.5 text-[10px] font-bold text-cyan-400">
                Lesson 3: Atoms, Electrons & Habitats
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1.5 text-xs font-bold text-amber-400">
            <Star className="h-3.5 w-3.5 fill-amber-400" /> Stars Earned: {stars}/15
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-400">
            <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-400" />
            SYS_READY · {masteryPct}%
          </span>
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="rounded-xl border border-slate-800 bg-slate-900 p-2 text-slate-300 hover:text-white"
            aria-label="Settings"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 gap-6 lg:grid-cols-12">
          {/* LEFT — Tutor & controls */}
          <section className="flex flex-col gap-4 lg:col-span-3 lg:min-h-0 lg:overflow-y-auto">
            <div className="rounded-3xl border border-slate-800/80 bg-[#0b0e1a] p-5 text-center shadow-xl">
              <motion.div
                className="relative mx-auto w-fit rounded-full bg-gradient-to-tr from-cyan-500 via-indigo-500 to-purple-500 p-1 shadow-[0_0_30px_rgba(6,182,212,0.35)]"
                animate={{ scale: avatarActive ? [1, 1.04, 1] : 1 }}
                transition={{ duration: 0.8, repeat: avatarActive ? Infinity : 0 }}
              >
                <img
                  src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=200&q=80"
                  alt=""
                  className="h-20 w-20 rounded-full border-2 border-slate-900 object-cover"
                />
              </motion.div>
              <p className="mt-3 text-base font-bold text-white">Prof. Spark</p>
              <p className="text-xs text-cyan-400">AI Tutor & Companion</p>
              <AnimatePresence mode="wait">
                <motion.div
                  key={bubble}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mx-auto mt-3 max-w-[95%] rounded-2xl border border-cyan-500/30 bg-[#121829] px-3.5 py-3 text-left text-xs leading-relaxed text-cyan-200 shadow-lg"
                >
                  {bubble}
                </motion.div>
              </AnimatePresence>
              <div
                className={[
                  'mt-3 inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[10px] font-bold tracking-wide',
                  isSpeaking
                    ? 'animate-pulse bg-cyan-500 text-slate-950'
                    : isListening
                      ? 'animate-pulse bg-red-500 text-white'
                      : 'border border-slate-800 bg-slate-900 text-slate-300',
                ].join(' ')}
              >
                {[8, 14, 6, 16, 10].map((h, i) => (
                  <motion.span
                    key={i}
                    className="inline-block w-1 rounded-full bg-current opacity-80"
                    animate={{ height: avatarActive ? [h, h + 8, h] : h * 0.5 }}
                    transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.08 }}
                    style={{ height: h }}
                  />
                ))}
                {isSpeaking
                  ? ' 🔊 SPEAKING…'
                  : isListening
                    ? ' 🎙️ LISTENING TO YOU…'
                    : ' || READY'}
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onFileSelected}
            />

            <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-[#101422] p-2">
              <button
                type="button"
                onClick={onMicToggle}
                className={[
                  'flex h-11 w-11 items-center justify-center rounded-full transition',
                  isListening
                    ? 'animate-pulse border-2 border-red-600 bg-red-500 shadow-lg shadow-red-500/40'
                    : 'bg-cyan-400 text-slate-950 hover:bg-cyan-300',
                ].join(' ')}
                aria-label={isListening ? 'Stop listening' : 'Start listening'}
                title={sttSupported ? 'Speak your doubt' : 'Mic STT needs Chrome/Edge/Safari'}
              >
                <Mic className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={onCameraClick}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-cyan-300 transition hover:border-cyan-500/50"
                aria-label="Upload homework photo"
                title="Upload a textbook or homework photo"
              >
                <Camera className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={onAskDoubt}
                disabled={doubtBusy}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-800 bg-[#101524] px-2 py-2.5 text-xs font-bold text-slate-200 hover:border-cyan-500/40 hover:text-cyan-300 disabled:opacity-60"
              >
                <HelpCircle className="h-3.5 w-3.5" /> Ask Doubt to AI Tutor
              </button>
            </div>

            <div
              className={[
                'flex w-full items-center gap-2 rounded-xl border bg-[#101422] px-3 py-2 transition-all focus-within:border-cyan-500/60',
                isListening ? 'border-red-400' : 'border-slate-800',
              ].join(' ')}
            >
              <input
                value={doubtDraft}
                onChange={(e) => setDoubtDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submitDoubt(doubtDraft)}
                placeholder={isListening ? 'Listening… speak now' : 'Type your doubt…'}
                className="flex-1 border-none bg-transparent px-1 text-xs text-slate-100 outline-none placeholder:text-slate-500"
              />
              <button
                type="button"
                onClick={() => submitDoubt(doubtDraft)}
                disabled={doubtBusy || !doubtDraft.trim()}
                className="rounded-lg bg-cyan-400 p-1.5 text-slate-950 hover:bg-cyan-300 disabled:opacity-40"
                aria-label="Send doubt"
              >
                {doubtBusy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>
            {voiceHint && (
              <p className="text-[11px] font-semibold text-amber-300">{voiceHint}</p>
            )}

            <div className="rounded-3xl border border-slate-800/80 bg-[#0b0e1a] p-4">
              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Quick Doubt Chips</p>
              <div className="space-y-2">
                {DOUBT_CHIPS.map((chip) => (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => onChip(chip)}
                    className="w-full rounded-xl border border-slate-800 bg-[#101524] px-3 py-3 text-left text-xs text-slate-300 transition-all hover:border-cyan-500/40 hover:bg-[#161d30] hover:text-cyan-300"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-800/80 bg-[#0b0e1a] p-4">
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Real-time Mistake Corrector</p>
              {mistake ? (
                <div className="space-y-2">
                  <div className="rounded-xl border border-rose-500/30 bg-rose-950/40 px-3 py-2 text-xs text-rose-200">
                    <span className="font-bold">Mistake: </span>
                    {mistake.wrong}
                  </div>
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/40 px-3 py-2 text-xs text-emerald-200">
                    <span className="font-bold">Fix: </span>
                    {mistake.fix}
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/30 px-3 py-2 text-xs font-semibold text-emerald-300">
                  All clear — drag animals to their homes in the game!
                </div>
              )}
            </div>
          </section>

          {/* CENTER — Video + habitat game */}
          <section className="flex flex-col gap-6 lg:col-span-6 lg:min-h-0 lg:overflow-y-auto">
            <div className="group relative h-52 overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-b from-[#0e1322] to-[#080b14] text-white shadow-2xl">
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  backgroundImage:
                    'radial-gradient(circle at 18% 30%, rgba(34,211,238,0.16), transparent 42%), radial-gradient(circle at 82% 72%, rgba(99,102,241,0.18), transparent 40%)',
                }}
              />
              {rendering && (
                <div className="flex h-full flex-col items-center justify-center gap-3 px-6">
                  <div className="h-10 w-10 animate-spin rounded-full border-4 border-violet-400 border-t-transparent" />
                  <p className="text-center text-sm font-bold text-violet-200">
                    AI Rendering custom molecular animation…
                  </p>
                  <div className="h-2 w-56 overflow-hidden rounded-full bg-slate-700">
                    <div
                      className="h-full rounded-full bg-violet-500 transition-all"
                      style={{ width: `${renderPct}%` }}
                    />
                  </div>
                  <p className="text-xs font-bold text-slate-400">Rendering {renderPct}%</p>
                </div>
              )}

              {!rendering && video && (
                <div className="relative h-full">
                  <div className="absolute left-3 top-3 rounded-md bg-slate-800/80 px-2.5 py-1 text-[11px] font-bold text-sky-300">
                    {video.title}
                  </div>
                  <div className="flex h-full items-center justify-center gap-6 px-4 pt-6">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/80 text-xs font-extrabold">
                      H
                    </div>
                    <div className="text-center">
                      <div className="mb-1 text-[10px] font-bold text-amber-400">electrons share →</div>
                      <div className="h-0.5 w-24 bg-gradient-to-r from-rose-400 via-amber-300 to-emerald-400" />
                    </div>
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/80 text-sm font-extrabold">
                      O
                    </div>
                  </div>
                  <p className="absolute bottom-12 left-0 right-0 px-4 text-center text-[11px] text-slate-300">
                    {video.caption}
                  </p>
                  <div className="absolute inset-x-3 bottom-3 flex items-center gap-2 rounded-lg bg-slate-800/95 px-3 py-2">
                    <button
                      type="button"
                      onClick={() => setPlaying((p) => !p)}
                      className="text-white"
                      aria-label={playing ? 'Pause' : 'Play'}
                    >
                      {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </button>
                    <input
                      type="range"
                      min={0}
                      max={video.durationSec}
                      step={0.25}
                      value={progress}
                      onChange={(e) => {
                        setProgress(Number(e.target.value));
                        setPlaying(false);
                      }}
                      className="min-w-0 flex-1 accent-violet-500"
                    />
                    <span className="whitespace-nowrap text-[10px] font-bold text-slate-400">
                      {formatTime(progress)} / {formatTime(video.durationSec)}
                    </span>
                    <Settings className="h-3.5 w-3.5 text-slate-300" />
                  </div>
                </div>
              )}

              {!rendering && !video && (
                <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
                  <div className="absolute left-4 top-3 flex items-center gap-2">
                    <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-400" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                      AI Video Stage · SYS_READY
                    </span>
                  </div>
                  <div className="mb-1 rounded-full border border-cyan-500/30 bg-cyan-500/10 p-4 text-cyan-400 transition-transform group-hover:scale-110">
                    <Play className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-bold text-white">AI Video Explanation Generator</p>
                  <p className="max-w-md text-xs text-slate-400">
                    Click a quick doubt chip or ask Prof. Spark to render a custom HD explanation.
                  </p>
                </div>
              )}
            </div>

            <HabitatDragAndDrop
              onStarEarned={() => {
                setStars((s) => Math.min(15, s + 1));
                setMistake(null);
                setBubble('Yay! That animal found its home! ⭐');
                appendTranscript('student', 'Placed an animal in its habitat!');
                replyAsTutor('Super job! Keep helping the animals find home!', 300);
                addSummaryNote({
                  title: 'Animal Habitats',
                  description: 'Animals live in places that match their needs — jungle, ocean, or farm.',
                  category: 'concept',
                });
              }}
              onLevelComplete={() => {
                setBubble("Hooray! You're a Super Animal Helper! 🚀");
                replyAsTutor("Hooray! You did it! You're a Super Animal Helper!", 200);
                addSummaryNote({
                  title: 'Habitat Master',
                  description: 'Matched every animal to Jungle, Ocean, or Barn Farm!',
                  category: 'concept',
                });
              }}
            />
          </section>

          {/* RIGHT — Dynamic transcript & summary */}
          <div className="flex w-full flex-col gap-4 lg:col-span-3">
            <div className="flex h-[380px] flex-col rounded-3xl border border-slate-800/80 bg-[#0b0e1a] p-4">
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                Dialogue Transcript
              </h3>

              <div className="flex-1 space-y-3 overflow-y-auto pr-1 text-xs">
                {transcript.map((msg) => (
                  <div
                    key={msg.id}
                    className={[
                      'rounded-xl p-3',
                      msg.sender === 'tutor'
                        ? 'border border-slate-800/60 bg-[#101524] text-slate-200'
                        : 'ml-3 border border-slate-800/60 bg-[#101524] text-slate-200',
                    ].join(' ')}
                  >
                    <p
                      className={[
                        'mb-1 text-[11px] font-bold',
                        msg.sender === 'tutor' ? 'text-cyan-400' : 'text-slate-300',
                      ].join(' ')}
                    >
                      {msg.sender === 'tutor' ? '🤖' : '👤'} {msg.senderName}
                      <span className="ml-2 font-medium text-slate-400">{msg.timestamp}</span>
                      {msg.isDoubtTrigger && (
                        <span className="ml-1 rounded bg-amber-500/15 px-1 py-0.5 text-[9px] font-extrabold text-amber-300">
                          doubt
                        </span>
                      )}
                    </p>
                    <p className="leading-relaxed">{msg.text}</p>
                  </div>
                ))}
                {rendering && (
                  <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/40 p-3 text-xs font-bold text-cyan-200">
                    🎬 Generating AI Video… {renderPct}%
                  </div>
                )}
                <div ref={transcriptEndRef} />
              </div>
            </div>

            <div className="flex h-[280px] flex-col rounded-3xl border border-slate-800/80 bg-[#0b0e1a] p-4">
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                Today&apos;s Science Summary
              </h3>

              <div className="flex-1 space-y-2 overflow-y-auto pr-1 text-xs">
                {summaryNotes.length === 0 ? (
                  <p className="py-4 text-center text-xs italic text-slate-500">
                    Notes will automatically appear here as Prof. Spark explains concepts…
                  </p>
                ) : (
                  summaryNotes.map((note) => (
                    <div
                      key={note.id}
                      className="rounded-2xl border border-slate-800/60 bg-[#101524] p-2.5"
                    >
                      <h4 className="flex items-center gap-1 text-[11px] font-bold text-cyan-300">
                        • {note.title}
                      </h4>
                      <p className="mt-0.5 text-[10px] leading-normal text-slate-400">
                        {note.description}
                      </p>
                    </div>
                  ))
                )}
              </div>

              <button
                type="button"
                onClick={handleCompleteLesson}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 py-3.5 text-sm font-bold text-slate-950 shadow-lg shadow-orange-500/20 transition-all hover:from-amber-400 hover:to-orange-400"
              >
                🎉 Lesson Complete!
              </button>
              {completeFlash && (
                <p className="mt-2 text-center text-xs font-bold text-emerald-300">
                  Confetti unlocked — you crushed Lesson 3!
                </p>
              )}
              <Link
                to="/student/dashboard"
                className="mt-2 block text-center text-[11px] font-semibold text-slate-500 hover:text-cyan-300"
              >
                ← Back to Map View
              </Link>
            </div>
          </div>
        </div>

      <DashboardSettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
