export const LOCAL_AUTH_TOKEN_KEY = 'interniq.localAccessToken';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

export type LocalAuthUser = {
  id: string;
  email: string;
  name: string;
};

export type LocalAuthResponse = {
  access_token: string;
  token_type: 'bearer';
  expires_at: number;
  user: LocalAuthUser;
};

export function getLocalAccessToken(): string | null {
  try {
    return localStorage.getItem(LOCAL_AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function saveLocalAccessToken(token: string): void {
  localStorage.setItem(LOCAL_AUTH_TOKEN_KEY, token);
}

export function clearLocalAccessToken(): void {
  try {
    localStorage.removeItem(LOCAL_AUTH_TOKEN_KEY);
  } catch {
    // The current in-memory session will still be cleared when storage is unavailable.
  }
}

export async function localAuthRequest<T>(
  path: string,
  token?: string,
  body?: unknown,
  method: 'GET' | 'POST' = body === undefined ? 'GET' : 'POST',
): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method,
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = typeof data.detail === 'string' ? data.detail : response.statusText;
    throw new Error(detail || 'Authentication request failed.');
  }
  return data as T;
}
