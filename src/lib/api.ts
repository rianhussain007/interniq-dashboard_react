export type Internship = {
  id: string;
  title: string;
  company: string;
  location: string;
  mode?: string;
  stipend: string;
  skills?: string[];
  apply_link: string;
  source: 'LinkedIn' | 'Internshala' | 'Naukri' | string;
  posted_date?: string | null;
  deadline?: string | null;
  description?: string;
};

export type ApplicationRecord = {
  id: string;
  status: 'applied' | 'interviewing' | 'offer' | 'rejected' | 'withdrawn';
  notes?: string | null;
  applied_at: string;
  updated_at: string;
  internship: Internship;
};

export const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

export async function apiRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...(options?.body ? { 'Content-Type': 'application/json' } : {}),
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: response.statusText }));
    const detail = typeof errorData.detail === 'string'
      ? errorData.detail
      : errorData.detail?.message || response.statusText;
    throw new Error(detail);
  }

  return response.json() as Promise<T>;
}

export function internshipSearchPath(params: {
  q?: string;
  location?: string;
  source?: string;
}) {
  const searchParams = new URLSearchParams();
  if (params.q) searchParams.set('q', params.q);
  if (params.location) searchParams.set('location', params.location);
  if (params.source && params.source !== 'All') searchParams.set('source', params.source);
  const query = searchParams.toString();
  return query ? `/api/internships/search?${query}` : '/api/internships';
}
