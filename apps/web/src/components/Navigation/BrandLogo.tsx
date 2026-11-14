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

/** Vector logo, so it stays crisp at any header size. */
function Wordmark({ className, theme }: { className: string; theme: ColorTheme }) {
  return (
    <svg viewBox="0 0 276 64" className={className} role="img" aria-label="MindVault">
      <defs>
        <linearGradient id="mv-mark-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2563eb" />
          <stop offset="0.55" stopColor="#7c3aed" />
          <stop offset="1" stopColor="#db2777" />
        </linearGradient>
        <linearGradient id="mv-word-grad" x1="150" y1="0" x2="272" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#2563eb" />
          <stop offset="0.5" stopColor="#7c3aed" />
          <stop offset="1" stopColor="#db2777" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="17" fill="url(#mv-mark-grad)" />
      <circle cx="32" cy="32" r="23" fill="none" stroke="#ffffff" strokeOpacity="0.5" strokeWidth="2.5" strokeDasharray="10 5" strokeLinecap="round" />
      <path d="M19 44V21h6.5L32 32l6.5-11H45v23h-6V31l-7 11-7-11v13z" fill="#ffffff" />
      <circle cx="51" cy="13" r="5" fill="#facc15" stroke="#ffffff" strokeWidth="2" />
      <text
        x="76"
        y="45"
        textLength="196"
        lengthAdjust="spacingAndGlyphs"
        fontFamily='-apple-system, BlinkMacSystemFont, "SF Pro Display", Inter, "Segoe UI", system-ui, sans-serif'
        fontSize="35"
        fontWeight="800"
        letterSpacing="-0.5"
      >
        <tspan fill={theme === 'light' ? '#0f172a' : '#ffffff'}>Mind</tspan>
        <tspan fill="url(#mv-word-grad)">Vault</tspan>
      </text>
    </svg>
  );
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
      {variant === 'full' ? (
        <Wordmark className={imgClassName ?? DEFAULT_CLASS[variant]} theme={theme} />
      ) : (
        <img
          src={brandSrc(variant, theme)}
          alt="MindVault"
          className={imgClassName ?? DEFAULT_CLASS[variant]}
        />
      )}
    </div>
  );
}
