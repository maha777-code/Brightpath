import { useMemo } from 'react';
import { motion } from 'framer-motion';

type Word = { t: number; text: string };

type Props = {
  tutorName: string;
  avatarUrl: string;
  transcript: Word[];
  currentTime: number;
  isPlaying: boolean;
  pageIndex: number;
  pageCount: number;
  onNextPage: () => void;
};

function SpectrumRing({ active }: { active: boolean }) {
  const bars = useMemo(() => Array.from({ length: 36 }, (_, i) => i), []);
  return (
    <div className="pointer-events-none absolute inset-[-14px]">
      {bars.map((i) => {
        const angle = (i / bars.length) * 360;
        return (
          <motion.div
            key={i}
            className="absolute left-1/2 top-1/2 w-[3px] origin-bottom rounded-full bg-gradient-to-t from-cyan-500 to-sky-300"
            style={{
              height: 14,
              transform: `rotate(${angle}deg) translateY(-58px)`,
            }}
            animate={
              active
                ? {
                    scaleY: [0.45, 1.35 + (i % 5) * 0.12, 0.55, 1.1, 0.45],
                    opacity: [0.45, 1, 0.6, 0.95, 0.45],
                  }
                : { scaleY: 0.35, opacity: 0.25 }
            }
            transition={
              active
                ? {
                    duration: 0.9 + (i % 7) * 0.05,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    delay: (i % 9) * 0.04,
                  }
                : { duration: 0.3 }
            }
          />
        );
      })}
    </div>
  );
}

export default function TutorTranscriptPanel({
  tutorName,
  avatarUrl,
  transcript,
  currentTime,
  isPlaying,
  pageIndex,
  pageCount,
  onNextPage,
}: Props) {
  const wordsPerPage = Math.ceil(transcript.length / Math.max(pageCount, 1));
  const start = pageIndex * wordsPerPage;
  const pageWords = transcript.slice(start, start + wordsPerPage);

  const activeIdx = useMemo(() => {
    let idx = -1;
    for (let i = 0; i < transcript.length; i++) {
      if (transcript[i].t <= currentTime) idx = i;
      else break;
    }
    return idx;
  }, [transcript, currentTime]);

  return (
    <aside className="flex h-full min-h-0 flex-col rounded-2xl border border-white/10 bg-[rgba(255,255,255,0.05)] p-4 shadow-xl backdrop-blur-xl sm:p-5">
      <div className="flex flex-col items-center pt-2">
        <div className="relative flex h-[120px] w-[120px] items-center justify-center sm:h-[140px] sm:w-[140px]">
          <SpectrumRing active={isPlaying} />
          <motion.div
            className="relative z-10 h-20 w-20 overflow-hidden rounded-full border-2 border-cyan-300/50 bg-slate-800 sm:h-24 sm:w-24"
            animate={isPlaying ? { boxShadow: ['0 0 0 0 rgba(34,211,238,0.4)', '0 0 0 12px rgba(34,211,238,0)', '0 0 0 0 rgba(34,211,238,0.4)'] } : {}}
            transition={{ duration: 1.6, repeat: Infinity }}
          >
            <img src={avatarUrl} alt={tutorName} className="h-full w-full object-cover" />
          </motion.div>
        </div>
        <p className="mt-2 text-sm font-semibold text-cyan-100/90">{tutorName}</p>
      </div>

      <h3 className="mt-5 text-base font-bold tracking-tight text-white sm:text-lg">
        Live Explainer & Transcript
      </h3>

      <div className="mt-3 min-h-0 flex-1 overflow-y-auto rounded-xl border border-white/5 bg-black/25 p-3 sm:p-4">
        <p className="text-[15px] leading-relaxed sm:text-base">
          {pageWords.map((w, i) => {
            const globalIdx = start + i;
            const isPast = globalIdx < activeIdx;
            const isCurrent = globalIdx === activeIdx;
            return (
              <span
                key={`${w.t}-${i}`}
                className={[
                  'mr-[0.35em] transition-colors duration-150',
                  isCurrent
                    ? 'font-semibold text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.35)]'
                    : isPast
                      ? 'text-slate-400'
                      : 'text-slate-500',
                ].join(' ')}
              >
                {w.text}
              </span>
            );
          })}
        </p>
      </div>

      <div className="mt-3 flex items-center justify-center gap-2 pb-1">
        {Array.from({ length: pageCount }).map((_, i) => (
          <span
            key={i}
            className={[
              'h-1.5 w-1.5 rounded-full',
              i === pageIndex ? 'bg-cyan-300' : 'bg-white/25',
            ].join(' ')}
          />
        ))}
        {pageIndex < pageCount - 1 && (
          <button
            type="button"
            onClick={onNextPage}
            className="ml-1 text-xs font-semibold text-cyan-200/90 hover:text-white"
          >
            Next
          </button>
        )}
      </div>
    </aside>
  );
}
