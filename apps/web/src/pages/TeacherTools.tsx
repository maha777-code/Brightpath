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
import { TEACHER_TOOLS_CATALOG } from '@brightpath/shared';
import { api } from '@/lib/api';
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
    'rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide border';
  if (badge === 'New') return `${base} bg-cyan-500/20 text-cyan-300 border-cyan-500/30`;
  if (badge === 'Hot') return `${base} bg-amber-500/20 text-amber-300 border-amber-500/30`;
  return `${base} bg-violet-500/20 text-violet-300 border-violet-500/30`;
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

  const load = useCallback(async () => {
    try {
      const res = await api.teacherTools();
      setTools(res.tools.length ? res.tools : TEACHER_TOOLS_CATALOG);
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

  const openTool = (tool: TeacherToolDefinition) => {
    if (tool.id === 'curriculum-studio' || tool.href === '/teacher/dashboard') {
      navigate('/teacher/dashboard');
      return;
    }
    setActiveTool(tool);
  };

  return (
    <TeacherWorkspaceLayout>
      <main className="w-full max-w-full space-y-6 px-5 py-6 sm:px-8 lg:px-10 lg:py-8">
        <div className="td-card rounded-3xl p-6 sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-200/70">AI Tools Suite</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Teacher Tools Suite Hub
          </h1>
          <p className="mt-2 max-w-3xl text-base text-cyan-200/80">
            Search, filter, and launch classroom generators. Curriculum Studio opens the textbook
            upload and video pipeline; every other card launches from this hub.
          </p>
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
          <p className="rounded-2xl border border-amber-400/40 bg-amber-950/40 p-4 text-sm text-amber-100">
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
                            ? 'text-amber-400 hover:text-amber-300'
                            : 'text-slate-400 hover:text-amber-400',
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
                  <h3 className="mt-4 text-lg font-semibold text-white">{tool.title}</h3>
                  <p className="mt-1 flex-1 text-sm text-slate-300 line-clamp-2">{tool.description}</p>
                  <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-cyan-400">
                    {tool.highlighted ? 'Open Curriculum Studio' : 'Launch tool'}
                  </p>
                </article>
              );
            })}
          </div>
        )}
      </main>

      {activeTool && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/70 p-4 sm:items-center"
          onClick={() => setActiveTool(null)}
        >
          <div
            className="td-card max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-3xl p-6 sm:p-8"
            role="dialog"
            aria-modal="true"
            aria-labelledby="tool-launcher-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <h2 id="tool-launcher-title" className="sr-only">
                {activeTool.title}
              </h2>
              <button
                type="button"
                className="ml-auto rounded-full border border-white/15 p-2 text-cyan-100 hover:bg-white/10"
                aria-label="Close tool launcher"
                onClick={() => setActiveTool(null)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <TeacherToolLauncher tool={activeTool} embedded />
            <button
              type="button"
              className="mt-4 text-sm font-semibold text-cyan-200 underline"
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
