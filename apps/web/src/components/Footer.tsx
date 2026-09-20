import { BrandLogo } from '@/components/Navigation/BrandLogo';

const SOLUTION_LINKS = [
  { label: 'For Schools & Districts', href: '#schools' },
  { label: 'For Teachers', href: '#for-teachers' },
  { label: 'For Students', href: '#for-students' },
  { label: 'AI Instructional Coach', href: '#for-teachers' },
  { label: 'AI Tutor', href: '#ai-solutions' },
];

const TOOL_LINKS = [
  { label: 'Lesson Plan Generator', href: '#ai-solutions' },
  { label: 'Multiple Choice Quiz Maker', href: '#ai-solutions' },
  { label: 'Presentation Generator', href: '#ai-solutions' },
  { label: 'Rubric Generator', href: '#ai-solutions' },
  { label: 'Text Rewriter', href: '#ai-solutions' },
];

const RESOURCE_LINKS = [
  { label: 'Blog & Guides', href: '#how-it-works' },
  { label: 'AI Readiness Framework', href: '#how-it-works' },
  { label: 'Teacher Exemplars', href: '#for-teachers' },
  { label: 'Help & Support Center', href: 'mailto:hello@brightpath.ai' },
  { label: 'App Status', href: '#how-it-works' },
];

const COMPANY_LINKS = [
  { label: 'About Us', href: '#how-it-works' },
  { label: 'Pricing & Plans', href: '#pricing' },
  { label: 'Security & Privacy', href: '#how-it-works' },
  { label: 'Careers', href: 'mailto:hello@brightpath.ai' },
  { label: 'Contact Sales', href: 'mailto:hello@brightpath.ai' },
];

function FooterColumn({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <div className="space-y-4">
      <h5 className="bp-footer-col-title text-lg font-bold uppercase tracking-wider text-white">{title}</h5>
      <ul className="bp-footer-col-links space-y-2.5 text-lg">
        {links.map((link) => (
          <li key={link.label}>
            <a href={link.href} className="transition-colors hover:text-cyan-400">
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bp-site-footer w-full border-t border-slate-800/80 bg-slate-950 pb-8 pt-16 text-slate-400">
      <div className="mx-auto w-full max-w-7xl space-y-12 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 border-b border-slate-800/60 pb-12 lg:grid-cols-12">
          <div className="space-y-4 lg:col-span-6">
            <BrandLogo variant="full" to="/" imgClassName="h-12 w-auto object-contain" />
            <p className="bp-footer-tagline max-w-md text-xl leading-relaxed text-slate-300">
              Bringing safe, personalized AI to schools, teachers, and students with zero hassle,
              total privacy, and complete instructional support.
            </p>
          </div>

          <div className="space-y-3 lg:col-span-6 lg:pl-8">
            <h4 className="bp-footer-news-title text-2xl font-semibold text-white">Stay updated with MindVault</h4>
            <p className="bp-footer-news-desc text-lg text-slate-400">
              Get the latest AI education insights, feature updates, and classroom tools delivered
              to your inbox.
            </p>
            <form
              onSubmit={(event) => event.preventDefault()}
              className="flex max-w-md gap-2 pt-1"
            >
              <label htmlFor="mindvault-newsletter" className="sr-only">
                School email
              </label>
              <input
                id="mindvault-newsletter"
                type="email"
                placeholder="Enter your school email"
                className="bp-footer-input w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-lg text-white placeholder-slate-500 transition-colors focus:border-cyan-500 focus:outline-none"
              />
              <button
                type="submit"
                className="bp-footer-submit shrink-0 rounded-xl bg-cyan-500 px-6 py-3 text-lg font-bold text-slate-950 shadow-[0_0_20px_rgba(6,182,212,0.2)] transition-all hover:bg-cyan-400"
              >
                Subscribe
              </button>
            </form>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 py-4 md:grid-cols-4">
          <FooterColumn title="AI Solutions" links={SOLUTION_LINKS} />
          <FooterColumn title="Popular Tools" links={TOOL_LINKS} />
          <FooterColumn title="Resources" links={RESOURCE_LINKS} />
          <FooterColumn title="Company" links={COMPANY_LINKS} />
        </div>

        <div className="bp-footer-legal flex flex-col items-center justify-between gap-4 border-t border-slate-800/60 pt-8 text-base md:flex-row">
          <span>© {year} MindVault, Inc. All rights reserved.</span>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <a href="#how-it-works" className="transition-colors hover:text-white">
              Privacy Policy
            </a>
            <a href="#how-it-works" className="transition-colors hover:text-white">
              Terms of Service
            </a>
            <a href="#how-it-works" className="transition-colors hover:text-white">
              Security Overview
            </a>
            <a href="#how-it-works" className="transition-colors hover:text-white">
              Cookie Preferences
            </a>
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            <a href="#how-it-works" className="transition-colors hover:text-cyan-400" aria-label="Twitter / X">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
            <a href="#how-it-works" className="transition-colors hover:text-cyan-400" aria-label="LinkedIn">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
              </svg>
            </a>
            <a href="#how-it-works" className="transition-colors hover:text-cyan-400" aria-label="YouTube">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
