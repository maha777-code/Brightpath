import React from 'react';

interface SharadaChatBadgeProps {
  onClick?: () => void;
  className?: string;
}

export const SharadaChatBadge: React.FC<SharadaChatBadgeProps> = ({ onClick, className = '' }) => {
  return (
    <div className={`relative my-4 inline-flex items-center justify-center ${className}`}>
      <button
        type="button"
        onClick={onClick}
        className="group relative inline-flex cursor-pointer appearance-none items-center overflow-visible rounded-2xl border border-cyan-500/30 bg-slate-950/80 py-2.5 pl-14 pr-6 shadow-[0_0_20px_rgba(6,182,212,0.15)] backdrop-blur-xl transition-all duration-300 hover:border-cyan-400/80 hover:shadow-[0_0_30px_rgba(6,182,212,0.35)]"
        aria-label="Chat with Sharada, your AI assistant"
      >
        {/* Absolute overlaying 3D robot — floats independently of the pill */}
        <div className="pointer-events-none absolute -left-4 -top-3 bottom-0 z-20 flex h-16 w-14 items-center justify-center">
          <div className="absolute inset-1 rounded-full bg-cyan-400/20 blur-md transition-all duration-300 group-hover:bg-cyan-400/40" />

          <div className="h-full w-full transition-transform duration-300 group-hover:scale-110">
            <img
              src="/sharada-robot.png"
              alt=""
              className="animate-bot-only-float h-full w-full object-contain drop-shadow-[0_4px_12px_rgba(6,182,212,0.6)]"
            />
          </div>

          <span className="absolute bottom-1 right-1 z-30 flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full border border-slate-950 bg-cyan-400" />
          </span>
        </div>

        <div className="flex select-none flex-col text-left">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 transition-colors group-hover:text-cyan-300 md:text-[11px]">
              AI Assistant
            </span>
            <span className="h-1 w-1 animate-pulse rounded-full bg-cyan-400" />
          </div>
          <span className="whitespace-nowrap text-xs font-semibold text-slate-100 transition-colors group-hover:text-white md:text-sm">
            Chat with Sharada
          </span>
        </div>
      </button>
    </div>
  );
};

export default SharadaChatBadge;
