import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { BookOpen, Home, LayoutGrid, LogOut, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { BrandLogo } from '@/components/Navigation/BrandLogo';

const WORKSPACE_ITEMS = [
  {
    to: '/home',
    label: 'Home',
    detail: 'Raina & recommended tools',
    icon: Home,
    match: (pathname: string) => pathname === '/home' || pathname === '/',
  },
  {
    to: '/teacher/dashboard',
    label: 'Teacher Dashboard',
    detail: 'Curriculum & Textbook Studio',
    icon: BookOpen,
    match: (pathname: string) =>
      pathname === '/teacher/dashboard' || pathname.startsWith('/teacher/chapter'),
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
  const { logout, teacher } = useAuth();
  const [open, setOpen] = useState(false);

  const close = () => setOpen(false);

  return (
    <>
      <div className="fixed inset-x-0 top-0 z-40 flex items-center border-b border-slate-800 bg-slate-950 px-4 py-3 md:hidden">
        <button
          type="button"
          className="rounded-xl border border-slate-700 p-2.5 text-slate-200"
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-slate-950/60 md:hidden"
          aria-label="Close sidebar"
          onClick={close}
        />
      )}

      <aside
        className={[
          'z-50 flex w-64 shrink-0 flex-col justify-between border-r border-slate-800 bg-slate-950 px-4 py-5',
          'fixed inset-y-0 left-0 transition-transform duration-200 md:static md:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        ].join(' ')}
        style={{ fontFamily: 'Cambria, Georgia, serif' }}
      >
        <div className="space-y-6">
          <div className="hidden px-2 py-1 md:block">
            <BrandLogo variant="full" imgClassName="h-10 w-auto object-contain" />
          </div>

          <div className="mb-2 flex items-center justify-between px-2 md:hidden">
            <p className="text-sm font-extrabold text-white">Menu</p>
            <button
              type="button"
              className="rounded-xl border border-slate-700 p-2 text-slate-200"
              aria-label="Close menu"
              onClick={close}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-2">
            <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              TEACHER WORKSPACE
            </p>
            <nav className="space-y-1" aria-label="Teacher workspace">
              {WORKSPACE_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = item.match(pathname);
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={close}
                    className={[
                      'flex items-start gap-3 rounded-xl px-3 py-3 no-underline transition',
                      active
                        ? 'bg-slate-800 text-white shadow-[inset_0_0_0_1px_rgba(168,85,247,0.45)]'
                        : 'text-slate-300 hover:bg-slate-900 hover:text-white',
                    ].join(' ')}
                  >
                    <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${active ? 'text-purple-400' : 'text-slate-400'}`} />
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold leading-tight">{item.label}</span>
                      <span className="mt-0.5 block text-[11px] font-medium leading-snug text-slate-400">
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
          <p className="truncate px-3 text-sm font-bold text-white">{teacher?.name ?? 'Teacher'}</p>
          <p className="truncate px-3 text-xs text-slate-400">
            {teacher?.schoolName ?? 'School'} · {teacher?.subjectFocus ?? 'Science'}
          </p>
          <button
            type="button"
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#6D28D9]/80 px-4 py-2.5 text-sm font-medium text-white hover:bg-[#7C3AED]"
          >
            <LogOut className="h-4 w-4" /> Log out
          </button>
        </div>
      </aside>
    </>
  );
}

export default TeacherSidebar;
