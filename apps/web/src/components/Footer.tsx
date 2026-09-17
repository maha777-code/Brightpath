import { BrandLogo } from '@/components/Navigation/BrandLogo';

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-800 bg-[#030712]/90 px-6 py-8 text-slate-300 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 sm:flex-row">
        <BrandLogo variant="full" to="/" imgClassName="h-12 w-auto object-contain" />
        <p className="text-sm tracking-tight text-slate-400">
          © {year} MindVault. Personalized AI Learning for Every Learner.
        </p>
      </div>
    </footer>
  );
}

export default Footer;
