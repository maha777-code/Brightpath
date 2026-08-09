import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import {
  ArrowLeft,
  Camera,
  Check,
  HelpCircle,
  Mic,
  Pause,
  Play,
  Settings,
  Star,
} from 'lucide-react';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/context/AuthContext';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { DashboardSettingsDrawer } from '@/components/dashboard/DashboardSettingsDrawer';

type BondEdge = 'h1-o' | 'h2-o';

interface ChatLine {
  id: string;
  speaker: 'spark' | 'student';
  text: string;
}

interface VideoClip {
  id: string;
  title: string;
  durationSec: number;
  caption: string;
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
    },
    reply: 'Great question! When atoms share electrons, they form a covalent bond — like friends sharing toys so everyone is happy!',
  },
  {
    id: 'vs',
    label: '💥 Show video on covalent vs ionic bonding',
    video: {
      id: 'vs',
      title: '✨ AI Video: Covalent vs Ionic Bonds',
      durationSec: 98,
      caption: 'Covalent = share. Ionic = give & take. Different friendship styles for atoms!',
    },
    reply: 'Covalent bonds share electrons. Ionic bonds transfer electrons. Water (H₂O) uses covalent bonds!',
  },
  {
    id: 'shells',
    label: '🧪 Explain electron shells with a cartoon video',
    video: {
      id: 'shells',
      title: '✨ AI Video: Electron Shell Cartoon',
      durationSec: 112,
      caption: 'Orbit rings around the nucleus — shells fill from the inside out.',
    },
    reply: 'Electron shells are like racetracks around the nucleus. Oxygen wants 8 electrons in its outer shell — that\'s the octet rule!',
  },
] as const;

const NOTES_SEED = [
  { id: 'atom', title: 'Atom', body: 'Tiny building block made of protons, neutrons & electrons.' },
  { id: 'covalent', title: 'Covalent Bond', body: 'Atoms share electrons to become stable.' },
  { id: 'water', title: 'Water Formula', body: 'H₂O — two Hydrogen atoms bonded to one Oxygen.' },
];

function formatTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function AiTutorPage() {
  const navigate = useNavigate();
  const { profile } = useProfile();
  const { parent } = useAuth();
  const learnerName = profile?.name || parent?.name?.split(' ')[0] || 'Alex';

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [camOn, setCamOn] = useState(false);
  const [speaking, setSpeaking] = useState(true);
  const [bubble, setBubble] = useState(
    'Great attempt! Remember Oxygen needs 2 electrons to complete its outer shell…',
  );
  const [stars, setStars] = useState(12);
  const [mistake, setMistake] = useState<{ wrong: string; fix: string } | null>({
    wrong: 'Connected only one H to O',
    fix: 'Water needs TWO Hydrogen atoms bonded to Oxygen (H—O—H).',
  });
  const [bonds, setBonds] = useState<Record<BondEdge, boolean>>({
    'h1-o': false,
    'h2-o': false,
  });
  const [selectedAtom, setSelectedAtom] = useState<'H1' | 'H2' | 'O' | null>(null);
  const [notes, setNotes] = useState(NOTES_SEED);
  const [chat, setChat] = useState<ChatLine[]>([
    {
      id: '1',
      speaker: 'spark',
      text: `Hi ${learnerName}! I'm Prof. Spark. Today we'll build water from atoms. Ready?`,
    },
    {
      id: '2',
      speaker: 'student',
      text: 'Why does Oxygen need two Hydrogens?',
    },
    {
      id: '3',
      speaker: 'spark',
      text: 'Oxygen needs 2 more electrons. Each H shares one — so we need two H friends!',
    },
  ]);

  const [rendering, setRendering] = useState(false);
  const [renderPct, setRenderPct] = useState(0);
  const [video, setVideo] = useState<VideoClip | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [completeFlash, setCompleteFlash] = useState(false);
  const chatEnd = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat, rendering]);

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

  useEffect(() => {
    const id = window.setInterval(() => setSpeaking((s) => !s), 2200);
    return () => window.clearInterval(id);
  }, []);

  const pushChat = useCallback((speaker: ChatLine['speaker'], text: string) => {
    setChat((prev) => [...prev, { id: `${Date.now()}-${Math.random()}`, speaker, text }]);
  }, []);

  const runVideoEngine = useCallback(
    (clip: VideoClip, studentLine: string, sparkReply: string) => {
      pushChat('student', studentLine);
      setRendering(true);
      setRenderPct(0);
      setVideo(null);
      setPlaying(false);
      setProgress(0);
      setBubble('Hang tight — I\'m rendering a custom molecular animation for you!');

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
          pushChat('spark', sparkReply);
          setNotes((prev) => {
            if (prev.some((n) => n.id === clip.id)) return prev;
            return [
              ...prev,
              {
                id: clip.id,
                title: clip.title.replace('✨ AI Video: ', ''),
                body: clip.caption,
              },
            ];
          });
        } else {
          setRenderPct(Math.min(99, Math.floor(pct)));
        }
      }, 180);
    },
    [pushChat],
  );

  const onChip = (chip: (typeof DOUBT_CHIPS)[number]) => {
    runVideoEngine(chip.video, chip.label, chip.reply);
  };

  const onAskDoubt = () => {
    const chip = DOUBT_CHIPS[0];
    runVideoEngine(chip.video, 'Ask Doubt: How do atoms share electrons?', chip.reply);
  };

  const onAtomClick = (atom: 'H1' | 'H2' | 'O') => {
    if (!selectedAtom) {
      setSelectedAtom(atom);
      return;
    }
    if (selectedAtom === atom) {
      setSelectedAtom(null);
      return;
    }
    const pair = [selectedAtom, atom].sort().join('-');
    if (pair === 'H1-O' || pair === 'O-H1') {
      setBonds((b) => ({ ...b, 'h1-o': true }));
    } else if (pair === 'H2-O' || pair === 'O-H2') {
      setBonds((b) => ({ ...b, 'h2-o': true }));
    } else {
      setMistake({
        wrong: `Tried to bond ${selectedAtom} to ${atom}`,
        fix: 'Bond each Hydrogen to Oxygen — H atoms don\'t bond to each other for water.',
      });
      setBubble('Almost! In water, both H atoms connect to O, not to each other.');
      pushChat('spark', 'Hint: connect H → O ← H. That makes H₂O!');
    }
    setSelectedAtom(null);
  };

  const checkWork = () => {
    if (bonds['h1-o'] && bonds['h2-o']) {
      setMistake(null);
      setStars((s) => Math.min(15, s + 1));
      setBubble('Perfect! That\'s H₂O — you built a water molecule! ⭐');
      pushChat('spark', 'Excellent work, Super Chemist! H—O—H is correct. +1 Star!');
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.65 } });
      setNotes((prev) =>
        prev.map((n) =>
          n.id === 'water' ? { ...n, body: 'H₂O ✓ — you built it on the practice board!' } : n,
        ),
      );
    } else {
      setMistake({
        wrong: 'Molecule incomplete',
        fix: 'Connect BOTH Hydrogen atoms (H) to the Oxygen (O) atom, then check again.',
      });
      setBubble('Not quite yet — Oxygen still needs another Hydrogen friend!');
      pushChat('spark', 'Keep going! Click H, then O, for each Hydrogen.');
    }
  };

  const completeLesson = () => {
    setCompleteFlash(true);
    confetti({ particleCount: 160, spread: 55, origin: { y: 0.4 } });
    confetti({ particleCount: 90, angle: 60, spread: 55, origin: { x: 0.1, y: 0.6 } });
    confetti({ particleCount: 90, angle: 120, spread: 55, origin: { x: 0.9, y: 0.6 } });
    pushChat('spark', '🎉 Lesson complete! You earned Super Chemist status!');
    window.setTimeout(() => setCompleteFlash(false), 4000);
  };

  const masteryPct = useMemo(() => Math.round((stars / 15) * 100), [stars]);

  return (
    <div className="flex min-h-dvh flex-col bg-slate-50 text-slate-800">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 lg:px-6">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Map View
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-extrabold text-slate-900 sm:text-lg">
              🧪 Interactive Chemistry Session with Prof. Spark
            </h1>
            <p className="truncate text-xs text-slate-500">
              Lesson 3: Atoms, Electrons & Chemical Bonds
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800 ring-1 ring-amber-200">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" /> Stars Earned: {stars}/15
            </span>
            <span className="rounded-full bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-700 ring-1 ring-violet-200">
              Super Chemist 🚀
            </span>
            <span className="hidden items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200 sm:inline-flex">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              AI Video Engine Ready
              <span className="h-2 w-16 overflow-hidden rounded-full bg-slate-200">
                <span className="block h-full bg-emerald-500" style={{ width: `${masteryPct}%` }} />
              </span>
            </span>
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <DashboardSidebar onOpenSettings={() => setSettingsOpen(true)} />

        <div className="grid min-h-0 flex-1 gap-3 overflow-y-auto p-3 lg:grid-cols-[minmax(260px,320px)_minmax(0,1fr)_minmax(240px,280px)] lg:overflow-hidden lg:p-4">
          {/* LEFT — Tutor & controls */}
          <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm lg:min-h-0 lg:overflow-y-auto">
            <div className="relative overflow-hidden rounded-2xl bg-slate-900 px-4 pb-4 pt-6 text-center">
              <motion.div
                className="mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-violet-500 shadow-lg shadow-violet-500/40"
                animate={{ scale: speaking ? [1, 1.04, 1] : 1 }}
                transition={{ duration: 0.8, repeat: speaking ? Infinity : 0 }}
              >
                <div className="relative">
                  <div className="absolute -top-3 left-1/2 h-5 w-16 -translate-x-1/2 rounded-full bg-white/90" />
                  <div className="flex gap-5">
                    <span className="h-2.5 w-2.5 rounded-full bg-slate-900" />
                    <span className="h-2.5 w-2.5 rounded-full bg-slate-900" />
                  </div>
                  <motion.div
                    className="mx-auto mt-3 h-2 w-10 rounded-full border-b-2 border-white"
                    animate={{ scaleX: speaking ? [1, 1.35, 1] : 1 }}
                    transition={{ duration: 0.45, repeat: speaking ? Infinity : 0 }}
                  />
                </div>
              </motion.div>
              <p className="mt-3 text-sm font-extrabold text-white">Prof. Spark</p>
              <AnimatePresence mode="wait">
                <motion.div
                  key={bubble}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mx-auto mt-3 max-w-[95%] rounded-2xl bg-white/10 px-3 py-2 text-left text-xs font-medium leading-relaxed text-violet-100 ring-1 ring-white/15"
                >
                  {bubble}
                </motion.div>
              </AnimatePresence>
              <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-slate-800 px-3 py-1.5 text-[10px] font-bold tracking-wide text-slate-200">
                {[8, 14, 6, 16, 10].map((h, i) => (
                  <motion.span
                    key={i}
                    className="inline-block w-1 rounded-full bg-violet-400"
                    animate={{ height: micOn || speaking ? [h, h + 8, h] : h * 0.5 }}
                    transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.08 }}
                    style={{ height: h }}
                  />
                ))}
                {micOn ? ' LISTENING…' : ' READY'}
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2">
              <button
                type="button"
                onClick={() => setMicOn((v) => !v)}
                className={[
                  'flex h-10 w-10 items-center justify-center rounded-full text-white',
                  micOn ? 'bg-red-500' : 'bg-slate-400',
                ].join(' ')}
                aria-label="Toggle microphone"
              >
                <Mic className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setCamOn((v) => !v)}
                className={[
                  'flex h-10 w-10 items-center justify-center rounded-full text-white',
                  camOn ? 'bg-blue-500' : 'bg-slate-400',
                ].join(' ')}
                aria-label="Toggle camera"
              >
                <Camera className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={onAskDoubt}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-violet-500 px-2 py-2.5 text-xs font-extrabold text-white hover:bg-violet-600"
              >
                <HelpCircle className="h-3.5 w-3.5" /> Ask Doubt to AI Tutor
              </button>
            </div>

            <div>
              <p className="mb-2 text-sm font-extrabold text-slate-800">Quick Doubt Chips</p>
              <div className="space-y-2">
                {DOUBT_CHIPS.map((chip) => (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => onChip(chip)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-left text-xs font-bold text-slate-700 transition hover:border-violet-300 hover:bg-violet-50"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="mb-2 text-sm font-extrabold text-slate-800">Real-time Mistake Corrector</p>
              {mistake ? (
                <div className="space-y-2">
                  <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
                    <span className="font-bold">Mistake: </span>
                    {mistake.wrong}
                  </div>
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                    <span className="font-bold">Fix: </span>
                    {mistake.fix}
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">
                  All clear — your molecule looks great!
                </div>
              )}
            </div>
          </section>

          {/* CENTER — Video + board */}
          <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm lg:min-h-0 lg:overflow-y-auto">
            <div className="relative overflow-hidden rounded-2xl bg-[#090d16] text-white">
              {rendering && (
                <div className="flex h-64 flex-col items-center justify-center gap-3 px-6">
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
                <div className="relative h-64">
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
                <div className="flex h-64 flex-col items-center justify-center gap-2 px-6 text-center">
                  <p className="text-sm font-bold text-slate-300">AI Video Generator Stage</p>
                  <p className="text-xs text-slate-500">
                    Click a doubt chip or Ask Doubt to render a custom explanation video.
                  </p>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-[#fdfbf7] p-4">
              <p className="mb-3 text-sm font-extrabold text-slate-800">
                ✍️ Interactive Practice Board — Build H₂O
              </p>
              <p className="mb-4 text-xs text-slate-500">
                Click two atoms to bond them (H → O ← H), then check your work.
              </p>

              <div className="relative mx-auto mb-4 h-44 max-w-md">
                <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 400 180">
                  {bonds['h1-o'] && (
                    <line x1="80" y1="90" x2="200" y2="90" stroke="#059669" strokeWidth="6" strokeLinecap="round" />
                  )}
                  {bonds['h2-o'] && (
                    <line x1="320" y1="90" x2="200" y2="90" stroke="#059669" strokeWidth="6" strokeLinecap="round" />
                  )}
                </svg>
                <button
                  type="button"
                  onClick={() => onAtomClick('H1')}
                  className={[
                    'absolute left-4 top-1/2 flex h-16 w-16 -translate-y-1/2 items-center justify-center rounded-full text-lg font-black text-white shadow-md',
                    selectedAtom === 'H1' ? 'ring-4 ring-amber-300 bg-rose-500' : 'bg-rose-500',
                  ].join(' ')}
                >
                  H
                </button>
                <button
                  type="button"
                  onClick={() => onAtomClick('O')}
                  className={[
                    'absolute left-1/2 top-1/2 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-xl font-black text-white shadow-md',
                    selectedAtom === 'O' ? 'ring-4 ring-amber-300 bg-emerald-500' : 'bg-emerald-500',
                  ].join(' ')}
                >
                  O
                </button>
                <button
                  type="button"
                  onClick={() => onAtomClick('H2')}
                  className={[
                    'absolute right-4 top-1/2 flex h-16 w-16 -translate-y-1/2 items-center justify-center rounded-full text-lg font-black text-white shadow-md',
                    selectedAtom === 'H2' ? 'ring-4 ring-amber-300 bg-rose-500' : 'bg-rose-500',
                  ].join(' ')}
                >
                  H
                </button>
              </div>

              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={checkWork}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#059669] px-5 py-2.5 text-sm font-extrabold text-white shadow-md hover:bg-emerald-700"
                >
                  <Check className="h-4 w-4" /> Check My Work ✓
                </button>
              </div>
            </div>
          </section>

          {/* RIGHT — Transcript & summary */}
          <section className="flex min-h-[420px] flex-col rounded-2xl border border-slate-200 bg-white shadow-sm lg:min-h-0">
            <div className="border-b border-slate-100 px-3 py-3">
              <p className="text-sm font-extrabold text-slate-800">💬 Dialogue Transcript</p>
            </div>
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-3">
              {chat.map((line) => (
                <div
                  key={line.id}
                  className={[
                    'rounded-xl px-2.5 py-2 text-xs leading-relaxed',
                    line.speaker === 'spark'
                      ? 'bg-violet-50 text-violet-900 ring-1 ring-violet-100'
                      : 'bg-slate-50 text-slate-700 ring-1 ring-slate-100',
                  ].join(' ')}
                >
                  <span className="font-extrabold">
                    {line.speaker === 'spark' ? 'Prof. Spark' : learnerName}:{' '}
                  </span>
                  {line.text}
                </div>
              ))}
              {rendering && (
                <div className="rounded-xl bg-violet-100 px-2.5 py-2 text-xs font-bold text-violet-800 ring-1 ring-violet-200">
                  🎬 Generating AI Video… {renderPct}%
                </div>
              )}
              <div ref={chatEnd} />
            </div>

            <div className="border-t border-slate-100 p-3">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                <p className="mb-2 text-xs font-extrabold text-emerald-800">📝 Today&apos;s Chemistry Summary</p>
                <ul className="space-y-2">
                  {notes.map((n) => (
                    <li key={n.id} className="rounded-lg bg-white/80 px-2 py-1.5 ring-1 ring-emerald-100">
                      <p className="text-[11px] font-extrabold text-emerald-800">{n.title}</p>
                      <p className="text-[10px] text-emerald-900/80">{n.body}</p>
                    </li>
                  ))}
                </ul>
              </div>
              <button
                type="button"
                onClick={completeLesson}
                className="mt-3 w-full rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 px-3 py-2.5 text-sm font-extrabold text-white shadow-md hover:opacity-95"
              >
                🎉 Lesson Complete!
              </button>
              {completeFlash && (
                <p className="mt-2 text-center text-xs font-bold text-emerald-700">
                  Confetti unlocked — you crushed Lesson 3!
                </p>
              )}
              <Link
                to="/dashboard"
                className="mt-2 block text-center text-[11px] font-semibold text-slate-400 hover:text-teal-700"
              >
                ← Back to Map View
              </Link>
            </div>
          </section>
        </div>
      </div>

      <DashboardSettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
