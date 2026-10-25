import { useCallback, useEffect, useMemo, useState, type ComponentType } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  ClipboardList,
  FileText,
  Gamepad2,
  ListChecks,
  Mail,
  MessageSquare,
  Mic,
  Music,
  Pencil,
  Presentation,
  School,
  Sparkles,
  Star,
  Youtube,
} from 'lucide-react';
import type {
  TeacherToolBadge,
  TeacherToolDefinition,
  TeacherToolFocusArea,
} from '@brightpath/shared';
import { hasAiToolAccess, TEACHER_TOOLS_CATALOG, teacherToolBadges, type AiToolPlan } from '@brightpath/shared';
import { isTeacherToolEnabled } from '@/lib/teacherToolAvailability';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { ProUpgradeDialog } from '@/components/billing/ProUpgradeDialog';
import { TeacherWorkspaceLayout } from '@/components/teacher/TeacherWorkspaceLayout';
import { AIToolWizardModal } from '@/components/tools/AIToolWizardModal';
import { ToolsFilterBar, type ToolsLibraryFilter, type ToolsSortKey } from '@/components/tools/ToolsFilterBar';
import { TeacherToolLauncher } from '@/pages/TeacherToolPage';
import { canUserAccessTool, getRegistryTool, toolVisibleToRole } from '@/config/toolsRegistry';

const ICONS: Record<string, ComponentType<{ className?: string }>> = {
  'book-open': BookOpen,
  music: Music,
  mic: Mic,
  'file-text': FileText,
  pencil: Pencil,
  'clipboard-list': ClipboardList,
  'list-checks': ListChecks,
  'gamepad-2': Gamepad2,
  presentation: Presentation,
  'message-square': MessageSquare,
  youtube: Youtube,
  mail: Mail,
  school: School,
};

function badgeClass(badge: TeacherToolBadge): string {
  const base =
    'td-tool-badge rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide';
  if (badge === 'New') return `${base} td-tool-badge-new bg-emerald-950/80 text-emerald-400 border-emerald-500/40`;
  if (badge === 'Hot') return `${base} td-tool-badge-hot bg-emerald-950/80 text-emerald-400 border-emerald-500/40`;
  return `${base} td-tool-badge-beta bg-cyan-950/80 text-cyan-300 border-cyan-500/40`;
}

export default function TeacherTools() {
  const navigate = useNavigate();
  const [tools, setTools] = useState<TeacherToolDefinition[]>(TEACHER_TOOLS_CATALOG);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [focusArea, setFocusArea] = useState<TeacherToolFocusArea | 'all'>('all');
  const [library, setLibrary] = useState<ToolsLibraryFilter>('all');
  const [sort, setSort] = useState<ToolsSortKey>('popular');
  const [error, setError] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<TeacherToolDefinition | null>(null);
  const { role, planType, user, teacher, parent } = useAuth();
  const email = user?.email ?? teacher?.email ?? parent?.email ?? null;
  const [lockedPlan, setLockedPlan] = useState<AiToolPlan | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.teacherTools();
      const byId = new Map(TEACHER_TOOLS_CATALOG.map((tool) => [tool.id, tool]));
      const fromApi = res.tools.map((tool) => ({
        ...(byId.get(tool.id) ?? {}),
        ...tool,
        requiredPlan: byId.get(tool.id)?.requiredPlan ?? tool.requiredPlan ?? 'free',
      }));
      const seen = new Set(fromApi.map((tool) => tool.id));
      const extras = TEACHER_TOOLS_CATALOG.filter((tool) => !seen.has(tool.id));
      setTools(res.tools.length ? [...fromApi, ...extras] : TEACHER_TOOLS_CATALOG);
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
      if (!toolVisibleToRole(tool.id, role, email)) return false;
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
  }, [tools, query, focusArea, library, sort, favoriteIds, role, email]);

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

  const actor = { role, email };
  const canLaunch = (tool: TeacherToolDefinition) =>
    isTeacherToolEnabled(tool.id) &&
    canUserAccessTool(actor, getRegistryTool(tool.id)?.allowedRoles ?? []) &&
    hasAiToolAccess({ role, email, planType, requiredPlan: tool.requiredPlan ?? 'free' });

  const openTool = (tool: TeacherToolDefinition) => {
    if (!isTeacherToolEnabled(tool.id)) return;
    if (!canUserAccessTool(actor, getRegistryTool(tool.id)?.allowedRoles ?? [])) {
      setError('This tool is not available for your role');
      return;
    }
    if (tool.id === 'curriculum-studio' || tool.href === '/tools/curriculum-textbook-studio') {
      if (!hasAiToolAccess({ role, email, planType, requiredPlan: 'pro' })) {
        setLockedPlan('pro');
        return;
      }
      navigate('/tools/curriculum-textbook-studio');
      return;
    }
    if (!hasAiToolAccess({ role, email, planType, requiredPlan: tool.requiredPlan ?? 'free' })) {
      setLockedPlan(tool.requiredPlan ?? 'pro');
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
    if (tool.id === 'gamified-activity') {
      navigate('/teacher/tools/gamified-activity');
      return;
    }
    if (tool.id === 'classroom') {
      navigate('/teacher/tools/classroom');
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

        <ToolsFilterBar
          query={query}
          onQueryChange={setQuery}
          focusArea={focusArea}
          onFocusAreaChange={setFocusArea}
          library={library}
          onLibraryChange={setLibrary}
          sort={sort}
          onSortChange={setSort}
          searchPlaceholder="Search all tools..."
          onClear={() => {
            setQuery('');
            setFocusArea('all');
            setLibrary('all');
            setSort('popular');
          }}
        />

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
                      {teacherToolBadges(tool).map((badge) => (
                        <span key={badge} className={badgeClass(badge)}>{badge}</span>
                      ))}
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
                        ? tool.id === 'curriculum-studio'
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

      <ProUpgradeDialog open={lockedPlan !== null} onClose={() => setLockedPlan(null)} />

      {activeTool && (
        <AIToolWizardModal
          isOpen
          onClose={() => setActiveTool(null)}
          toolName={activeTool.title}
          description={activeTool.description}
        >
          <TeacherToolLauncher
            tool={activeTool}
            embedded
            favorited={favoriteIds.includes(activeTool.id)}
            onToggleFavorite={() => void toggleFavorite(activeTool.id)}
          />
          <button
            type="button"
            className="mt-4 text-sm font-semibold text-cyan-300 underline"
            onClick={() => navigate(activeTool.href)}
          >
            Open dedicated page
          </button>
        </AIToolWizardModal>
      )}
    </TeacherWorkspaceLayout>
  );
}
