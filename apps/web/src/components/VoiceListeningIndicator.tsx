import React from 'react';

interface VoiceListeningIndicatorProps {
  isListening: boolean;
  onStopListening: () => void;
  className?: string;
}

export const VoiceListeningIndicator: React.FC<VoiceListeningIndicatorProps> = ({
  isListening,
  onStopListening,
  className = '',
}) => {
  if (!isListening) return null;

  return (
    <div
      className={`inline-flex items-center gap-2.5 rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-rose-400 backdrop-blur-md ${className}`}
    >
      <div className="relative flex h-2.5 w-2.5 items-center justify-center">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-500" />
      </div>

      <div className="flex h-3.5 items-end gap-0.5">
        <span className="h-full w-0.5 animate-bounce rounded-full bg-rose-400 [animation-delay:-0.3s]" />
        <span className="h-full w-0.5 animate-bounce rounded-full bg-rose-400 [animation-delay:-0.15s]" />
        <span className="h-full w-0.5 animate-bounce rounded-full bg-rose-400" />
        <span className="h-full w-0.5 animate-bounce rounded-full bg-rose-400 [animation-delay:-0.2s]" />
      </div>

      <span className="text-xs font-semibold uppercase tracking-wider text-rose-300">Listening...</span>

      <button
        type="button"
        onClick={onStopListening}
        className="ml-1 cursor-pointer appearance-none rounded-full border-0 bg-transparent p-0.5 transition-colors hover:bg-rose-500/20"
        title="Stop listening"
      >
        <span className="px-1 text-[10px] font-bold text-rose-300">Done</span>
      </button>
    </div>
  );
};

export function voiceMicButtonClass(listening: boolean, layout = 'rounded-xl p-2') {
  return listening
    ? `cursor-pointer appearance-none animate-pulse border border-rose-500/40 bg-rose-500/20 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.4)] ${layout}`
    : `cursor-pointer appearance-none border border-transparent text-slate-400 transition-all hover:bg-slate-800 hover:text-cyan-400 ${layout}`;
}

export default VoiceListeningIndicator;
