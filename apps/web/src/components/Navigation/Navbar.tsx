import type { ReactNode } from 'react';
import { HomeButton } from '@/components/Navigation/HomeButton';
import { BrandLogo } from '@/components/Navigation/BrandLogo';

/** Persistent top bar for teacher workspace pages. */
export function HeaderNav({ actions }: { actions?: ReactNode }) {
  return (
    <div className="flex w-full items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-4">
        <BrandLogo variant="full" imgClassName="h-12 w-auto object-contain" />
        <HomeButton />
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-3">{actions}</div> : null}
    </div>
  );
}

export { BrandLogo } from '@/components/Navigation/BrandLogo';
export default HeaderNav;
