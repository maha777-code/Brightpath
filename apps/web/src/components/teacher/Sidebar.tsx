import { useLocation } from 'react-router-dom';
import { Bookmark, Eye, Home, LayoutGrid, Users } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useDisplayUser } from '@/lib/displayUser';
import { workspaceForRole } from '@/lib/workspaceRole';
import { AppSidebar, type SidebarSection } from '@/components/layout/AppSidebar';

const WORKSPACE_ITEMS = [
  {
    to: '/home',
    label: 'Home',
    detail: 'Sharada & recommended tools',
    icon: Home,
    match: (pathname: string) =>
      pathname === '/home' || pathname === '/' || pathname.startsWith('/chat/sharada') || pathname.startsWith('/chat/raina'),
  },
  {
    to: '/teacher/tools',
    label: 'AI Tools Suite',
    detail: 'All Tools Hub',
    icon: LayoutGrid,
    match: (pathname: string) => pathname.startsWith('/teacher/tools'),
  },
  {
    to: '/teacher/resources/lesson-plans',
    label: 'My Resources',
    detail: 'Saved lesson plans',
    icon: Bookmark,
    match: (pathname: string) => pathname.startsWith('/teacher/resources'),
  },
] as const;

const CLASSROOM_ITEMS = [
  {
    to: '/classes',
    label: 'Classes & Students',
    detail: 'Rosters, join codes, profiles',
    icon: Users,
    match: (pathname: string) => pathname.startsWith('/classes'),
  },
  {
    to: '/sharada-oversight',
    label: 'Sharada Oversight',
    detail: 'Student chats & safety alerts',
    icon: Eye,
    match: (pathname: string) => pathname.startsWith('/sharada-oversight'),
  },
] as const;

const CLASSROOM_ROLES = new Set(['teacher', 'org_admin', 'center_admin']);

type NavDef = (typeof WORKSPACE_ITEMS)[number] | (typeof CLASSROOM_ITEMS)[number];

export function TeacherSidebar() {
  const { pathname } = useLocation();
  const { role } = useAuth();
  const { userName, userMeta, schoolName } = useDisplayUser();
  const workspace = workspaceForRole(role);
  const profileDetail = workspace.detail ? `${schoolName} · ${workspace.detail}` : userMeta;

  const toItems = (defs: readonly NavDef[]) =>
    defs.map((item) => ({
      key: item.to,
      to: item.to,
      label: item.label,
      detail: item.detail,
      icon: item.icon,
      active: item.match(pathname),
    }));

  const sections: SidebarSection[] = [{ items: toItems(WORKSPACE_ITEMS) }];
  if (role && CLASSROOM_ROLES.has(role)) sections.push({ label: 'Classroom', items: toItems(CLASSROOM_ITEMS) });

  return <AppSidebar title={workspace.title} sections={sections} userName={userName} userDetail={profileDetail} />;
}

export default TeacherSidebar;
