import { useEffect } from 'react';
import type { TeacherSubtopic } from '@brightpath/shared';

const API_MEDIA_ORIGIN = (
  import.meta.env.VITE_API_PUBLIC_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  'http://127.0.0.1:3001'
).replace(/\/$/, '');

function resolveVideoSrc(sub?: TeacherSubtopic | null): { video?: string; youtube?: string } {
  const raw = (sub?.generatedVideoUrl || sub?.videoUrl || '').trim();
  if (!raw) return {};
  if (/youtu\.be|youtube\.com/i.test(raw)) return { youtube: raw };
  if (/^https?:\/\//i.test(raw)) return { video: raw };
  if (raw.startsWith('/public/videos/') || raw.startsWith('public/videos/')) {
    const path = raw.startsWith('/') ? raw : `/${raw}`;
    return { video: `${API_MEDIA_ORIGIN}${path}` };
  }
  return {};
}

export function GamifiedVideoStudioModal({
  open,
  onClose,
  subtopic,
  title,
  subject,
}: {
  open: boolean;
  onClose: () => void;
  subtopic?: TeacherSubtopic | null;
  title?: string;
  subject?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === 'gamified-video-close') onClose();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('message', onMessage);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('message', onMessage);
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const params = new URLSearchParams();
  const heading = title || (subtopic ? `${subtopic.code} ${subtopic.title}` : '');
  if (heading) params.set('title', heading);
  if (subject) params.set('subject', subject);
  const media = resolveVideoSrc(subtopic);
  if (media.video) params.set('video', media.video);
  if (media.youtube) params.set('youtube', media.youtube);
  const src = `/gamified-video-studio.html${params.toString() ? `?${params}` : ''}`;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[#202124]">
      <iframe
        title="Gamified Video Studio"
        src={src}
        className="h-full w-full border-0 bg-[#f8f9fa]"
        allow="autoplay; fullscreen; clipboard-read; clipboard-write"
      />
    </div>
  );
}

export default GamifiedVideoStudioModal;
