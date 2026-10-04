import type { ReactNode } from 'react';

interface SharadaChatBadgeProps {
  onClick?: () => void;
  className?: string;
}

export function SharadaAssistantPill({ onClick }: { onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex cursor-pointer appearance-none items-center gap-2 rounded-full border border-slate-800/90 bg-slate-900/90 px-4 py-1.5 shadow-lg backdrop-blur-md"
      aria-label="Chat with Sharada, your AI assistant"
    >
      <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-cyan-400">
        AI Assistant
        <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-cyan-400" />
      </span>
      <span className="font-bold text-slate-600">•</span>
      <span className="text-xs font-semibold text-slate-100">Chat with Sharada</span>
    </button>
  );
}

export function SharadaBotAvatar({ onClick, className = '' }: SharadaChatBadgeProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex shrink-0 cursor-pointer appearance-none items-center justify-center border-0 bg-transparent p-0 ${className}`}
      aria-label="Chat with Sharada"
    >
      <span className="pointer-events-none absolute -inset-3 rounded-full bg-cyan-500/25 blur-2xl" />
      <img
        src="/sharada-robot.png"
        alt="Sharada AI Assistant"
        className="animate-cinematic-bot relative z-10 h-[80px] w-[80px] object-contain drop-shadow-[0_10px_20px_rgba(6,182,212,0.3)] md:h-[112px] md:w-[112px]"
      />
    </button>
  );
}

export function SharadaPromptFrame({
  onChat,
  children,
}: {
  onChat?: () => void;
  children: ReactNode;
}) {
  return (
    <div className="my-8 flex w-full flex-col items-center justify-center px-4">
      <div className="mb-4">
        <SharadaAssistantPill onClick={onChat} />
      </div>
      <div className="flex w-[min(85vw,100%)] items-center gap-4 md:gap-6">
        <SharadaBotAvatar onClick={onChat} />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}

/** @deprecated Use SharadaPromptFrame. Kept so older imports still render the bot. */
export const SharadaChatBadge = SharadaBotAvatar;

export default SharadaChatBadge;
