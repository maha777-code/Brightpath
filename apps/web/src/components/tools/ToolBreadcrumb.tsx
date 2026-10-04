import { Link, useLocation } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export function toolBreadcrumbCategory(role: string | null | undefined, pathname: string): {
  label: string;
  href: string;
} {
  if (role === 'student' || pathname.includes('/student')) {
    return { label: 'Student Tools', href: '/student/tools' };
  }
  if (role === 'parent' || pathname.includes('/parent')) {
    return { label: 'Parent Tools', href: '/home' };
  }
  if (role === 'org_admin' || pathname.includes('/school')) {
    return { label: 'School Tools', href: '/teacher/tools' };
  }
  if (role === 'center_admin' || pathname.includes('/tutor') || pathname.includes('/center')) {
    return { label: 'Tutor Tools', href: '/teacher/tools' };
  }
  return { label: 'Teacher Tools', href: '/teacher/tools' };
}

export function ToolBreadcrumb({ toolName }: { toolName: string }) {
  const { role } = useAuth();
  const { pathname } = useLocation();
  const category = toolBreadcrumbCategory(role, pathname);

  return (
    <nav className="flex flex-wrap items-center gap-2 text-xs font-semibold" aria-label="Breadcrumb">
      <Link
        to={category.href}
        className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-1 text-cyan-400 no-underline shadow-[0_0_12px_rgba(6,182,212,0.22)] transition-all hover:border-cyan-500/50 hover:bg-slate-800/80 hover:text-cyan-300"
        style={{ color: '#22d3ee', textDecoration: 'none', WebkitTextFillColor: '#22d3ee' }}
      >
        <ChevronLeft className="h-3.5 w-3.5 text-cyan-400" />
        <span>{category.label}</span>
      </Link>
      <span className="font-bold text-slate-600">/</span>
      <span className="rounded-lg border border-slate-800/80 bg-slate-950/60 px-3 py-1 font-medium tracking-wide text-slate-200">
        {toolName}
      </span>
    </nav>
  );
}
