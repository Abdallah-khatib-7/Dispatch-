import { getToken, clearToken } from '@/lib/auth/token';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

export class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST';
  body?: unknown;
  query?: Record<string, string | number | undefined>;
}

const buildQuery = (query?: RequestOptions['query']): string => {
  if (!query) return '';
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== '') params.set(key, String(value));
  }
  const s = params.toString();
  return s ? `?${s}` : '';
};

// One 401 from the backend means the stored token is gone or expired -- there
// is no refresh path (single-account JWT), so the only correct response is to
// drop it and let the route guard send the user back to /connect.
export const apiRequest = async <T>(path: string, opts: RequestOptions = {}): Promise<T> => {
  const token = getToken();
  const res = await fetch(`${API_BASE_URL}${path}${buildQuery(opts.query)}`, {
    method: opts.method ?? 'GET',
    headers: {
      ...(opts.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });

  if (res.status === 401) {
    clearToken();
    window.dispatchEvent(new Event('dispatch:auth-expired'));
  }

  if (!res.ok) {
    let code = 'unknown_error';
    let message = `Request failed with status ${res.status}`;
    try {
      const data = (await res.json()) as { error?: { code?: string; message?: string } };
      if (data.error?.code) code = data.error.code;
      if (data.error?.message) message = data.error.message;
    } catch {
      // Response body wasn't JSON; keep the generic message above.
    }
    throw new ApiError(res.status, code, message);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
};
