import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Activity, AlertTriangle, Eye, Flag, Loader2, Mail, MessageSquareText, Radio, ShieldAlert, X } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { TutorText } from '@/components/roster/TutorText';
import {
  oversightApi,
  rosterApi,
  type OversightSession,
  type RosterClass,
  type SafetyAlert,
  type TutorMessage,
} from '@/lib/rosterApi';

const LIVE_POLL_MS = 4000;

const CATEGORY_LABEL: Record<SafetyAlert['category'], string> = {
  distress: 'Wellbeing concern',
  harm: 'Possible harm',
  inappropriate: 'Inappropriate content',
  academic_dishonesty: 'Academic honesty',
};

const SEVERITY_STYLE: Record<SafetyAlert['severity'], string> = {
  high: 'bg-rose-500/20 text-rose-200 border-rose-500/40',
  medium: 'bg-amber-500/20 text-amber-200 border-amber-500/40',
  low: 'bg-slate-500/20 text-slate-200 border-slate-500/40',
};

const FLAG_LABEL: Record<string, string> = {
  distress: 'wellbeing',
  harm: 'harm',
  inappropriate: 'inappropriate',
  academic_dishonesty: 'honesty',
};

const pill = (active: boolean) =>
  `rounded-full border px-3 py-1 text-sm font-semibold ${active ? 'border-cyan-400 bg-cyan-500/20 text-cyan-200' : 'border-slate-700 text-slate-300'}`;

function when(iso: string) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function TranscriptPanel({ sessionId, onClose }: { sessionId: string; onClose: () => void }) {
  const [session, setSession] = useState<OversightSession | null>(null);
  const [messages, setMessages] = useState<TutorMessage[]>([]);
  const [alerts, setAlerts] = useState<SafetyAlert[]>([]);
  const [error, setError] = useState('');
  const lastAt = useRef<string | undefined>(undefined);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    lastAt.current = undefined;
    setSession(null);
    setMessages([]);
    setError('');
    oversightApi
      .session(sessionId)
      .then((r) => {
        if (cancelled) return;
        setSession(r.session);
        setMessages(r.messages);
        setAlerts(r.alerts);
        lastAt.current = r.messages.at(-1)?.createdAt ?? r.session.startedAt;
      })
      .catch((err) => !cancelled && setError(err instanceof Error ? err.message : 'Could not open the transcript'));
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const isLive = session?.isLive ?? false;
  useEffect(() => {
    if (!isLive) return;
    const id = window.setInterval(() => {
      if (!lastAt.current) return;
      oversightApi
        .session(sessionId, lastAt.current)
        .then((r) => {
          setSession(r.session);
          setAlerts(r.alerts);
          if (r.messages.length) {
            setMessages((m) => [...m, ...r.messages.filter((x) => !m.some((y) => y.id === x.id))]);
            lastAt.current = r.messages.at(-1)!.createdAt;
          }
        })
        .catch(() => undefined);
    }, LIVE_POLL_MS);
    return () => window.clearInterval(id);
  }, [sessionId, isLive]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  return (
    <section className="flex max-h-[75vh] min-h-[420px] flex-col rounded-2xl border border-slate-800 bg-slate-900/70">
      <div className="flex items-start justify-between gap-3 border-b border-slate-800 px-5 py-3">
        <div className="min-w-0">
          {session ? (
            <>
              <p className="flex items-center gap-2 font-bold text-white">
                {session.title}
                {session.isLive ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-bold text-emerald-300">
                    <Radio className="h-3 w-3 animate-pulse" /> Live
                  </span>
                ) : null}
              </p>
              <p className="text-xs text-slate-400">
                {session.student.name || session.student.email}
                {session.className ? ` · ${session.className}` : ''} · started {when(session.startedAt)}
              </p>
              {session.summary ? <p className="mt-1 text-sm text-slate-300">{session.summary}</p> : null}
            </>
          ) : (
            <Loader2 className="h-5 w-5 animate-spin text-cyan-400" />
          )}
        </div>
        <button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:text-white" aria-label="Close transcript">
          <X className="h-5 w-5" />
        </button>
      </div>
      {alerts.filter((a) => a.status === 'open').length ? (
        <p className="flex items-center gap-2 border-b border-rose-500/30 bg-rose-950/30 px-5 py-2 text-sm font-semibold text-rose-200">
          <AlertTriangle className="h-4 w-4" /> {alerts.filter((a) => a.status === 'open').length} open safety alert(s) in this conversation
        </p>
      ) : null}
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
        {error ? <p className="text-sm font-semibold text-rose-300">{error}</p> : null}
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.sender === 'student' ? 'justify-end' : 'justify-start'}`}>
            <div className="max-w-[85%]">
              <div
                className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${m.sender === 'student' ? 'whitespace-pre-wrap' : ''} ${
                  m.flags.length
                    ? 'border border-rose-500/50 bg-rose-950/40 text-rose-50'
                    : m.sender === 'student'
                      ? 'bg-cyan-500/15 text-slate-100'
                      : 'border border-slate-800 bg-slate-950 text-slate-200'
                }`}
              >
                {m.sender === 'student' ? m.content : <TutorText text={m.content} />}
              </div>
              <p className={`mt-1 text-xs text-slate-500 ${m.sender === 'student' ? 'text-right' : ''}`}>
                {m.sender === 'student' ? 'Student' : 'Sharada'} · {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                {m.flags.length ? (
                  <span className="ml-2 font-semibold text-rose-300">Flagged: {m.flags.map((f) => FLAG_LABEL[f] ?? f).join(', ')}</span>
                ) : null}
              </p>
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </section>
  );
}

function AlertCard({ alert, onOpen, onStatus }: { alert: SafetyAlert; onOpen: () => void; onStatus: (s: SafetyAlert['status']) => void }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full border px-2.5 py-0.5 text-xs font-bold uppercase ${SEVERITY_STYLE[alert.severity]}`}>{alert.severity}</span>
        <span className="text-sm font-bold text-white">{CATEGORY_LABEL[alert.category]}</span>
        <span className="text-sm text-slate-400">
          · {alert.studentName}
          {alert.className ? ` · ${alert.className}` : ''} · {when(alert.createdAt)}
        </span>
        {alert.notifiedAt ? (
          <span className="inline-flex items-center gap-1 text-xs text-slate-400">
            <Mail className="h-3.5 w-3.5" /> emailed
          </span>
        ) : null}
        {alert.status !== 'open' ? <span className="text-xs font-semibold uppercase text-slate-500">{alert.status}</span> : null}
      </div>
      <p className="mt-2 text-sm text-slate-300">{alert.reason}</p>
      <blockquote className="mt-2 border-l-2 border-rose-500/50 pl-3 text-sm italic text-slate-200">“{alert.excerpt}”</blockquote>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={onOpen} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 px-3 py-1.5 text-sm font-semibold text-slate-200">
          <Eye className="h-4 w-4" /> Read conversation
        </button>
        {alert.status === 'open' ? (
          <>
            <button type="button" onClick={() => onStatus('reviewed')} className="rounded-xl bg-emerald-500/20 px-3 py-1.5 text-sm font-semibold text-emerald-200">
              Mark reviewed
            </button>
            <button type="button" onClick={() => onStatus('dismissed')} className="rounded-xl border border-slate-700 px-3 py-1.5 text-sm font-semibold text-slate-300">
              Dismiss
            </button>
          </>
        ) : (
          <button type="button" onClick={() => onStatus('open')} className="rounded-xl border border-slate-700 px-3 py-1.5 text-sm font-semibold text-slate-300">
            Reopen
          </button>
        )}
      </div>
    </div>
  );
}

export default function SharadaOversight() {
  const [params, setParams] = useSearchParams();
  const classId = params.get('classId') ?? '';
  const studentId = params.get('studentId') ?? '';
  const [tab, setTab] = useState<'alerts' | 'conversations'>(classId || studentId ? 'conversations' : 'alerts');
  const [summary, setSummary] = useState<Awaited<ReturnType<typeof oversightApi.summary>> | null>(null);
  const [classes, setClasses] = useState<RosterClass[]>([]);
  const [alerts, setAlerts] = useState<SafetyAlert[] | null>(null);
  const [alertStatus, setAlertStatus] = useState<SafetyAlert['status'] | 'all'>('open');
  const [sessions, setSessions] = useState<OversightSession[] | null>(null);
  const [flagged, setFlagged] = useState(false);
  const [live, setLive] = useState(false);
  const [openSessionId, setOpenSessionId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const setFilter = (key: 'classId' | 'studentId', value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  const loadSummary = useCallback(() => {
    oversightApi.summary().then(setSummary).catch(() => undefined);
  }, []);

  const loadAlerts = useCallback(() => {
    oversightApi
      .alerts(alertStatus === 'all' ? undefined : alertStatus)
      .then((r) => setAlerts(r.alerts))
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load alerts'));
  }, [alertStatus]);

  const loadSessions = useCallback(() => {
    oversightApi
      .sessions({ classId: classId || undefined, studentId: studentId || undefined, flagged, live })
      .then((r) => setSessions(r.sessions))
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load conversations'));
  }, [classId, studentId, flagged, live]);

  useEffect(() => {
    loadSummary();
    rosterApi
      .overview()
      .then((r) => setClasses(r.classes))
      .catch(() => undefined);
    const id = window.setInterval(loadSummary, 30_000);
    return () => window.clearInterval(id);
  }, [loadSummary]);

  useEffect(() => {
    if (tab === 'alerts') loadAlerts();
  }, [tab, loadAlerts]);

  useEffect(() => {
    if (tab !== 'conversations') return;
    loadSessions();
    const id = window.setInterval(loadSessions, 15_000);
    return () => window.clearInterval(id);
  }, [tab, loadSessions]);

  const updateAlert = async (alert: SafetyAlert, status: SafetyAlert['status']) => {
    try {
      await oversightApi.setAlertStatus(alert.id, status);
      loadAlerts();
      loadSummary();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update the alert');
    }
  };

  const cards = [
    { label: 'Chatting now', value: summary?.activeNow, icon: Activity, accent: 'text-emerald-300' },
    { label: 'Conversations this week', value: summary?.sessionsThisWeek, icon: MessageSquareText, accent: 'text-cyan-300' },
    { label: 'Open alerts', value: summary?.openAlerts, icon: Flag, accent: 'text-amber-300' },
    { label: 'High priority', value: summary?.highAlerts, icon: ShieldAlert, accent: 'text-rose-300' },
  ];
  const studentFilterName = studentId ? sessions?.find((s) => s.student.id === studentId)?.student : null;

  return (
    <DashboardLayout>
      <div className="mv-roster h-full overflow-y-auto px-4 py-6 md:px-8">
        <div className="mx-auto max-w-6xl space-y-6">
          <header>
            <p className="text-xs font-semibold uppercase tracking-wide text-cyan-300">Student safety</p>
            <h1 className="mt-1 flex items-center gap-2 text-3xl font-bold text-white">
              <Eye className="h-7 w-7 text-cyan-400" /> Sharada Oversight
            </h1>
            <p className="mt-1 max-w-3xl text-sm text-slate-400">
              Read your students' conversations with Sharada, follow a chat live, and act on safety alerts. Students see a
              notice that teachers and the school can read their chats. Every transcript you open is recorded in the audit log.
            </p>
          </header>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {cards.map((c) => (
              <div key={c.label} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                <c.icon className={`h-5 w-5 ${c.accent}`} />
                <p className="mt-2 text-3xl font-black text-white">{c.value ?? '—'}</p>
                <p className="text-sm text-slate-400">{c.label}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="button" className={pill(tab === 'alerts')} onClick={() => setTab('alerts')}>
              Safety alerts{summary?.openAlerts ? ` (${summary.openAlerts})` : ''}
            </button>
            <button type="button" className={pill(tab === 'conversations')} onClick={() => setTab('conversations')}>
              Conversations
            </button>
          </div>

          {error ? <p className="text-sm font-semibold text-rose-300">{error}</p> : null}

          {tab === 'alerts' ? (
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {(['open', 'reviewed', 'dismissed', 'all'] as const).map((s) => (
                    <button key={s} type="button" className={pill(alertStatus === s)} onClick={() => setAlertStatus(s)}>
                      {s[0].toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                </div>
                {alerts === null ? <Loader2 className="h-5 w-5 animate-spin text-cyan-400" /> : null}
                {alerts?.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-slate-700 px-4 py-8 text-center text-sm text-slate-400">
                    No {alertStatus === 'all' ? '' : alertStatus} alerts.
                  </p>
                ) : null}
                {alerts?.map((a) => (
                  <AlertCard key={a.id} alert={a} onOpen={() => setOpenSessionId(a.sessionId)} onStatus={(s) => void updateAlert(a, s)} />
                ))}
              </div>
              {openSessionId ? <TranscriptPanel sessionId={openSessionId} onClose={() => setOpenSessionId(null)} /> : null}
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={classId}
                    onChange={(e) => setFilter('classId', e.target.value)}
                    className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-100"
                    aria-label="Filter by class"
                  >
                    <option value="">All classes</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <button type="button" className={pill(live)} onClick={() => setLive((v) => !v)}>
                    Live now
                  </button>
                  <button type="button" className={pill(flagged)} onClick={() => setFlagged((v) => !v)}>
                    Flagged only
                  </button>
                  {studentId ? (
                    <button type="button" className={pill(true)} onClick={() => setFilter('studentId', '')}>
                      {studentFilterName?.name || studentFilterName?.email || 'One student'} ×
                    </button>
                  ) : null}
                </div>
                {sessions === null ? <Loader2 className="h-5 w-5 animate-spin text-cyan-400" /> : null}
                {sessions?.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-slate-700 px-4 py-8 text-center text-sm text-slate-400">
                    No conversations match. Students start chats from their dashboard once they've joined your class.{' '}
                    <Link to="/classes" className="font-semibold text-cyan-300">
                      Manage classes
                    </Link>
                  </p>
                ) : null}
                {sessions?.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setOpenSessionId(s.id)}
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      s.id === openSessionId ? 'border-cyan-400 bg-cyan-950/40' : 'border-slate-800 bg-slate-900/70 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-white">{s.title}</span>
                      {s.isLive ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-bold text-emerald-300">
                          <Radio className="h-3 w-3 animate-pulse" /> Live
                        </span>
                      ) : null}
                      {s.flagCount ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/20 px-2 py-0.5 text-xs font-bold text-rose-200">
                          <Flag className="h-3 w-3" /> {s.flagCount}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {s.student.name || s.student.email}
                      {s.className ? ` · ${s.className}` : ''} · {s.messageCount} messages · {when(s.lastMessageAt)}
                    </p>
                    {s.summary ? <p className="mt-1 line-clamp-2 text-sm text-slate-300">{s.summary}</p> : null}
                  </button>
                ))}
              </div>
              {openSessionId ? <TranscriptPanel sessionId={openSessionId} onClose={() => setOpenSessionId(null)} /> : null}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
