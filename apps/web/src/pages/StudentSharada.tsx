import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, Loader2, MessageSquarePlus, Send, Sparkles } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { sharadaStudentApi, type TutorMessage, type TutorSessionSummary } from '@/lib/rosterApi';
import { CYBER_FONT_STYLE } from '@/lib/theme';
import { TutorText } from '@/components/roster/TutorText';

type ClassOption = { id: string; name: string; subject: string | null };

const STARTERS = [
  'Help me understand photosynthesis step by step',
  'I keep getting fractions wrong. Can you quiz me?',
  'Explain Newton’s third law with an everyday example',
];

export default function StudentSharada() {
  const navigate = useNavigate();
  const location = useLocation();
  const { parent } = useAuth();
  const firstName = parent?.name?.split(' ')[0] ?? 'there';
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [classId, setClassId] = useState('');
  const [sessions, setSessions] = useState<TutorSessionSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<TutorMessage[]>([]);
  const [draft, setDraft] = useState(() => (location.state as { prompt?: string } | null)?.prompt?.trim() ?? '');
  const [sending, setSending] = useState(false);
  const [loadingSession, setLoadingSession] = useState(false);
  const [error, setError] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const active = sessions.find((s) => s.id === activeId) ?? null;

  useEffect(() => {
    sharadaStudentApi
      .context()
      .then((r) => {
        setClasses(r.classes);
        if (r.classes.length === 1) setClassId(r.classes[0].id);
      })
      .catch(() => undefined);
    sharadaStudentApi
      .sessions()
      .then((r) => setSessions(r.sessions))
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load your conversations'));
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const openSession = useCallback(async (id: string) => {
    setActiveId(id);
    setLoadingSession(true);
    setError('');
    try {
      const r = await sharadaStudentApi.session(id);
      setMessages(r.messages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open that conversation');
    } finally {
      setLoadingSession(false);
    }
  }, []);

  const startNew = () => {
    setActiveId(null);
    setMessages([]);
    setError('');
  };

  const send = async (raw: string) => {
    const text = raw.trim();
    if (!text || sending) return;
    setSending(true);
    setError('');
    const pending: TutorMessage = { id: `pending-${Date.now()}`, sender: 'student', content: text, flags: [], createdAt: new Date().toISOString() };
    setMessages((m) => [...m, pending]);
    setDraft('');
    try {
      let sessionId = activeId;
      if (!sessionId) {
        const created = await sharadaStudentApi.createSession(classId || null);
        sessionId = created.session.id;
        setActiveId(sessionId);
        setSessions((list) => [created.session, ...list]);
      }
      const r = await sharadaStudentApi.send(sessionId, text);
      setMessages((m) => [...m.filter((x) => x.id !== pending.id), r.studentMessage, r.sharadaMessage]);
      setSessions((list) => [r.session, ...list.filter((s) => s.id !== r.session.id)]);
    } catch (err) {
      setMessages((m) => m.filter((x) => x.id !== pending.id));
      setDraft(text);
      setError(err instanceof Error ? err.message : 'Sharada could not reply. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mv-roster flex min-h-dvh flex-col bg-[#040711] p-4 text-slate-100 sm:p-6" style={CYBER_FONT_STYLE}>
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800/80 bg-[#0b0e1a]/80 px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/student/dashboard')}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-3 py-1.5 text-sm font-semibold text-slate-300 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Dashboard
          </button>
          <h1 className="flex items-center gap-2 text-lg font-bold text-white">
            <Sparkles className="h-5 w-5 text-cyan-400" /> Sharada, your study tutor
          </h1>
        </div>
      </header>

      <div
        role="note"
        className="mb-4 flex items-start gap-3 rounded-2xl border border-amber-500/40 bg-amber-950/40 px-4 py-3 text-sm text-amber-100"
      >
        <Eye className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
        <p>
          <span className="font-bold">Your teacher and school can see your Sharada conversations.</span> They read them to
          help you learn. If something you write sounds like you might be unsafe or upset, Sharada lets them know so a
          trusted adult can check in.{' '}
          <Link to="/privacy#sharada-conversations" className="font-semibold text-amber-200 underline">
            Learn more
          </Link>
        </p>
      </div>

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="flex flex-col gap-3 rounded-2xl border border-slate-800/80 bg-[#0b0e1a] p-3">
          <button
            type="button"
            onClick={startNew}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-500 px-3 py-2 text-sm font-bold text-slate-950"
          >
            <MessageSquarePlus className="h-4 w-4" /> New conversation
          </button>
          {classes.length > 1 && !activeId ? (
            <label className="text-xs font-semibold text-slate-400">
              Which class is this for?
              <select
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-2 py-2 text-sm text-slate-100"
              >
                <option value="">General / not sure</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <div className="min-h-0 flex-1 space-y-1 overflow-y-auto">
            {sessions.length === 0 ? <p className="px-1 text-xs text-slate-500">Your conversations will appear here.</p> : null}
            {sessions.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => void openSession(s.id)}
                className={`w-full rounded-xl px-3 py-2 text-left text-sm ${s.id === activeId ? 'bg-cyan-950/50 text-cyan-200' : 'text-slate-300 hover:bg-slate-900'}`}
              >
                <span className="block truncate font-semibold">{s.title}</span>
                <span className="block truncate text-xs text-slate-500">
                  {[s.subject, s.topic].filter(Boolean).join(' · ') || new Date(s.lastMessageAt).toLocaleDateString()}
                </span>
              </button>
            ))}
          </div>
        </aside>

        <section className="flex min-h-[60vh] flex-col rounded-2xl border border-slate-800/80 bg-[#0b0e1a]">
          {active ? (
            <div className="border-b border-slate-800 px-5 py-3">
              <p className="font-bold text-white">{active.title}</p>
              {active.summary ? <p className="mt-0.5 text-xs text-slate-400">{active.summary}</p> : null}
            </div>
          ) : null}
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
            {loadingSession ? <Loader2 className="mx-auto h-6 w-6 animate-spin text-cyan-400" /> : null}
            {!loadingSession && messages.length === 0 ? (
              <div className="mx-auto max-w-lg py-10 text-center">
                <p className="text-xl font-bold text-white">Hi {firstName}, what are you studying today?</p>
                <p className="mt-2 text-sm text-slate-400">
                  Sharada guides you with hints and questions so you work it out yourself. It won't just hand over homework
                  answers.
                </p>
                <div className="mt-5 space-y-2">
                  {STARTERS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => void send(s)}
                      className="block w-full rounded-xl border border-slate-800 bg-[#101524] px-4 py-3 text-left text-sm text-slate-200 hover:border-cyan-500/40"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.sender === 'student' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    m.sender === 'student' ? 'whitespace-pre-wrap bg-cyan-500 text-slate-950' : 'border border-slate-800 bg-[#101524] text-slate-100'
                  }`}
                >
                  {m.sender === 'student' ? m.content : <TutorText text={m.content} />}
                </div>
              </div>
            ))}
            {sending ? (
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin" /> Sharada is thinking…
              </div>
            ) : null}
            <div ref={endRef} />
          </div>
          {error ? <p className="px-5 pb-2 text-sm font-semibold text-rose-300">{error}</p> : null}
          <form
            className="flex items-end gap-2 border-t border-slate-800 p-3"
            onSubmit={(e) => {
              e.preventDefault();
              void send(draft);
            }}
          >
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void send(draft);
                }
              }}
              rows={2}
              maxLength={4000}
              placeholder="Ask Sharada a question…"
              className="min-h-[48px] flex-1 resize-none rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500"
            />
            <button
              type="submit"
              disabled={sending || !draft.trim()}
              className="rounded-xl bg-cyan-500 p-3 text-slate-950 disabled:opacity-40"
              aria-label="Send"
            >
              <Send className="h-5 w-5" />
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
