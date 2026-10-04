import type { ReactNode } from 'react';

interface SharadaChatBadgeProps {
  onClick?: () => void;
  className?: string;
}

export function SharadaBotAvatar({ onClick, className = '' }: SharadaChatBadgeProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative flex shrink-0 cursor-pointer appearance-none items-center justify-center border-0 bg-transparent p-0 ${className}`}
      aria-label="Chat with Sharada"
    >
      <span className="pointer-events-none absolute -inset-4 rounded-full bg-cyan-500/20 blur-2xl transition-all duration-500 group-hover:bg-cyan-500/35" />
      <img
        src="/sharada-robot.png"
        alt="Sharada Assistant"
        className="animate-cinematic-bot relative z-10 h-[80px] w-[80px] object-contain drop-shadow-[0_12px_24px_rgba(6,182,212,0.35)] md:h-[112px] md:w-[112px]"
      />
    </button>
  );
}

export function SharadaPromptFrame({
  onChat,
  name,
  children,
}: {
  onChat?: () => void;
  name: string;
  children: ReactNode;
}) {
  return (
    <div className="relative flex w-full flex-col items-center justify-center overflow-hidden px-4 pb-12 pt-8">
      <div className="pointer-events-none absolute left-1/2 top-0 h-[200px] w-[600px] -translate-x-1/2 rounded-full bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-indigo-500/10 blur-[100px]" />

      <div className="relative z-10 mb-8 text-center">
        <h1 className="text-[36px] font-extrabold tracking-tight text-white md:text-[52px]">
          Hi{' '}
          <span
            className="bg-gradient-to-r from-cyan-400 via-teal-300 to-blue-400 bg-clip-text text-transparent"
            style={{ WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
          >
            {name}
          </span>
          . How can I help today?
        </h1>
        <p className="mt-2 text-sm font-medium text-slate-400 md:text-base">
          Ask Sharada anything or select an AI tool to get started
        </p>
      </div>

      <div className="relative z-10 flex w-[min(88vw,100%)] items-center gap-4 md:gap-6">
        <SharadaBotAvatar onClick={onChat} />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}

/** @deprecated Use SharadaPromptFrame. Kept so older imports still render the bot. */
export const SharadaChatBadge = SharadaBotAvatar;

export default SharadaChatBadge;
