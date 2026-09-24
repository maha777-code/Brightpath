import { useEffect, useMemo, useState, type FormEvent, type ReactElement } from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  BarChart3,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  Cpu,
  DollarSign,
  FileText,
  LayoutDashboard,
  ListChecks,
  Lock,
  Mail,
  MessageSquare,
  Mic,
  Music,
  Pencil,
  Plus,
  Presentation,
  Search,
  Sparkles,
  Star,
  Users,
  Wrench,
  XCircle,
  Youtube,
  type LucideIcon,
} from 'lucide-react';
import {
  RAZORPAY_PLAN_AMOUNTS_INR,
  STRIPE_PLAN_PRICES,
  TEACHER_TOOL_FOCUS_LABELS,
  TEACHER_TOOLS_CATALOG,
  isOwnerAccess,
  type TeacherToolFocusArea,
} from '@brightpath/shared';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';

type Tab = 'overview' | 'tools' | 'analytics' | 'feedback';

type DraftTool = {
  id: string;
  title: string;
  slug: string;
  description: string;
  requiredPlan: string;
  focusArea: TeacherToolFocusArea | 'content';
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
  presentation: Presentation,
  'message-square': MessageSquare,
  youtube: Youtube,
  mail: Mail,
  sparkles: Sparkles,
};

const selectClass =
  'w-full cursor-pointer appearance-none rounded-xl border border-slate-800/80 bg-[#060911] px-4 py-2.5 text-sm font-semibold text-slate-300';

type FeedbackRow = {
  id: string;
  email: string;
  planType: string;
  rating: string;
  text: string | null;
  createdAt: string;
};

const tooltipStyle = {
  backgroundColor: '#0f172a',
  borderColor: '#334155',
  borderRadius: '0.75rem',
  color: '#f8fafc',
};

const navButton =
  'flex w-full cursor-pointer appearance-none items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-bold transition-all';

function inr(paise: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(paise / 100);
}

function planLabel(plan: string) {
  return STRIPE_PLAN_PRICES[plan]?.label ?? plan.replaceAll('_', ' ');
}

function monthlyPaise(plan: string) {
  return RAZORPAY_PLAN_AMOUNTS_INR[plan]?.monthly ?? 0;
}

export default function OwnerDashboard() {
  const { role, user, loading, homePath } = useAuth();
  const [tab, setTab] = useState<Tab>('overview');
  const [open, setOpen] = useState(false);
  const [subscribers, setSubscribers] = useState<{ planType: string; count: number }[]>([]);
  const [feedback, setFeedback] = useState<FeedbackRow[]>([]);
  const [notice, setNotice] = useState('');
  const [query, setQuery] = useState('');
  const [focus, setFocus] = useState<'all' | TeacherToolFocusArea>('all');
  const [planFilter, setPlanFilter] = useState('all');
  const [sort, setSort] = useState<'popular' | 'alpha' | 'newest'>('popular');
  const [tools, setTools] = useState<DraftTool[]>(() =>
    TEACHER_TOOLS_CATALOG.map((tool) => ({
      id: tool.id,
      title: tool.title,
      slug: tool.id,
      description: tool.description,
      requiredPlan: tool.requiredPlan,
      focusArea: tool.focusArea,
      badge: tool.badge,
      icon: tool.icon,
      href: tool.href,
      popularity: tool.popularity,
      newestRank: tool.newestRank,
      favorite: false,
      active: true,
      staged: false,
    })),
  );
  const [draft, setDraft] = useState({
    title: '',
    slug: '',
    description: '',
    requiredPlan: 'teacher_pro',
    prompt: '',
  });

  useEffect(() => {
    if (!isOwnerAccess(role)) return;
    api
      .ownerOverview()
      .then((result) => {
        setSubscribers(result.subscribers);
        setFeedback(result.feedback);
      })
      .catch(() => setNotice('Subscriber counts could not be loaded.'));
  }, [role]);

  const visibleTools = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = tools.filter((tool) => {
      const matchesQuery = !q || `${tool.title} ${tool.description}`.toLowerCase().includes(q);
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

  const totals = useMemo(() => {
    const free = subscribers
      .filter((row) => row.planType.includes('free'))
      .reduce((sum, row) => sum + row.count, 0);
    const teacher = subscribers.find((row) => row.planType === 'teacher_pro')?.count ?? 0;
    const center = subscribers.find((row) => row.planType === 'tutor_center_pro')?.count ?? 0;
    const mrr = subscribers.reduce((sum, row) => sum + row.count * monthlyPaise(row.planType), 0);
    return { free, teacher, center, accounts: subscribers.reduce((sum, row) => sum + row.count, 0), mrr };
  }, [subscribers]);

  if (loading) return <div className="app-loading"><div className="loader" /></div>;
  if (!role) return <Navigate to="/login" replace />;
  if (!isOwnerAccess(role)) return <Navigate to={homePath} replace />;

  const select = (next: Tab) => setTab(next);
  const stageTool = (event: FormEvent) => {
    event.preventDefault();
    setTools((current) => [
      {
        id: draft.slug || draft.title.toLowerCase().replace(/\s+/g, '-'),
        title: draft.title,
        slug: draft.slug,
        description: draft.description || draft.prompt,
        requiredPlan: draft.requiredPlan === 'teacher_pro' ? 'pro' : draft.requiredPlan === 'center_pro' ? 'center_pro' : 'free',
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
      ...current,
    ]);
    setDraft({ title: '', slug: '', description: '', requiredPlan: 'teacher_pro', prompt: '' });
    setOpen(false);
    setTab('tools');
    setNotice('Staged in this browser only. Add it to the shared tool catalog before it appears for teachers.');
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#060911] text-slate-100 lg:flex-row">
      <aside className="flex w-full shrink-0 flex-col justify-between border-r border-slate-800/80 bg-[#0b0f19] p-6 lg:w-64">
        <div className="space-y-8">
          <div>
            <span className="text-xs font-black uppercase tracking-widest text-cyan-400">System Owner</span>
            <h2 className="mt-1 text-xl font-extrabold text-white">Admin Control</h2>
          </div>
          <nav className="space-y-2">
            {(
              [
                ['overview', 'Overview', LayoutDashboard],
                ['tools', 'AI Tool Library', Wrench],
                ['analytics', 'Tool Usage Graphs', BarChart3],
                ['feedback', 'User Feedback', MessageSquare],
              ] as const
            ).map(([id, label, Icon]) => (
              <button
                key={id}
                type="button"
                onClick={() => select(id)}
                className={`${navButton} ${
                  tab === id
                    ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400'
                    : 'border-transparent bg-transparent text-slate-400 hover:bg-slate-800/50 hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4" /> {label}
              </button>
            ))}
          </nav>
        </div>
        <p className="border-t border-slate-800/80 pt-6 text-xs text-slate-500">
          Logged in as <span className="block truncate font-semibold text-slate-300">{user?.email}</span>
        </p>
      </aside>

      <main className="flex-1 space-y-8 overflow-y-auto p-6 sm:p-10">
        {notice ? <p className="rounded-xl border border-amber-500/30 bg-amber-950/40 px-4 py-3 text-sm text-amber-100">{notice}</p> : null}

        {tab === 'overview' ? (
          <section className="space-y-8">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <h1 className="text-3xl font-black text-white">Owner Overview</h1>
                <p className="mt-1 text-sm text-slate-400">Live account counts. Revenue is the catalog price times those accounts, not a payment ledger.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setTab('tools');
                  setOpen(true);
                }}
                className="inline-flex cursor-pointer appearance-none items-center gap-2 rounded-xl border border-transparent bg-cyan-400 px-5 py-3 text-sm font-extrabold text-slate-950 hover:bg-cyan-300"
              >
                <Plus className="h-4 w-4" /> Add New AI Tool
              </button>
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <Metric icon={DollarSign} label="Monthly revenue (estimate)" value={inr(totals.mrr)} note="Catalog price × accounts" />
              <Metric icon={DollarSign} label="Annual revenue (estimate)" value={inr(totals.mrr * 12)} note="Estimate × 12" />
              <Metric icon={Users} label="Accounts" value={totals.accounts.toLocaleString()} note="All stored platform users" />
              <Metric icon={Cpu} label="AI tokens used" value="—" note="No token ledger is stored" />
            </div>
            <div className="grid grid-cols-1 gap-4 rounded-2xl border border-slate-800/80 bg-[#0c1220] p-6 md:grid-cols-3">
              <Tier label="Free" count={totals.free} />
              <Tier label="Teacher Pro" count={totals.teacher} price={inr(monthlyPaise('teacher_pro')) + '/mo'} />
              <Tier label="Center Pro" count={totals.center} price={inr(monthlyPaise('tutor_center_pro')) + '/mo'} />
            </div>
            <ChartCard title="Accounts by plan">
              <BarChart data={subscribers.map((row) => ({ name: planLabel(row.planType), count: row.count }))}>
                <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                <XAxis dataKey="name" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis stroke="#94a3b8" allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" name="Accounts" fill="#22d3ee" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ChartCard>
          </section>
        ) : null}

        {tab === 'tools' ? (
          <section className="space-y-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <h1 className="text-3xl font-black text-white">AI Tool Library</h1>
                <p className="mt-1 text-sm text-slate-400">
                  Search, filter, and manage classroom generators available to teachers.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="inline-flex cursor-pointer appearance-none items-center gap-2 rounded-xl border border-transparent bg-cyan-400 px-5 py-3 text-sm font-extrabold text-slate-950 shadow-lg shadow-cyan-500/20"
              >
                <Plus className="h-4 w-4" /> Implement New Tool
              </button>
            </div>

            <div className="rounded-2xl border border-slate-800/80 bg-[#0b101d] p-6">
              <h2 className="text-2xl font-bold tracking-tight text-white">
                Teacher tools.{' '}
                <span className="font-normal text-slate-400">Search, filter, and launch classroom generators.</span>
              </h2>
            </div>

            <div className="space-y-3 rounded-2xl border border-slate-800/80 bg-[#0b101d] p-4">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search all teacher tools..."
                  aria-label="Search all teacher tools"
                  className="w-full rounded-xl border border-slate-800/80 bg-[#060911] py-3 pl-12 pr-4 text-sm text-white placeholder:text-slate-500"
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
              <p className="rounded-2xl border border-slate-800/80 bg-[#0c1322] p-8 text-sm text-slate-400">
                No tools match these filters.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {visibleTools.map((tool) => {
                  const Icon = TOOL_ICONS[tool.icon] ?? Sparkles;
                  return (
                    <article
                      key={tool.id}
                      className={`flex flex-col justify-between space-y-4 rounded-2xl border bg-[#0c1322] p-6 transition-all duration-200 ${
                        tool.active ? 'border-slate-800/80 hover:border-slate-700' : 'border-rose-900/40 opacity-70'
                      }`}
                    >
                      <div>
                        <div className="mb-4 flex items-center justify-between gap-2">
                          <div className="shrink-0 rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-3">
                            <Icon className="h-5 w-5 text-cyan-400" />
                          </div>
                          <div className="flex items-center gap-2">
                            {tool.staged ? (
                              <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-amber-300">
                                Staged
                              </span>
                            ) : null}
                            {tool.badge ? (
                              <span
                                className={`rounded-md border px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${
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
                                tool.favorite ? 'text-amber-400' : 'text-slate-600 hover:text-amber-400'
                              }`}
                            >
                              <Star className={`h-4 w-4 ${tool.favorite ? 'fill-amber-400' : ''}`} />
                            </button>
                          </div>
                        </div>
                        <h3 className="text-base font-bold leading-snug text-white">{tool.title}</h3>
                        <p className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-slate-400">{tool.description}</p>
                      </div>
                      <div className="space-y-3 border-t border-slate-800/80 pt-3">
                        <div className="flex items-center justify-between text-xs">
                          {tool.staged ? (
                            <span className="inline-flex items-center gap-1.5 font-semibold text-amber-400">
                              <Lock className="h-3.5 w-3.5" /> Staged locally
                            </span>
                          ) : tool.active ? (
                            <Link to={tool.href} className="inline-flex items-center gap-1 font-bold text-cyan-400 hover:underline">
                              Launch tool
                            </Link>
                          ) : (
                            <span className="font-semibold text-slate-500">Inactive</span>
                          )}
                          <span className="rounded bg-slate-900 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-500">
                            {tool.requiredPlan === 'center_pro' ? 'Center Pro' : tool.requiredPlan === 'pro' ? 'Pro' : 'Free'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between pt-1 text-xs">
                          <span className="text-[11px] text-slate-500">Admin status</span>
                          <button
                            type="button"
                            onClick={() =>
                              setTools((current) =>
                                current.map((item) => (item.id === tool.id ? { ...item, active: !item.active } : item)),
                              )
                            }
                            className={`inline-flex cursor-pointer appearance-none items-center gap-1 rounded-md border border-transparent px-2 py-1 text-[11px] font-bold ${
                              tool.active
                                ? 'bg-emerald-500/10 text-emerald-400'
                                : 'bg-rose-500/10 text-rose-400'
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
          </section>
        ) : null}

        {tab === 'analytics' ? (
          <section className="space-y-6">
            <div>
              <h1 className="text-3xl font-black text-white">Per-tool usage</h1>
              <p className="mt-1 text-sm text-slate-400">Each catalog tool is listed. Execution counts stay at zero until a usage log exists.</p>
            </div>
            <ChartCard title="Catalog tools">
              <BarChart data={TEACHER_TOOLS_CATALOG.map((tool) => ({ name: tool.title.split(' ')[0], requests: 0 }))}>
                <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                <XAxis dataKey="name" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis stroke="#94a3b8" allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="requests" name="Requests" fill="#a855f7" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ChartCard>
          </section>
        ) : null}

        {tab === 'feedback' ? (
          <section className="space-y-4">
            <h1 className="text-3xl font-black text-white">User product feedback</h1>
            {feedback.length === 0 ? (
              <p className="text-sm text-slate-400">No tool ratings are stored yet. Written comments are not collected.</p>
            ) : (
              feedback.map((row) => (
                <article key={row.id} className="space-y-2 rounded-2xl border border-slate-800/80 bg-[#0c1220] p-6">
                  <div className="flex justify-between gap-3 text-sm">
                    <span className="font-bold text-white">{row.email}</span>
                    <span className="text-slate-500">{new Date(row.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm text-slate-300">{row.text ?? 'Rating only. No written comment was stored.'}</p>
                  <p className="text-sm font-bold text-amber-400">{row.rating} · {planLabel(row.planType)}</p>
                </article>
              ))
            )}
          </section>
        ) : null}
      </main>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <form onSubmit={stageTool} className="w-full max-w-lg space-y-4 rounded-3xl border border-slate-800 bg-[#0c1220] p-8">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">Implement new AI tool</h3>
              <button type="button" onClick={() => setOpen(false)} className="cursor-pointer appearance-none border-0 bg-transparent text-slate-400">
                Close
              </button>
            </div>
            <Field label="Tool name" value={draft.title} onChange={(title) => setDraft({ ...draft, title })} />
            <Field label="Slug" value={draft.slug} onChange={(slug) => setDraft({ ...draft, slug })} />
            <Field label="Description" value={draft.description} onChange={(description) => setDraft({ ...draft, description })} />
            <label className="block text-xs font-bold uppercase text-slate-400">
              Minimum plan
              <select
                value={draft.requiredPlan}
                onChange={(event) => setDraft({ ...draft, requiredPlan: event.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-800 bg-[#070a12] px-4 py-3 text-sm text-white"
                style={{ backgroundColor: '#070a12' }}
              >
                <option value="free">Free</option>
                <option value="teacher_pro">Teacher Pro</option>
                <option value="center_pro">Center Pro</option>
              </select>
            </label>
            <label className="block text-xs font-bold uppercase text-slate-400">
              System prompt
              <textarea
                value={draft.prompt}
                onChange={(event) => setDraft({ ...draft, prompt: event.target.value })}
                rows={3}
                className="mt-1 w-full resize-none rounded-xl border border-slate-800 bg-[#070a12] px-4 py-3 text-sm text-white"
                style={{ backgroundColor: '#070a12', color: '#fff' }}
              />
            </label>
            <button type="submit" className="w-full cursor-pointer appearance-none rounded-xl border border-transparent bg-cyan-400 py-3.5 text-sm font-extrabold text-slate-950">
              Stage tool
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  note,
}: {
  icon: typeof DollarSign;
  label: string;
  value: string;
  note: string;
}) {
  return (
    <article className="space-y-2 rounded-2xl border border-slate-800/80 bg-[#0c1220] p-6">
      <div className="flex items-center justify-between text-xs font-bold uppercase text-slate-400">
        <span>{label}</span>
        <Icon className="h-4 w-4 text-cyan-400" />
      </div>
      <p className="text-3xl font-black text-white">{value}</p>
      <p className="text-xs text-slate-400">{note}</p>
    </article>
  );
}

function Tier({ label, count, price }: { label: string; count: number; price?: string }) {
  return (
    <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-5">
      <p className="text-xs font-extrabold uppercase text-cyan-300">{label}</p>
      <p className="text-2xl font-black text-white">{count.toLocaleString()} accounts</p>
      {price ? <p className="text-xs text-slate-300">{price}</p> : null}
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: ReactElement }) {
  return (
    <section className="rounded-2xl border border-slate-800/80 bg-[#0c1220] p-6">
      <h3 className="mb-4 text-lg font-bold text-white">{title}</h3>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block text-xs font-bold uppercase text-slate-400">
      {label}
      <input
        required={label !== 'Description'}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-xl border border-slate-800 bg-[#070a12] px-4 py-3 text-sm text-white"
        style={{ backgroundColor: '#070a12', color: '#fff' }}
      />
    </label>
  );
}
