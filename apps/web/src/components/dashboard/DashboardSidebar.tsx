import { NavLink, useLocation } from 'react-router-dom';
import { Home, Map, Library, ChartNoAxesCombined, Settings } from 'lucide-react';

const ITEMS = [
  { to: '/dashboard', label: 'Home', icon: Home, match: (p: string) => p === '/dashboard' },
  { to: '/dashboard#path', label: 'Path', icon: Map, match: () => false },
  { to: '/dashboard#subjects', label: 'Library', icon: Library, match: () => false },
  { to: '/progress', label: 'Progress', icon: ChartNoAxesCombined, match: (p: string) => p === '/progress' },
  { to: '/parent', label: 'Settings', icon: Settings, match: (p: string) => p.startsWith('/parent') },
] as const;

export function DashboardSidebar() {
  const { pathname } = useLocation();

  return (
    <aside className="hidden w-[72px] shrink-0 flex-col items-center gap-2 border-r border-slate-200/70 bg-white/70 py-4 backdrop-blur-md md:flex">
      {ITEMS.map(({ to, label, icon: Icon, match }) => {
        const active = match(pathname);
        return (
          <NavLink
            key={label}
            to={to}
            title={label}
            className={[
              'flex h-11 w-11 items-center justify-center rounded-2xl transition',
              active
                ? 'bg-teal-700 text-white shadow-md shadow-teal-700/30'
                : 'text-slate-400 hover:bg-slate-100 hover:text-teal-700',
            ].join(' ')}
          >
            <Icon className="h-5 w-5" strokeWidth={2.2} />
            <span className="sr-only">{label}</span>
          </NavLink>
        );
      })}
    </aside>
  );
}
