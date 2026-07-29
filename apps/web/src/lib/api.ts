const BASE = import.meta.env.VITE_API_URL ?? '/api';

function authHeaders(): HeadersInit {
  const token = localStorage.getItem('brightpath_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: { ...authHeaders(), ...init?.headers },
    });
  } catch {
    throw new Error(
      'Cannot reach the API server. From the project root run: npm run dev (starts web + api). Check http://localhost:3001/health',
    );
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? 'Request failed');
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

import type {
  AuthResponse,
  RegisterRequest,
  LoginRequest,
  ParentUser,
  ChildProfile,
  CreateChildRequest,
  UpdateChildRequest,
} from '@brightpath/shared';

export const api = {
  register: (body: RegisterRequest) =>
    request<AuthResponse>('/auth/register', { method: 'POST', body: JSON.stringify(body) }),

  login: (body: LoginRequest) =>
    request<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify(body) }),

  me: () => request<{ parent: ParentUser }>('/auth/me'),

  listChildren: () => request<{ children: ChildProfile[] }>('/children'),

  createChild: (body: CreateChildRequest) =>
    request<{ child: ChildProfile }>('/children', { method: 'POST', body: JSON.stringify(body) }),

  updateChild: (id: string, body: UpdateChildRequest) =>
    request<{ child: ChildProfile }>(`/children/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),

  deleteChild: (id: string) =>
    request<void>(`/children/${id}`, { method: 'DELETE' }),
};

export function saveAuth(token: string, parent: ParentUser) {
  localStorage.setItem('brightpath_token', token);
  localStorage.setItem('brightpath_parent', JSON.stringify(parent));
}

export function clearAuth() {
  localStorage.removeItem('brightpath_token');
  localStorage.removeItem('brightpath_parent');
}

export function loadStoredParent(): ParentUser | null {
  try {
    const raw = localStorage.getItem('brightpath_parent');
    return raw ? (JSON.parse(raw) as ParentUser) : null;
  } catch {
    return null;
  }
}

export function loadStoredToken(): string | null {
  return localStorage.getItem('brightpath_token');
}
