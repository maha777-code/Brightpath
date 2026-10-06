import { useNavigate } from 'react-router-dom';

export const BRAND_ASSETS = {
  full: '/assets/brand/mindvault-logo-horizontal.png',
  stacked: '/assets/brand/mindvault-logo-stacked.png',
  compact: '/assets/brand/mindvault-mark.png',
} as const;

const DEFAULT_CLASS: Record<keyof typeof BRAND_ASSETS, string> = {
  full: 'h-10 w-auto object-contain',
  stacked: 'h-28 w-auto object-contain',
  compact: 'h-8 w-8 object-contain',
};

export function BrandLogo({
  variant = 'full',
  to = '/home',
  imgClassName,
}: {
  variant?: keyof typeof BRAND_ASSETS;
  to?: string;
  imgClassName?: string;
}) {
  const navigate = useNavigate();

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
      className="flex cursor-pointer select-none items-center gap-3 transition-opacity hover:opacity-90"
    >
      <img
        src={BRAND_ASSETS[variant]}
        alt={variant === 'compact' ? 'MindVault' : 'MindVault - Personalized AI Learning for Every Learner'}
        className={imgClassName ?? DEFAULT_CLASS[variant]}
      />
    </div>
  );
}
