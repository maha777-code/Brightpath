import type { ReactNode } from 'react';
import { TeacherSidebar } from '@/components/teacher/Sidebar';
import '@/styles/teacher-dashboard.css';

export function TeacherWorkspaceLayout({
  actions,
  children,
}: {
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="td-dash flex min-h-dvh w-full max-w-full text-white">
      <TeacherSidebar />
      <div className="flex min-w-0 flex-1 flex-col pt-14 md:pt-0">
        {actions ? (
          <header className="td-header sticky top-0 z-30 hidden h-16 items-center justify-end gap-3 px-6 md:flex lg:px-10">
            {actions}
          </header>
        ) : null}
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
