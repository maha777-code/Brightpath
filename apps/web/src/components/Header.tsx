import { BrandLogo } from '@/components/Navigation/BrandLogo';

export function Header() {
  return (
    <header className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-6 py-3">
      <BrandLogo variant="full" />
    </header>
  );
}

export default Header;
