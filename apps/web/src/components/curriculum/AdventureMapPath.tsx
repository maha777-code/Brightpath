import { useEffect, useMemo, useRef, useState } from 'react';
import { Lock, Star } from 'lucide-react';
import type { CurriculumChapterItem, CurriculumVideoItem } from '@brightpath/shared';

export type AdventureMapNode =
  | {
      kind: 'video';
      id: string;
      chapterId: string;
      chapter: CurriculumChapterItem;
      video: CurriculumVideoItem;
      step: number;
      globalIndex: number;
      x: number;
      y: number;
      state: 'completed' | 'active' | 'ready' | 'locked';
    }
  | {
      kind: 'quiz';
      id: string;
      chapterId: string;
      chapter: CurriculumChapterItem;
      globalIndex: number;
      x: number;
      y: number;
      state: 'boss-passed' | 'boss-ready' | 'boss-locked';
    };

const MAP_WIDTH = 340;
const NODE_GAP_Y = 100;
const TOP_PAD = 72;
const BOTTOM_PAD = 64;

const LANDMARKS = ['🎪', '🎡', '🏰', '🗼', '🚀', '✈️', '🏖️', '🏔️', '🌲', '🏠', '⛽', '🚓', '🌉', '🌵', '⛵'];

function islandLabel(chapterIndex: number, subjectName: string) {
  if (/read/i.test(subjectName)) {
    return ['Sound Island', 'Word Island', 'Story Island'][chapterIndex % 3];
  }
  if (/math/i.test(subjectName)) {
    return chapterIndex === 0 ? 'Number Island' : 'Puzzle Island';
  }
  return chapterIndex === 0 ? 'Adventure Island' : 'Treasure Island';
}

function layoutNodes(
  chapters: CurriculumChapterItem[],
  activeVideoId: string | null,
): AdventureMapNode[] {
  const nodes: AdventureMapNode[] = [];
  let gi = 0;

  chapters.forEach((chapter) => {
    chapter.videos.forEach((video, vi) => {
      let state: 'completed' | 'active' | 'ready' | 'locked';
      if (video.isLocked || chapter.status === 'LOCKED') state = 'locked';
      else if (video.isCompleted) state = 'completed';
      else if (video.id === activeVideoId) state = 'active';
      else state = 'ready';

      // City-road zigzag: left curb → right curb
      const side = gi % 2 === 0 ? -1 : 1;
      nodes.push({
        kind: 'video',
        id: video.id,
        chapterId: chapter.id,
        chapter,
        video,
        step: vi + 1,
        globalIndex: gi,
        x: MAP_WIDTH / 2 + side * 86,
        y: TOP_PAD + gi * NODE_GAP_Y,
        state,
      });
      gi += 1;
    });

    const side = gi % 2 === 0 ? -1 : 1;
    nodes.push({
      kind: 'quiz',
      id: `quiz-${chapter.id}`,
      chapterId: chapter.id,
      chapter,
      globalIndex: gi,
      x: MAP_WIDTH / 2 + side * 86,
      y: TOP_PAD + gi * NODE_GAP_Y,
      state: chapter.quizPassed
        ? 'boss-passed'
        : chapter.quizUnlocked
          ? 'boss-ready'
          : 'boss-locked',
    });
    gi += 1;
  });

  return nodes;
}

/** Smooth S-curve road through nodes (city playmat style) */
function buildPathD(nodes: AdventureMapNode[]): string {
  if (nodes.length === 0) return '';
  let d = `M ${nodes[0].x} ${nodes[0].y}`;
  for (let i = 1; i < nodes.length; i++) {
    const prev = nodes[i - 1];
    const curr = nodes[i];
    const midY = (prev.y + curr.y) / 2;
    d += ` C ${prev.x} ${midY}, ${curr.x} ${midY}, ${curr.x} ${curr.y}`;
  }
  return d;
}

/** Decorative city playmat layer (grass, river, roundabouts) behind the quest road */
function CityPlaymatBackdrop({ width, height }: { width: number; height: number }) {
  const tiles = Math.ceil(height / 420) + 1;
  return (
    <svg
      width={width}
      height={height}
      className="absolute inset-0"
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden
    >
      <defs>
        <pattern id="grass" width="28" height="28" patternUnits="userSpaceOnUse">
          <rect width="28" height="28" fill="#86efac" />
          <circle cx="6" cy="10" r="2" fill="#4ade80" opacity="0.45" />
          <circle cx="20" cy="22" r="1.5" fill="#22c55e" opacity="0.35" />
        </pattern>
        <linearGradient id="river" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#7dd3fc" />
          <stop offset="50%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#7dd3fc" />
        </linearGradient>
      </defs>

      <rect width={width} height={height} fill="url(#grass)" />
      <rect x="0" y="0" width={width} height="120" fill="#e0f2fe" opacity="0.5" />
      <rect
        x="0"
        y={Math.max(0, height - 180)}
        width={width}
        height="180"
        fill="#fde68a"
        opacity="0.32"
      />

      <path
        d={`M ${width - 40} 0
            Q ${width - 80} ${height * 0.25}, ${width - 30} ${height * 0.45}
            Q ${width - 90} ${height * 0.65}, ${width - 50} ${height}`}
        fill="none"
        stroke="url(#river)"
        strokeWidth="28"
        strokeLinecap="round"
        opacity="0.85"
      />

      {Array.from({ length: tiles }).map((_, i) => {
        const y = 80 + i * 420;
        return (
          <g key={`deco-${i}`}>
            <circle cx="48" cy={y} r="28" fill="#2d3748" />
            <circle cx="48" cy={y} r="14" fill="#4ade80" />
            <text
              x="48"
              y={y + 5}
              textAnchor="middle"
              fontSize="12"
              fontWeight="900"
              fill="#166534"
            >
              H
            </text>
            <rect
              x={width - 70}
              y={y + 40}
              width="48"
              height="36"
              rx="4"
              fill="#94a3b8"
              opacity="0.75"
            />
            <text
              x={width - 46}
              y={y + 63}
              textAnchor="middle"
              fontSize="14"
              fontWeight="900"
              fill="#1d4ed8"
            >
              P
            </text>
            {[0, 1, 2, 3].map((t) => (
              <rect
                key={t}
                x={width / 2 - 40 + t * 10}
                y={y + 110}
                width="5"
                height="14"
                fill="#fff"
                opacity="0.85"
              />
            ))}
          </g>
        );
      })}
    </svg>
  );
}

interface AdventureMapPathProps {
  chapters: CurriculumChapterItem[];
  subjectName: string;
  activeVideoId: string | null;
  learnerName?: string;
  onSelectVideo: (chapter: CurriculumChapterItem, video: CurriculumVideoItem) => void;
  onSelectQuiz: (chapter: CurriculumChapterItem) => void;
  celebrateNodeId?: string | null;
}

export function AdventureMapPath({
  chapters,
  subjectName,
  activeVideoId,
  learnerName = 'Explorer',
  onSelectVideo,
  onSelectQuiz,
  celebrateNodeId,
}: AdventureMapPathProps) {
  const activeRef = useRef<HTMLButtonElement>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [pathReady, setPathReady] = useState(false);

  const nodes = useMemo(
    () => layoutNodes(chapters, activeVideoId),
    [chapters, activeVideoId],
  );
  const pathD = useMemo(() => buildPathD(nodes), [nodes]);
  const height = TOP_PAD + Math.max(nodes.length - 1, 0) * NODE_GAP_Y + BOTTOM_PAD;

  const completedCount = nodes.filter(
    (n) =>
      (n.kind === 'video' && n.video.isCompleted) ||
      (n.kind === 'quiz' && n.state === 'boss-passed'),
  ).length;
  const progressRatio = nodes.length ? completedCount / nodes.length : 0;

  useEffect(() => {
    const t = window.setTimeout(() => setPathReady(true), 80);
    return () => window.clearTimeout(t);
  }, [nodes.length]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      activeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 160);
    return () => window.clearTimeout(t);
  }, [activeVideoId, nodes.length]);

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2600);
  };

  const onNodeClick = (node: AdventureMapNode) => {
    if (node.kind === 'video') {
      if (node.state === 'locked') {
        showToast('Complete previous lessons to unlock this stage!');
        return;
      }
      onSelectVideo(node.chapter, node.video);
      return;
    }
    if (node.state === 'boss-locked') {
      showToast('Complete previous lessons to unlock this stage!');
      return;
    }
    onSelectQuiz(node.chapter);
  };

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col overflow-hidden rounded-2xl border border-emerald-200/60 bg-[#bbf7d0]">
      <div className="relative z-10 shrink-0 px-3 pb-1 pt-3">
        <p className="rounded-full border border-white/80 bg-white/95 px-3 py-1.5 text-center text-xs font-black text-emerald-800 shadow-sm">
          🗺️ {subjectName} City Quest Map
        </p>
      </div>

      <div className="relative z-10 min-h-0 flex-1 overflow-y-auto overscroll-contain px-1 pb-4 [scrollbar-width:thin] [scrollbar-color:#64748b_transparent]">
        <div className="relative mx-auto" style={{ width: MAP_WIDTH, height }}>
          <CityPlaymatBackdrop width={MAP_WIDTH} height={height} />
          {/* Photo playmat overlay when asset is available */}
          <div
            className="pointer-events-none absolute inset-0 z-[1] opacity-40 mix-blend-multiply"
            style={{
              backgroundImage: 'url(/maps/city-playmat.png)',
              backgroundSize: '100% auto',
              backgroundPosition: 'center top',
              backgroundRepeat: 'repeat-y',
            }}
          />

          {/* Landmark stickers along the road */}
          {nodes.map((node, i) => (
            <span
              key={`lm-${node.id}`}
              className="pointer-events-none absolute z-[5] text-xl drop-shadow-sm"
              style={{
                left: node.x + (i % 2 === 0 ? 52 : -64),
                top: node.y - 18,
              }}
              aria-hidden
            >
              {LANDMARKS[i % LANDMARKS.length]}
            </span>
          ))}

          {/* Asphalt road + lane dashes + progress glow */}
          <svg
            width={MAP_WIDTH}
            height={height}
            className="absolute inset-0 z-10"
            viewBox={`0 0 ${MAP_WIDTH} ${height}`}
          >
            {/* Road shoulder */}
            <path
              d={pathD}
              fill="none"
              stroke="#1e293b"
              strokeWidth={34}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Asphalt */}
            <path
              d={pathD}
              fill="none"
              stroke="#2d3748"
              strokeWidth={26}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Center lane dashes */}
            <path
              d={pathD}
              fill="none"
              stroke="#ffffff"
              strokeWidth={3}
              strokeLinecap="round"
              strokeDasharray="10 8"
              opacity={0.95}
            />
            {/* Progress fill on road edge */}
            <path
              d={pathD}
              fill="none"
              stroke="#4ade80"
              strokeWidth={6}
              strokeLinecap="round"
              strokeLinejoin="round"
              pathLength={100}
              strokeDasharray={100}
              strokeDashoffset={pathReady ? 100 - progressRatio * 100 : 100}
              className="transition-[stroke-dashoffset] duration-1000 ease-out"
              style={{ filter: 'drop-shadow(0 0 5px #4ade80aa)' }}
            />
          </svg>

          {chapters.map((ch, idx) => {
            const first = nodes.find((n) => n.chapterId === ch.id);
            if (!first) return null;
            return (
              <div
                key={`sign-${ch.id}`}
                className="pointer-events-none absolute z-20 -translate-x-1/2 rounded-xl bg-sky-600 px-2 py-1 text-[10px] font-black text-white shadow-md ring-2 ring-white"
                style={{ left: MAP_WIDTH / 2, top: Math.max(8, first.y - 52) }}
              >
                🚏 Ch {ch.sequenceOrder}: {islandLabel(idx, subjectName)}
              </div>
            );
          })}

          {nodes.map((node) => {
            const isSelected = node.kind === 'video' && node.video.id === activeVideoId;
            const celebrating = celebrateNodeId === node.id;

            return (
              <div
                key={node.id}
                className="absolute z-30 -translate-x-1/2 -translate-y-1/2"
                style={{ left: node.x, top: node.y }}
              >
                {isSelected && (
                  <div className="absolute -top-12 left-1/2 flex -translate-x-1/2 flex-col items-center">
                    <span className="mb-0.5 whitespace-nowrap rounded-full bg-white px-2 py-0.5 text-[9px] font-black text-rose-600 shadow">
                      {learnerName} is here!
                    </span>
                    <span className="animate-bounce text-2xl">🐥</span>
                  </div>
                )}

                {node.kind === 'video' && node.state === 'completed' && (
                  <div className="absolute -top-5 left-1/2 flex -translate-x-1/2 gap-0.5">
                    {[0, 1, 2].map((s) => (
                      <Star
                        key={s}
                        className={[
                          'h-3 w-3 fill-yellow-300 text-yellow-500',
                          celebrating ? 'animate-bounce' : '',
                        ].join(' ')}
                        style={celebrating ? { animationDelay: `${s * 80}ms` } : undefined}
                      />
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  ref={isSelected ? activeRef : undefined}
                  onClick={() => onNodeClick(node)}
                  className={[
                    'relative flex items-center justify-center rounded-2xl border-4 font-black shadow-lg ring-2 ring-white transition-transform',
                    node.kind === 'quiz' ? 'h-16 w-16' : 'h-14 w-14',
                    node.kind === 'quiz' && node.state === 'boss-passed'
                      ? 'border-amber-300 bg-gradient-to-b from-yellow-300 to-amber-500'
                      : '',
                    node.kind === 'quiz' && node.state === 'boss-ready'
                      ? 'animate-pulse border-amber-400 bg-gradient-to-b from-yellow-200 to-amber-400 ring-4 ring-amber-200'
                      : '',
                    node.kind === 'quiz' && node.state === 'boss-locked'
                      ? 'border-slate-300 bg-slate-300'
                      : '',
                    node.kind === 'video' && node.state === 'completed'
                      ? 'border-yellow-300 bg-rose-500 shadow-[0_0_16px_#fbbf24aa]'
                      : '',
                    node.kind === 'video' && node.state === 'active'
                      ? 'scale-110 animate-pulse border-yellow-200 bg-rose-500 ring-4 ring-rose-300'
                      : '',
                    node.kind === 'video' && node.state === 'ready'
                      ? 'border-rose-300 bg-rose-400'
                      : '',
                    node.kind === 'video' && node.state === 'locked'
                      ? 'border-slate-300 bg-slate-300'
                      : '',
                    celebrating ? 'scale-125' : '',
                  ].join(' ')}
                >
                  {node.kind === 'quiz' ? (
                    node.state === 'boss-locked' ? (
                      <Lock className="h-6 w-6 text-slate-500" />
                    ) : (
                      <span className="text-2xl">
                        {node.state === 'boss-passed' ? '🏆' : '🎁'}
                      </span>
                    )
                  ) : node.state === 'locked' ? (
                    <Lock className="h-5 w-5 text-slate-600" />
                  ) : node.state === 'completed' ? (
                    <Star className="h-7 w-7 fill-yellow-300 text-yellow-200 drop-shadow" />
                  ) : (
                    <span className="text-lg text-white">{node.step}</span>
                  )}
                </button>

                <p className="mt-1 max-w-[90px] truncate text-center text-[10px] font-extrabold text-slate-800 drop-shadow-[0_1px_0_#fff]">
                  {node.kind === 'quiz'
                    ? 'Boss!'
                    : node.state === 'active'
                      ? '🌟 Now'
                      : `Lv ${node.step}`}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {toast && (
        <div className="absolute bottom-3 left-1/2 z-50 max-w-[92%] -translate-x-1/2 rounded-full bg-slate-800 px-4 py-2 text-center text-xs font-bold text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
