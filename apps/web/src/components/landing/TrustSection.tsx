import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { TESTIMONIALS, TRUST_FACTS } from '@/content/marketing';

export function TrustSection() {
  return (
    <section id="trust" aria-labelledby="trust-title" className="w-full border-y border-slate-800/60 bg-slate-950 px-4 py-16 sm:px-8 md:px-12 lg:px-16">
      <div className="mx-auto max-w-[1440px]">
        <div className="mb-10 max-w-3xl space-y-3">
          <h2 id="trust-title" className="text-4xl font-extrabold tracking-tight text-white">
            Built for school data from day one
          </h2>
          <p className="text-xl text-slate-300">
            What we commit to, in plain words. The full details are in our{' '}
            <Link to="/security" className="font-bold text-cyan-400 underline-offset-4 hover:underline">
              Security Overview
            </Link>{' '}
            and{' '}
            <Link to="/privacy" className="font-bold text-cyan-400 underline-offset-4 hover:underline">
              Privacy Policy
            </Link>
            .
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
          {TRUST_FACTS.map((fact) => (
            <div key={fact.title} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
              <ShieldCheck className="h-6 w-6 text-cyan-400" aria-hidden="true" />
              <h3 className="mt-3 text-lg font-bold text-white">{fact.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">{fact.detail}</p>
            </div>
          ))}
        </div>

        {TESTIMONIALS.length > 0 ? (
          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
            {TESTIMONIALS.map((item) => (
              <figure key={item.author} className="rounded-2xl border border-cyan-500/30 bg-slate-900/60 p-6">
                <blockquote className="text-base leading-relaxed text-slate-200">“{item.quote}”</blockquote>
                <figcaption className="mt-4 text-sm">
                  <span className="font-bold text-white">{item.author}</span>
                  <span className="block text-slate-400">
                    {item.role}
                    {item.organization ? `, ${item.organization}` : ''}
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
