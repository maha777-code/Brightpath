import React from 'react';

interface SharadaChatBadgeProps {
  onClick?: () => void;
  className?: string;
}

export const SharadaChatBadge: React.FC<SharadaChatBadgeProps> = ({ onClick, className = '' }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group inline-flex cursor-pointer appearance-none select-none items-center gap-3.5 rounded-2xl border border-slate-800/80 bg-slate-900/60 px-4 py-2 shadow-lg backdrop-blur-md transition-all duration-300 hover:border-cyan-500/50 hover:bg-slate-900/90 hover:shadow-cyan-500/10 ${className}`}
      aria-label="Chat with Sharada, your AI assistant"
    >
      {/* Robot Character Container */}
      <div className="relative flex h-11 w-11 flex-shrink-0 items-center justify-center md:h-14 md:w-14">
        {/* Holographic Glowing Backdrop Aura */}
        <div className="absolute inset-0 animate-pulse rounded-full bg-cyan-500/20 blur-md transition-all duration-500 group-hover:bg-cyan-400/35" />

        {/* Animated 3D Robot Image */}
        <img
          src="/sharada-robot.png"
          alt=""
          className="animate-bot-float animate-bot-glow animate-bot-action relative z-10 h-full w-full object-contain transition-transform duration-300 group-hover:scale-[1.15]"
        />

        {/* Live Active Signal Beacon */}
        <span className="absolute bottom-0 right-0 z-20 flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
          <span className="relative inline-flex h-3 w-3 rounded-full border-2 border-slate-950 bg-cyan-500" />
        </span>
      </div>

      {/* Cinematic Text & Action Prompt */}
      <div className="flex flex-col text-left">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400">AI Assistant</span>
          <span className="h-1.5 w-1.5 animate-ping rounded-full bg-cyan-400" />
        </div>
        <span className="text-sm font-medium text-slate-100 transition-colors group-hover:text-cyan-300 md:text-base">
          Chat with Sharada
        </span>
      </div>
    </button>
  );
};

export default SharadaChatBadge;
