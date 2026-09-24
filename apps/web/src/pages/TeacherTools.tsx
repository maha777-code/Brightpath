import { useCallback, useEffect, useMemo, useState, type ComponentType } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  ClipboardList,
  FileText,
  ListChecks,
  Mail,
  MessageSquare,
  Mic,
  Music,
  Pencil,
  Presentation,
  Search,
  Sparkles,
  Star,
  X,
  Youtube,
} from 'lucide-react';
import type {
  TeacherToolBadge,
  TeacherToolDefinition,
  TeacherToolFocusArea,
} from '@brightpath/shared';
import { hasAiToolAccess, TEACHER_TOOLS_CATALOG, type AiToolPlan } from '@brightpath/shared';
import { isTeacherToolEnabled } from '@/lib/teacherToolAvailability';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { PaymentUpgradeModal } from '@/components/billing/PaymentUpgradeModal';
import { TeacherWorkspaceLayout } from '@/components/teacher/TeacherWorkspaceLayout';
import { TeacherToolLauncher } from '@/pages/TeacherToolPage';

type LibraryFilter = 'all' | 'favorites' | 'custom';
type SortKey = 'popular' | 'newest' | 'alpha';

const ICONS: Record<string, ComponentType<{ className?: string }>> = {
  'book-open': BookOpen,
  music: Music,
  mic: Mic,
  'file-text': FileText,
  pencil: Pencil,
  'clipboard-list': ClipboardList,
  'list-checks': ListChecks,
  presentation: Presentation,
  'message-square': MessageSquare,
  youtube: Youtube,
  mail: Mail,
};

function badgeClass(badge: TeacherToolBadge): string {
  const base =
    'rounded border px-2 py-0.5 text-[10px] font-semibold tracking-tight';
  if (badge === 'New') return `${base} bg-emerald-950/80 text-emerald-400 border-emerald-500/40`;
  if (badge === 'Hot') return `${base} bg-emerald-950/80 text-emerald-400 border-emerald-500/40`;
  return `${base} bg-cyan-950/80 text-cyan-300 border-cyan-500/40`;
}

export default function TeacherTools() {
  const navigate = useNavigate();
  const [tools, setTools] = useState<TeacherToolDefinition[]>(TEACHER_TOOLS_CATALOG);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [focusArea, setFocusArea] = useState<TeacherToolFocusArea | 'all'>('all');
  const [library, setLibrary] = useState<LibraryFilter>('all');
  const [sort, setSort] = useState<SortKey>('popular');
  const [error, setError] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<TeacherToolDefinition | null>(null);
  const { role, planType } = useAuth();
  const [lockedPlan, setLockedPlan] = useState<AiToolPlan | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.teacherTools();
      const byId = new Map(TEACHER_TOOLS_CATALOG.map((tool) => [tool.id, tool]));
      setTools(
        res.tools.length
          ? res.tools.map((tool) => ({
              ...(byId.get(tool.id) ?? {}),
              ...tool,
              requiredPlan: tool.requiredPlan ?? byId.get(tool.id)?.requiredPlan ?? 'pro',
            }))
          : TEACHER_TOOLS_CATALOG,
      );
      setFavoriteIds(res.favoriteIds);
      setError(null);
    } catch (e) {
      setTools(TEACHER_TOOLS_CATALOG);
      setError(e instanceof Error ? e.message : 'Could not load favorites. Showing the local catalog.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    let next = tools.filter((tool) => {
      if (focusArea !== 'all' && tool.focusArea !== focusArea) return false;
      if (library === 'favorites' && !favoriteIds.includes(tool.id)) return false;
      if (library === 'custom' && !tool.custom) return false;
      if (!q) return true;
      return (
        tool.title.toLowerCase().includes(q) ||
        tool.description.toLowerCase().includes(q) ||
        tool.focusArea.toLowerCase().includes(q)
      );
    });

    next = [...next].sort((a, b) => {
      if (a.highlighted !== b.highlighted) return a.highlighted ? -1 : 1;
      if (sort === 'alpha') return a.title.localeCompare(b.title);
      if (sort === 'newest') return a.newestRank - b.newestRank;
      return b.popularity - a.popularity;
    });
    return next;
  }, [tools, query, focusArea, library, sort, favoriteIds]);

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

  const canLaunch = (tool: TeacherToolDefinition) =>
    isTeacherToolEnabled(tool.id) &&
    hasAiToolAccess({ role, planType, requiredPlan: tool.requiredPlan ?? 'pro' });

  const openTool = (tool: TeacherToolDefinition) => {
    if (!isTeacherToolEnabled(tool.id)) return;
    if (!hasAiToolAccess({ role, planType, requiredPlan: tool.requiredPlan ?? 'pro' })) {
      setLockedPlan(tool.requiredPlan ?? 'pro');
      setCheckoutOpen(false);
      return;
    }
    if (tool.id === 'curriculum-studio' || tool.href === '/teacher/dashboard') {
      navigate('/teacher/dashboard');
      return;
    }
    if (tool.id === 'worksheet-generator') {
      navigate('/teacher/tools/worksheet-generator');
      return;
    }
    if (tool.id === 'song-generator') {
      navigate('/teacher/tools/song-generator');
      return;
    }
    if (tool.id === 'lesson-plan') {
      navigate('/teacher/tools/lesson-plan-generator');
      return;
    }
    setActiveTool(tool);
  };

  return (
    <TeacherWorkspaceLayout>
      <main className="w-full max-w-full space-y-6 px-5 py-6 sm:px-8 lg:px-10 lg:py-8">
        <div className="td-card rounded-3xl p-6 sm:p-8">
          <div className="text-3xl tracking-tight sm:text-4xl">
            <span className="font-bold text-slate-100">Teacher tools. </span>
            <span className="font-normal text-slate-400">
              Search, filter, and launch classroom generators.
            </span>
          </div>
        </div>

        <div className="td-card flex flex-col gap-3 rounded-3xl p-4 sm:p-5">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-cyan-200/70" />
            <input
              className="td-input w-full rounded-2xl py-3 pl-11 pr-4 text-base"
              placeholder="Search all teacher tools..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search all teacher tools"
            />
          </label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <select
              className="td-input rounded-2xl px-4 py-3 text-sm font-semibold"
              value={focusArea}
              onChange={(e) => setFocusArea(e.target.value as TeacherToolFocusArea | 'all')}
              aria-label="Discover tools by focus area"
            >
              <option value="all">Discover tools by focus area</option>
              <option value="curriculum">Curriculum</option>
              <option value="content">Content creation</option>
              <option value="assessment">Assessment</option>
              <option value="communication">Communication</option>
            </select>
            <select
              className="td-input rounded-2xl px-4 py-3 text-sm font-semibold"
              value={library}
              onChange={(e) => setLibrary(e.target.value as LibraryFilter)}
              aria-label="Favorites"
            >
              <option value="all">All tools</option>
              <option value="favorites">Favorites</option>
              <option value="custom">Custom</option>
            </select>
            <select
              className="td-input rounded-2xl px-4 py-3 text-sm font-semibold"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              aria-label="Sort by"
            >
              <option value="popular">Sort by: Most popular</option>
              <option value="newest">Newest</option>
              <option value="alpha">Alphabetical</option>
            </select>
          </div>
        </div>

        {error && (
          <p className="rounded-lg border border-rose-500/40 bg-rose-950/40 p-4 text-sm tracking-tight text-rose-200">
            {error}
          </p>
        )}

        {visible.length === 0 ? (
          <div className="td-card rounded-3xl p-10 text-center">
            <Sparkles className="mx-auto h-8 w-8 text-cyan-200" />
            <p className="mt-3 text-lg font-bold text-white">
              {library === 'custom' ? 'No custom tools yet' : 'No tools match these filters'}
            </p>
            <p className="mt-1 text-sm text-cyan-200/80">
              {library === 'custom'
                ? 'Custom teacher tools will appear here when you save one.'
                : 'Try a different search, focus area, or favorites filter.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {visible.map((tool) => {
              const Icon = ICONS[tool.icon] ?? Sparkles;
              const favorited = favoriteIds.includes(tool.id);
              return (
                <article
                  key={tool.id}
                  className={[
                    'td-tool-tile group relative flex min-h-[220px] cursor-pointer flex-col rounded-xl border border-slate-600 bg-slate-800/90 p-5 text-left text-white shadow-lg backdrop-blur-md transition-all',
                    'hover:border-cyan-500/50 hover:bg-slate-800 hover:shadow-cyan-500/10',
                    tool.highlighted ? 'lg:col-span-2 border-cyan-500/40 bg-slate-800' : '',
                  ].join(' ')}
                  onClick={() => openTool(tool)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      openTool(tool);
                    }
                  }}
                  role="link"
                  tabIndex={0}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-950 text-cyan-400">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex items-center gap-2">
                      {tool.badge ? <span className={badgeClass(tool.badge)}>{tool.badge}</span> : null}
                      <button
                        type="button"
                        className={[
                          'rounded-md border-0 bg-transparent p-1.5 appearance-none transition',
                          favorited
                            ? 'text-emerald-400 hover:text-emerald-300'
                            : 'text-slate-400 hover:text-emerald-400',
                        ].join(' ')}
                        aria-label={favorited ? `Unpin ${tool.title} from favorites` : `Pin ${tool.title} to favorites`}
                        aria-pressed={favorited}
                        onClick={(e) => {
                          e.stopPropagation();
                          void toggleFavorite(tool.id);
                        }}
                      >
                        <Star className="h-4 w-4" fill={favorited ? 'currentColor' : 'none'} />
                      </button>
                    </div>
                  </div>
                  <div className="mt-4 text-lg tracking-tight">
                    <span className="font-bold text-slate-100">{tool.title}. </span>
                    <span className="font-normal text-slate-400">{tool.description}</span>
                  </div>
                  <p
                    className={`mt-4 text-sm font-medium tracking-tight ${
                      !isTeacherToolEnabled(tool.id)
                        ? 'text-amber-300'
                        : canLaunch(tool)
                          ? 'text-cyan-400'
                          : 'text-amber-300'
                    }`}
                  >
                    {!isTeacherToolEnabled(tool.id)
                      ? 'Tool Under Maintenance'
                      : canLaunch(tool)
                        ? tool.highlighted
                          ? 'Open Curriculum Studio'
                          : 'Launch tool'
                        : '🔒 Upgrade to unlock'}
                  </p>
                </article>
              );
            })}
          </div>
        )}
      </main>

      {lockedPlan && !checkoutOpen ? (
        <div className="fixed inset-0 z-[70] flex items-end justify-center p-4 sm:items-center">
          <button type="button" className="absolute inset-0 bg-slate-950/70" aria-label="Close upgrade" onClick={() => setLockedPlan(null)} />
          <div className="relative z-10 w-full max-w-md rounded-3xl border border-slate-700 bg-slate-900 p-6 text-white" role="dialog" aria-modal="true">
            <h2 className="text-xl font-bold">Upgrade Plan</h2>
            <p className="mt-2 text-sm text-slate-300">This tool is included on a higher MindVault plan.</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <a href="/pricing#pricing" className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-bold text-slate-950">
                View pricing
              </a>
              <button type="button" className="rounded-xl border border-slate-600 px-4 py-2 text-sm font-semibold" onClick={() => setCheckoutOpen(true)}>
                Upgrade now
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <PaymentUpgradeModal
        open={checkoutOpen && lockedPlan !== null}
        onClose={() => setCheckoutOpen(false)}
        defaultPlan={lockedPlan === 'center_pro' ? 'tutor_center_pro' : 'teacher_pro'}
      />

      {activeTool && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center p-4 sm:items-center">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/70"
            aria-label="Dismiss tool launcher"
            onClick={() => setActiveTool(null)}
          />
          <div
            className={
              activeTool.id === 'quiz-generator'
                ? 'relative z-10 max-h-[92dvh] w-full max-w-6xl overflow-y-auto rounded-3xl bg-white p-5 text-slate-800 shadow-2xl sm:p-8'
                : 'relative z-10 td-card max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-3xl p-6 sm:p-8'
            }
            role="dialog"
            aria-modal="true"
            aria-labelledby="tool-launcher-title"
          >
            <div className="mb-3 flex items-start justify-end">
              <h2 id="tool-launcher-title" className="sr-only">
                {activeTool.title}
              </h2>
              <button
                type="button"
                className={
                  activeTool.id === 'quiz-generator'
                    ? 'rounded-full border border-slate-200 p-2 text-slate-500 hover:bg-slate-100'
                    : 'rounded-full border border-white/15 p-2 text-cyan-100 hover:bg-white/10'
                }
                aria-label="Close tool launcher"
                onClick={() => setActiveTool(null)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <TeacherToolLauncher
              tool={activeTool}
              embedded
              favorited={favoriteIds.includes(activeTool.id)}
              onToggleFavorite={() => void toggleFavorite(activeTool.id)}
            />
            <button
              type="button"
              className={
                activeTool.id === 'quiz-generator'
                  ? 'mt-4 text-sm font-semibold text-cyan-300 underline'
                  : 'mt-4 text-sm font-semibold text-cyan-200 underline'
              }
              onClick={() => navigate(activeTool.href)}
            >
              Open dedicated page
            </button>
          </div>
        </div>
      )}
    </TeacherWorkspaceLayout>
  );
}
