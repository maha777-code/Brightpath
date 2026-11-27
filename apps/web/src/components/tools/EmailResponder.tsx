import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Bookmark, ChevronDown, Copy, Download, History, Languages, Loader2, Mic, Plus, Printer, Share2, Sparkles, Star, ThumbsDown, ThumbsUp, Volume2, ArrowUp } from 'lucide-react';
import type { EmailResponderRequest } from '@brightpath/shared';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useDisplayUser } from '@/lib/displayUser';
import { AddFileMenu } from '@/components/tools/AddFileMenu';
import { ToolErrorRetry } from '@/components/tools/ToolErrorRetry';
import { toolBreadcrumbCategory } from '@/components/tools/ToolBreadcrumb';
import { VoiceListeningIndicator } from '@/components/VoiceListeningIndicator';
import {
  TOOL_ACCENT_BUTTON,
  TOOL_BREADCRUMB,
  TOOL_BREADCRUMB_LINK,
  TOOL_CARD,
  TOOL_FIELD,
  TOOL_GENERATE,
  TOOL_ICON_BUTTON,
  TOOL_LABEL,
  TOOL_MIC,
  TOOL_MUTED,
  TOOL_PAGE,
  TOOL_PANEL,
  TOOL_SECONDARY,
  TOOL_SECTION_TITLE,
  TOOL_SUBTITLE,
  TOOL_TEXTAREA,
  TOOL_TEXTAREA_SHORT,
  TOOL_TITLE,
} from '@/components/tools/toolTheme';

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

function iconClass(active = false) {
  return active ? 'mv-pres-accent h-4 w-4' : 'h-4 w-4';
}

function FieldToolbar({ words, onFiles }: { words: number; onFiles: (files: FileList | null) => void }) {
  const over = words > WORD_LIMIT;
  return (
    <div className="mt-3 flex items-center justify-between gap-3 text-xs">
      <AddFileMenu multiple={false} onFiles={onFiles} />
      <span className={over ? 'text-rose-300' : TOOL_MUTED}>
        Total file word count: {words.toLocaleString()}/{WORD_LIMIT.toLocaleString()}
      </span>
    </div>
  );
}

function EmailBreadcrumb({ detail, onTool }: { detail?: string; onTool?: () => void }) {
  const { role } = useAuth();
  const { pathname } = useLocation();
  const category = toolBreadcrumbCategory(role, pathname);
  return (
    <nav className={`${TOOL_BREADCRUMB} flex-wrap`} aria-label="Breadcrumb">
      <Link to={category.href} className={TOOL_BREADCRUMB_LINK}>
        {category.label}
      </Link>
      <span className={TOOL_MUTED}>›</span>
      {detail ? (
        <button type="button" onClick={onTool} className="mv-pres-accent text-sm">
          Email Responder
        </button>
      ) : (
        <span>Email Responder</span>
      )}
      {detail ? (
        <>
          <span className={TOOL_MUTED}>›</span>
          <span>{detail}</span>
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
  const [failed, setFailed] = useState<{ message: string; instruction?: string } | null>(null);

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
    setFailed(null);
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
    setFailed(null);
    let emailText = '';
    let suggestions = DEFAULT_SUGGESTIONS;
    try {
      const result = await api.generateEmailResponse(body);
      emailText = result.email;
      if (result.suggestions?.length) suggestions = result.suggestions.slice(0, 2);
    } catch (e) {
      setFailed({
        message: e instanceof Error ? e.message : 'Could not write this email. Please try again.',
        instruction: revising ? followInstruction : undefined,
      });
      return;
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
      className={TOOL_ICON_BUTTON}
      aria-label={favorited ? 'Remove from favorites' : 'Add to favorites'}
      aria-pressed={favorited}
      onClick={toggleFavorite}
    >
      <Star className={`h-5 w-5 ${favorited ? 'fill-amber-300 text-amber-300' : TOOL_MUTED}`} />
    </button>
  );

  const grouped = BUCKETS.map((bucket) => ({
    bucket,
    items: history.filter((item) => historyBucket(item.createdAt) === bucket),
  })).filter((group) => group.items.length > 0);

  const historyPanel = (
    <aside className={`${TOOL_CARD} mt-6`}>
      <h2 className={TOOL_SECTION_TITLE}>Recent History</h2>
      <div className="mt-3 max-h-[70vh] overflow-y-auto">
        {grouped.length === 0 ? <p className={`${TOOL_MUTED} text-sm`}>No emails yet.</p> : null}
        {grouped.map((group) => (
          <section key={group.bucket} className="mb-4">
            <h3 className={`${TOOL_MUTED} px-2 pb-1 text-xs font-semibold`}>{group.bucket}</h3>
            <ul>
              {group.items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setActive(item);
                      setFailed(null);
                      setShowPrompt(false);
                    }}
                    className={`block w-full rounded-lg px-2 py-1.5 text-left text-sm ${
                      item.id === active?.id ? 'mv-pres-accent font-semibold' : TOOL_MUTED
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
      <button type="button" className={TOOL_SECONDARY} aria-label="Share email" onClick={() => void shareEmail()}>
        <Share2 className="h-4 w-4" />
      </button>
      <button type="button" className={TOOL_SECONDARY} aria-label="New email" onClick={startNew}>
        <Plus className="h-4 w-4" />
      </button>
      <button
        type="button"
        className={TOOL_SECONDARY}
        aria-label="History"
        aria-pressed={historyOpen}
        onClick={() => setHistoryOpen((open) => !open)}
      >
        <History className={iconClass(historyOpen)} />
      </button>
    </div>
  );

  const followUpComposer = (
    <form
      className="mt-6 w-full"
      onSubmit={(event) => {
        event.preventDefault();
        if (!followUp.trim() || busy) return;
        void draftEmail(followUp);
      }}
    >
      <div className="relative">
        <textarea
          value={followUp}
          onChange={(event) => setFollowUp(event.target.value)}
          placeholder="Continue the conversation..."
          className={`${TOOL_TEXTAREA_SHORT} pr-14`}
        />
        <button type="button" className={TOOL_MIC} aria-label="Dictate a follow-up" aria-pressed={followDictation.listening} onClick={followDictation.toggle}>
          <Mic className={`h-4 w-4 ${followDictation.listening ? 'text-violet-300' : ''}`} />
        </button>
        <button
          type="submit"
          disabled={!followUp.trim() || busy}
          className="mv-pres-generate absolute bottom-3 right-3 inline-flex h-8 w-8 items-center justify-center rounded-lg disabled:opacity-50"
          aria-label="Send follow-up"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
        </button>
      </div>
      {followDictation.listening ? <VoiceListeningIndicator className="mt-3" isListening onStopListening={followDictation.toggle} /> : null}
    </form>
  );

  if (active) {
    return (
      <div className={TOOL_PAGE}>
        {embedded ? null : <EmailBreadcrumb detail={active.title} onTool={startNew} />}
        <div className={TOOL_CARD}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <h1 className={TOOL_TITLE}>
              Email Responder
              {star}
            </h1>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setShowPrompt((open) => !open)}
                className={TOOL_ACCENT_BUTTON}
                aria-expanded={showPrompt}
              >
                {showPrompt ? 'Hide prompt' : 'Show prompt'}
                <ChevronDown className={`h-4 w-4 transition-transform ${showPrompt ? 'rotate-180' : ''}`} />
              </button>
              {pageTools}
            </div>
          </div>

          {showPrompt ? (
            <div className={`${TOOL_PANEL} mt-6 space-y-3 text-sm`}>
              <p><span className={TOOL_MUTED}>Author Name: </span>{active.authorName || 'Not set'}</p>
              <p className="whitespace-pre-wrap"><span className={TOOL_MUTED}>Email you're responding to: </span>{active.incomingEmail}</p>
              <p className="whitespace-pre-wrap"><span className={TOOL_MUTED}>What you want to communicate in response: </span>{active.responseIntent}</p>
            </div>
          ) : null}

          <section className={`${TOOL_PANEL} mt-6 p-5`}>
            {active.exemplar ? (
              <span className="mv-pres-accent mb-4 inline-flex items-center gap-1.5 rounded-md bg-violet-500/15 px-2 py-1 text-xs font-semibold">
                <Sparkles className="h-3.5 w-3.5" />
                Exemplar
              </span>
            ) : null}
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{active.email}</pre>
            <div className="mt-5 flex items-center justify-between gap-2 border-t border-slate-500/20 pt-3">
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={copyEmail} className={TOOL_SECONDARY} aria-label={copied ? 'Copied' : 'Copy email'}>
                  <Copy className={iconClass(copied)} />
                </button>
                <button type="button" onClick={downloadEmail} className={TOOL_SECONDARY} aria-label="Download email as text">
                  <Download className="h-4 w-4" />
                </button>
                <button type="button" onClick={printEmail} className={TOOL_SECONDARY} aria-label="Print email">
                  <Printer className="h-4 w-4" />
                </button>
                <div className="relative">
                  <button type="button" onClick={() => setTranslateOpen((open) => !open)} className={TOOL_SECONDARY} aria-label="Translate email" aria-expanded={translateOpen}>
                    <Languages className={iconClass(translateOpen)} />
                  </button>
                  {translateOpen ? (
                    <div className="mv-pres-card absolute bottom-10 left-0 z-20 min-w-36 rounded-xl border p-1 shadow-xl">
                      {TRANSLATE_LANGUAGES.map((language) => (
                        <button
                          key={language}
                          type="button"
                          className={`${TOOL_MUTED} block w-full rounded-lg px-3 py-1.5 text-left text-sm`}
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
                <button type="button" onClick={readAloud} className={TOOL_SECONDARY} aria-label={speaking ? 'Stop reading' : 'Read email aloud'}>
                  <Volume2 className={iconClass(speaking)} />
                </button>
                <button type="button" onClick={saveEmail} className={TOOL_SECONDARY} aria-label="Save email" aria-pressed={Boolean(active.saved)}>
                  <Bookmark className={iconClass(Boolean(active.saved))} fill={active.saved ? 'currentColor' : 'none'} />
                </button>
                {copied ? <span className={`${TOOL_MUTED} ml-1 text-xs font-semibold`}>Copied</span> : null}
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => rateEmail('up')} className={TOOL_SECONDARY} aria-label="Helpful" aria-pressed={active.feedback === 'up'}>
                  <ThumbsUp className={iconClass(active.feedback === 'up')} />
                </button>
                <button type="button" onClick={() => rateEmail('down')} className={TOOL_SECONDARY} aria-label="Needs improvement" aria-pressed={active.feedback === 'down'}>
                  <ThumbsDown className={iconClass(active.feedback === 'down')} />
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
                className="mv-pres-field rounded-xl px-4 py-3 text-left text-sm disabled:cursor-wait disabled:opacity-60"
              >
                {suggestion}
              </button>
            ))}
          </div>

          {failed ? <ToolErrorRetry className="mt-6" message={failed.message} busy={busy} onRetry={() => void draftEmail(failed.instruction)} /> : null}
          {followUpComposer}
          <p className={`${TOOL_MUTED} mt-3 text-center text-xs`}>Review AI output for accuracy. Follow school policies.</p>
          {notice ? <p className={`${TOOL_MUTED} mt-2 text-center text-xs font-semibold`}>{notice}</p> : null}
        </div>

        {historyOpen ? historyPanel : null}
      </div>
    );
  }

  return (
    <div className={TOOL_PAGE}>
      {embedded ? null : <EmailBreadcrumb />}
      <div className={TOOL_CARD}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className={TOOL_TITLE}>
              Email Responder
              {star}
            </h1>
            <p className={TOOL_SUBTITLE}>Generate a custom professional email in response to an email that you received.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className={TOOL_ACCENT_BUTTON} onClick={showExemplar}>
              {exemplarOn ? 'Exemplar loaded' : 'Show exemplar'}
            </button>
            {pageTools}
          </div>
        </div>

        <label className={`${TOOL_LABEL} mt-6`} htmlFor="email-responder-author">Author Name:</label>
        <div className="relative">
          <input
            id="email-responder-author"
            value={authorName}
            onChange={(event) => setAuthorName(event.target.value)}
            placeholder="Jane Smith"
            className={`${TOOL_FIELD} pr-10`}
          />
          <button
            type="button"
            className={`${TOOL_MUTED} absolute bottom-0 right-3 top-2 flex items-center`}
            aria-label={authorDictation.listening ? 'Stop recording' : 'Dictate author name'}
            title={authorDictation.listening ? 'Stop recording' : 'Start voice input'}
            onClick={authorDictation.toggle}
          >
            <Mic className={`h-4 w-4 ${authorDictation.listening ? 'text-violet-300' : ''}`} />
          </button>
        </div>
        {authorDictation.listening ? <VoiceListeningIndicator className="mt-2" isListening onStopListening={authorDictation.toggle} /> : null}

        <label className={TOOL_LABEL} htmlFor="email-responder-incoming">Email you're responding to: *</label>
        <div className="relative">
          <textarea
            id="email-responder-incoming"
            value={incomingEmail}
            onChange={(event) => {
              setIncomingEmail(event.target.value);
              setExemplarOn(false);
            }}
            placeholder="Paste the email you're responding to here"
            className={TOOL_TEXTAREA}
          />
          <button
            type="button"
            className={TOOL_MIC}
            aria-label={incomingDictation.listening ? 'Stop recording' : 'Dictate the email you received'}
            onClick={incomingDictation.toggle}
          >
            <Mic className={`h-4 w-4 ${incomingDictation.listening ? 'text-violet-300' : ''}`} />
          </button>
        </div>
        {incomingDictation.listening ? <VoiceListeningIndicator className="mt-2" isListening onStopListening={incomingDictation.toggle} /> : null}
        {incomingFiles.length > 0 ? (
          <ul className="mt-3 flex flex-wrap gap-2">
            {incomingFiles.map((name) => (
              <li key={name} className="mv-pres-field inline-flex items-center rounded-full px-3 py-1 text-xs">{name}</li>
            ))}
          </ul>
        ) : null}
        <FieldToolbar
          words={incomingWords}
          onFiles={(files) => setIncomingFiles((current) => [...current, ...Array.from(files ?? []).map((file) => file.name)])}
        />

        <label className={TOOL_LABEL} htmlFor="email-responder-intent">What you want to communicate in response: *</label>
        <div className="relative">
          <textarea
            id="email-responder-intent"
            value={responseIntent}
            onChange={(event) => {
              setResponseIntent(event.target.value);
              setExemplarOn(false);
            }}
            placeholder={INTENT_PLACEHOLDER}
            className={TOOL_TEXTAREA}
          />
          <button
            type="button"
            className={TOOL_MIC}
            aria-label={intentDictation.listening ? 'Stop recording' : 'Dictate your response'}
            onClick={intentDictation.toggle}
          >
            <Mic className={`h-4 w-4 ${intentDictation.listening ? 'text-violet-300' : ''}`} />
          </button>
        </div>
        {intentDictation.listening ? <VoiceListeningIndicator className="mt-2" isListening onStopListening={intentDictation.toggle} /> : null}
        {intentFiles.length > 0 ? (
          <ul className="mt-3 flex flex-wrap gap-2">
            {intentFiles.map((name) => (
              <li key={name} className="mv-pres-field inline-flex items-center rounded-full px-3 py-1 text-xs">{name}</li>
            ))}
          </ul>
        ) : null}
        <FieldToolbar
          words={intentWords}
          onFiles={(files) => setIntentFiles((current) => [...current, ...Array.from(files ?? []).map((file) => file.name)])}
        />

        <button type="button" disabled={!canGenerate} className={TOOL_GENERATE} onClick={() => void generate()}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {busy ? 'Generating...' : 'Generate'}
        </button>
        {failed ? <ToolErrorRetry className="mt-6" message={failed.message} busy={busy} onRetry={() => void draftEmail()} /> : null}
        {notice ? <p className={`${TOOL_MUTED} mt-3 text-center text-xs font-semibold`}>{notice}</p> : null}
      </div>
      {historyOpen ? historyPanel : null}
    </div>
  );
}
