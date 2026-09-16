import type { ReactNode } from 'react';
import { TeacherSidebar } from '@/components/teacher/Sidebar';
import '@/styles/teacher-dashboard.css';

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
        'td-dash flex min-h-screen w-full max-w-full bg-[#080c14] text-slate-100',
        fillViewport ? 'h-screen overflow-hidden' : 'min-h-dvh',
      ].join(' ')}
      style={{ fontFamily: 'Cambria, Georgia, serif' }}
    >
      <TeacherSidebar />
      <div
        className={[
          'min-w-0 flex-1 overflow-y-auto pt-14 md:pt-0',
          fillViewport ? 'flex min-h-0 flex-col overflow-hidden' : '',
        ].join(' ')}
      >
        {children}
      </div>
    </div>
  );
}

export default MainLayout;
