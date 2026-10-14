import { ChevronDown } from 'lucide-react';
import { FAQ_ITEMS } from '@/content/marketing';

export function FaqSection() {
  return (
    <section id="faq" aria-labelledby="faq-title" className="w-full px-4 py-16 sm:px-8 md:px-12 lg:px-16">
      <div className="mx-auto max-w-4xl">
        <h2 id="faq-title" className="text-4xl font-extrabold tracking-tight text-white">
          Questions educators ask us
        </h2>
        <p className="mt-3 text-xl text-slate-300">
          Straight answers on privacy, accuracy, cheating and cost.
        </p>
        <div className="mt-8 divide-y divide-slate-800 rounded-2xl border border-slate-800 bg-slate-950/70">
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
      </div>
    </section>
  );
}
