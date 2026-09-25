import { useState } from 'react';
import { MessageSquareHeart } from 'lucide-react';
import { FeedbackModal } from '@/components/FeedbackModal';

type Variant = 'dark' | 'light' | 'icon';

export function FeedbackMenuButton({ variant = 'dark', size = 'md' }: { variant?: Variant; size?: 'md' | 'lg' }) {
  const [open, setOpen] = useState(false);

  const className =
    variant === 'icon'
      ? 'flex h-11 w-11 cursor-pointer appearance-none items-center justify-center rounded-2xl border-0 bg-transparent text-slate-400 transition hover:bg-slate-100 hover:text-teal-700'
      : variant === 'light'
        ? 'flex w-full cursor-pointer appearance-none items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-bold text-slate-700 hover:border-indigo-200 hover:text-indigo-700'
        : size === 'lg'
          ? 'flex w-full cursor-pointer appearance-none items-center gap-2 rounded-xl border border-transparent bg-transparent p-2.5 text-left text-base font-semibold text-slate-300 transition hover:bg-slate-800/50 hover:text-white'
          : 'flex w-full cursor-pointer appearance-none items-center gap-3 rounded-xl border border-transparent bg-transparent px-4 py-3 text-left text-sm font-medium text-slate-400 transition hover:bg-slate-900/80 hover:text-white';

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className} title="Feedback & Rating">
        <MessageSquareHeart className={size === 'lg' ? 'h-5 w-5 shrink-0 text-cyan-400' : 'h-5 w-5 shrink-0'} />
        {variant === 'icon' ? <span className="sr-only">Feedback & Rating</span> : <span>Feedback & Rating</span>}
      </button>
      <FeedbackModal isOpen={open} onClose={() => setOpen(false)} />
    </>
  );
}
