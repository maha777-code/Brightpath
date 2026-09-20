import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const BACK_CLASS =
  'bp-auth-back mb-6 inline-flex items-center gap-2.5 rounded-xl border border-cyan-500/30 bg-slate-800/60 px-4 py-2 text-lg font-bold text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.15)] transition-all duration-200 hover:-translate-x-1 hover:border-cyan-400 hover:bg-slate-800 hover:text-cyan-300 hover:shadow-[0_0_20px_rgba(6,182,212,0.3)]';

export function PolicyLayout({
  title,
  lastUpdated,
  children,
}: {
  title: string;
  lastUpdated: string;
  children: ReactNode;
}) {
  return (
    <div className="bp-policy min-h-screen bg-slate-950 px-4 py-16 text-slate-200 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-4xl space-y-8 rounded-3xl border border-slate-800 bg-slate-900/80 p-8 shadow-[0_0_50px_rgba(0,0,0,0.8)] backdrop-blur-xl md:p-12">
        <div className="border-b border-slate-800 pb-6">
          <Link to="/" className={BACK_CLASS}>
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            Back to Home
          </Link>
          <h1 className="bp-policy-title mt-4 text-3xl font-extrabold tracking-tight text-white md:text-4xl">
            {title}
          </h1>
          <p className="bp-policy-updated mt-2 text-base text-slate-400">Last updated: {lastUpdated}</p>
        </div>
        <div className="bp-policy-body space-y-8 text-lg leading-relaxed text-slate-300">{children}</div>
      </div>
    </div>
  );
}

export default PolicyLayout;
