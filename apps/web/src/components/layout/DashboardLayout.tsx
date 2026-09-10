import type { ReactNode } from 'react';
import { TeacherWorkspaceLayout } from '@/components/teacher/TeacherWorkspaceLayout';

/** Full-viewport workspace shell so tool pages can stretch without leftover bottom padding. */
export function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <TeacherWorkspaceLayout fillViewport>
      <main className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">{children}</main>
    </TeacherWorkspaceLayout>
  );
}
