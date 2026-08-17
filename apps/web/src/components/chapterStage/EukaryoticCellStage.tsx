import { motion } from 'framer-motion';

type Callout = {
  id: string;
  label: string;
  xPct: number;
  yPct: number;
  appearAt: number;
  hideAt: number;
};

type Props = {
  currentTime: number;
  callouts: Callout[];
  captionsOn: boolean;
  captionText: string;
};

/** Stylized eukaryotic-cell simulation canvas (16:9 overlay). */
export default function EukaryoticCellStage({
  currentTime,
  callouts,
  captionsOn,
  captionText,
}: Props) {
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#0a1628]">
      <div
        className="absolute inset-0 opacity-80"
        style={{
          background:
            'radial-gradient(ellipse 70% 60% at 48% 50%, #1e3a5f 0%, #0f172a 55%, #020617 100%)',
        }}
      />
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 30%, rgba(56,189,248,0.15), transparent 40%), radial-gradient(circle at 75% 60%, rgba(34,211,238,0.12), transparent 35%)',
        }}
      />

      {/* Membrane */}
      <motion.div
        className="absolute left-1/2 top-1/2 h-[78%] w-[72%] -translate-x-1/2 -translate-y-1/2 rounded-[48%] border border-cyan-400/30"
        style={{
          background:
            'radial-gradient(ellipse at 40% 35%, rgba(56,189,248,0.25), rgba(14,116,144,0.15) 45%, rgba(15,23,42,0.4) 70%)',
          boxShadow: 'inset 0 0 60px rgba(34,211,238,0.15), 0 0 40px rgba(6,182,212,0.1)',
        }}
        animate={{ scale: [1, 1.015, 1] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Nucleus */}
      <motion.div
        className="absolute left-[38%] top-[36%] h-[22%] w-[18%] rounded-full"
        style={{
          background: 'radial-gradient(circle at 35% 30%, #7dd3fc, #0369a1 60%, #0c4a6e)',
          boxShadow: '0 0 24px rgba(14,165,233,0.45)',
        }}
        animate={{ scale: [1, 1.04, 1] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Golgi */}
      <div className="absolute left-[55%] top-[32%] flex h-[18%] w-[16%] flex-col justify-center gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-[18%] rounded-full bg-gradient-to-r from-amber-300/80 to-orange-400/70"
            style={{ width: `${85 - i * 8}%`, marginLeft: `${i * 6}%` }}
          />
        ))}
      </div>

      {/* Mitochondria */}
      <motion.div
        className="absolute left-[24%] top-[52%] h-[10%] w-[14%] rounded-[40%] bg-gradient-to-br from-rose-400 to-red-600/80"
        style={{ boxShadow: '0 0 16px rgba(244,63,94,0.35)' }}
        animate={{ rotate: [0, 6, -4, 0], x: [0, 4, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute left-[58%] top-[58%] h-[8%] w-[11%] rounded-[40%] bg-gradient-to-br from-rose-300 to-red-500/70"
        animate={{ rotate: [0, -5, 3, 0] }}
        transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Vesicles */}
      {[
        { left: '46%', top: '54%', delay: 0 },
        { left: '52%', top: '48%', delay: 0.4 },
        { left: '44%', top: '46%', delay: 0.8 },
      ].map((v, i) => (
        <motion.div
          key={i}
          className="absolute h-3 w-3 rounded-full bg-cyan-300/90 shadow-[0_0_10px_rgba(34,211,238,0.7)] sm:h-3.5 sm:w-3.5"
          style={{ left: v.left, top: v.top }}
          animate={{ y: [0, -8, 0], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 2.4, delay: v.delay, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}

      {callouts.map((c) => {
        const visible = currentTime >= c.appearAt && currentTime <= c.hideAt;
        if (!visible) return null;
        return (
          <motion.div
            key={c.id}
            className="pointer-events-none absolute z-10"
            style={{ left: `${c.xPct}%`, top: `${c.yPct}%` }}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <div className="relative -translate-x-1/2 -translate-y-1/2">
              <div className="absolute left-1/2 top-full h-6 w-px -translate-x-1/2 bg-cyan-300/70" />
              <div className="whitespace-nowrap rounded-md border border-cyan-400/40 bg-slate-950/75 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-cyan-100 shadow-lg backdrop-blur-sm sm:text-xs">
                {c.label}
              </div>
            </div>
          </motion.div>
        );
      })}

      {captionsOn && captionText && (
        <div className="absolute bottom-16 left-1/2 z-20 w-[90%] max-w-xl -translate-x-1/2 text-center">
          <span className="inline-block rounded-md bg-black/70 px-3 py-1.5 text-sm font-medium text-white">
            {captionText}
          </span>
        </div>
      )}
    </div>
  );
}
