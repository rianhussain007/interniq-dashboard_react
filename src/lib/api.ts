import { isSupabaseConfigured, supabase } from './supabase';

export type Internship = {
  id: string;
  title: string;
  company: string;
  location: string;
  mode?: string;
  stipend: string;
  skills?: string[];
  apply_link: string | null;
  source: 'LinkedIn' | 'Internshala' | 'Naukri' | string;
  last_seen_at?: string | null;
  posted_date?: string | null;
  deadline?: string | null;
  description?: string;
  similarity?: number;
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
  const session = isSupabaseConfigured
    ? (await supabase.auth.getSession()).data.session
    : null;
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
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

export type InternshipSearchParams = {
  q?: string;
  location?: string;
  source?: string;
  mode?: string;
  sort?: string;
  limit?: number;
  offset?: number;
};

function internshipSearchQuery(params: InternshipSearchParams) {
  const searchParams = new URLSearchParams();
  if (params.q) searchParams.set('q', params.q);
  if (params.location) searchParams.set('location', params.location);
  if (params.source && params.source !== 'All') searchParams.set('source', params.source);
  if (params.mode && params.mode !== 'All') searchParams.set('mode', params.mode);
  if (params.sort) searchParams.set('sort', params.sort);
  if (params.limit !== undefined) searchParams.set('limit', String(params.limit));
  if (params.offset !== undefined) searchParams.set('offset', String(params.offset));
  return searchParams.toString();
}

export function internshipSearchPath(params: InternshipSearchParams) {
  const query = internshipSearchQuery(params);
  return query ? `/api/internships/search?${query}` : '/api/internships';
}

export function semanticInternshipSearchPath(params: InternshipSearchParams) {
  const query = internshipSearchQuery(params);
  return `/api/internships/semantic-search${query ? `?${query}` : ''}`;
}
