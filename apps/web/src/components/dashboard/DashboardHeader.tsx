import { Link } from 'react-router-dom';
import { ChevronDown, LogOut, UserRound } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';

interface DashboardHeaderProps {
  learnerName: string;
}

export function DashboardHeader({ learnerName }: DashboardHeaderProps) {
  const { parent, logout } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur-md">
      <div className="flex h-16 items-center gap-4 px-4 lg:px-6">
        <Link to="/dashboard" className="flex shrink-0 items-center gap-2.5 no-underline">
          <span className="h-9 w-9 rounded-full bg-[conic-gradient(from_210deg,#6366f1,#ec4899,#0d9488,#3b82f6,#6366f1)] shadow-md" />
          <span className="hidden text-sm font-extrabold text-slate-800 sm:inline md:text-base">
            Brightpath AI Tutor
          </span>
        </Link>

        <nav className="mx-auto hidden items-center gap-6 text-sm font-semibold text-slate-500 lg:flex">
          <a href="/#subjects" className="hover:text-teal-700">Subjects</a>
          <a href="/#how-it-works" className="hover:text-teal-700">How It Works</a>
          <a href="/#pricing" className="hover:text-teal-700">Pricing</a>
          <a href="/#schools" className="hover:text-teal-700">For Schools</a>
          <Link to="/parent" className="hover:text-teal-700">Parent</Link>
        </nav>

        <div className="relative ml-auto">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2.5 py-1.5 shadow-sm transition hover:border-teal-300"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-teal-600 to-indigo-500 text-xs font-bold text-white">
              {learnerName.slice(0, 1).toUpperCase()}
            </span>
            <span className="hidden text-sm font-semibold text-slate-700 sm:inline">
              {learnerName}&apos;s Profile
            </span>
            <ChevronDown className="h-4 w-4 text-slate-400" />
          </button>

          {open && (
            <div className="absolute right-0 mt-2 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
              <div className="border-b border-slate-100 px-3 py-2 text-xs text-slate-500">
                {parent?.email}
              </div>
              <Link
                to="/parent"
                className="flex items-center gap-2 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                onClick={() => setOpen(false)}
              >
                <UserRound className="h-4 w-4" /> Manage children
              </Link>
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-rose-600 hover:bg-rose-50"
                onClick={() => {
                  setOpen(false);
                  logout();
                }}
              >
                <LogOut className="h-4 w-4" /> Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
