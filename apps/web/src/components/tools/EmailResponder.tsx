import { useEffect, useRef, useState, type RefObject } from 'react';
import { ChevronDown, Copy, FilePlus, Loader2, Mic, RotateCcw, Sparkles, Star } from 'lucide-react';
import { fallbackEmailResponse, type EmailResponderRequest } from '@brightpath/shared';
import { api } from '@/lib/api';
import { useDisplayUser } from '@/lib/displayUser';

const WORD_LIMIT = 75_000;

const EXEMPLAR_EMAIL = `Subject: Science project check-in

Dear teacher,

I wanted to check in about the science project due Friday. My child understands the question, but is unsure which steps to finish and whether the materials at home are enough. Could we find a short time this week to talk it through?

Thank you,
A parent`;

const EXEMPLAR_INTENT =
  'Confirm a short meeting after school on Thursday, explain the remaining experiment steps in plain language, and offer to send a one-page checklist.';

type Snapshot = {
  authorName: string;
  incomingEmail: string;
  responseIntent: string;
};

type SpeechRec = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

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

function FieldToolbar({
  words,
  menuOpen,
  onToggleMenu,
  onUpload,
  inputRef,
  onFiles,
}: {
  words: number;
  menuOpen: boolean;
  onToggleMenu: () => void;
  onUpload: () => void;
  inputRef: RefObject<HTMLInputElement | null>;
  onFiles: (files: FileList | null) => void;
}) {
  const over = words > WORD_LIMIT;
  return (
    <div className="mt-2 flex items-center justify-between gap-3 border-t border-slate-800/80 pt-2">
      <div className="relative">
        <button
          type="button"
          className="flex cursor-pointer appearance-none items-center gap-1.5 rounded-lg border border-slate-700/60 bg-slate-800/60 px-3 py-1.5 text-xs font-bold text-slate-300 transition-all hover:bg-slate-800"
          onClick={onToggleMenu}
        >
          <FilePlus className="h-3.5 w-3.5" />
          <span>+ Add File</span>
          <ChevronDown className="h-3 w-3" />
        </button>
        {menuOpen ? (
          <div className="absolute bottom-9 left-0 z-10 w-48 overflow-hidden rounded-lg border border-slate-600 bg-slate-800 py-1 shadow-lg">
            <button
              type="button"
              className="block w-full cursor-pointer appearance-none border-0 bg-transparent px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-700"
              onClick={onUpload}
            >
              Upload PDF or document
            </button>
          </div>
        ) : null}
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.doc,.docx,.txt,.md,application/pdf"
          className="hidden"
          onChange={(event) => {
            onFiles(event.target.files);
            event.currentTarget.value = '';
          }}
        />
      </div>
      <p className={over ? 'text-xs font-medium text-rose-400' : 'text-[11px] font-medium text-slate-500'}>
        Total word limit: {words.toLocaleString()}/{WORD_LIMIT.toLocaleString()}
      </p>
    </div>
  );
}

export function EmailResponder() {
  const { userName } = useDisplayUser();
  const signedInName = userName && userName !== 'Teacher User' ? userName : '';
  const [authorName, setAuthorName] = useState(signedInName);
  const [incomingEmail, setIncomingEmail] = useState('');
  const [responseIntent, setResponseIntent] = useState('');
  const [incomingFiles, setIncomingFiles] = useState<string[]>([]);
  const [intentFiles, setIntentFiles] = useState<string[]>([]);
  const [history, setHistory] = useState<Snapshot[]>([]);
  const [exemplarOn, setExemplarOn] = useState(false);
  const [favorited, setFavorited] = useState(false);
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [incomingMenu, setIncomingMenu] = useState(false);
  const [intentMenu, setIntentMenu] = useState(false);
  const incomingFileRef = useRef<HTMLInputElement>(null);
  const intentFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void api
      .teacherTools()
      .then((res) => setFavorited(res.favoriteIds.includes('family-email')))
      .catch(() => undefined);
  }, []);

  const incomingDictation = useDictation((text) => setIncomingEmail((current) => (current ? `${current} ${text}` : text)));
  const intentDictation = useDictation((text) => setResponseIntent((current) => (current ? `${current} ${text}` : text)));
  const authorDictation = useDictation((text) => setAuthorName((current) => (current ? `${current} ${text}` : text)));

  const incomingWords = wordCount(incomingEmail);
  const intentWords = wordCount(responseIntent);
  const overLimit = incomingWords > WORD_LIMIT || intentWords > WORD_LIMIT;
  const canGenerate = Boolean(incomingEmail.trim() && responseIntent.trim()) && !overLimit && !busy;

  const snapshot = (): Snapshot => ({ authorName, incomingEmail, responseIntent });

  const pushHistory = () => setHistory((current) => [...current, snapshot()].slice(-20));

  const undo = () => {
    setHistory((current) => {
      const previous = current[current.length - 1];
      if (!previous) {
        setAuthorName(signedInName);
        setIncomingEmail('');
        setResponseIntent('');
        setIncomingFiles([]);
        setIntentFiles([]);
        setExemplarOn(false);
        return current;
      }
      setAuthorName(previous.authorName);
      setIncomingEmail(previous.incomingEmail);
      setResponseIntent(previous.responseIntent);
      setExemplarOn(false);
      return current.slice(0, -1);
    });
  };

  const showExemplar = () => {
    pushHistory();
    setIncomingEmail(EXEMPLAR_EMAIL);
    setResponseIntent(EXEMPLAR_INTENT);
    setExemplarOn(true);
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
    try {
      const result = await api.generateEmailResponse(body);
      setEmail(result.email);
    } catch {
      setEmail(fallbackEmailResponse(body).email);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 pb-8 text-slate-100">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-white">Email Responder</h1>
            <button
              type="button"
              className={`cursor-pointer appearance-none border-0 bg-transparent p-0 ${favorited ? 'text-amber-400' : 'text-slate-500 hover:text-amber-400'}`}
              aria-label={favorited ? 'Remove from favorites' : 'Add to favorites'}
              aria-pressed={favorited}
              onClick={() => {
                setFavorited((value) => !value);
                void api.toggleTeacherToolFavorite('family-email').then((res) => setFavorited(res.favorited)).catch(() => undefined);
              }}
            >
              <Star className="h-5 w-5" fill={favorited ? 'currentColor' : 'none'} />
            </button>
          </div>
          <p className="mt-1 text-sm text-slate-400">Generate a custom professional email in response to an email that you received.</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            className="cursor-pointer appearance-none rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3.5 py-1.5 text-xs font-bold text-cyan-400 transition-all hover:bg-cyan-500/20"
            onClick={showExemplar}
          >
            {exemplarOn ? 'Exemplar loaded' : 'Show exemplar'}
          </button>
          <button
            type="button"
            className="cursor-pointer appearance-none rounded-xl border border-slate-700/60 bg-slate-800/80 p-2 text-slate-300 transition-all hover:bg-slate-700"
            aria-label="Undo last change"
            onClick={undo}
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </header>

      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold text-slate-200">Author Name:</span>
        <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-[#0b101d] px-3 py-2.5 focus-within:border-cyan-500/60">
          <button
            type="button"
            className={`cursor-pointer appearance-none rounded-lg border border-cyan-500/20 bg-cyan-500/10 p-2 text-cyan-400 ${authorDictation.listening ? 'bg-cyan-900/60' : ''}`}
            aria-label="Dictate author name"
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
      </label>

      <div>
        <label className="mb-1.5 block text-sm font-semibold text-slate-200">
          Email you're responding to: <span className="text-rose-400">*</span>
        </label>
        <div className="rounded-xl border border-slate-800 bg-[#0b101d] p-4 focus-within:border-cyan-500/60">
          <div className="flex gap-2">
            <button
              type="button"
              className={`h-9 shrink-0 cursor-pointer appearance-none rounded-lg border border-cyan-500/20 bg-cyan-500/10 p-2 text-cyan-400 ${incomingDictation.listening ? 'bg-cyan-900/60' : ''}`}
              aria-label="Dictate the email you received"
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
              placeholder="Paste the email you’re responding to here"
              className="min-h-36 w-full resize-none border-0 bg-transparent p-0 text-sm leading-relaxed text-white outline-none placeholder:text-slate-500"
            />
          </div>
          {incomingFiles.length > 0 ? (
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {incomingFiles.map((name) => (
                <li key={name} className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs text-slate-100">
                  {name}
                </li>
              ))}
            </ul>
          ) : null}
          <FieldToolbar
            words={incomingWords}
            menuOpen={incomingMenu}
            onToggleMenu={() => {
              setIncomingMenu((open) => !open);
              setIntentMenu(false);
            }}
            onUpload={() => {
              setIncomingMenu(false);
              incomingFileRef.current?.click();
            }}
            inputRef={incomingFileRef}
            onFiles={(files) => {
              const names = Array.from(files ?? []).map((file) => file.name);
              setIncomingFiles((current) => [...current, ...names]);
            }}
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
              className={`h-9 shrink-0 cursor-pointer appearance-none rounded-lg border border-cyan-500/20 bg-cyan-500/10 p-2 text-cyan-400 ${intentDictation.listening ? 'bg-cyan-900/60' : ''}`}
              aria-label="Dictate your response"
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
              placeholder="i.e. that sounds great... let’s schedule some time... help me understand..."
              className="min-h-36 w-full resize-none border-0 bg-transparent p-0 text-sm leading-relaxed text-white outline-none placeholder:text-slate-500"
            />
          </div>
          {intentFiles.length > 0 ? (
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {intentFiles.map((name) => (
                <li key={name} className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs text-slate-100">
                  {name}
                </li>
              ))}
            </ul>
          ) : null}
          <FieldToolbar
            words={intentWords}
            menuOpen={intentMenu}
            onToggleMenu={() => {
              setIntentMenu((open) => !open);
              setIncomingMenu(false);
            }}
            onUpload={() => {
              setIntentMenu(false);
              intentFileRef.current?.click();
            }}
            inputRef={intentFileRef}
            onFiles={(files) => {
              const names = Array.from(files ?? []).map((file) => file.name);
              setIntentFiles((current) => [...current, ...names]);
            }}
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
      {email ? (
        <section className="rounded-2xl border border-slate-800 bg-[#0b101d] p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">Draft</h2>
            <button
              type="button"
              className="inline-flex cursor-pointer appearance-none items-center gap-1.5 rounded-lg border border-slate-700 bg-transparent px-3 py-1.5 text-xs font-bold text-slate-200 hover:bg-slate-800"
              onClick={() => {
                void navigator.clipboard.writeText(email).then(() => {
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 1500);
                });
              }}
            >
              <Copy className="h-3.5 w-3.5" />
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-100">{email}</pre>
        </section>
      ) : null}
    </div>
  );
}
