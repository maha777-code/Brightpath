import { Link } from 'react-router-dom';
import { BrandLogo } from '@/components/Navigation/BrandLogo';
import { NewsletterSection } from '@/components/NewsletterSection';

const SOLUTION_LINKS = [
  { label: 'For Schools & Academies', href: '/#for-schools' },
  { label: 'For Teachers', href: '/#for-teachers' },
  { label: 'For Students & Parents', href: '/#for-students' },
  { label: 'MindVault vs AI chatbots', href: '/compare' },
];

const TOOL_LINKS = [
  { label: 'Lesson Plan Generator', href: '/#ai-solutions' },
  { label: 'Multiple Choice Quiz Generator', href: '/#ai-solutions' },
  { label: 'Worksheet Generator', href: '/#ai-solutions' },
  { label: 'Presentation Generator', href: '/#ai-solutions' },
  { label: 'Curriculum & Textbook Studio', href: '/#ai-solutions' },
];

const RESOURCE_LINKS = [
  { label: 'FAQs', href: '/faq' },
  { label: 'Security Overview', href: '/security' },
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'Help & Support', href: '/contact' },
];

const COMPANY_LINKS = [
  { label: 'Pricing & Plans', href: '/pricing' },
  { label: 'Contact Us', href: '/contact' },
  { label: 'Book a School Walkthrough', href: '/contact' },
];

function FooterColumn({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <div className="space-y-4">
      <h5 className="bp-footer-col-title text-lg font-bold uppercase tracking-wider text-white">{title}</h5>
      <ul className="bp-footer-col-links space-y-2.5 text-lg">
        {links.map((link) => {
          const isAppRoute = link.href.startsWith('/') && !link.href.startsWith('//') && !link.href.includes('#');
          return (
            <li key={link.label}>
              {isAppRoute ? (
                <Link to={link.href} className="transition-colors hover:text-cyan-400">
                  {link.label}
                </Link>
              ) : (
                <a href={link.href} className="transition-colors hover:text-cyan-400">
                  {link.label}
                </a>
              )}
            </li>
          );
        })}
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
              The AI teaching assistant that follows your syllabus, for teachers, students, parents
              and schools. Made in Bangalore.
            </p>
          </div>

          <div className="lg:col-span-6 lg:pl-8">
            <NewsletterSection />
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

          <div className="flex flex-wrap items-center justify-center gap-6 text-base font-medium text-slate-400">
            <Link to="/privacy" className="transition-colors hover:text-cyan-400">
              Privacy Policy
            </Link>
            <Link to="/terms" className="transition-colors hover:text-cyan-400">
              Terms of Service
            </Link>
            <Link to="/security" className="transition-colors hover:text-cyan-400">
              Security Overview
            </Link>
            <Link to="/cookie-preferences" className="transition-colors hover:text-cyan-400">
              Cookie Preferences
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
