import { useEffect, useRef, useState } from 'react';
import { MoreHorizontal, Send } from 'lucide-react';
import type { AiChatConfig } from '@/lib/ageGroupDashboardConfig';

interface TutorChatDrawerProps {
  learnerName: string;
  persona: AiChatConfig;
  accent?: string;
  /** Forces chat to reset when age group changes */
  ageGroupKey: string;
  /** Called after a learner sends a chat message (path mastery sync) */
  onPracticeInteraction?: () => void;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'tutor';
  text: string;
  streaming?: boolean;
}

function buildInitial(persona: AiChatConfig, learnerName: string): ChatMessage[] {
  return persona.initialMessages.map((m, i) => ({
    id: `seed-${i}`,
    role: m.role,
    text: m.text.replaceAll('{name}', learnerName),
  }));
}

function kidReply(template: string, learnerName: string, userText: string): string {
  const base = template.replaceAll('{name}', learnerName);
  const tip = userText.toLowerCase().includes('?')
    ? ' Great question — let\'s break it into tiny steps!'
    : ' Nice try! Want a hint or a fun example next?';
  return `${base}${tip}`;
}

export function TutorChatDrawer({
  learnerName,
  persona,
  accent = '#0f766e',
  ageGroupKey,
  onPracticeInteraction,
}: TutorChatDrawerProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    buildInitial(persona, learnerName),
  );
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const streamTimer = useRef<number | null>(null);

  useEffect(() => {
    setMessages(buildInitial(persona, learnerName));
    setDraft('');
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only on age/learner identity
  }, [ageGroupKey, learnerName]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(
    () => () => {
      if (streamTimer.current) window.clearInterval(streamTimer.current);
    },
    [],
  );

  const streamReply = (full: string) => {
    const id = `${Date.now()}-r`;
    setMessages((prev) => [...prev, { id, role: 'tutor', text: '', streaming: true }]);
    let i = 0;
    if (streamTimer.current) window.clearInterval(streamTimer.current);
    streamTimer.current = window.setInterval(() => {
      i += Math.max(1, Math.floor(full.length / 40));
      const slice = full.slice(0, i);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === id
            ? { ...m, text: slice, streaming: i < full.length }
            : m,
        ),
      );
      if (i >= full.length) {
        if (streamTimer.current) window.clearInterval(streamTimer.current);
        streamTimer.current = null;
        setBusy(false);
      }
    }, 28);
  };

  const send = () => {
    const text = draft.trim();
    if (!text || busy) return;
    setBusy(true);
    setMessages((prev) => [...prev, { id: String(Date.now()), role: 'user', text }]);
    setDraft('');
    onPracticeInteraction?.();
    const reply = kidReply(persona.replyTemplate, learnerName, text);
    window.setTimeout(() => streamReply(reply), 220);
  };

  return (
    <aside className="flex h-full w-full flex-col overflow-hidden rounded-3xl border border-white/70 bg-white/85 shadow-soft backdrop-blur-md lg:w-80 xl:w-96">
      <div className="flex items-center justify-between px-4 py-3 text-white" style={{ background: accent }}>
        <div>
          <p className="text-sm font-bold">24/7 AI Tutor</p>
          <p className="text-xs opacity-90">{learnerName}&apos;s Tutor</p>
        </div>
        <button
          type="button"
          className="rounded-lg p-1.5 hover:bg-white/10"
          aria-label="Chat options"
          title={persona.tone}
        >
          <MoreHorizontal className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-3 py-4">
        {messages.map((m) => (
          <div
            key={m.id}
            className={[
              'max-w-[90%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
              m.role === 'user' ? 'ml-auto text-white' : 'mr-auto bg-slate-100 text-slate-700',
            ].join(' ')}
            style={m.role === 'user' ? { background: accent } : undefined}
          >
            {m.text}
            {m.streaming && <span className="ml-0.5 inline-block animate-pulse">▍</span>}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <div className="border-t border-slate-100 p-3">
        <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-2 py-1.5">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder={persona.placeholder || 'Type your answer...'}
            className="min-w-0 flex-1 bg-transparent px-2 text-sm text-slate-700 outline-none placeholder:text-slate-400"
          />
          <button
            type="button"
            onClick={send}
            disabled={busy}
            className="flex h-9 w-9 items-center justify-center rounded-full text-white transition hover:opacity-90 disabled:opacity-50"
            style={{ background: accent }}
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
