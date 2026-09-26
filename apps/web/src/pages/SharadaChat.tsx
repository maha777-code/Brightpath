import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowUp,
  Check,
  Copy,
  MessageSquare,
  Mic,
  MoreHorizontal,
  Plus,
  RotateCw,
  Share2,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  X,
} from 'lucide-react';
import { classifyUserIntent, fallbackSharadaChat, sharadaTitleFromPrompt, type SharadaChatMessage, type SharadaChatResponse } from '@brightpath/shared';
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

function pendingStatus(prompt: string): string {
  const intent = classifyUserIntent(prompt);
  if (intent.type === 'EXPLANATION') return "I'll explain this in language your students can follow.";
  if (intent.type === 'TOOL_WORKSHEET') return "I'll search for the right tool to create your worksheet.";
  if (intent.type === 'TOOL_QUIZ') return "I'll search for the right tool to create your quiz.";
  if (intent.type === 'TOOL_LESSON_PLAN') return "I'll search for the right tool to create your lesson plan.";
  if (intent.targetTool) return `I'll use ${intent.targetTool} for this request.`;
  return "I'll answer this directly.";
}

function nextId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const THREADS_KEY = 'brightpath.sharada.threads';

type StoredThread = {
  id: string;
  title: string;
  updatedAt: number;
  messages: ThreadMessage[];
};

function isThreadMessage(value: unknown): value is ThreadMessage {
  if (!value || typeof value !== 'object') return false;
  const msg = value as ThreadMessage;
  if (typeof msg.id !== 'string') return false;
  if (msg.role === 'user') return typeof msg.text === 'string';
  return msg.role === 'assistant' && typeof msg.markdown === 'string' && typeof msg.statusLine === 'string';
}

function loadThreads(): StoredThread[] {
  try {
    const raw = localStorage.getItem(THREADS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item) => {
      if (!item || typeof item !== 'object') return [];
      const thread = item as StoredThread;
      if (typeof thread.id !== 'string' || typeof thread.title !== 'string' || !Array.isArray(thread.messages)) return [];
      const messages = thread.messages.filter(isThreadMessage);
      if (messages.length === 0) return [];
      return [{ id: thread.id, title: thread.title, updatedAt: Number(thread.updatedAt) || Date.now(), messages }];
    });
  } catch {
    return [];
  }
}

function formatWhen(timestamp: number): string {
  const minutes = Math.round((Date.now() - timestamp) / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  const weeks = Math.round(days / 7);
  return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
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
  const [historyOpen, setHistoryOpen] = useState(true);
  const [threads, setThreads] = useState<StoredThread[]>(() => loadThreads());
  const [threadId, setThreadId] = useState(nextId);

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
        statusLine: pendingStatus(prompt),
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

  useEffect(() => {
    localStorage.setItem(THREADS_KEY, JSON.stringify(threads));
  }, [threads]);

  useEffect(() => {
    const settled = messages.filter((msg) => !(msg.role === 'assistant' && msg.pending));
    if (settled.length === 0) return;
    setThreads((current) => {
      const existing = current.find((thread) => thread.id === threadId);
      const same =
        existing &&
        existing.title === title &&
        existing.messages.length === settled.length &&
        existing.messages.every((msg, index) => msg.id === settled[index]?.id);
      if (same) return current;
      const next: StoredThread = { id: threadId, title: title || 'New conversation', updatedAt: Date.now(), messages: settled };
      return [next, ...current.filter((thread) => thread.id !== threadId)].slice(0, 40);
    });
  }, [messages, threadId, title]);

  const startNewChat = useCallback(() => {
    setThreadId(nextId());
    setMessages([]);
    setTitle('New conversation');
    setDraft('');
    setBusy(false);
    navigate('/chat/sharada', { replace: true, state: null });
  }, [navigate]);

  const openThread = (id: string) => {
    const thread = threads.find((item) => item.id === id);
    if (!thread || busy) return;
    setThreadId(thread.id);
    setTitle(thread.title);
    setMessages(thread.messages);
    setDraft('');
    navigate('/chat/sharada', { replace: true, state: null });
  };

  const deleteThread = (id: string) => {
    setThreads((current) => current.filter((thread) => thread.id !== id));
    if (id !== threadId) return;
    setThreadId(nextId());
    setMessages([]);
    setTitle('New conversation');
    setDraft('');
    setBusy(false);
  };

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
      <div className="flex min-h-0 w-full flex-1 flex-row overflow-hidden bg-[#131314] font-sans text-slate-100" style={FONT}>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
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
              className="cursor-pointer appearance-none rounded-full border-0 bg-transparent p-2 text-slate-400 shadow-none transition-colors hover:bg-slate-800/80 hover:text-slate-100"
              style={{ appearance: 'none' }}
              aria-label="Share"
              title={shareNote ?? 'Share'}
              onClick={() => void shareThread()}
            >
              <Share2 className="h-4 w-4" />
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
                      <div className="mt-4 flex items-center gap-1.5 pt-1 text-slate-400">
                        <button
                          type="button"
                          title="Good response"
                          aria-pressed={reaction[msg.id] === 'up'}
                          className={`cursor-pointer appearance-none rounded-full border-0 bg-transparent p-2 transition-colors hover:bg-slate-800/80 hover:text-slate-100 ${reaction[msg.id] === 'up' ? 'text-cyan-300' : 'text-slate-400'}`}
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
                          className={`cursor-pointer appearance-none rounded-full border-0 bg-transparent p-2 transition-colors hover:bg-slate-800/80 hover:text-slate-100 ${reaction[msg.id] === 'down' ? 'text-cyan-300' : 'text-slate-400'}`}
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
                          className="cursor-pointer appearance-none rounded-full border-0 bg-transparent p-2 text-slate-400 transition-colors hover:bg-slate-800/80 hover:text-slate-100 disabled:opacity-40"
                          disabled={busy}
                          onClick={() => regenerate(msg.id)}
                        >
                          <RotateCw className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          title="Copy text"
                          className="cursor-pointer appearance-none rounded-full border-0 bg-transparent p-2 text-slate-400 transition-colors hover:bg-slate-800/80 hover:text-slate-100"
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
                            className="cursor-pointer appearance-none rounded-full border-0 bg-transparent p-2 text-slate-400 transition-colors hover:bg-slate-800/80 hover:text-slate-100"
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
                      : 'cursor-not-allowed bg-[#282a2c] text-slate-400'
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

        <aside
          className={`${
            historyOpen ? 'w-72 opacity-100 sm:w-80' : 'w-0 border-l-0 opacity-0'
          } flex h-full min-w-0 shrink-0 flex-col overflow-hidden border-l border-slate-800/80 bg-[#181a1b] transition-all duration-300 ease-in-out`}
          aria-hidden={!historyOpen}
        >
          <div className="flex h-full w-72 flex-col overflow-hidden p-4 sm:w-80">
            <div className="mb-4 flex items-center">
              <button
                type="button"
                className="flex w-full cursor-pointer appearance-none items-center justify-center gap-2 rounded-full border border-slate-700/40 bg-[#282a2c] px-4 py-2.5 text-sm font-medium text-slate-100 shadow-sm transition-all hover:bg-[#313335]"
                onClick={startNewChat}
              >
                <Plus className="h-4 w-4 text-cyan-400" />
                <span>New chat</span>
              </button>
              <button
                type="button"
                className="ml-2 cursor-pointer appearance-none rounded-full border-0 bg-transparent p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-200 lg:hidden"
                aria-label="Close history"
                onClick={() => setHistoryOpen(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="px-3 pb-2 pt-2 text-xs font-bold uppercase tracking-wider text-slate-400">Recent</div>
            <div className="custom-scrollbar flex-1 space-y-1 overflow-y-auto pr-1">
              {threads.length === 0 ? (
                <p className="px-3 py-2 text-sm text-slate-500">No recent chats yet.</p>
              ) : (
                threads.map((chat) => {
                  const active = chat.id === threadId;
                  return (
                    <div
                      key={chat.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => openThread(chat.id)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          openThread(chat.id);
                        }
                      }}
                      className={`group flex cursor-pointer items-center justify-between rounded-xl px-3.5 py-2.5 text-sm transition-all ${
                        active
                          ? 'border border-slate-700/50 bg-[#282a2c] font-medium text-white'
                          : 'border border-transparent text-slate-300 hover:bg-[#282a2c]/60'
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-2.5">
                        <MessageSquare className={`h-4 w-4 shrink-0 ${active ? 'text-cyan-400' : 'text-slate-500'}`} />
                        <span className="min-w-0">
                          <span className="block max-w-[180px] truncate text-ellipsis">{chat.title}</span>
                          <span className="block text-xs text-slate-500">{formatWhen(chat.updatedAt)}</span>
                        </span>
                      </div>
                      <button
                        type="button"
                        title="Delete chat"
                        className="cursor-pointer appearance-none border-0 bg-transparent p-1 text-slate-400 opacity-0 transition-opacity hover:text-rose-400 group-hover:opacity-100"
                        onClick={(event) => {
                          event.stopPropagation();
                          deleteThread(chat.id);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </aside>
      </div>
    </TeacherWorkspaceLayout>
  );
}

export default SharadaChat;
