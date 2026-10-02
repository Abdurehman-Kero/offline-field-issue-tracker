import { Role } from '../shared/constants';

export function getClientRole(): Role {
  return (localStorage.getItem('user_role') as Role) || 'field_worker';
}

export function setClientRole(role: Role) {
  localStorage.setItem('user_role', role);
  window.dispatchEvent(new CustomEvent('role_changed', { detail: { role } }));
}


export interface ApiErrorPayload {
  code: string;
  message: string;
  details?: Array<{ field: string; message: string }>;
}

export class ApiError extends Error {
  status: number;
  code: string;
  details: Array<{ field: string; message: string }>;

  constructor(status: number, errorData: ApiErrorPayload) {
    super(errorData.message || 'API request failed');
    this.status = status;
    this.code = errorData.code || 'UNKNOWN_ERROR';
    this.details = errorData.details || [];
  }
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit & { bypassOfflineSim?: boolean } = {},
  timeoutMs = 8000
): Promise<T> {
  // Enforce offline behavior even on localhost so the Outbox queues correctly.
  // We use the true probe state exposed by useOnlineStatus if it's available.
  const isActuallyOnline = typeof window !== 'undefined' && typeof (window as any).__appIsOnline === 'boolean'
    ? (window as any).__appIsOnline
    : (typeof navigator !== 'undefined' ? navigator.onLine : true);

  if (!isActuallyOnline && !options.bypassOfflineSim) {
    throw new TypeError('Failed to fetch');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const headers = new Headers(options.headers || {});
  if (!headers.has('X-Role')) {
    const currentRole = (localStorage.getItem('user_role') as Role) || 'field_worker';
    headers.set('X-Role', currentRole);
  }
  if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }

  try {
    const baseUrl = import.meta.env.VITE_API_URL || '';
    // Ensure we don't duplicate slashes if baseUrl has a trailing slash
    const fullUrl = baseUrl 
      ? `${baseUrl.replace(/\/$/, '')}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`
      : endpoint;

    const response = await fetch(fullUrl, {
      ...options,
      headers,
      signal: controller.signal,
    });

    const isJson = response.headers.get('content-type')?.includes('application/json');
    const data = isJson ? await response.json() : null;

    if (!response.ok) {
      const errPayload: ApiErrorPayload = data?.error || {
        code: `HTTP_${response.status}`,
        message: response.statusText || 'Request failed',
      };
      throw new ApiError(response.status, errPayload);
    }

    return data as T;
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutMs}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

export const apiClient = {
  get: <T = any>(endpoint: string, options?: RequestInit & { bypassOfflineSim?: boolean }) =>
    apiRequest<T>(endpoint, { ...options, method: 'GET' }),
  post: <T = any>(endpoint: string, body?: any, options?: RequestInit & { bypassOfflineSim?: boolean }) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),
  patch: <T = any>(endpoint: string, body?: any, options?: RequestInit & { bypassOfflineSim?: boolean }) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    }),
  delete: <T = any>(endpoint: string, options?: RequestInit & { bypassOfflineSim?: boolean }) =>
    apiRequest<T>(endpoint, { ...options, method: 'DELETE' }),
};

export async function fetchReports() {
  return apiRequest<{ items: any[] }>('/api/reports');
}
