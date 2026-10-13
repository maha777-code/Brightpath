import { useNavigate } from 'react-router-dom';
import { useColorTheme, type ColorTheme } from '@/context/ColorTheme';

export const BRAND_ASSETS = {
  full: '/assets/brand/mindvault-logo-horizontal.png',
  fullLight: '/assets/brand/mindvault-logo-horizontal-light-bg.png',
  stacked: '/assets/brand/mindvault-logo-stacked.png',
  stackedLight: '/assets/brand/mindvault-logo-stacked-light-bg.png',
  compact: '/assets/brand/mindvault-mark.png',
} as const;

export type BrandVariant = 'full' | 'stacked' | 'compact';

const DEFAULT_CLASS: Record<BrandVariant, string> = {
  full: 'h-10 w-auto object-contain',
  stacked: 'h-28 w-auto object-contain',
  compact: 'h-8 w-8 object-contain',
};

export function brandSrc(variant: BrandVariant, theme: ColorTheme) {
  if (theme === 'light' && variant === 'full') return BRAND_ASSETS.fullLight;
  if (theme === 'light' && variant === 'stacked') return BRAND_ASSETS.stackedLight;
  return BRAND_ASSETS[variant];
}

export function BrandLogo({
  variant = 'full',
  to = '/home',
  imgClassName,
}: {
  variant?: BrandVariant;
  to?: string;
  imgClassName?: string;
}) {
  const navigate = useNavigate();
  const { theme } = useColorTheme();

  return (
    <div
      role="link"
      tabIndex={0}
      onClick={() => navigate(to)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          navigate(to);
        }
      }}
      className="mv-brand-logo flex cursor-pointer select-none items-center gap-3 transition-opacity hover:opacity-90"
    >
      <img
        src={brandSrc(variant, theme)}
        alt={variant === 'compact' ? 'MindVault' : 'MindVault - Personalized AI Learning for Every Learner'}
        className={imgClassName ?? DEFAULT_CLASS[variant]}
      />
    </div>
  );
}
