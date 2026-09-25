import { useAuth } from '@/context/AuthContext';

const USER_NAME_KEY = 'user_name';
const USER_SCHOOL_KEY = 'user_school';

type Named = {
  name?: string | null;
  fullName?: string | null;
  school?: string | null;
  schoolName?: string | null;
} | null | undefined;

function firstNonEmpty(...values: Array<string | null | undefined>): string {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) return trimmed;
  }
  return '';
}

function nameFrom(entity: Named): string {
  return firstNonEmpty(entity?.name, entity?.fullName);
}

export function persistDisplayUser(input: {
  user?: Named;
  teacher?: Named;
  parent?: Named;
  organization?: { name?: string | null } | null;
}) {
  const name = firstNonEmpty(nameFrom(input.user), nameFrom(input.teacher), nameFrom(input.parent));
  if (name) localStorage.setItem(USER_NAME_KEY, name);
  else localStorage.removeItem(USER_NAME_KEY);

  const school = firstNonEmpty(
    input.organization?.name,
    input.teacher?.schoolName,
    input.user?.school,
    input.teacher?.school,
  );
  if (school) localStorage.setItem(USER_SCHOOL_KEY, school);
  else localStorage.removeItem(USER_SCHOOL_KEY);
}

export function clearDisplayUser() {
  localStorage.removeItem(USER_NAME_KEY);
  localStorage.removeItem(USER_SCHOOL_KEY);
}

export function storedUserName(): string {
  try {
    return localStorage.getItem(USER_NAME_KEY)?.trim() || '';
  } catch {
    return '';
  }
}

export function storedUserSchool(): string {
  try {
    return localStorage.getItem(USER_SCHOOL_KEY)?.trim() || '';
  } catch {
    return '';
  }
}

export function resolveUserName(input: {
  user?: Named;
  teacher?: Named;
  parent?: Named;
}): string {
  return firstNonEmpty(nameFrom(input.user), nameFrom(input.teacher), nameFrom(input.parent), storedUserName()) || 'Teacher';
}

export function resolveUserSchool(input: {
  organization?: { name?: string | null } | null;
  teacher?: Named;
  user?: Named;
}): string {
  return (
    firstNonEmpty(
      input.organization?.name,
      input.teacher?.schoolName,
      input.user?.school,
      storedUserSchool(),
    ) || 'School'
  );
}

export function firstNameFromDisplayName(name?: string | null): string {
  if (!name?.trim()) return 'Teacher';
  const cleaned = name.replace(/^(prof\.?|dr\.?|mr\.?|mrs\.?|ms\.?)\s+/i, '').trim();
  return cleaned.split(/\s+/)[0] || 'Teacher';
}

function emailLocalPart(...emails: Array<string | null | undefined>): string {
  for (const email of emails) {
    const local = email?.split('@')[0]?.trim();
    if (local) return local;
  }
  return '';
}

export function useDisplayUser() {
  const { user, teacher, parent, organization } = useAuth();
  const resolvedName = firstNonEmpty(nameFrom(user), nameFrom(teacher), nameFrom(parent), storedUserName());
  const userName = resolvedName || 'Teacher User';
  const firstName = resolvedName
    ? firstNameFromDisplayName(resolvedName)
    : emailLocalPart(user?.email, teacher?.email, parent?.email) || 'Teacher';
  const schoolName = resolveUserSchool({ organization, teacher, user });
  const subject = teacher?.subjectFocus?.trim() || 'Education';
  const userMeta = `${schoolName} · ${subject}`;

  return {
    userName,
    firstName: firstName || 'Teacher',
    schoolName,
    userMeta,
  };
}
