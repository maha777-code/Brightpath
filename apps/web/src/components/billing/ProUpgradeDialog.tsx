import { useNavigate } from 'react-router-dom';

/** Shown when a non-Pro account opens Curriculum & Textbook Studio. */
export function ProUpgradeDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 cursor-pointer border-0 bg-slate-950/70"
        aria-label="Close upgrade dialog"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pro-upgrade-title"
        className="relative z-10 w-full max-w-md rounded-3xl border border-slate-700 bg-slate-900 p-6 text-white shadow-2xl"
      >
        <h2 id="pro-upgrade-title" className="text-xl font-bold">
          Upgrade to Pro
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">
          Curriculum & Textbook Studio is available with a Pro subscription. Upgrade to upload textbooks, standards, and syllabus documents.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            className="cursor-pointer appearance-none rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-bold text-slate-950"
            onClick={() => navigate('/pricing')}
          >
            Upgrade to Pro
          </button>
          <button
            type="button"
            className="cursor-pointer appearance-none rounded-xl border border-slate-600 bg-transparent px-4 py-2.5 text-sm font-semibold text-slate-200"
            onClick={onClose}
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
