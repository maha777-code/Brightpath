import { Link } from 'react-router-dom';

function Sparkle({ className }: { className: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
    </svg>
  );
}

export function CtaBanner({ startHref }: { startHref: string }) {
  return (
    <section
      id="pricing"
      className="bp-cta-banner relative my-12 w-full overflow-hidden bg-gradient-to-r from-[#7c3aed] via-[#6d28d9] to-[#4338ca] px-6 py-12 text-white md:py-16 lg:px-16"
    >
      <div className="bp-cta-glow bp-cta-glow--tl pointer-events-none" aria-hidden="true" />
      <div className="bp-cta-glow bp-cta-glow--br pointer-events-none" aria-hidden="true" />

      <div className="pointer-events-none absolute left-6 top-4 text-purple-300 opacity-40">
        <Sparkle className="h-12 w-12 animate-pulse" />
      </div>
      <div className="pointer-events-none absolute -bottom-6 -left-6 text-purple-300 opacity-30">
        <Sparkle className="h-24 w-24" />
      </div>
      <div className="pointer-events-none absolute right-10 top-8 text-indigo-200 opacity-25">
        <Sparkle className="h-8 w-8" />
      </div>

      <div className="relative z-10 mx-auto flex max-w-7xl flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-xl">
          <h2 className="bp-cta-banner-title text-3xl font-black leading-tight tracking-tight text-white sm:text-4xl md:text-5xl">
            Get started with MindVault
          </h2>
        </div>

        <div className="max-w-lg space-y-6">
          <p className="bp-cta-banner-copy text-base font-medium leading-relaxed text-purple-100 md:text-lg">
            Let's make teaching more joyful and learning more fun for every classroom in every
            district.
          </p>

          <div className="flex flex-wrap items-center gap-4">
            <Link
              to="/login"
              className="bp-cta-banner-primary inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-base font-bold text-purple-700 shadow-md transition-all hover:bg-slate-100"
            >
              Get in touch
              <span aria-hidden="true">↗</span>
            </Link>
            <Link
              to={startHref}
              className="bp-cta-banner-secondary inline-flex items-center gap-2 rounded-xl border-2 border-white bg-transparent px-6 py-3 text-base font-bold text-white transition-all hover:bg-white/10"
            >
              Free for teachers
              <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
