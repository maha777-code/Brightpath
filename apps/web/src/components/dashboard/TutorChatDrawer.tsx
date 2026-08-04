import { useState } from 'react';
import { MoreHorizontal, Send } from 'lucide-react';

interface TutorChatDrawerProps {
  learnerName: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'tutor';
  text: string;
}

const INITIAL: ChatMessage[] = [
  {
    id: '1',
    role: 'user',
    text: 'Can you explain the quadratic formula with examples?',
  },
  {
    id: '2',
    role: 'tutor',
    text: "Absolutely! Let's break it down into steps. For ax² + bx + c = 0, the solutions are x = (-b ± √(b² − 4ac)) / 2a. Try a = 1, b = 5, c = 6.",
  },
];

export function TutorChatDrawer({ learnerName }: TutorChatDrawerProps) {
  const [messages, setMessages] = useState(INITIAL);
  const [draft, setDraft] = useState('');

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    setMessages((prev) => [
      ...prev,
      { id: String(Date.now()), role: 'user', text },
      {
        id: `${Date.now()}-r`,
        role: 'tutor',
        text: `Great question, ${learnerName}! Open a full lesson from My Subjects for a deeper walkthrough — I'm here 24/7.`,
      },
    ]);
    setDraft('');
  };

  return (
    <aside className="flex h-full w-full flex-col overflow-hidden rounded-3xl border border-white/70 bg-white/85 shadow-soft backdrop-blur-md lg:w-80 xl:w-96">
      <div className="flex items-center justify-between bg-teal-700 px-4 py-3 text-white">
        <div>
          <p className="text-sm font-bold">24/7 AI Tutor</p>
          <p className="text-xs text-teal-100">{learnerName}&apos;s Tutor</p>
        </div>
        <button type="button" className="rounded-lg p-1.5 hover:bg-teal-600" aria-label="Chat options">
          <MoreHorizontal className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-3 py-4">
        {messages.map((m) => (
          <div
            key={m.id}
            className={[
              'max-w-[90%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
              m.role === 'user'
                ? 'ml-auto bg-teal-700 text-white'
                : 'mr-auto bg-slate-100 text-slate-700',
            ].join(' ')}
          >
            {m.text}
          </div>
        ))}
      </div>

      <div className="border-t border-slate-100 p-3">
        <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-2 py-1.5">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder="Type a message..."
            className="min-w-0 flex-1 bg-transparent px-2 text-sm text-slate-700 outline-none placeholder:text-slate-400"
          />
          <button
            type="button"
            onClick={send}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-700 text-white transition hover:bg-teal-600"
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
