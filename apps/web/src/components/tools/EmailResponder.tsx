import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Bookmark, ChevronDown, ChevronRight, Copy, Download, History, Languages, Loader2, Mic, Plus, Printer, Share2, Sparkles, Star, ThumbsDown, ThumbsUp, Volume2, ArrowUp } from 'lucide-react';
import { fallbackEmailResponse, type EmailResponderRequest } from '@brightpath/shared';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useDisplayUser } from '@/lib/displayUser';
import { AddFileMenu } from '@/components/tools/AddFileMenu';
import { toolBreadcrumbCategory } from '@/components/tools/ToolBreadcrumb';
import { VoiceListeningIndicator } from '@/components/VoiceListeningIndicator';

const WORD_LIMIT = 75_000;
const HISTORY_LIMIT = 50;

const EXEMPLAR_EMAIL = `Subject: Science project check-in

Dear teacher,

I wanted to check in about the science project due Friday. My child understands the question, but is unsure which steps to finish and whether the materials at home are enough. Could we find a short time this week to talk it through?

Thank you,
A parent`;

const EXEMPLAR_INTENT =
  'Confirm a short meeting after school on Thursday, explain the remaining experiment steps in plain language, and offer to send a one-page checklist.';

const INTENT_PLACEHOLDER = 'i.e. that sounds great... let’s schedule some time... help me understand...';

const TRANSLATE_LANGUAGES = ['Hindi', 'Kannada', 'Spanish', 'French', 'Arabic', 'English'];

const DEFAULT_SUGGESTIONS = [
  'Make this email shorter and more casual while keeping it professional.',
  'Draft a follow-up email confirming the next step and what to discuss.',
];

type SpeechRec = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SavedGeneration = {
  id: string;
  title: string;
  createdAt: string;
  authorName: string;
  incomingEmail: string;
  responseIntent: string;
  attachments: string[];
  email: string;
  exemplar: boolean;
  suggestions: string[];
  feedback?: 'up' | 'down' | null;
  saved?: boolean;
};

type HistoryBucket = 'Today' | 'Yesterday' | 'Last 7 days' | 'Older';

const BUCKETS: HistoryBucket[] = ['Today', 'Yesterday', 'Last 7 days', 'Older'];

function wordCount(value: string): number {
  const trimmed = value.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

function useDictation(onAppend: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const recRef = useRef<SpeechRec | null>(null);

  const toggle = () => {
    if (listening) {
      recRef.current?.stop();
      setListening(false);
      return;
    }
    const Ctor =
      (window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec })
        .SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: new () => SpeechRec }).webkitSpeechRecognition;
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = 'en-US';
    rec.interimResults = false;
    rec.continuous = false;
    rec.onresult = (event) => {
      const text = event.results[0]?.[0]?.transcript?.trim();
      if (text) onAppend(text);
    };
    rec.onend = () => setListening(false);
    recRef.current = rec;
    rec.start();
    setListening(true);
  };

  return { listening, toggle };
}

function emailTitle(email: string): string {
  const subject = email.match(/^subject:\s*(.+)$/im)?.[1]?.trim();
  const line = subject || email.split('\n').map((part) => part.trim()).find(Boolean) || 'Email response';
  return line.slice(0, 80);
}

function historyKey(userId: string) {
  return `brightpath.email-responder.${userId}`;
}

function loadHistory(userId: string): SavedGeneration[] {
  try {
    const raw = localStorage.getItem(historyKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedGeneration[];
    return Array.isArray(parsed)
      ? parsed.filter((item) => item?.id && item.email).map((item) => ({ ...item, suggestions: item.suggestions?.length ? item.suggestions : DEFAULT_SUGGESTIONS }))
      : [];
  } catch {
    return [];
  }
}

function saveHistory(userId: string, items: SavedGeneration[]) {
  localStorage.setItem(historyKey(userId), JSON.stringify(items.slice(0, HISTORY_LIMIT)));
}

function historyBucket(iso: string): HistoryBucket {
  const date = new Date(iso);
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const diff = Math.round((start - day) / 86_400_000);
  if (diff <= 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7) return 'Last 7 days';
  return 'Older';
}

function escapeHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function prettyIconClass(active = false, tone: 'cyan' | 'amber' | 'emerald' | 'rose' = 'cyan') {
  const activeTone = {
    cyan: 'border-cyan-300/70 bg-cyan-500/20 text-cyan-100 shadow-[0_0_16px_rgba(34,211,238,0.35)]',
    amber: 'border-amber-300/70 bg-amber-500/20 text-amber-100 shadow-[0_0_16px_rgba(251,191,36,0.35)]',
    emerald: 'border-emerald-300/70 bg-emerald-500/20 text-emerald-100 shadow-[0_0_16px_rgba(52,211,153,0.35)]',
    rose: 'border-rose-300/70 bg-rose-500/20 text-rose-100 shadow-[0_0_16px_rgba(251,113,133,0.35)]',
  }[tone];
  return `inline-flex h-9 w-9 shrink-0 cursor-pointer appearance-none items-center justify-center rounded-full border transition-all duration-200 hover:-translate-y-0.5 ${
    active
      ? activeTone
      : 'border-slate-600/80 bg-slate-900/80 text-slate-200 shadow-sm hover:border-cyan-300/70 hover:bg-slate-800 hover:text-cyan-50 hover:shadow-[0_0_16px_rgba(34,211,238,0.28)]'
  }`;
}

function prettyMicClass(listening: boolean) {
  return listening
    ? 'inline-flex h-12 w-12 shrink-0 cursor-pointer appearance-none items-center justify-center rounded-full border border-rose-200/80 bg-gradient-to-br from-rose-400 to-fuchsia-600 text-white shadow-[0_0_24px_rgba(244,63,94,0.6)] ring-4 ring-rose-500/25 animate-pulse'
    : 'inline-flex h-12 w-12 shrink-0 cursor-pointer appearance-none items-center justify-center rounded-full border border-cyan-200/70 bg-gradient-to-br from-cyan-300 via-cyan-500 to-blue-600 text-white shadow-[0_0_22px_rgba(34,211,238,0.55)] ring-4 ring-cyan-400/20 transition-transform duration-200 hover:scale-105 hover:shadow-[0_0_28px_rgba(34,211,238,0.7)]';
}

function FieldToolbar({ words, onFiles }: { words: number; onFiles: (files: FileList | null) => void }) {
  const over = words > WORD_LIMIT;
  return (
    <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-800/80 pt-3">
      <AddFileMenu multiple={false} onFiles={onFiles} />
      <p className={over ? 'text-xs font-medium text-rose-400' : 'text-xs font-medium text-slate-500'}>
        Total file word count: {words.toLocaleString()}/{WORD_LIMIT.toLocaleString()}
      </p>
    </div>
  );
}

function EmailBreadcrumb({ detail, onTool }: { detail?: string; onTool?: () => void }) {
  const { role } = useAuth();
  const { pathname } = useLocation();
  const category = toolBreadcrumbCategory(role, pathname);
  return (
    <nav className="mb-5 flex flex-wrap items-center gap-1.5 text-sm text-slate-400" aria-label="Breadcrumb">
      <Link to={category.href} className="text-slate-300 no-underline hover:text-white">
        {category.label}
      </Link>
      <ChevronRight className="h-3.5 w-3.5 text-slate-600" />
      {detail ? (
        <button
          type="button"
          onClick={onTool}
          className="cursor-pointer appearance-none border-0 bg-transparent p-0 text-slate-300 hover:text-white"
        >
          Email Responder
        </button>
      ) : (
        <span className="font-medium text-slate-100">Email Responder</span>
      )}
      {detail ? (
        <>
          <ChevronRight className="h-3.5 w-3.5 text-slate-600" />
          <span className="font-medium text-slate-100">{detail}</span>
        </>
      ) : null}
    </nav>
  );
}

export function EmailResponder({ embedded = false }: { embedded?: boolean }) {
  const { user, teacher, parent } = useAuth();
  const userId = user?.id || teacher?.id || parent?.id || 'local';
  const { userName } = useDisplayUser();
  const signedInName = userName && userName !== 'Teacher User' ? userName : '';
  const [authorName, setAuthorName] = useState(signedInName);
  const [incomingEmail, setIncomingEmail] = useState('');
  const [responseIntent, setResponseIntent] = useState('');
  const [incomingFiles, setIncomingFiles] = useState<string[]>([]);
  const [intentFiles, setIntentFiles] = useState<string[]>([]);
  const [exemplarOn, setExemplarOn] = useState(false);
  const [favorited, setFavorited] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [translateOpen, setTranslateOpen] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [followUp, setFollowUp] = useState('');
  const [notice, setNotice] = useState('');
  const [history, setHistory] = useState<SavedGeneration[]>([]);
  const [active, setActive] = useState<SavedGeneration | null>(null);

  useEffect(() => {
    void api
      .teacherTools()
      .then((res) => setFavorited(res.favoriteIds.includes('family-email')))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    setHistory(loadHistory(userId));
  }, [userId]);

  const followDictation = useDictation((text) => setFollowUp((current) => (current ? `${current} ${text}` : text)));
  const incomingDictation = useDictation((text) => setIncomingEmail((current) => (current ? `${current} ${text}` : text)));
  const intentDictation = useDictation((text) => setResponseIntent((current) => (current ? `${current} ${text}` : text)));
  const authorDictation = useDictation((text) => setAuthorName((current) => (current ? `${current} ${text}` : text)));

  const incomingWords = wordCount(incomingEmail);
  const intentWords = wordCount(responseIntent);
  const overLimit = incomingWords > WORD_LIMIT || intentWords > WORD_LIMIT;
  const canGenerate = Boolean(incomingEmail.trim() && responseIntent.trim()) && !overLimit && !busy;

  const toggleFavorite = () => {
    setFavorited((value) => !value);
    void api.toggleTeacherToolFavorite('family-email').then((res) => setFavorited(res.favorited)).catch(() => undefined);
  };

  const showExemplar = () => {
    setIncomingEmail(EXEMPLAR_EMAIL);
    setResponseIntent(EXEMPLAR_INTENT);
    setExemplarOn(true);
  };

  const startNew = () => {
    setActive(null);
    setShowPrompt(false);
    setAuthorName(signedInName);
    setIncomingEmail('');
    setResponseIntent('');
    setIncomingFiles([]);
    setIntentFiles([]);
    setExemplarOn(false);
    setFollowUp('');
    setNotice('');
    setTranslateOpen(false);
    window.speechSynthesis?.cancel();
    setSpeaking(false);
  };

  const remember = (record: SavedGeneration) => {
    const next = [record, ...loadHistory(userId).filter((item) => item.id !== record.id)].slice(0, HISTORY_LIMIT);
    saveHistory(userId, next);
    setHistory(next);
    setActive(record);
  };

  const patchActive = (patch: Partial<SavedGeneration>) => {
    if (!active) return;
    const record = { ...active, ...patch };
    const next = loadHistory(userId).map((item) => (item.id === record.id ? record : item));
    saveHistory(userId, next);
    setHistory(next);
    setActive(record);
  };

  const showNotice = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 1800);
  };

  const draftEmail = async (followInstruction?: string) => {
    const revising = Boolean(followInstruction?.trim() && active);
    if (!revising && !canGenerate) return;
    const source = active;
    const body: EmailResponderRequest = {
      authorName: (revising ? source?.authorName : authorName)?.trim() || undefined,
      incomingEmail: (revising ? source?.incomingEmail : incomingEmail)?.trim() ?? '',
      responseIntent: revising
        ? `Revise the current draft.\n\nInstruction:\n${followInstruction!.trim()}\n\nCurrent draft:\n${source?.email ?? ''}\n\nOriginal intent:\n${source?.responseIntent ?? ''}`
        : responseIntent.trim(),
      attachments: revising ? source?.attachments : [...incomingFiles, ...intentFiles],
      followUp: followInstruction?.trim() || undefined,
      currentEmail: revising ? source?.email : undefined,
    };
    setBusy(true);
    let emailText = '';
    let suggestions = DEFAULT_SUGGESTIONS;
    try {
      const result = await api.generateEmailResponse(body);
      emailText = result.email;
      if (result.suggestions?.length) suggestions = result.suggestions.slice(0, 2);
    } catch {
      emailText = fallbackEmailResponse(body).email;
      suggestions = fallbackEmailResponse(body).suggestions;
    } finally {
      setBusy(false);
    }
    if (revising && source) {
      remember({
        ...source,
        title: emailTitle(emailText),
        email: emailText,
        suggestions,
        createdAt: new Date().toISOString(),
      });
      return;
    }
    remember({
      id: crypto.randomUUID(),
      title: emailTitle(emailText),
      createdAt: new Date().toISOString(),
      authorName: authorName.trim(),
      incomingEmail: body.incomingEmail,
      responseIntent: responseIntent.trim(),
      attachments: body.attachments ?? [],
      email: emailText,
      exemplar: exemplarOn,
      suggestions,
    });
    setShowPrompt(false);
    setFollowUp('');
  };

  const generate = () => {
    void draftEmail();
  };

  const copyEmail = () => {
    if (!active) return;
    void navigator.clipboard.writeText(active.email).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    });
  };

  const downloadEmail = () => {
    if (!active) return;
    const blob = new Blob([active.email], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${active.title.replace(/[^\w\s-]+/g, '').trim().replace(/\s+/g, '-').slice(0, 60) || 'email-response'}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const printEmail = () => {
    if (!active) return;
    const frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    frame.style.cssText = 'position:fixed;width:0;height:0;border:0;right:0;bottom:0';
    document.body.appendChild(frame);
    const doc = frame.contentDocument;
    const win = frame.contentWindow;
    if (!doc || !win) {
      frame.remove();
      return;
    }
    doc.open();
    doc.write(`<!DOCTYPE html><html><head><title>${escapeHtml(active.title)}</title></head><body><pre style="font-family:Segoe UI,sans-serif;white-space:pre-wrap;font-size:14px">${escapeHtml(active.email)}</pre></body></html>`);
    doc.close();
    win.focus();
    win.print();
    window.setTimeout(() => frame.remove(), 1000);
  };

  const shareEmail = async () => {
    const text = active?.email ?? '';
    if (!text) {
      showNotice('Generate an email before sharing.');
      return;
    }
    if (navigator.share) {
      try {
        await navigator.share({ title: active?.title || 'Email Responder', text });
        return;
      } catch {
        return;
      }
    }
    await navigator.clipboard.writeText(text);
    showNotice('Email copied to share.');
  };

  const readAloud = () => {
    if (!active || !('speechSynthesis' in window)) {
      showNotice('Read aloud is not available in this browser.');
      return;
    }
    if (speaking || window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(active.email);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  const saveEmail = () => {
    if (!active) return;
    patchActive({ saved: true });
    showNotice('Email saved.');
  };

  const rateEmail = (value: 'up' | 'down') => {
    if (!active) return;
    const next = active.feedback === value ? null : value;
    patchActive({ feedback: next });
    showNotice(next === 'up' ? 'Marked as helpful.' : next === 'down' ? 'Marked as needs improvement.' : 'Feedback cleared.');
  };

  const star = (
    <button
      type="button"
      className={prettyIconClass(favorited, 'amber')}
      aria-label={favorited ? 'Remove from favorites' : 'Add to favorites'}
      aria-pressed={favorited}
      onClick={toggleFavorite}
    >
      <Star className="h-4 w-4" fill={favorited ? 'currentColor' : 'none'} />
    </button>
  );

  const grouped = BUCKETS.map((bucket) => ({
    bucket,
    items: history.filter((item) => historyBucket(item.createdAt) === bucket),
  })).filter((group) => group.items.length > 0);

  const historyPanel = (
    <aside className="w-full shrink-0 rounded-2xl border border-slate-800 bg-[#0c111c] lg:w-72">
      <h2 className="border-b border-slate-800 px-4 py-3 text-sm font-bold text-white">Recent History</h2>
      <div className="max-h-[70vh] overflow-y-auto px-2 py-3">
        {grouped.length === 0 ? <p className="px-2 text-sm text-slate-500">No emails yet.</p> : null}
        {grouped.map((group) => (
          <section key={group.bucket} className="mb-4">
            <h3 className="px-2 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">{group.bucket}</h3>
            <ul>
              {group.items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setActive(item);
                      setShowPrompt(false);
                    }}
                    className={`w-full cursor-pointer appearance-none rounded-lg border-0 px-2 py-1.5 text-left text-sm ${
                      item.id === active?.id ? 'bg-violet-500/20 font-semibold text-violet-200' : 'bg-transparent text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {item.title}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </aside>
  );

  const pageTools = (
    <div className="flex items-center gap-2">
      <button type="button" className={prettyIconClass()} aria-label="Share email" onClick={() => void shareEmail()}>
        <Share2 className="h-4 w-4" />
      </button>
      <button type="button" className={prettyIconClass()} aria-label="New email" onClick={startNew}>
        <Plus className="h-4 w-4" />
      </button>
      <button
        type="button"
        className={prettyIconClass(historyOpen, 'cyan')}
        aria-label="History"
        aria-pressed={historyOpen}
        onClick={() => setHistoryOpen((open) => !open)}
      >
        <History className="h-4 w-4" />
      </button>
    </div>
  );

  const followUpComposer = (
    <form
      className="mx-auto w-full max-w-2xl rounded-3xl border border-cyan-400/30 bg-[#0b1220] p-3 shadow-[0_0_32px_rgba(34,211,238,0.14)]"
      onSubmit={(event) => {
        event.preventDefault();
        if (!followUp.trim() || busy) return;
        void draftEmail(followUp);
      }}
    >
      <div className="flex items-center gap-3">
        <button type="button" className={prettyMicClass(followDictation.listening)} aria-label="Dictate a follow-up" aria-pressed={followDictation.listening} onClick={followDictation.toggle}>
          <Mic className={`h-5 w-5 ${followDictation.listening ? 'animate-bounce' : ''}`} />
        </button>
        <textarea
          value={followUp}
          onChange={(event) => setFollowUp(event.target.value)}
          placeholder="Continue the conversation..."
          className="min-h-14 flex-1 resize-y border-0 bg-transparent px-1 py-2 text-sm text-white outline-none placeholder:text-slate-400"
        />
        <button
          type="submit"
          disabled={!followUp.trim() || busy}
          className="inline-flex h-12 w-12 shrink-0 cursor-pointer appearance-none items-center justify-center rounded-full border border-cyan-200/40 bg-gradient-to-br from-cyan-300 to-blue-600 text-white shadow-[0_0_18px_rgba(34,211,238,0.4)] transition-transform hover:scale-105 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
          aria-label="Send follow-up"
        >
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowUp className="h-5 w-5" />}
        </button>
      </div>
      {followDictation.listening ? <VoiceListeningIndicator className="mt-3" isListening onStopListening={followDictation.toggle} /> : null}
    </form>
  );

  if (active) {
    return (
      <div className="flex w-full flex-col gap-5 pb-8 text-slate-100">
        <div className="flex w-full flex-col gap-6 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1">
          {embedded ? null : <EmailBreadcrumb detail={active.title} onTool={startNew} />}
          <div className="mb-2 flex justify-end">{pageTools}</div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-[#121826] px-4 py-3">
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-white">Email Responder</h1>
              {star}
            </div>
            <button
              type="button"
              onClick={() => setShowPrompt((open) => !open)}
              className="inline-flex cursor-pointer appearance-none items-center gap-1.5 border-0 bg-transparent text-sm font-semibold text-slate-300 hover:text-white"
              aria-expanded={showPrompt}
            >
              {showPrompt ? 'Hide prompt' : 'Show prompt'}
              <ChevronDown className={`h-4 w-4 transition-transform ${showPrompt ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {showPrompt ? (
            <div className="mb-4 space-y-3 rounded-2xl border border-slate-800 bg-[#121826] p-4 text-sm text-slate-300">
              <p><span className="text-slate-500">Author Name: </span>{active.authorName || 'Not set'}</p>
              <p className="whitespace-pre-wrap"><span className="text-slate-500">Email you're responding to: </span>{active.incomingEmail}</p>
              <p className="whitespace-pre-wrap"><span className="text-slate-500">What you want to communicate in response: </span>{active.responseIntent}</p>
            </div>
          ) : null}

          <section className="rounded-2xl border border-slate-800 bg-[#121826] p-5">
            {active.exemplar ? (
              <span className="mb-4 inline-flex items-center gap-1.5 rounded-md bg-violet-500/15 px-2 py-1 text-xs font-bold text-violet-300">
                <Sparkles className="h-3.5 w-3.5" />
                Exemplar
              </span>
            ) : null}
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-100">{active.email}</pre>
            <div className="mt-5 flex items-center justify-between gap-2 border-t border-slate-800 pt-3">
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={copyEmail} className={prettyIconClass(copied, 'emerald')} aria-label={copied ? 'Copied' : 'Copy email'}>
                  <Copy className="h-4 w-4" />
                </button>
                <button type="button" onClick={downloadEmail} className={prettyIconClass()} aria-label="Download email as text">
                  <Download className="h-4 w-4" />
                </button>
                <button type="button" onClick={printEmail} className={prettyIconClass()} aria-label="Print email">
                  <Printer className="h-4 w-4" />
                </button>
                <div className="relative">
                  <button type="button" onClick={() => setTranslateOpen((open) => !open)} className={prettyIconClass(translateOpen, 'cyan')} aria-label="Translate email" aria-expanded={translateOpen}>
                    <Languages className="h-4 w-4" />
                  </button>
                  {translateOpen ? (
                    <div className="absolute bottom-10 left-0 z-20 min-w-36 rounded-xl border border-slate-700 bg-slate-900 p-1 shadow-xl">
                      {TRANSLATE_LANGUAGES.map((language) => (
                        <button
                          key={language}
                          type="button"
                          className="block w-full cursor-pointer appearance-none rounded-lg border-0 bg-transparent px-3 py-1.5 text-left text-sm text-slate-200 hover:bg-slate-800"
                          onClick={() => {
                            setTranslateOpen(false);
                            void draftEmail(`Translate this entire email into ${language}. Keep the Subject line and a professional tone.`);
                          }}
                        >
                          {language}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
                <button type="button" onClick={readAloud} className={prettyIconClass(speaking, 'cyan')} aria-label={speaking ? 'Stop reading' : 'Read email aloud'}>
                  <Volume2 className="h-4 w-4" />
                </button>
                <button type="button" onClick={saveEmail} className={prettyIconClass(Boolean(active.saved), 'amber')} aria-label="Save email" aria-pressed={Boolean(active.saved)}>
                  <Bookmark className="h-4 w-4" fill={active.saved ? 'currentColor' : 'none'} />
                </button>
                {copied ? <span className="ml-1 text-xs font-semibold text-emerald-300">Copied</span> : null}
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => rateEmail('up')} className={prettyIconClass(active.feedback === 'up', 'emerald')} aria-label="Helpful" aria-pressed={active.feedback === 'up'}>
                  <ThumbsUp className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => rateEmail('down')} className={prettyIconClass(active.feedback === 'down', 'rose')} aria-label="Needs improvement" aria-pressed={active.feedback === 'down'}>
                  <ThumbsDown className="h-4 w-4" />
                </button>
              </div>
            </div>
          </section>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {(active.suggestions.length ? active.suggestions : DEFAULT_SUGGESTIONS).slice(0, 2).map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                disabled={busy}
                onClick={() => void draftEmail(suggestion)}
                className="cursor-pointer appearance-none rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-left text-sm font-medium text-slate-200 hover:border-slate-500 disabled:cursor-wait disabled:opacity-60"
              >
                {suggestion}
              </button>
            ))}
          </div>

        </div>

        {historyOpen ? historyPanel : null}
        </div>
        {followUpComposer}
        <p className="text-center text-xs text-slate-500">Review AI output for accuracy. Follow school policies.</p>
        {notice ? <p className="text-center text-xs font-semibold text-emerald-300">{notice}</p> : null}
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-6 pb-10 text-slate-100 lg:flex-row lg:items-start">
      <div className="min-w-0 flex-1">
      {embedded ? null : <EmailBreadcrumb />}
      <div className="mb-3 flex justify-end">{pageTools}</div>
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-white">Email Responder</h1>
            {star}
          </div>
          <p className="mt-1 text-sm text-slate-400">Generate a custom professional email in response to an email that you received.</p>
        </div>
        <button
          type="button"
          className="cursor-pointer appearance-none border-0 bg-transparent px-1 py-1 text-sm font-semibold text-violet-300 hover:text-violet-200"
          onClick={showExemplar}
        >
          {exemplarOn ? 'Exemplar loaded' : 'Show exemplar'}
        </button>
      </header>

      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold text-slate-200">Author Name:</span>
        <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-[#0b101d] px-3 py-2.5 focus-within:border-cyan-500/60">
          <button
            type="button"
            className={prettyMicClass(authorDictation.listening)}
            aria-label={authorDictation.listening ? 'Stop recording' : 'Dictate author name'}
            title={authorDictation.listening ? 'Stop recording' : 'Start voice input'}
            onClick={authorDictation.toggle}
          >
            <Mic className={`h-5 w-5 ${authorDictation.listening ? 'animate-bounce' : ''}`} />
          </button>
          <input
            value={authorName}
            onChange={(event) => setAuthorName(event.target.value)}
            placeholder="Jane Smith"
            className="w-full border-0 bg-transparent p-0 text-sm text-white outline-none placeholder:text-slate-500"
          />
        </div>
        {authorDictation.listening ? <VoiceListeningIndicator className="mt-2" isListening onStopListening={authorDictation.toggle} /> : null}
      </label>

      <div>
        <label className="mb-1.5 block text-sm font-semibold text-slate-200">
          Email you're responding to: <span className="text-rose-400">*</span>
        </label>
        <div className="rounded-xl border border-slate-800 bg-[#0b101d] p-4 focus-within:border-cyan-500/60">
          <div className="flex gap-2">
            <button
              type="button"
              className={prettyMicClass(incomingDictation.listening)}
              aria-label={incomingDictation.listening ? 'Stop recording' : 'Dictate the email you received'}
              onClick={incomingDictation.toggle}
            >
              <Mic className={`h-5 w-5 ${incomingDictation.listening ? 'animate-bounce' : ''}`} />
            </button>
            <textarea
              value={incomingEmail}
              onChange={(event) => {
                setIncomingEmail(event.target.value);
                setExemplarOn(false);
              }}
              placeholder="Paste the email you're responding to here"
              className="min-h-40 w-full resize-y border-0 bg-transparent p-0 text-sm leading-relaxed text-white outline-none placeholder:text-slate-500"
            />
          </div>
          {incomingDictation.listening ? <VoiceListeningIndicator className="mt-2" isListening onStopListening={incomingDictation.toggle} /> : null}
          {incomingFiles.length > 0 ? (
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {incomingFiles.map((name) => (
                <li key={name} className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs text-slate-100">{name}</li>
              ))}
            </ul>
          ) : null}
          <FieldToolbar
            words={incomingWords}
            onFiles={(files) => setIncomingFiles((current) => [...current, ...Array.from(files ?? []).map((file) => file.name)])}
          />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-semibold text-slate-200">
          What you want to communicate in response: <span className="text-rose-400">*</span>
        </label>
        <div className="rounded-xl border border-slate-800 bg-[#0b101d] p-4 focus-within:border-cyan-500/60">
          <div className="flex gap-2">
            <button
              type="button"
              className={prettyMicClass(intentDictation.listening)}
              aria-label={intentDictation.listening ? 'Stop recording' : 'Dictate your response'}
              onClick={intentDictation.toggle}
            >
              <Mic className={`h-5 w-5 ${intentDictation.listening ? 'animate-bounce' : ''}`} />
            </button>
            <textarea
              value={responseIntent}
              onChange={(event) => {
                setResponseIntent(event.target.value);
                setExemplarOn(false);
              }}
              placeholder={INTENT_PLACEHOLDER}
              className="min-h-40 w-full resize-y border-0 bg-transparent p-0 text-sm leading-relaxed text-white outline-none placeholder:text-slate-500"
            />
          </div>
          {intentDictation.listening ? <VoiceListeningIndicator className="mt-2" isListening onStopListening={intentDictation.toggle} /> : null}
          {intentFiles.length > 0 ? (
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {intentFiles.map((name) => (
                <li key={name} className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs text-slate-100">{name}</li>
              ))}
            </ul>
          ) : null}
          <FieldToolbar
            words={intentWords}
            onFiles={(files) => setIntentFiles((current) => [...current, ...Array.from(files ?? []).map((file) => file.name)])}
          />
        </div>
      </div>

      <button
        type="button"
        disabled={!canGenerate}
        className="flex w-full cursor-pointer appearance-none items-center justify-center gap-2 rounded-2xl border-0 bg-[#b092f6] py-3.5 font-bold text-slate-950 shadow-lg transition-all hover:bg-[#a080f4] disabled:cursor-not-allowed disabled:opacity-60"
        onClick={() => void generate()}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {busy ? 'Generating...' : 'Generate'}
      </button>
      {notice ? <p className="text-center text-xs font-semibold text-emerald-300">{notice}</p> : null}
      </div>
      </div>
      {historyOpen ? historyPanel : null}
    </div>
  );
}
