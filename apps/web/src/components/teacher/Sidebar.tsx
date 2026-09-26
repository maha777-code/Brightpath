import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Home, LayoutGrid, LogOut, Menu, X } from 'lucide-react';
import { FeedbackMenuButton } from '@/components/FeedbackMenuButton';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useDisplayUser } from '@/lib/displayUser';
import { workspaceForRole } from '@/lib/workspaceRole';
import { BrandLogo } from '@/components/Navigation/BrandLogo';
import { CYBER_FONT_STYLE } from '@/lib/theme';

const WORKSPACE_ITEMS = [
  {
    to: '/home',
    label: 'Home',
    detail: 'Sharada & recommended tools',
    icon: Home,
    match: (pathname: string) =>
      pathname === '/home' || pathname === '/' || pathname.startsWith('/chat/sharada') || pathname.startsWith('/chat/raina'),
  },
  {
    to: '/teacher/tools',
    label: 'AI Tools Suite',
    detail: 'All Tools Hub',
    icon: LayoutGrid,
    match: (pathname: string) => pathname.startsWith('/teacher/tools'),
  },
] as const;

export function TeacherSidebar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { logout, role } = useAuth();
  const { userName, userMeta, schoolName } = useDisplayUser();
  const workspace = workspaceForRole(role);
  const profileDetail = workspace.detail ? `${schoolName} · ${workspace.detail}` : userMeta;
  const [open, setOpen] = useState(false);

  const close = () => setOpen(false);

  return (
    <>
      <div className="fixed inset-x-0 top-0 z-40 flex items-center border-b border-slate-800/80 bg-[#030712]/90 px-4 py-3 backdrop-blur-md md:hidden">
        <button
          type="button"
          className="rounded-lg border border-cyan-400/40 p-2.5 text-cyan-300"
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
        <span className="ml-3 text-sm font-semibold tracking-tight text-slate-100">MindVault</span>
      </div>

      {open && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-[#030712]/70 md:hidden"
          aria-label="Close sidebar"
          onClick={close}
        />
      )}

      <aside
        className={[
          'z-50 flex w-64 shrink-0 flex-col justify-between border-r border-slate-800/80 bg-[#030712]/90 px-4 py-5 backdrop-blur-md',
          'fixed inset-y-0 left-0 transition-transform duration-200 md:static md:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        ].join(' ')}
        style={CYBER_FONT_STYLE}
      >
        <div className="space-y-6">
          <div className="hidden items-center gap-2 border-b border-cyan-900/50 px-2 pb-4 md:flex">
            <div className="h-3 w-3 shrink-0 rounded-full bg-cyan-400 shadow-[0_0_10px_#22d3ee] animate-pulse" />
            <div className="min-w-0">
              <BrandLogo variant="full" imgClassName="h-8 w-auto object-contain" />
              <p className="mt-1 text-base font-extrabold tracking-tight text-slate-200">{workspace.title}</p>
            </div>
          </div>

          <div className="mb-2 flex items-center justify-between px-2 md:hidden">
            <p className="text-sm font-semibold tracking-tight text-slate-100">Menu</p>
            <button
              type="button"
              className="rounded-lg border border-slate-800 p-2 text-cyan-200"
              aria-label="Close menu"
              onClick={close}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-2">
            <p className="px-2 text-base font-extrabold tracking-tight text-slate-400">
              {workspace.title}
            </p>
            <nav className="space-y-1" aria-label={workspace.title}>
              {WORKSPACE_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = item.match(pathname);
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={close}
                    className={[
                      'flex items-start gap-3 rounded-none px-3 py-3 no-underline transition',
                      active
                        ? 'border-l-2 border-cyan-400 bg-cyan-950/30 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.15)]'
                        : 'border-l-2 border-transparent text-slate-400 hover:bg-cyan-950/20 hover:text-cyan-200',
                    ].join(' ')}
                  >
                    <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${active ? 'text-cyan-300' : 'text-slate-500'}`} />
                    <span className="min-w-0">
                      <span className="block text-base font-bold leading-tight tracking-tight">
                        {item.label}
                      </span>
                      <span className="mt-0.5 block text-sm font-normal leading-snug tracking-tight text-slate-400">
                        {item.detail}
                      </span>
                    </span>
                  </NavLink>
                );
              })}
            </nav>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-4">
          <FeedbackMenuButton size="lg" />
          <div className="mb-2 flex items-center gap-2 px-3">
            <span className="rounded border border-emerald-500/40 bg-emerald-950/80 px-2.5 py-1 text-sm font-semibold tracking-tight text-emerald-400">
              [ONLINE]
            </span>
          </div>
          <p className="truncate px-3 text-base font-bold tracking-tight text-slate-100">{userName}</p>
          <p className="truncate px-3 text-sm font-normal tracking-tight text-slate-400">{profileDetail}</p>
          <button
            type="button"
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="mt-3 inline-flex w-full cursor-pointer appearance-none items-center justify-center gap-2 rounded-lg border border-cyan-400/50 bg-cyan-500/10 px-4 py-2.5 text-base font-bold tracking-tight text-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all hover:bg-cyan-500 hover:text-black"
          >
            <LogOut className="h-5 w-5" /> Log out
          </button>
        </div>
      </aside>
    </>
  );
}

export default TeacherSidebar;
