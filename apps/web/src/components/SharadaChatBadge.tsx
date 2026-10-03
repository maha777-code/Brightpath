import React from 'react';

interface SharadaChatBadgeProps {
  onClick?: () => void;
  className?: string;
}

export const SharadaChatBadge: React.FC<SharadaChatBadgeProps> = ({ onClick, className = '' }) => {
  return (
    <div className={`my-4 flex justify-center ${className}`}>
      <button
        type="button"
        onClick={onClick}
        className="animate-codex-float group relative inline-flex cursor-pointer appearance-none items-center gap-3.5 overflow-hidden rounded-2xl border border-cyan-500/30 bg-slate-950/80 px-5 py-2.5 shadow-[0_0_20px_rgba(6,182,212,0.15)] backdrop-blur-xl transition-all duration-300 ease-out hover:border-cyan-400/80 hover:shadow-[0_0_30px_rgba(6,182,212,0.35)]"
        aria-label="Chat with Sharada, your AI assistant"
      >
        {/* Shimmer overlay effect */}
        <div className="bg-shimmer-cyan pointer-events-none absolute inset-0" />

        {/* 3D Robot Avatar Wrapper */}
        <div className="relative flex h-9 w-9 flex-shrink-0 items-center justify-center md:h-10 md:w-10">
          {/* Radar Ripple Effect */}
          <span className="animate-codex-radar pointer-events-none absolute inset-0 rounded-full border border-cyan-400/60" />

          {/* Avatar Soft Neon Aura */}
          <div className="absolute inset-1 rounded-full bg-cyan-500/30 blur-md transition-all duration-300 group-hover:bg-cyan-400/50" />

          {/* Robot Image */}
          <img
            src="/sharada-robot.png"
            alt=""
            className="relative z-10 h-full w-full object-contain drop-shadow-[0_2px_8px_rgba(6,182,212,0.5)] transition-transform duration-300 group-hover:scale-110"
          />

          {/* Active Status Beacon */}
          <span className="absolute -bottom-0.5 -right-0.5 z-20 flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full border border-slate-950 bg-cyan-400" />
          </span>
        </div>

        {/* Text Details & Status Tag */}
        <div className="relative z-10 flex flex-col text-left">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 transition-colors group-hover:text-cyan-300 md:text-[11px]">
              AI Assistant
            </span>
            <span className="h-1 w-1 animate-pulse rounded-full bg-cyan-400" />
          </div>
          <span className="text-xs font-semibold text-slate-100 transition-colors group-hover:text-white md:text-sm">
            Chat with Sharada
          </span>
        </div>
      </button>
    </div>
  );
};

export default SharadaChatBadge;
