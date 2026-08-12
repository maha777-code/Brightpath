import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { RefreshCw, Sparkles, Volume2, X } from 'lucide-react';
import { pickVoice, stripForSpeech } from '@/lib/speech';

export interface AnimalItem {
  id: string;
  name: string;
  emoji: string;
  habitatId: string;
  isMatched: boolean;
  soundPhrase: string;
  /** Realistic photo URL */
  photoUrl: string;
  /** Optional remote/local audio clip */
  soundUrl?: string;
  /** Web Audio synth preset when clip fails */
  synth: 'roar' | 'splash' | 'moo' | 'chatter' | 'click' | 'oink';
}

export interface HabitatTarget {
  id: string;
  title: string;
  emoji: string;
  bgColor: string;
  borderColor: string;
}

const INITIAL_HABITATS: HabitatTarget[] = [
  {
    id: 'jungle',
    title: 'Jungle',
    emoji: '🌴',
    bgColor: 'bg-emerald-100',
    borderColor: 'border-emerald-400',
  },
  {
    id: 'ocean',
    title: 'Ocean',
    emoji: '🌊',
    bgColor: 'bg-sky-100',
    borderColor: 'border-sky-400',
  },
  {
    id: 'farm',
    title: 'Barn Farm',
    emoji: '🚜',
    bgColor: 'bg-amber-100',
    borderColor: 'border-amber-400',
  },
];

const INITIAL_ANIMALS: AnimalItem[] = [
  {
    id: 'a1',
    name: 'Lion',
    emoji: '🦁',
    habitatId: 'jungle',
    isMatched: false,
    soundPhrase: 'Roar! I live in the Jungle!',
    photoUrl:
      'https://images.unsplash.com/photo-1546182990-dffeafbe841d?auto=format&fit=crop&w=800&q=80',
    soundUrl: '/animals/sounds/lion.mp3',
    synth: 'roar',
  },
  {
    id: 'a2',
    name: 'Fish',
    emoji: '🐠',
    habitatId: 'ocean',
    isMatched: false,
    soundPhrase: 'Splish splash! I live in the Ocean!',
    photoUrl:
      'https://images.unsplash.com/photo-1524704654690-b56c05c78a04?auto=format&fit=crop&w=800&q=80',
    soundUrl: '/animals/sounds/fish.mp3',
    synth: 'splash',
  },
  {
    id: 'a3',
    name: 'Cow',
    emoji: '🐮',
    habitatId: 'farm',
    isMatched: false,
    soundPhrase: 'Moo! I live on the Farm!',
    photoUrl:
      'https://images.unsplash.com/photo-1570042223110-7b0cce0f1f29?auto=format&fit=crop&w=800&q=80',
    soundUrl: '/animals/sounds/cow.mp3',
    synth: 'moo',
  },
  {
    id: 'a4',
    name: 'Monkey',
    emoji: '🐵',
    habitatId: 'jungle',
    isMatched: false,
    soundPhrase: 'Ooh ooh! I live in the Jungle!',
    photoUrl:
      'https://images.unsplash.com/photo-1540573133985-87b6da6d54a9?auto=format&fit=crop&w=800&q=80',
    soundUrl: '/animals/sounds/monkey.mp3',
    synth: 'chatter',
  },
  {
    id: 'a5',
    name: 'Dolphin',
    emoji: '🐬',
    habitatId: 'ocean',
    isMatched: false,
    soundPhrase: 'Click click! I live in the Ocean!',
    photoUrl:
      'https://images.unsplash.com/photo-1607153333879-c174d265f1d2?auto=format&fit=crop&w=800&q=80',
    soundUrl: '/animals/sounds/dolphin.mp3',
    synth: 'click',
  },
  {
    id: 'a6',
    name: 'Pig',
    emoji: '🐷',
    habitatId: 'farm',
    isMatched: false,
    soundPhrase: 'Oink! I live on the Farm!',
    photoUrl:
      'https://images.unsplash.com/photo-1516467508483-a7212febe31a?auto=format&fit=crop&w=800&q=80',
    soundUrl: '/animals/sounds/pig.mp3',
    synth: 'oink',
  },
];

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function speakKid(text: string) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  const clean = stripForSpeech(text);
  if (!clean) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(clean);
  utter.lang = 'en-US';
  utter.pitch = 1.15;
  utter.rate = 0.95;
  utter.volume = 1;
  const voice =
    pickVoice('en-US') ??
    pickVoice('en-GB') ??
    window.speechSynthesis.getVoices().find((v) => /en/i.test(v.lang)) ??
    null;
  if (voice) utter.voice = voice;
  window.setTimeout(() => window.speechSynthesis.speak(utter), 40);
}

let audioCtx: AudioContext | null = null;

function getAudioCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!audioCtx) audioCtx = new AC();
  if (audioCtx.state === 'suspended') void audioCtx.resume();
  return audioCtx;
}

/** Fun kid-friendly animal sound when mp3 assets are missing */
function playSynth(kind: AnimalItem['synth']) {
  const ctx = getAudioCtx();
  if (!ctx) return;

  const now = ctx.currentTime;
  const master = ctx.createGain();
  master.gain.value = 0.22;
  master.connect(ctx.destination);

  const beep = (freq: number, start: number, dur: number, type: OscillatorType = 'sawtooth') => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now + start);
    g.gain.setValueAtTime(0.0001, now + start);
    g.gain.exponentialRampToValueAtTime(0.9, now + start + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);
    osc.connect(g);
    g.connect(master);
    osc.start(now + start);
    osc.stop(now + start + dur + 0.02);
  };

  switch (kind) {
    case 'roar':
      beep(120, 0, 0.45, 'sawtooth');
      beep(90, 0.15, 0.55, 'triangle');
      beep(70, 0.35, 0.5, 'sawtooth');
      break;
    case 'moo':
      beep(180, 0, 0.35, 'triangle');
      beep(140, 0.2, 0.55, 'sine');
      break;
    case 'oink':
      beep(320, 0, 0.12, 'square');
      beep(260, 0.14, 0.12, 'square');
      beep(300, 0.28, 0.14, 'square');
      break;
    case 'chatter':
      beep(520, 0, 0.08, 'square');
      beep(480, 0.1, 0.08, 'square');
      beep(560, 0.2, 0.08, 'square');
      beep(500, 0.3, 0.1, 'square');
      break;
    case 'click':
      beep(880, 0, 0.06, 'sine');
      beep(1100, 0.1, 0.06, 'sine');
      beep(980, 0.2, 0.08, 'sine');
      break;
    case 'splash':
      beep(600, 0, 0.08, 'triangle');
      beep(420, 0.08, 0.12, 'sine');
      beep(300, 0.18, 0.18, 'triangle');
      break;
    default:
      beep(440, 0, 0.2, 'sine');
  }
}

async function playAnimalAudio(animal: AnimalItem) {
  // Prefer real clip from /public; fall back to synth
  if (animal.soundUrl) {
    try {
      const audio = new Audio(animal.soundUrl);
      audio.volume = 0.9;
      await audio.play();
      return;
    } catch {
      /* missing file or autoplay — synth below */
    }
  }
  playSynth(animal.synth);
}

interface HabitatDragAndDropProps {
  onStarEarned?: () => void;
  onLevelComplete?: () => void;
  className?: string;
}

type DragState = {
  animalId: string;
  x: number;
  y: number;
  offsetX: number;
  offsetY: number;
} | null;

const DRAG_THRESHOLD = 12;

export function HabitatDragAndDrop({
  onStarEarned,
  onLevelComplete,
  className = '',
}: HabitatDragAndDropProps) {
  const [animals, setAnimals] = useState<AnimalItem[]>(() =>
    shuffle(INITIAL_ANIMALS.map((a) => ({ ...a }))),
  );
  const [drag, setDrag] = useState<DragState>(null);
  const [hoverHabitat, setHoverHabitat] = useState<string | null>(null);
  const [justMatched, setJustMatched] = useState<string | null>(null);
  const [showComplete, setShowComplete] = useState(false);
  const [previewAnimal, setPreviewAnimal] = useState<AnimalItem | null>(null);

  const habitatRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const boardRef = useRef<HTMLDivElement>(null);
  const introPlayed = useRef(false);
  const dragAnimalId = useRef<string | null>(null);
  const pointerStart = useRef<{ x: number; y: number; animalId: string } | null>(null);
  const didDrag = useRef(false);

  const unmatched = animals.filter((a) => !a.isMatched);
  const matchedByHabitat = (habitatId: string) =>
    animals.filter((a) => a.isMatched && a.habitatId === habitatId);

  useEffect(() => {
    if (introPlayed.current) return;
    introPlayed.current = true;
    const id = window.setTimeout(() => {
      speakKid(
        'Hi little helper! Help the animals find their home! Drag each animal to where they live! Tap an animal to see a real picture!',
      );
    }, 500);
    return () => window.clearTimeout(id);
  }, []);

  const replayIntro = () => {
    speakKid(
      'Hi little helper! Help the animals find their home! Drag each animal to where they live! Tap an animal to see a real picture!',
    );
  };

  const resetGame = () => {
    setAnimals(shuffle(INITIAL_ANIMALS.map((a) => ({ ...a, isMatched: false }))));
    setDrag(null);
    setHoverHabitat(null);
    setJustMatched(null);
    setShowComplete(false);
    setPreviewAnimal(null);
    dragAnimalId.current = null;
    window.setTimeout(() => {
      speakKid('New animals! Help them find their homes!');
    }, 200);
  };

  const openAnimalPreview = useCallback((animal: AnimalItem) => {
    setPreviewAnimal(animal);
    void playAnimalAudio(animal);
    speakKid(`That's a real ${animal.name}! ${animal.soundPhrase}`);
  }, []);

  const habitatUnderPoint = useCallback((clientX: number, clientY: number) => {
    for (const h of INITIAL_HABITATS) {
      const el = habitatRefs.current[h.id];
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom) {
        return h.id;
      }
    }
    return null;
  }, []);

  const placeAnimal = useCallback(
    (animalId: string, habitatId: string) => {
      const animal = animals.find((a) => a.id === animalId);
      if (!animal || animal.isMatched) return;

      if (animal.habitatId !== habitatId) {
        const home = INITIAL_HABITATS.find((h) => h.id === animal.habitatId);
        speakKid(
          `Oopsie! A ${animal.name} lives in the ${home?.title ?? 'right place'}! Let's try again!`,
        );
        return;
      }

      setAnimals((prev) =>
        prev.map((a) => (a.id === animalId ? { ...a, isMatched: true } : a)),
      );
      setJustMatched(animalId);
      window.setTimeout(() => setJustMatched(null), 900);

      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      speakKid(
        `Yay! Super job! The ${animal.name} belongs in the ${INITIAL_HABITATS.find((h) => h.id === habitatId)?.title}!`,
      );
      onStarEarned?.();

      const remaining = animals.filter((a) => !a.isMatched && a.id !== animalId).length;
      if (remaining === 0) {
        window.setTimeout(() => {
          confetti({ particleCount: 200, spread: 100, origin: { y: 0.45 } });
          confetti({ particleCount: 90, angle: 60, spread: 80, origin: { x: 0.1, y: 0.55 } });
          confetti({ particleCount: 90, angle: 120, spread: 80, origin: { x: 0.9, y: 0.55 } });
          speakKid("Hooray! You did it! You're a Super Animal Helper!");
          setShowComplete(true);
          onLevelComplete?.();
        }, 700);
      }
    },
    [animals, onLevelComplete, onStarEarned],
  );

  const endPointer = useCallback(
    (clientX: number, clientY: number) => {
      const start = pointerStart.current;
      const id = dragAnimalId.current;
      const moved = didDrag.current;

      pointerStart.current = null;
      dragAnimalId.current = null;
      didDrag.current = false;
      setDrag(null);
      setHoverHabitat(null);

      if (!start || !id) return;

      if (!moved) {
        const animal = animals.find((a) => a.id === id);
        if (animal) openAnimalPreview(animal);
        return;
      }

      const habitatId = habitatUnderPoint(clientX, clientY);
      if (habitatId) placeAnimal(id, habitatId);
    },
    [animals, habitatUnderPoint, openAnimalPreview, placeAnimal],
  );

  useEffect(() => {
    if (!pointerStart.current && !drag) return;

    const onMove = (e: PointerEvent) => {
      const start = pointerStart.current;
      if (!start) return;

      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      const dist = Math.hypot(dx, dy);

      if (!didDrag.current && dist >= DRAG_THRESHOLD) {
        didDrag.current = true;
        dragAnimalId.current = start.animalId;
        const animal = animals.find((a) => a.id === start.animalId);
        setDrag({
          animalId: start.animalId,
          x: e.clientX,
          y: e.clientY,
          offsetX: 56,
          offsetY: 56,
        });
        if (animal) {
          speakKid(`That's a ${animal.name}! Where does the ${animal.name} live?`);
        }
      }

      if (didDrag.current) {
        setDrag((d) => (d ? { ...d, x: e.clientX, y: e.clientY } : d));
        setHoverHabitat(habitatUnderPoint(e.clientX, e.clientY));
      }
    };

    const onUp = (e: PointerEvent) => {
      endPointer(e.clientX, e.clientY);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [animals, drag, endPointer, habitatUnderPoint]);

  const onPointerDownAnimal = (animal: AnimalItem, e: React.PointerEvent) => {
    if (animal.isMatched) return;
    e.preventDefault();
    didDrag.current = false;
    dragAnimalId.current = animal.id;
    pointerStart.current = { x: e.clientX, y: e.clientY, animalId: animal.id };
  };

  const draggingAnimal = drag ? animals.find((a) => a.id === drag.animalId) : null;

  return (
    <div
      ref={boardRef}
      className={[
        'relative flex min-h-0 flex-col overflow-hidden rounded-3xl border-2 border-violet-100 bg-gradient-to-b from-violet-50 via-white to-sky-50 p-4 shadow-soft sm:p-5',
        className,
      ].join(' ')}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-black text-slate-800">
            <Sparkles className="h-5 w-5 text-amber-500" /> Animal Homes
          </h3>
          <p className="text-sm font-semibold text-slate-500">
            Tap for a real photo & sound — drag to a home!
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={replayIntro}
            className="flex h-12 min-w-12 items-center justify-center gap-1 rounded-2xl bg-violet-500 px-3 text-sm font-bold text-white shadow-md active:scale-95"
            aria-label="Hear instructions again"
          >
            <Volume2 className="h-5 w-5" />
            <span className="hidden sm:inline">Listen</span>
          </button>
          <button
            type="button"
            onClick={resetGame}
            className="flex h-12 min-w-12 items-center justify-center gap-1 rounded-2xl bg-slate-100 px-3 text-sm font-bold text-slate-700 shadow-sm active:scale-95"
            aria-label="Play again"
          >
            <RefreshCw className="h-5 w-5" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        </div>
      </div>

      {/* Habitats */}
      <div className="mb-4 grid shrink-0 gap-3 sm:grid-cols-3">
        {INITIAL_HABITATS.map((habitat) => {
          const glowing = hoverHabitat === habitat.id && Boolean(drag);
          const placed = matchedByHabitat(habitat.id);
          return (
            <div
              key={habitat.id}
              ref={(el) => {
                habitatRefs.current[habitat.id] = el;
              }}
              className={[
                'min-h-[120px] rounded-3xl border-4 p-3 transition-all',
                habitat.bgColor,
                glowing
                  ? 'scale-[1.02] border-dashed border-emerald-400 bg-emerald-50/80 shadow-lg ring-4 ring-emerald-200'
                  : habitat.borderColor,
              ].join(' ')}
            >
              <p className="mb-2 text-center text-base font-black text-slate-800">
                <span className="mr-1 text-2xl">{habitat.emoji}</span>
                {habitat.title}
              </p>
              <div className="flex min-h-[64px] flex-wrap items-center justify-center gap-2">
                {placed.length === 0 && (
                  <p className="text-xs font-bold text-slate-400">Drop animals here</p>
                )}
                {placed.map((a) => (
                  <motion.button
                    key={a.id}
                    type="button"
                    initial={{ scale: 0.6 }}
                    animate={{
                      scale: justMatched === a.id ? [1, 1.2, 1] : 1,
                      y: justMatched === a.id ? [0, -8, 0] : 0,
                    }}
                    transition={{ type: 'spring', stiffness: 400, damping: 12 }}
                    onClick={() => openAnimalPreview(a)}
                    className="flex h-16 w-16 flex-col items-center justify-center rounded-2xl bg-white text-2xl shadow-md"
                  >
                    <span aria-hidden>{a.emoji}</span>
                    <span className="text-[10px] font-black text-slate-600">{a.name}</span>
                  </motion.button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Animal tray — large cards filling space */}
      <div className="flex min-h-[220px] flex-1 flex-col rounded-3xl border-2 border-dashed border-violet-200 bg-white/80 p-3 sm:min-h-[260px] sm:p-4">
        <p className="mb-3 text-center text-base font-black text-violet-700">
          Animals waiting for a home ({unmatched.length})
        </p>
        <div className="grid min-h-0 flex-1 grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
          {unmatched.map((animal) => {
            const isDragging = drag?.animalId === animal.id;
            return (
              <button
                key={animal.id}
                type="button"
                onPointerDown={(e) => onPointerDownAnimal(animal, e)}
                className={[
                  'flex min-h-[110px] touch-none select-none flex-col items-center justify-center gap-1 rounded-3xl border-4 border-white bg-gradient-to-b from-white to-violet-50 px-2 py-3 shadow-lg transition active:scale-95 sm:min-h-[130px]',
                  isDragging ? 'scale-105 opacity-40 shadow-2xl' : 'hover:scale-[1.03]',
                ].join(' ')}
                aria-label={`Tap or drag ${animal.name}`}
              >
                <span className="text-5xl leading-none sm:text-6xl" aria-hidden>
                  {animal.emoji}
                </span>
                <span className="text-sm font-black text-slate-800 sm:text-base">{animal.name}</span>
                <span className="text-[10px] font-bold uppercase tracking-wide text-violet-500">
                  Tap · Drag
                </span>
              </button>
            );
          })}
          {unmatched.length === 0 && !showComplete && (
            <p className="col-span-full self-center py-6 text-center text-base font-bold text-emerald-600">
              All animals are home!
            </p>
          )}
        </div>
      </div>

      {/* Floating drag ghost */}
      {draggingAnimal && drag && (
        <div
          className="pointer-events-none fixed z-50 flex h-28 w-28 scale-110 flex-col items-center justify-center rounded-3xl border-4 border-violet-300 bg-white text-5xl opacity-90 shadow-2xl"
          style={{
            left: drag.x - drag.offsetX,
            top: drag.y - drag.offsetY,
          }}
        >
          <span aria-hidden>{draggingAnimal.emoji}</span>
          <span className="text-sm font-black text-slate-700">{draggingAnimal.name}</span>
        </div>
      )}

      {/* Real animal photo popup */}
      <AnimatePresence>
        {previewAnimal && (
          <motion.div
            className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPreviewAnimal(null)}
          >
            <motion.div
              role="dialog"
              aria-label={`Real ${previewAnimal.name}`}
              initial={{ scale: 0.5, y: 80 }}
              animate={{
                scale: [0.5, 1.12, 0.96, 1.06, 1],
                y: [80, -28, 8, -12, 0],
              }}
              exit={{ scale: 0.8, opacity: 0, y: 40 }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
              className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setPreviewAnimal(null)}
                className="absolute right-3 top-3 z-10 rounded-full bg-white/90 p-2 text-slate-600 shadow"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                <motion.img
                  key={previewAnimal.id}
                  src={previewAnimal.photoUrl}
                  alt={`Real ${previewAnimal.name}`}
                  className="h-full w-full object-cover"
                  initial={{ y: 40, scale: 0.9 }}
                  animate={{ y: [40, -18, 0, -10, 0], scale: [0.9, 1.08, 1, 1.04, 1] }}
                  transition={{ duration: 0.85, ease: 'easeOut' }}
                  draggable={false}
                />
                <span className="absolute bottom-3 left-3 rounded-full bg-black/50 px-3 py-1 text-2xl">
                  {previewAnimal.emoji}
                </span>
              </div>
              <div className="p-4 text-center">
                <h4 className="text-2xl font-black text-slate-800">{previewAnimal.name}!</h4>
                <p className="mt-1 text-sm font-semibold text-slate-500">{previewAnimal.soundPhrase}</p>
                <button
                  type="button"
                  onClick={() => void playAnimalAudio(previewAnimal)}
                  className="mt-3 inline-flex items-center gap-2 rounded-full bg-violet-500 px-4 py-2 text-sm font-bold text-white"
                >
                  <Volume2 className="h-4 w-4" /> Play sound again
                </button>
                <p className="mt-2 text-xs font-bold text-violet-600">
                  Now drag me to my home!
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Level complete modal */}
      <AnimatePresence>
        {showComplete && (
          <motion.div
            className="absolute inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl"
            >
              <p className="text-5xl">🎉</p>
              <h4 className="mt-3 text-2xl font-black text-slate-800">Super Animal Helper!</h4>
              <p className="mt-2 text-sm font-semibold text-slate-500">
                You helped every animal find their home. Amazing work!
              </p>
              <button
                type="button"
                onClick={resetGame}
                className="mt-5 w-full rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 py-3.5 text-base font-black text-white shadow-md active:scale-95"
              >
                Play Next Game 🎉
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
