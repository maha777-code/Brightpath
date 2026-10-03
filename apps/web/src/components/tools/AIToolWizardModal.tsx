import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Maximize2, Minimize2, X } from 'lucide-react';

interface AIToolWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  toolName: string;
  children: ReactNode;
}

export function AIToolWizardModal({ isOpen, onClose, toolName, children }: AIToolWizardModalProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (!isOpen) setIsExpanded(false);
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className={`animate-fadeIn fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/80 backdrop-blur-md transition-all duration-300 ${
        isExpanded ? 'p-0' : 'p-2 md:p-4'
      }`}
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-tool-wizard-title"
        onClick={(event) => event.stopPropagation()}
        className={`relative flex flex-col overflow-hidden border border-slate-800 bg-slate-900 shadow-2xl transition-all duration-300 ease-in-out ${
          isExpanded
            ? 'm-0 h-full w-full max-h-none max-w-none rounded-none p-6'
            : 'h-[88vh] w-full max-w-7xl rounded-3xl p-6 md:p-8'
        }`}
      >
        <div className="mb-4 flex items-center justify-between border-b border-slate-800/80 pb-4">
          <h2 id="ai-tool-wizard-title" className="text-lg font-bold tracking-tight text-white md:text-xl">
            {toolName}
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsExpanded((value) => !value)}
              className="cursor-pointer appearance-none rounded-xl border-0 bg-transparent p-2 text-slate-400 transition-all hover:bg-slate-800/80 hover:text-cyan-400"
              title={isExpanded ? 'Collapse view' : 'Expand to full screen'}
              aria-label={isExpanded ? 'Collapse' : 'Expand'}
            >
              {isExpanded ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer appearance-none rounded-xl border-0 bg-transparent p-2 text-slate-400 transition-all hover:bg-slate-800/80 hover:text-white"
              title="Close tool"
              aria-label="Close modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
