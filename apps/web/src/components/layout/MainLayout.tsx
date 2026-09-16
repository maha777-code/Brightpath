import type { ReactNode } from 'react';
import { TeacherSidebar } from '@/components/teacher/Sidebar';
import '@/styles/teacher-dashboard.css';
import { CYBER_FONT_STYLE } from '@/lib/theme';

export function MainLayout({
  children,
  fillViewport = false,
}: {
  children: ReactNode;
  fillViewport?: boolean;
}) {
  return (
    <div
      className={[
        'td-dash relative flex min-h-screen w-full max-w-full bg-transparent text-slate-100',
        fillViewport ? 'h-screen overflow-hidden' : 'min-h-dvh',
      ].join(' ')}
      style={CYBER_FONT_STYLE}
    >
      <TeacherSidebar />
      <div
        className={[
          'relative z-10 min-w-0 flex-1 overflow-y-auto pt-14 md:pt-0',
          fillViewport ? 'flex min-h-0 flex-col overflow-hidden' : '',
        ].join(' ')}
      >
        {children}
      </div>
    </div>
  );
}

export default MainLayout;
