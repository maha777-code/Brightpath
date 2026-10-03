import React from 'react';

interface SharadaChatBadgeProps {
  onClick?: () => void;
  className?: string;
}

export const SharadaChatBadge: React.FC<SharadaChatBadgeProps> = ({ onClick, className = '' }) => {
  return (
    <div className={`group relative my-6 inline-flex items-center justify-center ${className}`}>
      {/* Enlarged 3D robot overlay, sitting outside the pill */}
      <div className="pointer-events-none absolute -left-8 -top-6 z-30 flex h-24 w-20 items-center justify-center md:h-28 md:w-24">
        <div className="absolute inset-2 rounded-full bg-cyan-400/25 blur-lg transition-all duration-300 group-hover:bg-cyan-400/45" />

        <div className="h-full w-full transition-transform duration-300 group-hover:scale-110">
          <img
            src="/sharada-robot.png"
            alt=""
            className="animate-bot-only-float h-full w-full object-contain drop-shadow-[0_8px_16px_rgba(6,182,212,0.6)]"
          />
        </div>

        <span className="absolute bottom-2 right-2 z-40 flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
          <span className="relative inline-flex h-3 w-3 rounded-full border-2 border-slate-950 bg-cyan-400" />
        </span>
      </div>

      <button
        type="button"
        onClick={onClick}
        className="relative inline-flex cursor-pointer appearance-none items-center overflow-visible rounded-2xl border border-cyan-500/35 bg-slate-950/80 py-3 pl-16 pr-6 shadow-[0_0_25px_rgba(6,182,212,0.2)] backdrop-blur-xl transition-all duration-300 hover:border-cyan-400/80 hover:shadow-[0_0_35px_rgba(6,182,212,0.4)] md:pl-20"
        aria-label="Chat with Sharada, your AI assistant"
      >
        <div className="bg-shimmer-cyan pointer-events-none absolute inset-0 rounded-2xl" />

        <div className="relative z-10 flex select-none flex-col text-left">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400 transition-colors group-hover:text-cyan-300 md:text-xs">
              AI Assistant
            </span>
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-400" />
          </div>
          <span className="whitespace-nowrap text-sm font-bold text-slate-100 transition-colors group-hover:text-white md:text-base">
            Chat with Sharada
          </span>
        </div>
      </button>
    </div>
  );
};

export default SharadaChatBadge;
