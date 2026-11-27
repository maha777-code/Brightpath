import { RefreshCw } from 'lucide-react';
import { TOOL_ERROR, TOOL_SECONDARY } from '@/components/tools/toolTheme';

/** Error line for an AI tool, with a Try again button when the failed request can be re-sent. */
export function ToolErrorRetry({
  message,
  onRetry,
  busy = false,
  className = '',
}: {
  message: string | null | undefined;
  onRetry?: (() => void) | null;
  busy?: boolean;
  className?: string;
}) {
  if (!message) return null;
  return (
    <div role="alert" className={`flex flex-wrap items-center gap-3 ${className}`}>
      <p className={TOOL_ERROR}>{message}</p>
      {onRetry ? (
        <button
          type="button"
          className={`${TOOL_SECONDARY} mt-4 disabled:cursor-not-allowed disabled:opacity-50`}
          disabled={busy}
          onClick={onRetry}
        >
          <RefreshCw className="h-3.5 w-3.5" /> Try again
        </button>
      ) : null}
    </div>
  );
}
