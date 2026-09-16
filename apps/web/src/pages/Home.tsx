import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowUp,
  ClipboardList,
  FileText,
  Image as ImageIcon,
  ListChecks,
  Mail,
  Mic,
  Music,
  Pencil,
  Plus,
  Presentation,
  Sparkles,
  Star,
} from 'lucide-react';
import { getTeacherToolById } from '@brightpath/shared';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { TeacherWorkspaceLayout } from '@/components/teacher/TeacherWorkspaceLayout';

const FONT = { fontFamily: 'Cambria, Georgia, serif' } as const;

const HOME_TOOL_IDS = [
  'worksheet-generator',
  'lesson-plan',
  'family-email',
  'quiz-generator',
  'presentation-generator',
  'text-rewriter',
  'song-generator',
] as const;

const HOME_TOOL_LABELS: Record<(typeof HOME_TOOL_IDS)[number], string> = {
  'worksheet-generator': 'Worksheet Generator',
  'lesson-plan': 'Lesson Plan',
  'family-email': 'Professional Email',
  'quiz-generator': 'Multiple Choice Quiz',
  'presentation-generator': 'Presentation Generator',
  'text-rewriter': 'Text Rewriter',
  'song-generator': 'Educational Song Generator',
};

const TOOL_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  music: Music,
  'file-text': FileText,
  pencil: Pencil,
  'clipboard-list': ClipboardList,
  'list-checks': ListChecks,
  presentation: Presentation,
  mail: Mail,
};

const RECENT_ACTIVITY = [
  {
    id: 'act-1',
    title: 'Photosynthesis Lesson Plan - 9th Grade...',
    type: 'Lesson Plan',
    href: '/teacher/tools/lesson-plan-generator',
  },
  {
    id: 'act-2',
    title: 'Photosynthesis explained',
    type: 'Lesson Plan',
    href: '/teacher/tools/lesson-plan-generator',
  },
  {
    id: 'act-3',
    title: 'World War II Worksheet',
    type: 'Worksheet Generator',
    href: '/teacher/tools/worksheet-generator',
  },
  {
    id: 'act-4',
    title: 'Data import and visualization in python',
    type: 'Multiple Choice Quiz / Assessment',
    href: '/teacher/tools/quiz-generator',
  },
] as const;

function firstName(name?: string | null): string {
  if (!name?.trim()) return 'Teacher';
  const cleaned = name.replace(/^(prof\.?|dr\.?)\s+/i, '').trim();
  return cleaned.split(/\s+/)[0] || 'Teacher';
}

export function HomePage() {
  const { user, teacher } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [prompt, setPrompt] = useState('');
  const [reply, setReply] = useState<string | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);

  const displayName = firstName(teacher?.name ?? user?.name);

  const recommendedTools = useMemo(
    () =>
      HOME_TOOL_IDS.map((id) => {
        const tool = getTeacherToolById(id);
        return {
          id,
          name: HOME_TOOL_LABELS[id],
          description: tool?.description ?? '',
          route: tool?.href ?? '/teacher/tools',
          iconName: tool?.icon ?? 'sparkles',
        };
      }),
    [],
  );

  useEffect(() => {
    void api
      .teacherTools()
      .then((res) => setFavoriteIds(res.favoriteIds))
      .catch(() => undefined);
  }, []);

  const toggleFavorite = async (toolId: string) => {
    const wasFav = favoriteIds.includes(toolId);
    setFavoriteIds((prev) => (wasFav ? prev.filter((id) => id !== toolId) : [...prev, toolId]));
    try {
      const res = await api.toggleTeacherToolFavorite(toolId);
      setFavoriteIds(res.favoriteIds);
    } catch {
      setFavoriteIds((prev) => (wasFav ? [...prev, toolId] : prev.filter((id) => id !== toolId)));
    }
  };

  const sendPrompt = useCallback(() => {
    const text = prompt.trim();
    if (!text) return;
    setReply(
      `Raina: I’ll look that up and suggest classroom-ready resources for “${text.slice(0, 80)}${text.length > 80 ? '…' : ''}”. You can also open a tool below to generate a worksheet, quiz, or lesson plan.`,
    );
    setPrompt('');
  }, [prompt]);

  return (
    <TeacherWorkspaceLayout>
      <div
        className="min-h-full bg-[#090d16] px-5 py-8 text-slate-100 sm:px-8 lg:px-10"
        style={FONT}
      >
        <div className="mx-auto max-w-6xl space-y-10">
          <section className="mx-auto max-w-2xl pt-2 text-center">
            <h1 className="text-center text-3xl font-bold text-slate-100" style={FONT}>
              Hi {displayName}, how can I help today?
            </h1>
            <p className="mt-1 text-center text-sm text-slate-400">
              Chat with Raina, your AI assistant
            </p>

            <div className="mx-auto mt-6 max-w-2xl rounded-2xl border border-slate-700/80 bg-slate-900/90 p-4 text-left shadow-xl">
              <textarea
                rows={2}
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    sendPrompt();
                  }
                }}
                placeholder="Recommend 5 accessible video resources for social..."
                className="w-full resize-none bg-transparent text-base text-slate-100 placeholder-slate-500 outline-none"
                style={FONT}
              />
              <div className="flex items-center justify-between border-t border-slate-800/60 pt-2">
                <button
                  type="button"
                  className="rounded-lg border-0 bg-transparent p-1.5 text-slate-400 shadow-none transition-colors hover:text-white"
                  aria-label="Attach a file"
                  onClick={() => fileRef.current?.click()}
                  style={{ appearance: 'none' }}
                >
                  <Plus className="h-4 w-4" />
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  className="hidden"
                  accept="image/*,.pdf,.doc,.docx,.txt"
                  onChange={() => {
                    setReply('Raina: Attachment added. Tell me how you’d like to use this file.');
                  }}
                />
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    className="text-slate-400 transition-colors hover:text-purple-400"
                    aria-label="Voice input"
                    title="Voice input"
                    onClick={() =>
                      setReply('Raina: Voice input is ready in your next session. Type your request for now.')
                    }
                  >
                    <Mic className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="text-slate-400 transition-colors hover:text-purple-400"
                    aria-label="Attach an image"
                    onClick={() => fileRef.current?.click()}
                  >
                    <ImageIcon className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="rounded-lg bg-purple-600 p-1.5 text-white transition-colors hover:bg-purple-500"
                    aria-label="Send message"
                    onClick={sendPrompt}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            <button
              type="button"
              className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-1.5 text-xs text-slate-300 transition-colors hover:border-purple-500"
              onClick={() => {
                setPrompt('Generate a classroom image of ');
                setReply(null);
              }}
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              New! Ask Raina to generate images
            </button>

            {reply ? (
              <p className="mt-4 rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-left text-sm text-slate-300">
                {reply}
              </p>
            ) : null}
          </section>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
                YOUR MAGIC
              </p>
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-bold text-slate-100">Recommended teacher tools</h2>
                <button
                  type="button"
                  onClick={() => navigate('/teacher/tools')}
                  className="cursor-pointer text-sm font-medium text-purple-400 hover:text-purple-300"
                >
                  Discover all tools →
                </button>
              </div>
              <p className="mb-4 text-xs text-slate-400">
                Curated for you, based on your profile &amp; MindVault activity.
              </p>

              <div className="grid grid-cols-1 gap-4 pt-2 md:grid-cols-3">
                {recommendedTools.map((tool) => {
                  const Icon = TOOL_ICONS[tool.iconName] ?? Sparkles;
                  const favorited = favoriteIds.includes(tool.id);
                  return (
                    <div
                      key={tool.id}
                      role="link"
                      tabIndex={0}
                      onClick={() => navigate(tool.route)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          navigate(tool.route);
                        }
                      }}
                      className="cursor-pointer space-y-2 rounded-xl border border-slate-800 bg-slate-900/80 p-4 transition-all hover:border-purple-500/50 hover:bg-slate-800/80"
                    >
                      <div className="flex items-center justify-between">
                        <Icon className="h-5 w-5 text-purple-400" />
                        <button
                          type="button"
                          className={favorited ? 'text-amber-400' : 'text-slate-600 hover:text-amber-400'}
                          aria-label={favorited ? `Unpin ${tool.name}` : `Pin ${tool.name}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            void toggleFavorite(tool.id);
                          }}
                        >
                          <Star className="h-4 w-4" fill={favorited ? 'currentColor' : 'none'} />
                        </button>
                      </div>
                      <h3 className="text-sm font-semibold text-slate-100">{tool.name}</h3>
                      <p className="line-clamp-2 text-xs text-slate-400">{tool.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <aside className="h-fit space-y-4 rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5">
              <h2 className="mb-4 text-lg font-bold text-slate-100">Recent activity</h2>
              <div className="space-y-3">
                {RECENT_ACTIVITY.map((act) => (
                  <div
                    key={act.id}
                    className="group cursor-pointer"
                    onClick={() => navigate(act.href)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        navigate(act.href);
                      }
                    }}
                    role="link"
                    tabIndex={0}
                  >
                    <p className="text-sm font-medium text-slate-200 transition-colors group-hover:text-purple-300">
                      {act.title}
                    </p>
                    <span className="text-xs text-slate-500">{act.type}</span>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </div>
      </div>
    </TeacherWorkspaceLayout>
  );
}

export default HomePage;
