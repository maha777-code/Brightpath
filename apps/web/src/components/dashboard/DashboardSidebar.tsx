import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Home, Bot, Map, Library, ChartNoAxesCombined, Settings } from 'lucide-react';

type SidebarItem =
  | {
      kind: 'link';
      to: string;
      label: string;
      icon: typeof Home;
      match: (pathname: string) => boolean;
      onNavigate?: (pathname: string, navigate: ReturnType<typeof useNavigate>, e: React.MouseEvent) => void;
    }
  | {
      kind: 'action';
      id: string;
      label: string;
      icon: typeof Home;
    };

const ITEMS: SidebarItem[] = [
  {
    kind: 'link',
    to: '/dashboard',
    label: 'Home',
    icon: Home,
    match: (p) => p === '/dashboard',
  },
  {
    kind: 'link',
    to: '/dashboard/ai-tutor',
    label: 'Personal AI Tutor',
    icon: Bot,
    match: (p) => p.startsWith('/dashboard/ai-tutor'),
  },
  {
    kind: 'link',
    to: '/dashboard/learning-path',
    label: 'Learning Path',
    icon: Map,
    match: (p) => p === '/dashboard/learning-path',
    onNavigate: (pathname, navigate, e) => {
      if (pathname === '/dashboard') {
        e.preventDefault();
        document.getElementById('path')?.scrollIntoView({ behavior: 'smooth' });
        navigate('/dashboard#path', { replace: true });
      }
    },
  },
  {
    kind: 'link',
    to: '/dashboard/subjects',
    label: 'Library',
    icon: Library,
    match: (p) => p === '/dashboard/subjects' || p.startsWith('/dashboard/subjects/'),
  },
  {
    kind: 'link',
    to: '/dashboard/analytics',
    label: 'Analytics',
    icon: ChartNoAxesCombined,
    match: (p) => p === '/dashboard/analytics' || p === '/progress',
    onNavigate: (pathname, navigate, e) => {
      if (pathname === '/dashboard') {
        e.preventDefault();
        document.getElementById('analytics')?.scrollIntoView({ behavior: 'smooth' });
        navigate('/dashboard#analytics', { replace: true });
      }
    },
  },
  {
    kind: 'action',
    id: 'settings',
    label: 'Settings',
    icon: Settings,
  },
];

interface DashboardSidebarProps {
  onOpenSettings?: () => void;
}

export function DashboardSidebar({ onOpenSettings }: DashboardSidebarProps) {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  return (
    <aside className="hidden w-[72px] shrink-0 flex-col items-center gap-2 border-r border-slate-200/70 bg-white/70 py-4 backdrop-blur-md md:flex">
      {ITEMS.map((item) => {
        const Icon = item.icon;

        if (item.kind === 'action') {
          return (
            <button
              key={item.id}
              type="button"
              title={item.label}
              onClick={() => onOpenSettings?.()}
              className="flex h-11 w-11 items-center justify-center rounded-2xl text-slate-400 transition hover:bg-slate-100 hover:text-teal-700"
            >
              <Icon className="h-5 w-5" strokeWidth={2.2} />
              <span className="sr-only">{item.label}</span>
            </button>
          );
        }

        const active = item.match(pathname);

        return (
          <NavLink
            key={item.label}
            to={item.to}
            title={item.label}
            onClick={(e) => item.onNavigate?.(pathname, navigate, e)}
            className={[
              'flex h-11 w-11 items-center justify-center rounded-2xl transition',
              active
                ? 'bg-[#059669] text-white shadow-md shadow-emerald-700/30'
                : 'text-slate-400 hover:bg-slate-100 hover:text-teal-700',
            ].join(' ')}
          >
            <Icon className="h-5 w-5" strokeWidth={2.2} />
            <span className="sr-only">{item.label}</span>
          </NavLink>
        );
      })}
    </aside>
  );
}
