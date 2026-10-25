import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { GAMIFIED_VIDEO_STORAGE_KEY, type GamifiedVideoSpec } from '@brightpath/shared';
import { api } from '@/lib/api';
import { CURRICULUM_STUDIO_PATH } from '@/pages/tools/CurriculumTextbookStudio';

function studioHref(params: URLSearchParams) {
  const next = new URLSearchParams();
  const chapterId = params.get('chapterId');
  if (chapterId) next.set('chapterId', chapterId);
  const query = next.toString();
  return query ? `${CURRICULUM_STUDIO_PATH}?${query}` : CURRICULUM_STUDIO_PATH;
}

export default function GamifiedVideoPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const chapterId = params.get('chapterId') || undefined;
  const subtopicId = params.get('subtopicId') || undefined;
  const [spec, setSpec] = useState<GamifiedVideoSpec | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setSpec(null);
    if (!chapterId && !subtopicId) {
      setLoading(false);
      setError('Open Gamified Video from a chapter or subtopic in Curriculum & Textbook Studio.');
      return;
    }
    api
      .generateGamifiedVideo({ chapterId, subtopicId })
      .then((res) => {
        if (cancelled) return;
        sessionStorage.setItem(GAMIFIED_VIDEO_STORAGE_KEY, JSON.stringify(res.spec));
        setSpec(res.spec);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Could not build a gamified video from the textbook.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [chapterId, subtopicId]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === 'gamified-video-close') {
        navigate(studioHref(params));
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [navigate, params]);

  const iframeSrc = useMemo(() => {
    if (!spec) return '';
    const query = new URLSearchParams({ from: 'textbook', spec: spec.id });
    if (spec.video.src && spec.video.type === 'youtube') query.set('youtube', spec.video.src);
    if (spec.video.src && spec.video.type === 'html5') query.set('video', spec.video.src);
    return `/gamified-video-studio.html?${query}`;
  }, [spec]);

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-[#f8f9fa] text-[#202124]">
      {loading ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#1a73e8]" />
          <h1 className="text-xl font-medium">Building the game from your textbook</h1>
          <p className="max-w-md text-sm text-[#5f6368]">
            Reading the attached unit, extracting key terms and misconceptions, then placing quiz,
            skill-check, escape, and branch checkpoints on the video.
          </p>
        </div>
      ) : error ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
          <h1 className="text-xl font-medium">Could not open Gamified Video</h1>
          <p className="max-w-md text-sm text-[#5f6368]">{error}</p>
          <Link to={studioHref(params)} className="rounded-full bg-[#1a73e8] px-4 py-2 text-sm text-white">
            Back to Curriculum Studio
          </Link>
        </div>
      ) : (
        <iframe
          title="Gamified Video Studio"
          src={iframeSrc}
          className="h-full w-full flex-1 border-0 bg-white"
          allow="autoplay; fullscreen; clipboard-read; clipboard-write"
        />
      )}
    </div>
  );
}
