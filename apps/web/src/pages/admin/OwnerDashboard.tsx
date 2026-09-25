import { Component, useEffect, useMemo, useState, type ErrorInfo, type FormEvent, type ReactNode } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  Eye,
  FileText,
  ListChecks,
  Lock,
  Mail,
  MessageSquare,
  Mic,
  Monitor,
  Music,
  Pencil,
  Search,
  Sparkles,
  Star,
  XCircle,
  Youtube,
  type LucideIcon,
} from 'lucide-react';
import {
  RAZORPAY_PLAN_AMOUNTS_INR,
  STRIPE_PLAN_PRICES,
  TEACHER_TOOL_FOCUS_LABELS,
  TEACHER_TOOLS_CATALOG,
  type TeacherToolFocusArea,
} from '@brightpath/shared';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { isTeacherToolEnabled, setTeacherToolEnabled } from '@/lib/teacherToolAvailability';
import { ToolRenderer } from '@/components/tools/ToolRenderer';
import { getRegistryTool, toToolDefinition, type ToolDefinition } from '@/config/toolsRegistry';
import { FeedbackMenuButton } from '@/components/FeedbackMenuButton';
import { CURRICULUM_STUDIO_PATH } from '@/pages/tools/CurriculumTextbookStudio';

type Tab = 'overview' | 'tools' | 'feedback';

type DraftTool = {
  id: string;
  title: string;
  description: string;
  requiredPlan: string;
  focusArea: TeacherToolFocusArea;
  badge?: 'New' | 'Hot' | 'Beta' | null;
  icon: string;
  href: string;
  popularity: number;
  newestRank: number;
  favorite: boolean;
  active: boolean;
  staged: boolean;
};

const TOOL_ICONS: Record<string, LucideIcon> = {
  'book-open': BookOpen,
  music: Music,
  mic: Mic,
  'file-text': FileText,
  pencil: Pencil,
  'clipboard-list': ClipboardList,
  'list-checks': ListChecks,
  presentation: Monitor,
  'message-square': MessageSquare,
  youtube: Youtube,
  mail: Mail,
  sparkles: Sparkles,
};

const selectClass =
  'w-full cursor-pointer appearance-none rounded-xl border border-slate-800/80 bg-[#060911] px-4 py-3 text-base font-semibold text-slate-300';

type SubscriberRow = { planType: string; count: number };
type FeedbackRow = {
  id: string;
  email: string;
  planType: string;
  rating: string;
  text: string | null;
  createdAt: string;
};

const navClass =
  'w-full cursor-pointer appearance-none rounded-xl border px-4 py-3.5 text-left text-base font-bold';

function monthlyPaise(planType: string): number {
  return RAZORPAY_PLAN_AMOUNTS_INR[planType]?.monthly ?? 0;
}

function inr(paise: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(paise / 100);
}

function planLabel(planType: string): string {
  if (planType === 'pro' || planType === 'teacher_pro') return 'Teacher Pro';
  if (planType === 'center_pro' || planType === 'tutor_center_pro') return 'Center Pro';
  return STRIPE_PLAN_PRICES[planType]?.label ?? (planType.endsWith('_free') || planType === 'free' ? 'Free' : planType);
}

function isFreePlan(planType: string): boolean {
  return planType === 'free' || planType.endsWith('_free');
}

export default function OwnerDashboard() {
  const { role, loading, homePath } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('overview');
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const [draftName, setDraftName] = useState('');
  const [query, setQuery] = useState('');
  const [focus, setFocus] = useState<'all' | TeacherToolFocusArea>('all');
  const [planFilter, setPlanFilter] = useState('all');
  const [sort, setSort] = useState<'popular' | 'alpha' | 'newest'>('popular');
  const [preview, setPreview] = useState<DraftTool | null>(null);
  const [subscribers, setSubscribers] = useState<SubscriberRow[]>([]);
  const [feedback, setFeedback] = useState<FeedbackRow[]>([]);
  const [tools, setTools] = useState<DraftTool[]>(() =>
    TEACHER_TOOLS_CATALOG.map((tool) => ({
      id: tool.id,
      title: tool.title,
      description: tool.description,
      requiredPlan: tool.requiredPlan,
      focusArea: tool.focusArea,
      badge: tool.badge,
      icon: tool.icon,
      href: tool.href,
      popularity: tool.popularity,
      newestRank: tool.newestRank,
      favorite: false,
      active: isTeacherToolEnabled(tool.id),
      staged: false,
    })),
  );

  useEffect(() => {
    if (role !== 'org_admin') return;
    api
      .ownerOverview()
      .then((result) => {
        setSubscribers(result.subscribers);
        setFeedback(result.feedback);
      })
      .catch(() => setNotice('Subscriber counts could not be loaded.'));
  }, [role]);

  const totals = useMemo(() => {
    const free = subscribers.filter((row) => isFreePlan(row.planType)).reduce((sum, row) => sum + row.count, 0);
    const teacher = subscribers.find((row) => row.planType === 'teacher_pro')?.count ?? 0;
    const center = subscribers.find((row) => row.planType === 'tutor_center_pro')?.count ?? 0;
    const mrr = subscribers.reduce((sum, row) => sum + row.count * monthlyPaise(row.planType), 0);
    return { free, teacher, center, mrr };
  }, [subscribers]);

  const visibleTools = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = (tools ?? []).filter((tool) => {
      if (!tool) return false;
      const matchesQuery = !q || `${tool.title ?? ''} ${tool.description ?? ''}`.toLowerCase().includes(q);
      const matchesFocus = focus === 'all' || tool.focusArea === focus;
      const matchesPlan = planFilter === 'all' || tool.requiredPlan === planFilter;
      return matchesQuery && matchesFocus && matchesPlan;
    });
    return rows.sort((a, b) => {
      if (sort === 'alpha') return a.title.localeCompare(b.title);
      if (sort === 'newest') return a.newestRank - b.newestRank;
      return b.popularity - a.popularity;
    });
  }, [tools, query, focus, planFilter, sort]);

  if (loading) return <div className="app-loading"><div className="loader" /></div>;
  if (!role) return <Navigate to="/login" replace />;
  if (role !== 'org_admin') return <Navigate to={homePath} replace />;

  const stageTool = (event: FormEvent) => {
    event.preventDefault();
    if (!draftName.trim()) return;
    setTools((current) => [
      ...current,
      {
        id: `draft-${Date.now()}`,
        title: draftName.trim(),
        description: 'Staged in this browser only.',
        requiredPlan: 'pro',
        focusArea: 'content',
        badge: 'New',
        icon: 'sparkles',
        href: '/teacher/tools',
        popularity: 0,
        newestRank: 0,
        favorite: false,
        active: false,
        staged: true,
      },
    ]);
    setDraftName('');
    setOpen(false);
    setTab('tools');
    setNotice('Draft created. To publish to all teachers, append tool definition to TEACHER_TOOLS_CATALOG.');
  };

  return (
    <DashboardErrorBoundary>
    <div className="flex min-h-screen flex-col bg-[#070a12] text-slate-100 md:flex-row">
      <aside className="flex w-full shrink-0 flex-col gap-6 border-r border-slate-800 bg-[#0c1220] p-6 md:min-h-screen md:w-72">
        <div>
          <span className="text-sm font-bold uppercase tracking-wider text-cyan-400">School Admin</span>
          <h2 className="mt-1 text-2xl font-black text-white">Admin Panel</h2>
        </div>
        <nav className="space-y-3">
          <button
            type="button"
            onClick={() => setTab('overview')}
            className={`${navClass} ${tab === 'overview' ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400' : 'border-transparent bg-transparent text-slate-400'}`}
          >
            Overview & Revenue
          </button>
          <button
            type="button"
            onClick={() => setTab('tools')}
            className={`${navClass} ${tab === 'tools' ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400' : 'border-transparent bg-transparent text-slate-400'}`}
          >
            AI Tool Library
          </button>
          <button
            type="button"
            onClick={() => setTab('feedback')}
            className={`${navClass} ${tab === 'feedback' ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400' : 'border-transparent bg-transparent text-slate-400'}`}
          >
            Ratings & Feedback
          </button>
        </nav>
        <div className="mt-auto border-t border-slate-800 pt-4">
          <FeedbackMenuButton />
        </div>
      </aside>

      <main className="flex-1 space-y-8 p-8">
        {notice ? (
          <p className="rounded-xl border border-amber-500/30 bg-amber-950/40 px-4 py-3 text-base text-amber-100">{notice}</p>
        ) : null}

        {tab === 'overview' ? (
          <div className="space-y-6">
            <h1 className="text-4xl font-black tracking-tight text-white">School Overview</h1>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              <article className="space-y-1 rounded-2xl border border-slate-800 bg-[#0c1220] p-6">
                <span className="text-sm font-bold uppercase text-slate-400">Estimated MRR</span>
                <div className="text-4xl font-black text-cyan-400">{inr(totals.mrr)}</div>
                <p className="text-sm text-slate-500">Catalog price × active accounts</p>
              </article>
              <article className="space-y-1 rounded-2xl border border-slate-800 bg-[#0c1220] p-6">
                <span className="text-sm font-bold uppercase text-slate-400">Estimated ARR</span>
                <div className="text-4xl font-black text-purple-400">{inr(totals.mrr * 12)}</div>
                <p className="text-sm text-slate-500">Annual run-rate</p>
              </article>
              <article className="space-y-1 rounded-2xl border border-slate-800 bg-[#0c1220] p-6">
                <span className="text-sm font-bold uppercase text-slate-400">Token Usage</span>
                <div className="text-4xl font-black text-slate-500">—</div>
                <p className="text-sm text-slate-500">No token ledger configured</p>
              </article>
            </div>
            <section className="space-y-4 rounded-2xl border border-slate-800 bg-[#0c1220] p-6">
              <h3 className="text-xl font-bold text-white">Active Accounts by Tier</h3>
              <div className="grid grid-cols-1 gap-4 text-center sm:grid-cols-3">
                <Tier label="Free" count={totals.free} />
                <Tier label="Teacher Pro" count={totals.teacher} accent="text-purple-400" price={`${inr(monthlyPaise('teacher_pro'))}/mo`} />
                <Tier label="Center Pro" count={totals.center} accent="text-cyan-400" price={`${inr(monthlyPaise('tutor_center_pro'))}/mo`} />
              </div>
            </section>
          </div>
        ) : null}

        {tab === 'tools' ? (
          <div className="space-y-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <h1 className="text-4xl font-black tracking-tight text-white">AI Tool Library</h1>
                <p className="mt-1 text-xl text-slate-400">
                  Search, filter, and manage classroom generators available to teachers.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="inline-flex cursor-pointer appearance-none items-center gap-2 rounded-xl border border-transparent bg-cyan-400 px-5 py-3 text-base font-extrabold text-slate-950"
              >
                Implement New Tool
              </button>
            </div>

            <div className="rounded-2xl border border-slate-800/80 bg-[#0b101d] p-6">
              <h2 className="text-3xl font-bold tracking-tight text-white">
                Teacher tools.{' '}
                <span className="font-normal text-slate-400">Search, filter, and launch classroom generators.</span>
              </h2>
            </div>

            <div className="space-y-3 rounded-2xl border border-slate-800/80 bg-[#0b101d] p-5">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search all teacher tools..."
                  aria-label="Search all teacher tools"
                  className="w-full rounded-xl border border-slate-800/80 bg-[#060911] py-3.5 pl-12 pr-4 text-base text-white"
                  style={{ backgroundColor: '#060911', color: '#fff' }}
                />
              </label>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <select
                  value={focus}
                  onChange={(event) => setFocus(event.target.value as TeacherToolFocusArea | 'all')}
                  aria-label="Discover tools by focus area"
                  className={selectClass}
                  style={{ backgroundColor: '#060911' }}
                >
                  <option value="all">Discover tools by focus area</option>
                  {(Object.keys(TEACHER_TOOL_FOCUS_LABELS) as TeacherToolFocusArea[]).map((area) => (
                    <option key={area} value={area}>
                      {TEACHER_TOOL_FOCUS_LABELS[area]}
                    </option>
                  ))}
                </select>
                <select
                  value={planFilter}
                  onChange={(event) => setPlanFilter(event.target.value)}
                  aria-label="Plan tier"
                  className={selectClass}
                  style={{ backgroundColor: '#060911' }}
                >
                  <option value="all">All tools</option>
                  <option value="free">Free</option>
                  <option value="pro">Pro</option>
                  <option value="center_pro">Center Pro</option>
                </select>
                <select
                  value={sort}
                  onChange={(event) => setSort(event.target.value as 'popular' | 'alpha' | 'newest')}
                  aria-label="Sort order"
                  className={selectClass}
                  style={{ backgroundColor: '#060911' }}
                >
                  <option value="popular">Sort by: Most popular</option>
                  <option value="alpha">Alphabetical</option>
                  <option value="newest">Newest</option>
                </select>
              </div>
            </div>

            {visibleTools.length === 0 ? (
              <p className="rounded-2xl border border-slate-800/80 bg-[#0c1322] p-8 text-base text-slate-400">
                No tools match these filters.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {visibleTools.map((tool) => {
                  const Icon = TOOL_ICONS[tool.icon] ?? Sparkles;
                  return (
                    <article
                      key={tool.id}
                      className={`flex flex-col justify-between space-y-4 rounded-2xl border bg-[#0c1322] p-6 ${
                        tool.active ? 'border-slate-800/80' : 'border-rose-900/40 opacity-70'
                      }`}
                    >
                      <div>
                        <div className="mb-4 flex items-center justify-between gap-3">
                          <div className="shrink-0 rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-3">
                            <Icon className="h-5 w-5 text-cyan-400" />
                          </div>
                          <div className="flex items-center gap-3">
                            {tool.staged ? (
                              <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-extrabold uppercase tracking-wider text-amber-300">
                                Staged
                              </span>
                            ) : null}
                            {tool.badge ? (
                              <span
                                className={`rounded-md border px-2.5 py-1 text-xs font-extrabold uppercase tracking-wider ${
                                  tool.badge === 'Hot'
                                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                                    : tool.badge === 'Beta'
                                      ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400'
                                      : 'border-purple-500/30 bg-purple-500/10 text-purple-400'
                                }`}
                              >
                                {tool.badge}
                              </span>
                            ) : null}
                            <button
                              type="button"
                              aria-label={tool.favorite ? 'Remove favorite' : 'Favorite tool'}
                              onClick={() =>
                                setTools((current) =>
                                  current.map((item) => (item.id === tool.id ? { ...item, favorite: !item.favorite } : item)),
                                )
                              }
                              className={`cursor-pointer appearance-none border-0 bg-transparent p-1 ${
                                tool.favorite ? 'text-amber-400' : 'text-slate-600'
                              }`}
                            >
                              <Star className={`h-4 w-4 ${tool.favorite ? 'fill-amber-400' : ''}`} />
                            </button>
                          </div>
                        </div>
                        <h3 className="text-xl font-bold leading-snug text-white">{tool.title}</h3>
                        <p className="mt-1.5 line-clamp-3 text-sm leading-relaxed text-slate-400">{tool.description}</p>
                      </div>
                      <div className="space-y-3 border-t border-slate-800/80 pt-3">
                        <div className="flex items-center justify-between gap-3 text-base">
                          {tool.staged ? (
                            <span className="inline-flex items-center gap-1.5 font-semibold text-amber-400">
                              <Lock className="h-3.5 w-3.5" /> Staged locally
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                if (tool.id === 'curriculum-studio') {
                                  navigate(CURRICULUM_STUDIO_PATH);
                                  return;
                                }
                                setPreview(tool);
                              }}
                              className="inline-flex cursor-pointer appearance-none items-center gap-1.5 border-0 bg-transparent text-base font-bold text-cyan-400"
                            >
                              <Eye className="h-4 w-4" /> Admin Preview
                            </button>
                          )}
                          <span className="rounded bg-slate-900 px-2.5 py-1 text-xs font-bold uppercase text-slate-500">
                            {planLabel(tool.requiredPlan)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-3 pt-1 text-base">
                          <span className="text-base text-slate-500">Admin status</span>
                          <button
                            type="button"
                            onClick={() =>
                              setTools((current) =>
                                current.map((item) => {
                                  if (item.id !== tool.id) return item;
                                  const active = !item.active;
                                  if (!item.staged) setTeacherToolEnabled(item.id, active);
                                  return { ...item, active };
                                }),
                              )
                            }
                            className={`inline-flex cursor-pointer appearance-none items-center gap-1.5 rounded-md border border-transparent px-2.5 py-1.5 text-sm font-bold ${
                              tool.active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                            }`}
                          >
                            {tool.active ? (
                              <>
                                <CheckCircle2 className="h-3 w-3" /> Active
                              </>
                            ) : (
                              <>
                                <XCircle className="h-3 w-3" /> Inactive
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        ) : null}

        {tab === 'feedback' ? (
          <div className="space-y-6">
            <h1 className="text-4xl font-black tracking-tight text-white">Ratings & Feedback</h1>
            {feedback.length === 0 ? (
              <div className="rounded-2xl border border-slate-800 bg-[#0c1220] p-12 text-center text-slate-400">
                <p className="text-lg font-semibold">No feedback ratings submitted yet.</p>
                <p className="mt-1 text-sm text-slate-500">Ratings given by teachers will automatically populate here.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {feedback.map((row) => (
                  <article key={row.id} className="rounded-2xl border border-slate-800 bg-[#0c1220] p-6">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-base font-bold text-white">{row.email}</span>
                      <span className="text-sm text-slate-500">{new Date(row.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className="mt-2 text-base font-bold text-amber-400">
                      {row.rating} · {planLabel(row.planType)}
                    </p>
                    <p className="mt-2 text-base text-slate-400">
                      {row.text ?? 'No written comment was stored with this rating.'}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </main>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <form onSubmit={stageTool} className="w-full max-w-md space-y-4 rounded-2xl border border-slate-800 bg-[#0c1220] p-6">
            <h3 className="text-2xl font-bold text-white">Stage Draft AI Tool</h3>
            <label className="block text-sm font-bold uppercase text-slate-400">
              Tool Name
              <input
                required
                value={draftName}
                onChange={(event) => setDraftName(event.target.value)}
                placeholder="e.g. AI Rubric Generator"
                className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-900 p-3 text-base text-white"
                style={{ backgroundColor: '#0f172a', color: '#fff' }}
              />
            </label>
            <p className="text-sm leading-relaxed text-amber-400">
              Draft created. To publish to all teachers, append tool definition to TEACHER_TOOLS_CATALOG.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="cursor-pointer appearance-none border-0 bg-transparent px-4 py-2 text-base font-semibold text-slate-400"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="cursor-pointer appearance-none rounded-xl border border-transparent bg-cyan-400 px-5 py-3 text-base font-bold text-slate-950"
              >
                Stage Draft Tool
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {preview ? (
        <AdminToolPreview
          tool={
            getRegistryTool(preview.id) ??
            toToolDefinition(
              {
                id: preview.id,
                title: preview.title,
                description: preview.description,
                focusArea: preview.focusArea,
                href: preview.href,
                requiredPlan: (preview.requiredPlan as 'free' | 'pro' | 'center_pro') || 'pro',
                popularity: preview.popularity,
                newestRank: preview.newestRank,
                icon: preview.icon,
              },
              preview.staged,
            )
          }
          onClose={() => setPreview(null)}
        />
      ) : null}
    </div>
    </DashboardErrorBoundary>
  );
}

function AdminToolPreview({ tool, onClose }: { tool: ToolDefinition; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md sm:p-8">
      <div className="flex h-[88vh] w-full max-w-7xl flex-col overflow-hidden rounded-3xl border border-slate-800 bg-[#040711] shadow-2xl">
        <ToolRenderer tool={tool} mode="admin-preview" onClose={onClose} />
      </div>
    </div>
  );
}

class DashboardErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Uncaught Admin Dashboard Error:', error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="m-6 space-y-4 rounded-2xl border border-rose-900/50 bg-rose-950/20 p-8 text-center">
        <div className="inline-flex rounded-xl bg-rose-500/10 p-3 text-rose-400">
          <AlertTriangle className="h-8 w-8" />
        </div>
        <h2 className="text-2xl font-bold text-white">Something went wrong loading Admin Control</h2>
        <p className="mx-auto max-w-xl overflow-x-auto rounded-lg bg-rose-950/60 p-3 font-mono text-sm text-rose-300">
          {this.state.error.message || 'Unknown rendering error'}
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="cursor-pointer appearance-none rounded-xl border border-transparent bg-rose-500 px-5 py-3 text-base font-bold text-white"
        >
          Reload Dashboard Page
        </button>
      </div>
    );
  }
}

function Tier({
  label,
  count,
  accent = 'text-slate-400',
  price,
}: {
  label: string;
  count: number;
  accent?: string;
  price?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
      <span className={`text-sm font-bold uppercase ${accent}`}>{label}</span>
      <div className="mt-1 text-3xl font-black text-white">{count}</div>
      {price ? <p className="mt-1 text-sm text-slate-500">{price}</p> : null}
    </div>
  );
}
