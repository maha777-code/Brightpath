import { PartyPopper, X } from 'lucide-react';
import { AGE_GROUP_LABELS, AGE_GROUP_LEVEL_NAMES, type AgeGroup } from '@brightpath/shared';

interface AgeUpgradeModalProps {
  open: boolean;
  newGroup: AgeGroup;
  previousGroup?: AgeGroup | null;
  message?: string;
  onClose: () => void;
}

export function AgeUpgradeModal({
  open,
  newGroup,
  previousGroup,
  message,
  onClose,
}: AgeUpgradeModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/70 bg-white p-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-indigo-500 text-white shadow-lg">
          <PartyPopper className="h-8 w-8" />
        </div>

        <h2 className="text-center text-xl font-extrabold text-slate-800">
          Congratulations!
        </h2>
        <p className="mt-2 text-center text-sm leading-relaxed text-slate-600">
          {message ??
            `You've unlocked ${AGE_GROUP_LEVEL_NAMES[newGroup]} Subjects & Features!`}
        </p>

        <div className="mt-5 rounded-2xl bg-gradient-to-r from-teal-50 to-indigo-50 p-4 text-center ring-1 ring-teal-100">
          {previousGroup && (
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {AGE_GROUP_LABELS[previousGroup]} →
            </p>
          )}
          <p className="mt-1 text-lg font-extrabold text-teal-700">
            {AGE_GROUP_LABELS[newGroup]}
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-full bg-gradient-to-r from-teal-600 to-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-md"
        >
          Explore my new subjects
        </button>
      </div>
    </div>
  );
}
