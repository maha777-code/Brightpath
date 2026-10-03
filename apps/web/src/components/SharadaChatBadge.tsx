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
      className={`inline-flex cursor-pointer appearance-none items-center gap-3 border-0 bg-transparent p-0 group select-none ${className}`}
      aria-label="Chat with Sharada, your AI assistant"
    >
      {/* Animated Avatar Container */}
      <div className="relative h-8 w-8 flex-shrink-0 rounded-full bg-gradient-to-tr from-pink-500 via-rose-500 to-amber-400 p-[2px] shadow-md transition-all duration-300 group-hover:scale-105 group-hover:shadow-pink-500/25 md:h-10 md:w-10">
        {/* Avatar Image */}
        <img
          src="/sharada-avatar.png"
          alt=""
          className="h-full w-full rounded-full bg-slate-900 object-cover object-top"
        />
        {/* Active/Online Indicator Badge */}
        <span className="absolute bottom-0 right-0 h-2.5 w-2.5 animate-pulse rounded-full border-2 border-slate-950 bg-emerald-500" />
      </div>

      {/* Text Label */}
      <span className="text-sm font-medium text-slate-200 transition-colors group-hover:text-pink-400 md:text-base">
        Chat with Sharada, your AI assistant
      </span>
    </button>
  );
};

export default SharadaChatBadge;
