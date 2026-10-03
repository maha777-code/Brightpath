import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AIToolSurface } from '@/components/tools/AIToolSurface';

interface AIToolWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  toolName: string;
  description?: string;
  children: ReactNode;
}

export function AIToolWizardModal({ isOpen, onClose, toolName, description, children }: AIToolWizardModalProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (!isOpen) setIsExpanded(false);
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className={`animate-fadeIn fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/80 backdrop-blur-md transition-all duration-300 ${
        isExpanded ? 'p-3 md:p-4' : 'p-2 md:p-4'
      }`}
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-tool-wizard-title"
        onClick={(event) => event.stopPropagation()}
        className={`flex min-h-0 ${
          isExpanded ? 'h-full w-full max-h-none max-w-none' : 'h-[88vh] w-full max-w-7xl'
        }`}
      >
        <AIToolSurface
          title={toolName}
          description={description}
          expanded={isExpanded}
          onToggleExpand={() => setIsExpanded((value) => !value)}
          onClose={onClose}
        >
          {children}
        </AIToolSurface>
      </div>
    </div>,
    document.body,
  );
}
