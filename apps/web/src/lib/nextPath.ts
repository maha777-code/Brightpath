/** Returns an in-app path from `?next=`, rejecting anything that could leave the site. */
export function safeNextPath(search: string): string | null {
  const next = new URLSearchParams(search).get('next');
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.includes('\\')) return null;
  if (next === '/login' || next.startsWith('/login?')) return null;
  return next;
}
