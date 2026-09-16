import { Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { homePathForRole } from '@brightpath/shared';
import { useAuth } from '@/context/AuthContext';

const FONT = { fontFamily: 'Cambria, Georgia, serif' } as const;

export const HOME_BUTTON_CLASS =
  'flex cursor-pointer items-center gap-2 rounded-xl border border-slate-700/80 bg-slate-900/80 px-3.5 py-2 text-sm font-medium text-slate-200 shadow-sm transition-all hover:border-purple-500 hover:bg-slate-800 hover:text-white';

export function teacherHomePath(role?: string | null): string {
  if (role === 'teacher') return '/teacher/tools';
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
      style={FONT}
    >
      <Home className="h-4 w-4 text-purple-400" />
      <span>Home</span>
    </button>
  );
}
