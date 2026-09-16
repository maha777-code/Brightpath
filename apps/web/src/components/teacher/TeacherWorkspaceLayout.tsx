import type { ReactNode } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';

export function TeacherWorkspaceLayout({
  children,
  fillViewport = false,
}: {
  children: ReactNode;
  fillViewport?: boolean;
}) {
  return <MainLayout fillViewport={fillViewport}>{children}</MainLayout>;
}

export default TeacherWorkspaceLayout;
