import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowUp,
  Check,
  Clock,
  Copy,
  Mic,
  Newspaper,
  Plus,
  Share2,
} from 'lucide-react';
import { fallbackRainaChat, rainaTitleFromPrompt, type RainaChatMessage, type RainaChatResponse } from '@brightpath/shared';
import { api } from '@/lib/api';
import { TeacherWorkspaceLayout } from '@/components/teacher/TeacherWorkspaceLayout';
import { MarkdownContent } from '@/components/teacher/MarkdownContent';

import { CYBER_FONT_STYLE } from '@/lib/theme';

const FONT = CYBER_FONT_STYLE;

type ChatLocationState = {
  prompt?: string;
  initialPrompt?: string;
  topic?: string;
  startedAt?: number;
};

type ThreadMessage =
  | { id: string; role: 'user'; text: string }
  | {
      id: string;
      role: 'assistant';
      statusLine: string;
      confirmation: string;
      markdown: string;
      pending?: boolean;
    };

function nextId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function historyFromThread(messages: ThreadMessage[]): RainaChatMessage[] {
  return messages.flatMap((msg) => {
    if (msg.role === 'user') return [{ role: 'user' as const, content: msg.text }];
    if (msg.pending) return [];
    return [{ role: 'assistant' as const, content: [msg.confirmation, msg.markdown].filter(Boolean).join('\n\n') }];
  });
}

export function RainaChat() {
  const location = useLocation();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef<number | null>(null);

  const state = (location.state ?? {}) as ChatLocationState;
  const incomingPrompt = (state.prompt ?? state.initialPrompt ?? '').trim();

  const [title, setTitle] = useState(() =>
    state.topic?.trim() || (incomingPrompt ? rainaTitleFromPrompt(incomingPrompt) : 'New conversation'),
  );
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(() => Boolean(incomingPrompt));
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [shareNote, setShareNote] = useState<string | null>(null);
  const [barNote, setBarNote] = useState<string | null>(null);

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => {
      const el = scrollerRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }, []);

  const runPrompt = useCallback(
    async (prompt: string, prior: ThreadMessage[]) => {
      const userMsg: ThreadMessage = { id: nextId(), role: 'user', text: prompt };
      const pending: ThreadMessage = {
        id: nextId(),
        role: 'assistant',
        statusLine: /worksheet/i.test(prompt)
          ? "I'll search for the right tool to create your worksheet."
          : "I'll search for the right tool to help with this request.",
        confirmation: '',
        markdown: '',
        pending: true,
      };
      const next = [...prior, userMsg, pending];
      setMessages(next);
      setBusy(true);
      setTitle(rainaTitleFromPrompt(prompt));
      scrollToEnd();

      let reply: RainaChatResponse;
      try {
        reply = await api.rainaChat({
          prompt,
          history: historyFromThread(prior),
        });
      } catch {
        reply = fallbackRainaChat(prompt);
      }

      setTitle(reply.title || rainaTitleFromPrompt(prompt));
      setMessages((current) =>
        current.map((msg) =>
          msg.id === pending.id
            ? {
                ...msg,
                statusLine: reply.statusLine,
                confirmation: reply.confirmation,
                markdown: reply.markdown,
                pending: false,
              }
            : msg,
        ),
      );
      setBusy(false);
      scrollToEnd();
    },
    [scrollToEnd],
  );

  useEffect(() => {
    if (!incomingPrompt) return;
    const stamp = state.startedAt ?? 0;
    if (startedRef.current === stamp && stamp !== 0) return;
    if (startedRef.current !== null && stamp === 0) return;
    startedRef.current = stamp;
    void runPrompt(incomingPrompt, []);
  }, [incomingPrompt, runPrompt, state.startedAt]);

  useEffect(() => {
    scrollToEnd();
  }, [messages, scrollToEnd]);

  const submitFollowUp = useCallback(() => {
    const text = draft.trim();
    if (!text || busy) return;
    setDraft('');
    void runPrompt(text, messages.filter((msg) => !(msg.role === 'assistant' && msg.pending)));
  }, [busy, draft, messages, runPrompt]);

  const copyText = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId((cur) => (cur === id ? null : cur)), 1600);
    } catch {
      setCopiedId(null);
    }
  };

  const shareThread = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: `Raina › ${title}`, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setShareNote('Link copied');
      window.setTimeout(() => setShareNote(null), 1600);
    } catch {
      setShareNote(null);
    }
  };

  const empty = messages.length === 0;
  const activeTitle = useMemo(() => title || 'New conversation', [title]);

  return (
    <TeacherWorkspaceLayout fillViewport>
      <div className="flex min-h-0 flex-1 flex-col bg-transparent text-slate-100" style={FONT}>
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-800/80 bg-[#030712]/80 px-5 py-3 backdrop-blur-md sm:px-8">
          <nav className="flex min-w-0 items-center gap-2 text-sm text-slate-400" aria-label="Breadcrumb">
            <button
              type="button"
              className="shrink-0 border-0 bg-transparent p-0 text-slate-400 shadow-none hover:text-slate-200"
              style={{ appearance: 'none' }}
              onClick={() => navigate('/home')}
            >
              Raina
            </button>
            <span aria-hidden>›</span>
            <span className="truncate font-semibold text-slate-200">{activeTitle}</span>
          </nav>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              className="rounded-lg border-0 bg-transparent p-2 text-slate-400 shadow-none hover:text-white"
              style={{ appearance: 'none' }}
              aria-label="Share"
              title={shareNote ?? 'Share'}
              onClick={() => void shareThread()}
            >
              <Share2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="rounded-lg border-0 bg-transparent p-2 text-slate-400 shadow-none hover:text-white"
              style={{ appearance: 'none' }}
              aria-label="New chat"
              title="New chat"
              onClick={() => navigate('/home')}
            >
              <Plus className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="rounded-lg border-0 bg-transparent p-2 text-slate-400 shadow-none hover:text-white"
              style={{ appearance: 'none' }}
              aria-label="History"
              title="History"
              onClick={() => navigate('/home')}
            >
              <Clock className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div ref={scrollerRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-8">
          <div className="mx-auto flex w-full max-w-4xl flex-col space-y-6">
            {empty && !busy ? (
              <p className="pt-16 text-center text-sm text-slate-400">
                Ask Raina to generate a worksheet, quiz, or lesson plan.
              </p>
            ) : null}

            {messages.map((msg) =>
              msg.role === 'user' ? (
                <div key={msg.id} className="ml-auto w-full max-w-lg">
                  <div className="rounded-lg border border-slate-800 bg-[#0b0f19] p-4 text-right">
                    <p className="text-slate-200">{msg.text}</p>
                    <div className="mt-2 flex justify-end">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 border-0 bg-transparent p-0 text-xs text-slate-500 shadow-none hover:text-slate-300"
                        style={{ appearance: 'none' }}
                        aria-label="Copy prompt"
                        onClick={() => void copyText(msg.id, msg.text)}
                      >
                        {copiedId === msg.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                        {copiedId === msg.id ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <article key={msg.id} className="max-w-none space-y-4">
                  <p className="text-slate-300">{msg.statusLine}</p>
                  {msg.pending ? (
                    <p className="animate-pulse text-sm text-slate-500">Working on it…</p>
                  ) : (
                    <>
                      {msg.confirmation ? (
                        <p className="font-medium text-slate-200">{msg.confirmation}</p>
                      ) : null}
                      <div className="my-4 border-b border-slate-800" />
                      <MarkdownContent markdown={msg.markdown} />
                    </>
                  )}
                </article>
              ),
            )}
          </div>
        </div>

        <div className="sticky bottom-0 shrink-0 bg-gradient-to-t from-[#030712] via-[#030712] to-transparent px-4 pb-4 pt-2 sm:px-8">
          <div className="mx-auto w-full max-w-4xl">
            <form
              className="rounded-lg border border-slate-800 bg-[#0b0f19]/95 p-3 shadow-[0_0_20px_rgba(6,182,212,0.12)]"
              onSubmit={(event) => {
                event.preventDefault();
                submitFollowUp();
              }}
            >
              <div className="flex items-end gap-2">
                <button
                  type="button"
                  className="rounded-lg border-0 bg-transparent p-1.5 text-slate-400 shadow-none hover:text-white"
                  style={{ appearance: 'none' }}
                  aria-label="Attach a file"
                  onClick={() => fileRef.current?.click()}
                >
                  <Plus className="h-4 w-4" />
                </button>
                <input
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      submitFollowUp();
                    }
                  }}
                  placeholder="Continue the conversation..."
                  className="min-h-[2.25rem] w-full bg-transparent px-2 py-1.5 font-mono text-cyan-100 placeholder-slate-600 outline-none"
                  style={FONT}
                  disabled={busy}
                />
                <button
                  type="button"
                  className="rounded-lg border-0 bg-transparent p-1.5 text-slate-400 shadow-none hover:text-cyan-300"
                  style={{ appearance: 'none' }}
                  aria-label="Voice input"
                  title="Voice input"
                  onClick={() => setBarNote('Voice input is ready in your next session. Type your follow-up for now.')}
                >
                  <Mic className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="rounded-lg border-0 bg-transparent p-1.5 text-slate-400 shadow-none hover:text-cyan-300"
                  style={{ appearance: 'none' }}
                  aria-label="Insert a document"
                  title="Insert a document"
                  onClick={() => fileRef.current?.click()}
                >
                  <Newspaper className="h-4 w-4" />
                </button>
                <button
                  type="submit"
                  className="rounded-lg border border-cyan-400/50 bg-cyan-500/10 p-2 text-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:bg-cyan-500 hover:text-black disabled:opacity-40"
                  aria-label="Send"
                  disabled={busy || !draft.trim()}
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
              </div>
            </form>
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              accept="image/*,.pdf,.doc,.docx,.txt"
              onChange={() => setBarNote('Attachment added. Tell Raina how to use this file.')}
            />
            {barNote ? <p className="mt-2 text-center text-xs text-slate-400">{barNote}</p> : null}
            <p className="mt-2 text-center text-xs text-slate-500">
              Raina can make mistakes. Always review content for accuracy and follow school policies.
            </p>
          </div>
        </div>
      </div>
    </TeacherWorkspaceLayout>
  );
}

export default RainaChat;
