import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { AIToolSurface } from '@/components/tools/AIToolSurface';

export function AIToolHeader({
  toolName,
  description,
  onClose,
  children,
  className = '',
  contentClassName = '',
}: {
  toolName: string;
  description?: string;
  category?: string;
  onClose?: () => void;
  children?: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (!isExpanded) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsExpanded(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [isExpanded]);

  const handleClose = () => {
    if (isExpanded) setIsExpanded(false);
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

  if (children == null) return null;

  const surface = (
    <AIToolSurface
      title={toolName}
      description={description}
      expanded={isExpanded}
      onToggleExpand={() => setIsExpanded((value) => !value)}
      onClose={handleClose}
      contentClassName={contentClassName}
    >
      {children}
    </AIToolSurface>
  );

  if (isExpanded) {
    return createPortal(
      <div className="fixed inset-0 z-[80] flex bg-slate-950/80 p-3 backdrop-blur-md md:p-4">{surface}</div>,
      document.body,
    );
  }

  return <div className={className}>{surface}</div>;
}
