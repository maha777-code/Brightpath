import { useNavigate } from 'react-router-dom';

export function BrandLogo({
  variant = 'full',
  to = '/teacher/tools',
  imgClassName,
}: {
  variant?: 'full' | 'compact';
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
      {variant === 'full' ? (
        <img
          src="/assets/mindvault-logo.png"
          alt="MindVault - Personalized AI Learning for Every Learner"
          className={imgClassName ?? 'h-10 w-auto object-contain'}
        />
      ) : (
        <img
          src="/assets/mindvault-icon.png"
          alt="MindVault"
          className={imgClassName ?? 'h-8 w-8 object-contain'}
        />
      )}
    </div>
  );
}
