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

const MAP_WIDTH = 320;
const NODE_GAP_Y = 92;
const TOP_PAD = 64;
const BOTTOM_PAD = 56;

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

      const side = gi % 2 === 0 ? -1 : 1;
      nodes.push({
        kind: 'video',
        id: video.id,
        chapterId: chapter.id,
        chapter,
        video,
        step: vi + 1,
        globalIndex: gi,
        x: MAP_WIDTH / 2 + side * 78,
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
      x: MAP_WIDTH / 2 + side * 78,
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
    <div className="relative flex h-full min-h-[480px] flex-col overflow-hidden rounded-[2rem] border-4 border-lime-300/90 bg-gradient-to-b from-sky-200 via-emerald-100 to-lime-200 shadow-[0_8px_0_#86efac]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-4 top-12 text-4xl opacity-80">🌲</div>
        <div className="absolute right-3 top-28 text-3xl opacity-75">🏔️</div>
        <div className="absolute bottom-20 left-3 text-3xl opacity-70">🌳</div>
        <div className="absolute right-5 top-[55%] text-2xl opacity-60">🌸</div>
        <div className="absolute bottom-32 right-6 text-3xl opacity-50">🌊</div>
        <div
          className="absolute inset-0 opacity-35"
          style={{
            backgroundImage:
              'radial-gradient(circle at 25% 15%, #fef08a99 0 36px, transparent 37px), radial-gradient(circle at 75% 55%, #ffffff66 0 48px, transparent 49px)',
          }}
        />
      </div>

      <div className="relative z-10 px-3 pb-1 pt-3">
        <p className="rounded-full bg-white/95 px-3 py-1.5 text-center text-xs font-black text-emerald-800 shadow ring-2 ring-lime-200">
          🗺️ {subjectName} Adventure Map
        </p>
      </div>

      <div className="relative z-10 flex-1 overflow-y-auto px-1 pb-4">
        <div className="relative mx-auto" style={{ width: MAP_WIDTH, height }}>
          <svg
            width={MAP_WIDTH}
            height={height}
            className="absolute inset-0"
            viewBox={`0 0 ${MAP_WIDTH} ${height}`}
          >
            <path
              d={pathD}
              fill="none"
              stroke="#fcd34d"
              strokeWidth={24}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d={pathD}
              fill="none"
              stroke="#fff7ed"
              strokeWidth={8}
              strokeLinecap="round"
              strokeDasharray="10 14"
              opacity={0.95}
            />
            <path
              d={pathD}
              fill="none"
              stroke="#4ade80"
              strokeWidth={10}
              strokeLinecap="round"
              strokeLinejoin="round"
              pathLength={100}
              strokeDasharray={100}
              strokeDashoffset={pathReady ? 100 - progressRatio * 100 : 100}
              className="transition-[stroke-dashoffset] duration-1000 ease-out"
              style={{ filter: 'drop-shadow(0 0 6px #4ade80aa)' }}
            />
          </svg>

          {chapters.map((ch, idx) => {
            const first = nodes.find((n) => n.chapterId === ch.id);
            if (!first) return null;
            return (
              <div
                key={`sign-${ch.id}`}
                className="pointer-events-none absolute z-20 -translate-x-1/2 rounded-xl bg-fuchsia-500 px-2 py-1 text-[10px] font-black text-white shadow-md"
                style={{ left: MAP_WIDTH / 2, top: Math.max(8, first.y - 48) }}
              >
                🏝️ Ch {ch.sequenceOrder}: {islandLabel(idx, subjectName)}
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
                    'relative flex items-center justify-center rounded-2xl border-4 font-black shadow-md transition-transform',
                    node.kind === 'quiz' ? 'h-16 w-16' : 'h-14 w-14',
                    node.kind === 'quiz' && node.state === 'boss-passed'
                      ? 'border-amber-300 bg-gradient-to-b from-yellow-300 to-amber-500'
                      : '',
                    node.kind === 'quiz' && node.state === 'boss-ready'
                      ? 'animate-pulse border-amber-400 bg-gradient-to-b from-yellow-200 to-amber-400 ring-4 ring-amber-200'
                      : '',
                    node.kind === 'quiz' && node.state === 'boss-locked'
                      ? 'border-slate-300 bg-slate-200'
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

                <p className="mt-1 max-w-[90px] truncate text-center text-[10px] font-extrabold text-emerald-900">
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
