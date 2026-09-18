import { BrandLogo } from '@/components/Navigation/BrandLogo';

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-800 bg-[#030712]/90 py-8 text-slate-300 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-[96rem] flex-col items-center justify-between gap-4 px-6 sm:flex-row lg:px-12">
        <BrandLogo variant="full" to="/" imgClassName="h-12 w-auto object-contain" />
        <p className="text-lg tracking-tight text-slate-400">
          © {year} MindVault. Personalized AI Learning for Every Learner.
        </p>
      </div>
    </footer>
  );
}

export default Footer;
