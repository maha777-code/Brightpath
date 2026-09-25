import { ChevronRight, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function AIToolHeader({
  toolName,
  category = 'Teacher Tools',
  onClose,
}: {
  toolName: string;
  category?: string;
  onClose?: () => void;
}) {
  const navigate = useNavigate();

  const handleClose = () => {
    if (onClose) {
      onClose();
      return;
    }
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate('/teacher/tools');
  };

  return (
    <div className="mb-4 flex shrink-0 items-center justify-between border-b border-slate-800/80 pb-4">
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
        <span>{category}</span>
        <ChevronRight className="h-3.5 w-3.5 text-slate-600" />
        <span className="font-bold text-cyan-400">{toolName}</span>
      </div>
      <button
        type="button"
        onClick={handleClose}
        aria-label="Close Tool"
        className="group flex cursor-pointer appearance-none items-center gap-1.5 rounded-xl border border-slate-700/60 bg-slate-800/80 px-3 py-1.5 text-xs font-bold text-slate-300 transition-all hover:bg-rose-500/20 hover:text-rose-400"
      >
        <span>Close</span>
        <X className="h-4 w-4 text-slate-400 transition-colors group-hover:text-rose-400" />
      </button>
    </div>
  );
}
