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
      className={`group relative flex shrink-0 cursor-pointer appearance-none items-center justify-center border-0 bg-transparent p-0 ${className}`}
      aria-label="Chat with Sharada"
    >
      <span className="absolute -inset-2 rounded-full bg-cyan-500/20 blur-xl transition-all group-hover:bg-cyan-500/30" />
      <span className="relative z-10 block transition-transform duration-200 group-hover:scale-110">
        <img
          src="/sharada-robot.png"
          alt="Sharada AI Assistant"
          className="animate-cartoon-bot h-20 w-20 object-contain drop-shadow-[0_8px_16px_rgba(6,182,212,0.6)] md:h-24 md:w-24"
        />
      </span>
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
    <div className="mx-auto my-8 flex w-full max-w-6xl flex-col items-center gap-3 px-4">
      <SharadaAssistantPill onClick={onChat} />
      <div className="mt-2 flex w-full flex-col items-center gap-4 md:flex-row">
        <SharadaBotAvatar onClick={onChat} />
        <div className="w-full min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}

/** @deprecated Use SharadaPromptFrame. Kept so older imports still render the bot. */
export const SharadaChatBadge = SharadaBotAvatar;

export default SharadaChatBadge;
