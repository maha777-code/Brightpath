import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { RefreshCw, Sparkles, Volume2 } from 'lucide-react';
import { pickVoice, stripForSpeech } from '@/lib/speech';

export interface AnimalItem {
  id: string;
  name: string;
  emoji: string;
  habitatId: string;
  isMatched: boolean;
  soundPhrase: string;
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
  },
  {
    id: 'a2',
    name: 'Fish',
    emoji: '🐠',
    habitatId: 'ocean',
    isMatched: false,
    soundPhrase: 'Splish splash! I live in the Ocean!',
  },
  {
    id: 'a3',
    name: 'Cow',
    emoji: '🐮',
    habitatId: 'farm',
    isMatched: false,
    soundPhrase: 'Moo! I live on the Farm!',
  },
  {
    id: 'a4',
    name: 'Monkey',
    emoji: '🐵',
    habitatId: 'jungle',
    isMatched: false,
    soundPhrase: 'Ooh ooh! I live in the Jungle!',
  },
  {
    id: 'a5',
    name: 'Dolphin',
    emoji: '🐬',
    habitatId: 'ocean',
    isMatched: false,
    soundPhrase: 'Click click! I live in the Ocean!',
  },
  {
    id: 'a6',
    name: 'Pig',
    emoji: '🐷',
    habitatId: 'farm',
    isMatched: false,
    soundPhrase: 'Oink! I live on the Farm!',
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
  const habitatRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const boardRef = useRef<HTMLDivElement>(null);
  const introPlayed = useRef(false);
  const dragAnimalId = useRef<string | null>(null);

  const unmatched = animals.filter((a) => !a.isMatched);
  const matchedByHabitat = (habitatId: string) =>
    animals.filter((a) => a.isMatched && a.habitatId === habitatId);

  useEffect(() => {
    if (introPlayed.current) return;
    introPlayed.current = true;
    const id = window.setTimeout(() => {
      speakKid(
        'Hi little helper! Help the animals find their home! Drag each animal to where they live!',
      );
    }, 500);
    return () => window.clearTimeout(id);
  }, []);

  const replayIntro = () => {
    speakKid(
      'Hi little helper! Help the animals find their home! Drag each animal to where they live!',
    );
  };

  const resetGame = () => {
    setAnimals(shuffle(INITIAL_ANIMALS.map((a) => ({ ...a, isMatched: false }))));
    setDrag(null);
    setHoverHabitat(null);
    setJustMatched(null);
    setShowComplete(false);
    dragAnimalId.current = null;
    window.setTimeout(() => {
      speakKid('New animals! Help them find their homes!');
    }, 200);
  };

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
      speakKid(`Yay! Super job! The ${animal.name} belongs in the ${INITIAL_HABITATS.find((h) => h.id === habitatId)?.title}!`);
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

  const endDrag = useCallback(
    (clientX: number, clientY: number) => {
      const id = dragAnimalId.current;
      dragAnimalId.current = null;
      setDrag(null);
      const habitatId = habitatUnderPoint(clientX, clientY);
      setHoverHabitat(null);
      if (id && habitatId) placeAnimal(id, habitatId);
    },
    [habitatUnderPoint, placeAnimal],
  );

  useEffect(() => {
    if (!drag) return;

    const onMove = (e: PointerEvent) => {
      setDrag((d) => (d ? { ...d, x: e.clientX, y: e.clientY } : d));
      setHoverHabitat(habitatUnderPoint(e.clientX, e.clientY));
    };
    const onUp = (e: PointerEvent) => {
      endDrag(e.clientX, e.clientY);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [drag, endDrag, habitatUnderPoint]);

  const onPointerDownAnimal = (animal: AnimalItem, e: React.PointerEvent) => {
    if (animal.isMatched) return;
    e.preventDefault();
    dragAnimalId.current = animal.id;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setDrag({
      animalId: animal.id,
      x: e.clientX,
      y: e.clientY,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
    });
    speakKid(`That's a ${animal.name}! Where does the ${animal.name} live?`);
  };

  const draggingAnimal = drag ? animals.find((a) => a.id === drag.animalId) : null;

  return (
    <div
      ref={boardRef}
      className={[
        'relative overflow-hidden rounded-3xl border-2 border-violet-100 bg-gradient-to-b from-violet-50 via-white to-sky-50 p-4 shadow-soft sm:p-5',
        className,
      ].join(' ')}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-black text-slate-800">
            <Sparkles className="h-5 w-5 text-amber-500" /> Animal Homes
          </h3>
          <p className="text-sm font-semibold text-slate-500">
            Drag each animal to the place they live!
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
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
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
                'min-h-[140px] rounded-3xl border-4 p-3 transition-all',
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
              <div className="flex min-h-[72px] flex-wrap items-center justify-center gap-2">
                {placed.length === 0 && (
                  <p className="text-xs font-bold text-slate-400">Drop animals here</p>
                )}
                {placed.map((a) => (
                  <motion.div
                    key={a.id}
                    initial={{ scale: 0.6 }}
                    animate={{
                      scale: justMatched === a.id ? [1, 1.2, 1] : 1,
                      y: justMatched === a.id ? [0, -8, 0] : 0,
                    }}
                    transition={{ type: 'spring', stiffness: 400, damping: 12 }}
                    className="flex h-20 w-20 flex-col items-center justify-center rounded-2xl bg-white text-3xl shadow-md"
                  >
                    <span aria-hidden>{a.emoji}</span>
                    <span className="text-[10px] font-black text-slate-600">{a.name}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Animal tray */}
      <div className="rounded-3xl border-2 border-dashed border-violet-200 bg-white/80 p-3">
        <p className="mb-3 text-center text-sm font-black text-violet-700">
          Animals waiting for a home ({unmatched.length})
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          {unmatched.map((animal) => {
            const isDragging = drag?.animalId === animal.id;
            return (
              <button
                key={animal.id}
                type="button"
                onPointerDown={(e) => onPointerDownAnimal(animal, e)}
                className={[
                  'flex h-24 w-24 touch-none select-none flex-col items-center justify-center rounded-3xl border-4 border-white bg-gradient-to-b from-white to-violet-50 text-4xl shadow-lg transition active:scale-95',
                  isDragging ? 'scale-110 opacity-40 shadow-2xl' : 'hover:scale-105',
                ].join(' ')}
                aria-label={`Drag ${animal.name}`}
              >
                <span aria-hidden>{animal.emoji}</span>
                <span className="mt-0.5 text-xs font-black text-slate-700">{animal.name}</span>
              </button>
            );
          })}
          {unmatched.length === 0 && !showComplete && (
            <p className="py-4 text-sm font-bold text-emerald-600">All animals are home!</p>
          )}
        </div>
      </div>

      {/* Floating drag ghost (pointer / touch) */}
      {draggingAnimal && drag && (
        <div
          className="pointer-events-none fixed z-50 flex h-24 w-24 scale-110 flex-col items-center justify-center rounded-3xl border-4 border-violet-300 bg-white text-4xl opacity-90 shadow-2xl"
          style={{
            left: drag.x - drag.offsetX,
            top: drag.y - drag.offsetY,
          }}
        >
          <span aria-hidden>{draggingAnimal.emoji}</span>
          <span className="text-xs font-black text-slate-700">{draggingAnimal.name}</span>
        </div>
      )}

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
