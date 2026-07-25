const STORAGE_KEY = 'dispatch.apiToken';

export interface TokenPayload {
  sub: string;
  iat: number;
  exp: number;
}

// Decode-only: display purposes (which account, when the session expires).
// The backend re-verifies the signature on every request; nothing here is a
// security boundary.
export const decodeToken = (token: string): TokenPayload | null => {
  try {
    const [, body] = token.split('.');
    if (!body) return null;
    const json = atob(body.replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(json) as TokenPayload;
    if (typeof payload.sub !== 'string' || typeof payload.exp !== 'number') return null;
    return payload;
  } catch {
    return null;
  }
};

export const getToken = (): string | null => localStorage.getItem(STORAGE_KEY);

export const setToken = (token: string): void => {
  localStorage.setItem(STORAGE_KEY, token);
};

export const clearToken = (): void => {
  localStorage.removeItem(STORAGE_KEY);
};

export const isTokenLive = (token: string): boolean => {
  const payload = decodeToken(token);
  if (!payload) return false;
  return payload.exp * 1000 > Date.now();
};
