import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { BookOpen, GraduationCap, LayoutGrid, LogOut, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';

const WORKSPACE_ITEMS = [
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

  const nav = (
    <nav className="flex flex-1 flex-col gap-1" aria-label="Teacher workspace">
      <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-200/70">
        Teacher workspace
      </p>
      {WORKSPACE_ITEMS.map((item) => {
        const Icon = item.icon;
        const active = item.match(pathname);
        return (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={close}
            className={[
              'flex items-start gap-3 rounded-2xl px-3 py-3 no-underline transition',
              active
                ? 'bg-cyan-400/15 text-white shadow-[inset_0_0_0_1px_rgba(34,211,238,0.45)]'
                : 'text-cyan-100/80 hover:bg-white/5 hover:text-white',
            ].join(' ')}
          >
            <span
              className={[
                'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border',
                active
                  ? 'border-cyan-300/50 bg-cyan-400/20 text-cyan-100'
                  : 'border-white/10 bg-white/5 text-cyan-200/80',
              ].join(' ')}
            >
              <Icon className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-bold leading-tight">{item.label}</span>
              <span className="mt-0.5 block text-xs font-medium leading-snug text-cyan-200/70">
                {item.detail}
              </span>
            </span>
          </NavLink>
        );
      })}
    </nav>
  );

  return (
    <>
      <div className="td-header fixed inset-x-0 top-0 z-40 flex items-center justify-between gap-3 px-4 py-3 md:hidden">
        <button
          type="button"
          className="rounded-xl border border-cyan-400/30 p-2.5 text-[#A5F3FC]"
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
        <p className="text-sm font-extrabold text-white">Brightpath Teacher</p>
        <span className="w-10" />
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
        'td-sidebar z-50 flex w-[280px] shrink-0 flex-col border-r border-cyan-300/20 bg-slate-950/80 px-4 py-5 backdrop-blur-md transition-transform duration-200',
          'fixed inset-y-0 left-0 md:static md:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        ].join(' ')}
      >
        <div className="mb-6 hidden items-center gap-3 px-2 md:flex">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-300/40 bg-white/5 text-white shadow-[0_0_16px_rgba(34,211,238,0.25)]">
            <GraduationCap className="h-6 w-6" />
          </span>
          <div>
            <p className="text-base font-extrabold text-white">Brightpath Teacher</p>
            <p className="text-xs font-semibold text-cyan-200/80">Curriculum & AI tools</p>
          </div>
        </div>

        <div className="mb-4 flex items-center justify-between px-2 md:hidden">
          <p className="text-sm font-extrabold text-white">Teacher workspace</p>
          <button
            type="button"
            className="rounded-xl border border-cyan-400/30 p-2 text-[#A5F3FC]"
            aria-label="Close menu"
            onClick={close}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {nav}

        <div className="mt-auto border-t border-white/10 pt-4">
          <p className="truncate px-3 text-sm font-bold text-white">{teacher?.name ?? 'Teacher'}</p>
          <p className="truncate px-3 text-xs text-[#A5F3FC]">
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
