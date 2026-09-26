import type { AppRole } from '@brightpath/shared';

export function workspaceForRole(role: string | null | undefined): {
  title: string;
  activity: string;
  greetingFallback: string;
  detail: string;
} {
  switch (role as AppRole) {
    case 'org_admin':
      return {
        title: 'School workspace',
        activity: 'Latest institutional work.',
        greetingFallback: 'User',
        detail: 'School Admin',
      };
    case 'parent':
      return {
        title: 'Parent workspace',
        activity: 'Latest home / student work.',
        greetingFallback: 'User',
        detail: 'Parent',
      };
    case 'center_admin':
      return {
        title: 'Tutoring Center workspace',
        activity: 'Latest center work.',
        greetingFallback: 'User',
        detail: 'Tutoring Center',
      };
    default:
      return {
        title: 'Teacher workspace',
        activity: 'Latest classroom work.',
        greetingFallback: 'Teacher',
        detail: '',
      };
  }
}
