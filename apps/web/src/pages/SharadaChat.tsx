import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowUp,
  Check,
  Clock,
  Copy,
  Mic,
  MoreHorizontal,
  Plus,
  RotateCw,
  Share2,
  ThumbsDown,
  ThumbsUp,
} from 'lucide-react';
import { fallbackSharadaChat, sharadaTitleFromPrompt, type SharadaChatMessage, type SharadaChatResponse } from '@brightpath/shared';
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

function historyFromThread(messages: ThreadMessage[]): SharadaChatMessage[] {
  return messages.flatMap((msg) => {
    if (msg.role === 'user') return [{ role: 'user' as const, content: msg.text }];
    if (msg.pending) return [];
    return [{ role: 'assistant' as const, content: [msg.confirmation, msg.markdown].filter(Boolean).join('\n\n') }];
  });
}

export function SharadaChat() {
  const location = useLocation();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef<number | null>(null);

  const state = (location.state ?? {}) as ChatLocationState;
  const incomingPrompt = (state.prompt ?? state.initialPrompt ?? '').trim();

  const [title, setTitle] = useState(() =>
    state.topic?.trim() || (incomingPrompt ? sharadaTitleFromPrompt(incomingPrompt) : 'New conversation'),
  );
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(() => Boolean(incomingPrompt));
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [shareNote, setShareNote] = useState<string | null>(null);
  const [barNote, setBarNote] = useState<string | null>(null);
  const [reaction, setReaction] = useState<Record<string, 'up' | 'down'>>({});
  const [moreId, setMoreId] = useState<string | null>(null);

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
      setTitle(sharadaTitleFromPrompt(prompt));
      scrollToEnd();

      let reply: SharadaChatResponse;
      try {
        reply = await api.sharadaChat({
          prompt,
          history: historyFromThread(prior),
        });
      } catch {
        reply = fallbackSharadaChat(prompt);
      }

      setTitle(reply.title || sharadaTitleFromPrompt(prompt));
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
        await navigator.share({ title: `Sharada › ${title}`, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setShareNote('Link copied');
      window.setTimeout(() => setShareNote(null), 1600);
    } catch {
      setShareNote(null);
    }
  };

  const regenerate = (assistantId: string) => {
    if (busy) return;
    const index = messages.findIndex((msg) => msg.id === assistantId);
    if (index < 1) return;
    const user = messages[index - 1];
    if (!user || user.role !== 'user') return;
    const prior = messages.slice(0, index - 1).filter((msg) => !(msg.role === 'assistant' && msg.pending));
    void runPrompt(user.text, prior);
  };

  const empty = messages.length === 0;
  const activeTitle = useMemo(() => title || 'New conversation', [title]);

  return (
    <TeacherWorkspaceLayout fillViewport>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#131314] font-sans text-slate-100" style={FONT}>
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-800/40 bg-[#131314] px-5 py-3 sm:px-8">
          <nav className="flex min-w-0 items-center gap-2 text-sm text-slate-400" aria-label="Breadcrumb">
            <button
              type="button"
              className="shrink-0 border-0 bg-transparent p-0 text-slate-400 shadow-none hover:text-slate-200"
              style={{ appearance: 'none' }}
              onClick={() => navigate('/home')}
            >
              Sharada
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

        <div ref={scrollerRef} className="custom-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6">
          <div className="mx-auto flex w-full max-w-4xl flex-col space-y-8">
            {empty && !busy ? (
              <p className="pt-16 text-center text-base text-slate-400">
                Ask Sharada to generate a worksheet, quiz, or lesson plan.
              </p>
            ) : null}

            {messages.map((msg) =>
              msg.role === 'user' ? (
                <div key={msg.id} className="flex w-full flex-col items-end space-y-1">
                  <div className="inline-block max-w-[80%] rounded-2xl rounded-tr-sm bg-[#282a2c] px-5 py-3.5 text-base font-normal leading-relaxed text-slate-100 shadow-sm hover:bg-[#313335] sm:text-lg">
                    {msg.text}
                  </div>
                  <button
                    type="button"
                    className="inline-flex cursor-pointer appearance-none items-center gap-1 border-0 bg-transparent pr-1 pt-1 text-xs text-slate-400 shadow-none transition-colors hover:text-slate-200"
                    aria-label="Copy prompt"
                    onClick={() => void copyText(msg.id, msg.text)}
                  >
                    {copiedId === msg.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copiedId === msg.id ? 'Copied' : 'Copy'}
                  </button>
                </div>
              ) : (
                <article key={msg.id} className="w-full space-y-4 pt-2">
                  <p className="text-base font-normal leading-[1.7] tracking-wide text-slate-200 sm:text-[17px]">
                    {msg.statusLine}
                  </p>
                  {msg.pending ? (
                    <p className="animate-pulse text-base text-slate-400">Working on it…</p>
                  ) : (
                    <>
                      {msg.confirmation ? (
                        <p className="text-base font-normal leading-[1.7] text-slate-200 sm:text-[17px]">{msg.confirmation}</p>
                      ) : null}
                      <MarkdownContent markdown={msg.markdown} />
                      <div className="mt-4 flex items-center gap-1 text-slate-400">
                        <button
                          type="button"
                          title="Good response"
                          aria-pressed={reaction[msg.id] === 'up'}
                          className={`cursor-pointer appearance-none rounded-full border-0 bg-transparent p-2 transition-all hover:bg-slate-800 hover:text-slate-200 ${reaction[msg.id] === 'up' ? 'text-cyan-300' : ''}`}
                          onClick={() =>
                            setReaction((current) => {
                              const next = { ...current };
                              if (next[msg.id] === 'up') delete next[msg.id];
                              else next[msg.id] = 'up';
                              return next;
                            })
                          }
                        >
                          <ThumbsUp className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          title="Bad response"
                          aria-pressed={reaction[msg.id] === 'down'}
                          className={`cursor-pointer appearance-none rounded-full border-0 bg-transparent p-2 transition-all hover:bg-slate-800 hover:text-slate-200 ${reaction[msg.id] === 'down' ? 'text-cyan-300' : ''}`}
                          onClick={() =>
                            setReaction((current) => {
                              const next = { ...current };
                              if (next[msg.id] === 'down') delete next[msg.id];
                              else next[msg.id] = 'down';
                              return next;
                            })
                          }
                        >
                          <ThumbsDown className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          title="Regenerate"
                          className="cursor-pointer appearance-none rounded-full border-0 bg-transparent p-2 transition-all hover:bg-slate-800 hover:text-slate-200 disabled:opacity-40"
                          disabled={busy}
                          onClick={() => regenerate(msg.id)}
                        >
                          <RotateCw className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          title="Copy text"
                          className="cursor-pointer appearance-none rounded-full border-0 bg-transparent p-2 transition-all hover:bg-slate-800 hover:text-slate-200"
                          onClick={() =>
                            void copyText(msg.id, [msg.confirmation, msg.markdown].filter(Boolean).join('\n\n'))
                          }
                        >
                          {copiedId === msg.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </button>
                        <div className="relative">
                          <button
                            type="button"
                            title="More"
                            className="cursor-pointer appearance-none rounded-full border-0 bg-transparent p-2 transition-all hover:bg-slate-800 hover:text-slate-200"
                            onClick={() => setMoreId((current) => (current === msg.id ? null : msg.id))}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                          {moreId === msg.id ? (
                            <button
                              type="button"
                              className="absolute bottom-10 left-0 cursor-pointer appearance-none whitespace-nowrap rounded-xl border border-slate-700/60 bg-[#1e1f20] px-3 py-2 text-xs text-slate-200 shadow-lg"
                              onClick={() => {
                                void copyText(`${msg.id}-more`, [msg.confirmation, msg.markdown].filter(Boolean).join('\n\n'));
                                setMoreId(null);
                              }}
                            >
                              Copy response
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </>
                  )}
                </article>
              ),
            )}
          </div>
        </div>

        <div className="shrink-0 bg-[#131314] px-4 pb-3 pt-2">
          <div className="mx-auto w-full max-w-3xl">
            <form
              className="flex items-center justify-between gap-3 rounded-[28px] border border-slate-700/50 bg-[#1e1f20] p-3 shadow-xl transition-all duration-200 hover:bg-[#282a2c] focus-within:border-cyan-500/50 focus-within:bg-[#1e1f20] sm:p-4"
              onSubmit={(event) => {
                event.preventDefault();
                submitFollowUp();
              }}
            >
              <button
                type="button"
                className="cursor-pointer appearance-none rounded-full border-0 bg-transparent p-2 text-slate-300 shadow-none transition-colors hover:bg-slate-800 hover:text-white"
                aria-label="Attach a file"
                title="Add file or attachment"
                onClick={() => fileRef.current?.click()}
              >
                <Plus className="h-5 w-5" />
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
                placeholder="Ask Sharada..."
                className="w-full border-none bg-transparent p-0 text-base text-slate-100 placeholder-slate-400 outline-none focus:outline-none sm:text-lg"
                style={FONT}
                disabled={busy}
              />
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="cursor-pointer appearance-none rounded-full border-0 bg-transparent p-2 text-slate-300 shadow-none transition-colors hover:bg-slate-800 hover:text-cyan-400"
                  aria-label="Voice input"
                  title="Use voice input"
                  onClick={() => setBarNote('Voice input is ready in your next session. Type your follow-up for now.')}
                >
                  <Mic className="h-5 w-5" />
                </button>
                <button
                  type="submit"
                  className={`flex appearance-none items-center justify-center rounded-full border-0 p-2.5 transition-all duration-200 ${
                    draft.trim() && !busy
                      ? 'cursor-pointer bg-cyan-400 text-slate-950 shadow-md hover:bg-cyan-300'
                      : 'cursor-not-allowed bg-slate-800 text-slate-500'
                  }`}
                  aria-label="Send"
                  disabled={busy || !draft.trim()}
                >
                  <ArrowUp className="h-4 w-4 stroke-[2.5]" />
                </button>
              </div>
            </form>
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              accept="image/*,.pdf,.doc,.docx,.txt"
              onChange={() => setBarNote('Attachment added. Tell Sharada how to use this file.')}
            />
            {barNote ? <p className="mt-2 text-center text-xs text-slate-400">{barNote}</p> : null}
            <p className="mt-2 pb-2 text-center text-xs text-slate-500">
              Sharada is AI and can make mistakes. Always review content for accuracy.
            </p>
          </div>
        </div>
      </div>
    </TeacherWorkspaceLayout>
  );
}

export default SharadaChat;
