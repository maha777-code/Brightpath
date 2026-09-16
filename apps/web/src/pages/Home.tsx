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

import { CYBER_FONT_STYLE } from '@/lib/theme';

const FONT = CYBER_FONT_STYLE;

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
    navigate('/chat/raina', {
      state: {
        prompt: text,
        initialPrompt: text,
        topic: text.slice(0, 30),
        startedAt: Date.now(),
      },
    });
  }, [navigate, prompt]);

  return (
    <TeacherWorkspaceLayout>
      <div
        className="min-h-full bg-transparent px-5 py-8 text-slate-100 sm:px-8 lg:px-10"
        style={FONT}
      >
        <div className="mx-auto max-w-6xl space-y-10">
          <section className="mx-auto max-w-2xl pt-2 text-center">
            <div className="mb-3 flex items-center justify-center gap-2">
              <div className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_10px_#22d3ee] animate-pulse" />
              <span className="badge-cyber">[SYS_OK]</span>
            </div>
            <h1 className="text-center text-3xl font-bold text-slate-100" style={FONT}>
              Hi {displayName}, how can I help today?
            </h1>
            <p className="mt-1 text-center text-sm text-slate-400">
              Chat with Raina, your AI assistant
            </p>

            <form
              className="mx-auto mt-6 max-w-2xl rounded-lg border border-slate-800 bg-[#0b0f19] p-4 text-left shadow-[0_0_20px_rgba(6,182,212,0.12)]"
              onSubmit={(event) => {
                event.preventDefault();
                sendPrompt();
              }}
            >
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
                className="w-full resize-none bg-transparent font-mono text-base text-cyan-100 placeholder-slate-600 outline-none"
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
                    className="text-slate-400 transition-colors hover:text-cyan-400"
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
                    className="text-slate-400 transition-colors hover:text-cyan-400"
                    aria-label="Attach an image"
                    onClick={() => fileRef.current?.click()}
                  >
                    <ImageIcon className="h-4 w-4" />
                  </button>
                  <button
                    type="submit"
                    className="rounded-lg border border-cyan-400/50 bg-cyan-500/10 p-1.5 text-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all hover:bg-cyan-500 hover:text-black"
                    aria-label="Send message"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </form>

            <button
              type="button"
              className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-800 bg-[#0b0f19] px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-cyan-300 transition-colors hover:border-cyan-500/60"
              onClick={() => {
                setPrompt('Generate a classroom image of ');
                setReply(null);
              }}
            >
              <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
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
              <p className="mb-1 font-mono text-xs font-semibold uppercase tracking-[0.22em] text-cyan-400">
                YOUR MAGIC
              </p>
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-bold text-slate-100">Recommended teacher tools</h2>
                <button
                  type="button"
                  onClick={() => navigate('/teacher/tools')}
                  className="cursor-pointer font-mono text-sm font-medium uppercase tracking-wide text-cyan-400 hover:text-cyan-300"
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
                      className="card-cyber cursor-pointer space-y-2 p-4"
                    >
                      <div className="flex items-center justify-between">
                        <Icon className="h-5 w-5 text-cyan-400" />
                        <button
                          type="button"
                          className={favorited ? 'text-emerald-400' : 'text-slate-600 hover:text-emerald-400'}
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

            <aside className="card-cyber h-fit space-y-4 p-5">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-100">Recent activity</h2>
                <span className="badge-cyber">[INDEXED]</span>
              </div>
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
                    <p className="text-sm font-medium text-slate-200 transition-colors group-hover:text-cyan-300">
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
