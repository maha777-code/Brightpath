import { ChevronDown } from 'lucide-react';
import { FAQ_ITEMS } from '@/content/marketing';

export function FaqList() {
  return (
    <div className="divide-y divide-slate-800 rounded-2xl border border-slate-800 bg-slate-950/70">
      {FAQ_ITEMS.map((item) => (
        <details key={item.question} className="group px-6 py-5">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-bold text-white [&::-webkit-details-marker]:hidden">
            {item.question}
            <ChevronDown
              className="h-5 w-5 shrink-0 text-cyan-400 transition-transform group-open:rotate-180"
              aria-hidden="true"
            />
          </summary>
          <p className="mt-3 text-base leading-relaxed text-slate-300">{item.answer}</p>
        </details>
      ))}
    </div>
  );
}
