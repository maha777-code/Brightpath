import { useEffect, useMemo, useRef, useState, type ComponentType } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUp,
  BookOpen,
  Brain,
  Clock,
  FileText,
  Flame,
  Home,
  LayoutGrid,
  ListChecks,
  LogOut,
  Menu,
  Mic,
  Music,
  Pencil,
  Plus,
  Sparkles,
  Star,
  X,
} from 'lucide-react';
import { AGE_GROUP_LABELS, getTeacherToolById, streakFlames } from '@brightpath/shared';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useActivityTracker } from '@/hooks/useActivityTracker';
import { useLearningPath } from '@/hooks/useLearningPath';
import { useProfile } from '@/hooks/useProfile';
import { firstNameFromDisplayName } from '@/lib/displayUser';
import { CYBER_FONT_STYLE } from '@/lib/theme';
import { getRegistryTool, type ToolDefinition } from '@/config/toolsRegistry';
import { ToolRenderer } from '@/components/tools/ToolRenderer';
import { BrandLogo } from '@/components/Navigation/BrandLogo';
import { FeedbackMenuButton } from '@/components/FeedbackMenuButton';

const FONT = CYBER_FONT_STYLE;

const RECOMMENDED_IDS = [
  'quiz-generator',
  'worksheet-generator',
  'text-rewriter',
  'lesson-plan',
  'song-generator',
] as const;

const ICONS: Record<string, ComponentType<{ className?: string }>> = {
  'book-open': BookOpen,
  'file-text': FileText,
  pencil: Pencil,
  'list-checks': ListChecks,
  music: Music,
  sparkles: Sparkles,
};

type StudentTool = {
  id: string;
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  href?: string;
  registry?: ToolDefinition;
};

function studentTools(): StudentTool[] {
  const tutor: StudentTool = {
    id: 'ai-tutor',
    title: '24/7 AI Tutor',
    description: 'Ask questions, review concepts, and get instant homework help.',
    icon: Brain,
    href: '/dashboard/ai-tutor',
  };
  const catalog = RECOMMENDED_IDS.flatMap((id) => {
    const tool = getTeacherToolById(id);
    const registry = getRegistryTool(id);
    if (!tool || !registry) return [];
    return [
      {
        id,
        title:
          id === 'quiz-generator'
            ? 'Practice Quiz Generator'
            : id === 'worksheet-generator'
              ? 'Interactive Worksheets'
              : id === 'text-rewriter'
                ? 'Text Rewriter & Summarizer'
                : id === 'lesson-plan'
                  ? 'Lesson Notes & Guides'
                  : tool.title,
        description: tool.description,
        icon: ICONS[tool.icon] ?? Sparkles,
        registry,
      } satisfies StudentTool,
    ];
  });
  return [tutor, ...catalog];
}

export function StudentWorkspace({ view = 'home' }: { view?: 'home' | 'tools' }) {
  const navigate = useNavigate();
  const { parent, logout, planType } = useAuth();
  const { profile } = useProfile();
  const activity = useActivityTracker(Boolean(parent));
  const learningPath = useLearningPath(Boolean(parent), parent?.calculatedAgeGroup);
  const fileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [prompt, setPrompt] = useState('');
  const [reply, setReply] = useState<string | null>(null);
  const [openMenu, setOpenMenu] = useState(false);
  const [active, setActive] = useState<ToolDefinition | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [classCode, setClassCode] = useState('');
  const [joinMsg, setJoinMsg] = useState('');
  const [joining, setJoining] = useState(false);

  const fullName = profile?.name?.trim() || parent?.name?.trim() || '';
  const firstName = fullName ? firstNameFromDisplayName(fullName) : 'Student';
  const ageLabel = parent?.calculatedAgeGroup ? AGE_GROUP_LABELS[parent.calculatedAgeGroup] : 'Student';
  const profileLine = parent?.currentAge != null ? `${ageLabel} · Age ${parent.currentAge}` : ageLabel;
  const tools = useMemo(() => studentTools(), []);
  const visibleTools = view === 'tools' ? tools : tools;

  useEffect(() => {
    const field = textareaRef.current;
    if (!field) return;
    field.style.height = 'auto';
    field.style.height = `${Math.min(field.scrollHeight, 200)}px`;
  }, [prompt]);

  const streakLabel =
    activity.currentStreak <= 0
      ? 'Start today'
      : `${activity.currentStreak} day${activity.currentStreak === 1 ? '' : 's'}${streakFlames(activity.currentStreak) ? ` ${streakFlames(activity.currentStreak)}` : ''}`;

  const sessions = learningPath.nodes
    .filter((node) => node.status === 'COMPLETED' || node.status === 'IN_PROGRESS')
    .sort((a, b) => b.sequenceOrder - a.sequenceOrder)
    .slice(0, 4);

  const sendPrompt = () => {
    const text = prompt.trim();
    if (!text) return;
    navigate('/dashboard/ai-tutor', { state: { prompt: text } });
  };

  const openTool = (tool: StudentTool) => {
    if (tool.href) {
      navigate(tool.href);
      return;
    }
    if (tool.registry) setActive(tool.registry);
  };

  const toggleFavorite = (toolId: string) => {
    if (toolId === 'ai-tutor') return;
    const wasFav = favoriteIds.includes(toolId);
    setFavoriteIds((prev) => (wasFav ? prev.filter((id) => id !== toolId) : [...prev, toolId]));
    void api.toggleTeacherToolFavorite(toolId).then((res) => setFavoriteIds(res.favoriteIds)).catch(() => {
      setFavoriteIds((prev) => (wasFav ? [...prev, toolId] : prev.filter((id) => id !== toolId)));
    });
  };

  const joinClass = async () => {
    if (!classCode.trim()) return;
    setJoining(true);
    setJoinMsg('');
    try {
      const res = await api.joinClass(classCode.trim());
      setJoinMsg(`Joined ${res.classBatch.name}`);
      setClassCode('');
    } catch (err) {
      setJoinMsg(err instanceof Error ? err.message : 'Could not join class');
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#040711] font-sans text-slate-100" style={FONT}>
      <div className="fixed inset-x-0 top-0 z-40 flex items-center border-b border-slate-800/80 bg-[#030712]/90 px-4 py-3 backdrop-blur-md md:hidden">
        <button
          type="button"
          className="cursor-pointer appearance-none rounded-lg border border-cyan-400/40 bg-transparent p-2.5 text-cyan-300"
          aria-label={openMenu ? 'Close menu' : 'Open menu'}
          onClick={() => setOpenMenu((value) => !value)}
        >
          {openMenu ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
        <span className="ml-3 text-sm font-semibold text-slate-100">Student workspace</span>
      </div>

      <aside
        className={[
          'z-50 flex w-64 shrink-0 flex-col justify-between border-r border-slate-800/80 bg-[#030712]/90 px-4 py-5 backdrop-blur-md',
          'fixed inset-y-0 left-0 transition-transform duration-200 md:static md:translate-x-0',
          openMenu ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        ].join(' ')}
      >
        <div className="space-y-6">
          <div className="hidden items-center gap-2 border-b border-cyan-900/50 px-2 pb-4 md:flex">
            <div className="h-3 w-3 shrink-0 animate-pulse rounded-full bg-cyan-400 shadow-[0_0_10px_#22d3ee]" />
            <div className="min-w-0">
              <BrandLogo variant="full" imgClassName="h-8 w-auto object-contain" />
              <p className="mt-1 text-base font-extrabold tracking-tight text-slate-200">Student workspace</p>
            </div>
          </div>
          <div className="space-y-2">
            <p className="px-2 text-base font-extrabold tracking-tight text-slate-400">Student workspace</p>
            <nav className="space-y-1" aria-label="Student workspace">
              <NavLink
                to="/student/dashboard"
                onClick={() => setOpenMenu(false)}
                className={({ isActive }) =>
                  [
                    'flex items-start gap-3 rounded-none px-3 py-3 no-underline transition',
                    isActive
                      ? 'border-l-2 border-cyan-400 bg-cyan-950/30 text-cyan-300'
                      : 'border-l-2 border-transparent text-slate-400 hover:bg-cyan-950/20 hover:text-cyan-200',
                  ].join(' ')
                }
              >
                <Home className="mt-0.5 h-5 w-5 shrink-0" />
                <span>
                  <span className="block text-base font-bold">Home</span>
                  <span className="mt-0.5 block text-sm text-slate-400">Sharada & recommended tools</span>
                </span>
              </NavLink>
              <NavLink
                to="/student/tools"
                onClick={() => setOpenMenu(false)}
                className={({ isActive }) =>
                  [
                    'flex items-start gap-3 rounded-none px-3 py-3 no-underline transition',
                    isActive
                      ? 'border-l-2 border-cyan-400 bg-cyan-950/30 text-cyan-300'
                      : 'border-l-2 border-transparent text-slate-400 hover:bg-cyan-950/20 hover:text-cyan-200',
                  ].join(' ')
                }
              >
                <LayoutGrid className="mt-0.5 h-5 w-5 shrink-0" />
                <span>
                  <span className="block text-base font-bold">AI Tools Suite</span>
                  <span className="mt-0.5 block text-sm text-slate-400">All Student Tools Hub</span>
                </span>
              </NavLink>
            </nav>
          </div>
        </div>
        <div className="border-t border-slate-800 pt-4">
          <FeedbackMenuButton size="lg" />
          <div className="mb-2 flex items-center gap-2 px-3">
            <span className="rounded border border-emerald-500/40 bg-emerald-950/80 px-2.5 py-1 text-sm font-semibold text-emerald-400">
              [ONLINE]
            </span>
          </div>
          <p className="truncate px-3 text-base font-bold text-slate-100">{fullName || 'Student'}</p>
          <p className="truncate px-3 text-sm text-slate-400">{profileLine}</p>
          <button
            type="button"
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="mt-3 inline-flex w-full cursor-pointer appearance-none items-center justify-center gap-2 rounded-lg border border-cyan-400/50 bg-cyan-500/10 px-4 py-2.5 text-base font-bold text-cyan-300 transition-all hover:bg-cyan-500 hover:text-black"
          >
            <LogOut className="h-5 w-5" /> Log out
          </button>
        </div>
      </aside>

      <main className="custom-scrollbar min-h-screen w-full flex-1 overflow-y-auto bg-[#040711] p-8 pt-20 md:pt-8">
        {view === 'home' ? (
          <section className="w-full space-y-6 pt-2 text-center">
            <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-1.5 text-sm font-black uppercase tracking-widest text-cyan-400">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-cyan-400" /> SYS_OK
            </span>
            <h1 className="text-5xl font-black leading-tight tracking-tight text-white lg:text-6xl">
              Hi {firstName}. <span className="text-slate-400">How can I help today?</span>
            </h1>
            <p className="text-lg font-medium text-slate-300">Chat with Sharada, your AI tutor & assistant</p>
            <form
              className="mx-auto flex w-full max-w-3xl flex-col space-y-3 rounded-[28px] border border-slate-700/50 bg-[#131b2e] p-4 text-left shadow-2xl focus-within:border-cyan-500/60 focus-within:ring-2 focus-within:ring-cyan-500/20 sm:p-5"
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
                className="custom-scrollbar max-h-[200px] w-full resize-none overflow-y-auto border-none bg-transparent p-0 text-base text-slate-100 placeholder-slate-400 focus:outline-none sm:text-lg"
                style={FONT}
              />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    className="cursor-pointer appearance-none rounded-full border-0 bg-transparent p-2.5 text-slate-300 hover:bg-slate-800 hover:text-white"
                    aria-label="Add file or attachment"
                    onClick={() => fileRef.current?.click()}
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    className="hidden"
                    accept="image/*,.pdf,.doc,.docx,.txt"
                    onChange={() => setReply('Sharada: Attachment noted. Ask your question in the tutor next.')}
                  />
                  <button
                    type="button"
                    className="cursor-pointer appearance-none rounded-full border-0 bg-transparent p-2.5 text-slate-300 hover:bg-slate-800 hover:text-cyan-400"
                    aria-label="Use voice input"
                    onClick={() => setReply('Sharada: Voice input is available inside the AI Tutor.')}
                  >
                    <Mic className="h-5 w-5" />
                  </button>
                </div>
                <button
                  type="submit"
                  disabled={!prompt.trim()}
                  className={`flex appearance-none items-center justify-center rounded-full border-0 p-3 transition-all ${
                    prompt.trim()
                      ? 'cursor-pointer bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/30 hover:bg-cyan-300'
                      : 'cursor-not-allowed bg-slate-800 text-slate-500'
                  }`}
                  aria-label="Send message"
                >
                  <ArrowUp className="h-5 w-5 stroke-[2.5]" />
                </button>
              </div>
            </form>
            {reply ? <p className="mx-auto max-w-3xl rounded-xl border border-slate-800 bg-[#080d1a] px-4 py-3 text-left text-slate-300">{reply}</p> : null}
          </section>
        ) : (
          <section className="mb-8">
            <h1 className="text-4xl font-black text-white">AI Tools Suite</h1>
            <p className="mt-2 text-lg text-slate-300">All student tools. Plan: {planType ?? 'student_free'}.</p>
          </section>
        )}

        <div className={`grid w-full grid-cols-1 gap-8 ${view === 'home' ? 'mt-10 lg:grid-cols-3' : ''}`}>
          <div className={view === 'home' ? 'space-y-5 lg:col-span-2' : 'space-y-5'}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base text-slate-300">
                <strong className="mr-1 text-xl font-black text-white">
                  {view === 'home' ? 'Recommended tools.' : 'Student tools.'}
                </strong>
                <span>Curated for your grade and MindVault activity.</span>
              </h2>
              {view === 'home' ? (
                <button
                  type="button"
                  onClick={() => navigate('/student/tools')}
                  className="inline-flex shrink-0 cursor-pointer appearance-none items-center gap-1.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-base font-bold text-cyan-400 hover:bg-cyan-500/20"
                >
                  Discover all tools <ArrowRight className="h-4 w-4" />
                </button>
              ) : null}
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {visibleTools.map((tool) => {
                const Icon = tool.icon;
                const favorited = favoriteIds.includes(tool.id);
                return (
                  <div
                    key={tool.id}
                    role="link"
                    tabIndex={0}
                    onClick={() => openTool(tool)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        openTool(tool);
                      }
                    }}
                    className="group flex min-h-[160px] cursor-pointer flex-col justify-between rounded-2xl border border-slate-800/80 bg-[#080d1a] p-5 shadow-lg transition-all hover:border-cyan-500/40 hover:bg-[#0b1326]"
                  >
                    <div className="flex items-center justify-between">
                      <div className="rounded-xl border border-cyan-500/20 bg-[#0e172a] p-2.5 text-cyan-400">
                        <Icon className="h-5 w-5" />
                      </div>
                      {tool.id === 'ai-tutor' ? null : (
                        <button
                          type="button"
                          className={`cursor-pointer appearance-none border-0 bg-transparent p-0 ${favorited ? 'text-amber-400' : 'text-slate-600 hover:text-amber-400'}`}
                          aria-label={favorited ? `Unpin ${tool.title}` : `Pin ${tool.title}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleFavorite(tool.id);
                          }}
                        >
                          <Star className="h-4 w-4" fill={favorited ? 'currentColor' : 'none'} />
                        </button>
                      )}
                    </div>
                    <div>
                      <h3 className="mt-3 text-lg font-extrabold text-white group-hover:text-cyan-300">{tool.title}</h3>
                      <p className="mt-1 line-clamp-2 text-base leading-relaxed text-slate-300">{tool.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {view === 'home' ? (
            <div className="space-y-5">
              <h2 className="text-base text-slate-300">
                <strong className="mr-1 text-xl font-black text-white">Recent activity.</strong>
                <span>Latest study sessions and practice.</span>
              </h2>
              <div className="flex items-center gap-3 rounded-2xl border border-slate-800/80 bg-[#080d1a] p-4">
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-2.5 text-amber-400">
                  <Flame className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Learning streak</p>
                  <p className="text-lg font-black text-white">{streakLabel}</p>
                  <p className="text-sm text-slate-400">Studied {activity.timeStudiedFormatted} this week</p>
                </div>
              </div>
              <div className="space-y-4 rounded-2xl border border-slate-800/80 bg-[#080d1a] p-5">
                {learningPath.loading ? (
                  <p className="text-sm text-slate-400">Loading study sessions…</p>
                ) : sessions.length === 0 ? (
                  <p className="text-sm text-slate-400">No study sessions yet. Start with the AI Tutor or a practice tool.</p>
                ) : (
                  sessions.map((node) => (
                    <div
                      key={node.id}
                      role="link"
                      tabIndex={0}
                      onClick={() => node.learnRoute && navigate(node.learnRoute)}
                      className="cursor-pointer rounded-xl border border-slate-800/60 bg-[#0a0f20] p-4 hover:bg-slate-800/50"
                    >
                      <h4 className="line-clamp-1 text-lg font-bold text-slate-100">{node.title}</h4>
                      <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-400">
                        <Clock className="h-4 w-4" />
                        {node.subjectCategory}
                        {node.masteryScore > 0 ? ` · ${node.masteryScore}%` : ''}
                      </p>
                    </div>
                  ))
                )}
              </div>
              <form
                className="space-y-2 rounded-2xl border border-slate-800/80 bg-[#080d1a] p-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  void joinClass();
                }}
              >
                <p className="text-sm font-bold text-slate-200">Join a class</p>
                <div className="flex gap-2">
                  <input
                    value={classCode}
                    onChange={(event) => setClassCode(event.target.value.toUpperCase())}
                    placeholder="Class code"
                    className="w-full rounded-xl border border-slate-700 bg-[#0b101d] px-3 py-2 text-sm text-white outline-none"
                  />
                  <button
                    type="submit"
                    disabled={joining || !classCode.trim()}
                    className="cursor-pointer appearance-none rounded-xl border-0 bg-cyan-400 px-3 py-2 text-sm font-bold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Join
                  </button>
                </div>
                {joinMsg ? <p className="text-xs text-slate-400">{joinMsg}</p> : null}
              </form>
            </div>
          ) : null}
        </div>
      </main>

      {active ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="flex h-[88vh] w-full max-w-7xl flex-col overflow-hidden rounded-3xl border border-slate-800 bg-[#040711] shadow-2xl">
            <ToolRenderer tool={active} embed onClose={() => setActive(null)} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function StudentTools() {
  return <StudentWorkspace view="tools" />;
}

export default function StudentDashboard() {
  return <StudentWorkspace view="home" />;
}
