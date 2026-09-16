import { Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { homePathForRole } from '@brightpath/shared';
import { useAuth } from '@/context/AuthContext';
import { CYBER_FONT_STYLE } from '@/lib/theme';

export const HOME_BUTTON_CLASS =
  'btn-cyber flex cursor-pointer items-center gap-2 rounded-lg px-3.5 py-2';

export function teacherHomePath(role?: string | null): string {
  if (role === 'teacher') return '/home';
  return homePathForRole(role);
}

export function HomeButton({ to }: { to?: string }) {
  const navigate = useNavigate();
  const { role } = useAuth();
  const dest = to ?? teacherHomePath(role);

  return (
    <button
      type="button"
      onClick={() => navigate(dest)}
      title="Return to Home Dashboard"
      className={HOME_BUTTON_CLASS}
      style={CYBER_FONT_STYLE}
    >
      <Home className="h-4 w-4 text-cyan-300" />
      <span>Home</span>
    </button>
  );
}
