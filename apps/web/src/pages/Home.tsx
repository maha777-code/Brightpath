import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUp,
  BookOpen,
  ClipboardList,
  Clock,
  FileText,
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
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useDisplayUser } from '@/lib/displayUser';
import { workspaceForRole } from '@/lib/workspaceRole';
import { TeacherWorkspaceLayout } from '@/components/teacher/TeacherWorkspaceLayout';

import { CYBER_FONT_STYLE } from '@/lib/theme';

const FONT = CYBER_FONT_STYLE;

const HOME_TOOL_IDS = [
  'curriculum-studio',
  'worksheet-generator',
  'lesson-plan',
  'family-email',
  'quiz-generator',
  'presentation-generator',
  'text-rewriter',
  'song-generator',
] as const;

const HOME_TOOL_LABELS: Record<(typeof HOME_TOOL_IDS)[number], string> = {
  'curriculum-studio': 'Curriculum & Textbook Studio',
  'worksheet-generator': 'Worksheet Generator',
  'lesson-plan': 'Lesson Plan',
  'family-email': 'Professional Email',
  'quiz-generator': 'Multiple Choice Quiz',
  'presentation-generator': 'Presentation Generator',
  'text-rewriter': 'Text Rewriter',
  'song-generator': 'Educational Song Generator',
};

const TOOL_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  'book-open': BookOpen,
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

export function HomePage() {
  const { role } = useAuth();
  const { firstName } = useDisplayUser();
  const workspace = workspaceForRole(role);
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [prompt, setPrompt] = useState('');
  const [reply, setReply] = useState<string | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);

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

  useEffect(() => {
    const field = textareaRef.current;
    if (!field) return;
    field.style.height = 'auto';
    field.style.height = `${Math.min(field.scrollHeight, 200)}px`;
  }, [prompt]);

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
    navigate('/chat/sharada', {
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
        className="custom-scrollbar flex h-full min-h-screen w-full flex-col justify-between overflow-y-auto bg-[#040711] p-8 font-sans text-slate-100"
        style={FONT}
      >
        <section className="w-full space-y-6 pt-2 text-center">
          <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-1.5 text-sm font-black uppercase tracking-widest text-cyan-400">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-cyan-400" /> SYS_OK
          </span>
          <h1 className="text-center text-5xl font-black leading-tight tracking-tight text-white lg:text-6xl">
            Hi {firstName || workspace.greetingFallback}. <span className="text-slate-400">How can I help today?</span>
          </h1>
          <p className="mb-6 mt-2 text-center text-lg font-medium text-slate-300">
            Chat with Sharada, your AI assistant
          </p>

          <form
            className="mx-auto my-4 flex w-full max-w-3xl flex-col justify-between space-y-3 rounded-[28px] border border-slate-700/50 bg-[#131b2e] p-4 text-left shadow-2xl transition-all duration-300 hover:border-slate-600 focus-within:border-cyan-500/60 focus-within:ring-2 focus-within:ring-cyan-500/20 sm:p-5"
            onSubmit={(event) => {
              event.preventDefault();
              sendPrompt();
            }}
          >
            <textarea
              ref={textareaRef}
              rows={1}
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  sendPrompt();
                }
              }}
              placeholder="Ask Sharada or enter prompt..."
              className="custom-scrollbar max-h-[200px] w-full resize-none overflow-y-auto border-none bg-transparent p-0 font-sans text-base font-normal leading-relaxed text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-0 sm:text-lg"
              style={FONT}
            />
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  className="cursor-pointer appearance-none rounded-full border-0 bg-transparent p-2.5 text-slate-300 transition-all hover:bg-slate-800 hover:text-white"
                  aria-label="Add file or attachment"
                  title="Add file or attachment"
                  onClick={() => fileRef.current?.click()}
                >
                  <Plus className="h-5 w-5" />
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  className="hidden"
                  accept="image/*,.pdf,.doc,.docx,.txt"
                  onChange={() => {
                    setReply('Sharada: Attachment added. Tell me how you’d like to use this file.');
                  }}
                />
                <button
                  type="button"
                  className="cursor-pointer appearance-none rounded-full border-0 bg-transparent p-2.5 text-slate-300 transition-all hover:bg-slate-800 hover:text-cyan-400"
                  aria-label="Use voice input"
                  title="Use voice input"
                  onClick={() =>
                    setReply('Sharada: Voice input is ready in your next session. Type your request for now.')
                  }
                >
                  <Mic className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  className="ml-1 hidden cursor-pointer appearance-none items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3.5 py-1.5 text-xs font-bold text-cyan-400 shadow-sm transition-all hover:bg-cyan-500/20 sm:inline-flex sm:text-sm"
                  onClick={() => {
                    setPrompt('Generate a classroom image of ');
                    setReply(null);
                  }}
                >
                  <Sparkles className="h-3.5 w-3.5" /> New! Ask Sharada to generate images
                </button>
              </div>
              <button
                type="submit"
                disabled={!prompt.trim()}
                className={`flex appearance-none items-center justify-center rounded-full border-0 p-3 font-extrabold transition-all duration-200 ${
                  prompt.trim()
                    ? 'scale-105 cursor-pointer bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/30 hover:bg-cyan-300 active:scale-95'
                    : 'cursor-not-allowed bg-slate-800 text-slate-500'
                }`}
                aria-label="Send message"
              >
                <ArrowUp className="h-5 w-5 stroke-[2.5]" />
              </button>
            </div>
          </form>

          {reply ? (
            <p className="rounded-xl border border-slate-800 bg-[#080d1a] px-4 py-3 text-left text-lg text-slate-300">
              {reply}
            </p>
          ) : null}
        </section>

        <div className="mt-10 grid w-full flex-1 grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="space-y-5 lg:col-span-2">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-normal text-slate-300">
                <strong className="mr-1 text-xl font-black text-white">Recommended tools.</strong>
                <span className="text-base text-slate-300">Curated for you, based on your profile and MindVault activity.</span>
              </h2>
              <button
                type="button"
                onClick={() => navigate('/teacher/tools')}
                className="inline-flex shrink-0 cursor-pointer appearance-none items-center gap-1.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-base font-bold text-cyan-400 transition-all hover:bg-cyan-500/20"
              >
                Discover all tools <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 grid w-full grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
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
                    className="group flex min-h-[160px] cursor-pointer flex-col justify-between rounded-2xl border border-slate-800/80 bg-[#080d1a] p-5 shadow-lg transition-all duration-200 hover:border-cyan-500/40 hover:bg-[#0b1326]"
                  >
                    <div className="flex items-center justify-between">
                      <div className="rounded-xl border border-cyan-500/20 bg-[#0e172a] p-2.5 text-cyan-400">
                        <Icon className="h-5 w-5" />
                      </div>
                      <button
                        type="button"
                        className={`cursor-pointer appearance-none border-0 bg-transparent p-0 ${favorited ? 'text-amber-400' : 'text-slate-600 hover:text-amber-400'}`}
                        aria-label={favorited ? `Unpin ${tool.name}` : `Pin ${tool.name}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          void toggleFavorite(tool.id);
                        }}
                      >
                        <Star className="h-4 w-4" fill={favorited ? 'currentColor' : 'none'} />
                      </button>
                    </div>
                    <div>
                      <h3 className="mt-3 text-lg font-extrabold text-white transition-colors group-hover:text-cyan-300">{tool.name}</h3>
                      <p className="mt-1 line-clamp-2 text-base leading-relaxed text-slate-300">{tool.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-5">
            <h2 className="text-base font-normal text-slate-300">
              <strong className="mr-1 text-xl font-black text-white">Recent activity.</strong>
              <span className="text-base text-slate-300">{workspace.activity}</span>
            </h2>
            <div className="mt-4 w-full space-y-4 rounded-2xl border border-slate-800/80 bg-[#080d1a] p-5 shadow-lg">
              {RECENT_ACTIVITY.map((act) => (
                <div
                  key={act.id}
                  className="group cursor-pointer space-y-1.5 rounded-xl border border-slate-800/60 bg-[#0a0f20] p-4 transition-all hover:bg-slate-800/50"
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
                  <h4 className="line-clamp-1 text-lg font-bold text-slate-100 transition-colors group-hover:text-cyan-400">
                    {act.title}
                  </h4>
                  <div className="flex items-center justify-between text-sm font-medium text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-4 w-4 text-slate-500" /> {act.type}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </TeacherWorkspaceLayout>
  );
}

export default HomePage;
