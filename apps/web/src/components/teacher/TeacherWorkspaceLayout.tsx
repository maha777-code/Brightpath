import type { ReactNode } from 'react';
import { TeacherSidebar } from '@/components/teacher/Sidebar';
import '@/styles/teacher-dashboard.css';

export function TeacherWorkspaceLayout({
  actions,
  children,
  fillViewport = false,
}: {
  actions?: ReactNode;
  children: ReactNode;
  fillViewport?: boolean;
}) {
  return (
    <div
      className={[
        'td-dash flex w-full max-w-full text-white',
        fillViewport ? 'h-screen overflow-hidden' : 'min-h-dvh',
      ].join(' ')}
    >
      <TeacherSidebar />
      <div
        className={[
          'flex min-w-0 flex-1 flex-col pt-14 md:pt-0',
          fillViewport ? 'min-h-0 overflow-hidden' : '',
        ].join(' ')}
      >
        {actions ? (
          <header className="td-header sticky top-0 z-30 hidden h-16 items-center justify-end gap-3 px-6 md:flex lg:px-10">
            {actions}
          </header>
        ) : null}
        <div
          className={
            fillViewport
              ? 'flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden'
              : 'min-w-0 flex-1'
          }
        >
          {children}
        </div>
      </div>
    </div>
  );
}
