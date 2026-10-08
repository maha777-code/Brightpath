import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown, ChevronRight, Copy, Download, Loader2, Mic, Printer, Sparkles, Star } from 'lucide-react';
import { fallbackEmailResponse, type EmailResponderRequest } from '@brightpath/shared';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useDisplayUser } from '@/lib/displayUser';
import { AddFileMenu } from '@/components/tools/AddFileMenu';
import { toolBreadcrumbCategory } from '@/components/tools/ToolBreadcrumb';
import { VoiceListeningIndicator, voiceMicButtonClass } from '@/components/VoiceListeningIndicator';

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
    return Array.isArray(parsed) ? parsed.filter((item) => item?.id && item.email) : [];
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
  };

  const generate = async () => {
    if (!canGenerate) return;
    const body: EmailResponderRequest = {
      authorName: authorName.trim() || undefined,
      incomingEmail: incomingEmail.trim(),
      responseIntent: responseIntent.trim(),
      attachments: [...incomingFiles, ...intentFiles],
    };
    setBusy(true);
    let emailText = '';
    try {
      const result = await api.generateEmailResponse(body);
      emailText = result.email;
    } catch {
      emailText = fallbackEmailResponse(body).email;
    } finally {
      setBusy(false);
    }
    const record: SavedGeneration = {
      id: crypto.randomUUID(),
      title: emailTitle(emailText),
      createdAt: new Date().toISOString(),
      authorName: authorName.trim(),
      incomingEmail: body.incomingEmail,
      responseIntent: body.responseIntent,
      attachments: body.attachments ?? [],
      email: emailText,
      exemplar: exemplarOn,
    };
    const next = [record, ...loadHistory(userId)].slice(0, HISTORY_LIMIT);
    saveHistory(userId, next);
    setHistory(next);
    setActive(record);
    setShowPrompt(false);
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
    const popup = window.open('', '_blank', 'noopener,noreferrer');
    if (!popup) return;
    popup.document.write(`<pre style="font-family:Segoe UI,sans-serif;white-space:pre-wrap">${escapeHtml(active.email)}</pre>`);
    popup.document.close();
    popup.focus();
    popup.print();
  };

  const star = (
    <button
      type="button"
      className={`cursor-pointer appearance-none border-0 bg-transparent p-0 ${favorited ? 'text-amber-400' : 'text-slate-500 hover:text-amber-400'}`}
      aria-label={favorited ? 'Remove from favorites' : 'Add to favorites'}
      aria-pressed={favorited}
      onClick={toggleFavorite}
    >
      <Star className="h-5 w-5" fill={favorited ? 'currentColor' : 'none'} />
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

  if (active) {
    return (
      <div className="flex w-full flex-col gap-6 pb-10 text-slate-100 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1">
          {embedded ? null : <EmailBreadcrumb detail={active.title} onTool={startNew} />}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-[#121826] px-4 py-3">
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-white">Email Responder</h1>
              {star}
            </div>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={startNew}
                className="cursor-pointer appearance-none border-0 bg-transparent text-sm font-semibold text-slate-400 hover:text-cyan-300"
              >
                New
              </button>
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
            <div className="mt-5 flex items-center gap-1 border-t border-slate-800 pt-3">
              <button type="button" onClick={copyEmail} className="cursor-pointer appearance-none rounded-lg border-0 bg-transparent p-2 text-slate-400 hover:bg-slate-800 hover:text-white" aria-label={copied ? 'Copied' : 'Copy email'}>
                <Copy className="h-4 w-4" />
              </button>
              <button type="button" onClick={downloadEmail} className="cursor-pointer appearance-none rounded-lg border-0 bg-transparent p-2 text-slate-400 hover:bg-slate-800 hover:text-white" aria-label="Download email as text">
                <Download className="h-4 w-4" />
              </button>
              <button type="button" onClick={printEmail} className="cursor-pointer appearance-none rounded-lg border-0 bg-transparent p-2 text-slate-400 hover:bg-slate-800 hover:text-white" aria-label="Print email">
                <Printer className="h-4 w-4" />
              </button>
              {copied ? <span className="ml-1 text-xs font-semibold text-emerald-300">Copied</span> : null}
            </div>
          </section>
        </div>

        {historyPanel}
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-6 pb-10 text-slate-100 lg:flex-row lg:items-start">
      <div className="flex min-w-0 flex-1 flex-col gap-5">
      {embedded ? null : <EmailBreadcrumb />}
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
            className={voiceMicButtonClass(authorDictation.listening, 'rounded-lg p-2')}
            aria-label={authorDictation.listening ? 'Stop recording' : 'Dictate author name'}
            title={authorDictation.listening ? 'Stop recording' : 'Start voice input'}
            onClick={authorDictation.toggle}
          >
            <Mic className="h-4 w-4" />
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
              className={`h-9 shrink-0 ${voiceMicButtonClass(incomingDictation.listening, 'rounded-lg p-2')}`}
              aria-label={incomingDictation.listening ? 'Stop recording' : 'Dictate the email you received'}
              onClick={incomingDictation.toggle}
            >
              <Mic className="h-4 w-4" />
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
              className={`h-9 shrink-0 ${voiceMicButtonClass(intentDictation.listening, 'rounded-lg p-2')}`}
              aria-label={intentDictation.listening ? 'Stop recording' : 'Dictate your response'}
              onClick={intentDictation.toggle}
            >
              <Mic className="h-4 w-4" />
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
      </div>
      {history.length > 0 ? historyPanel : null}
    </div>
  );
}
