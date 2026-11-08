import React, { useEffect, useState } from 'react';
import { Bookmark, ExternalLink, Loader2 } from 'lucide-react';
import { apiRequest, type Internship } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

export default function Saved() {
  const { user } = useAuth();
  const [saved, setSaved] = useState<Internship[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSaved = async () => {
      if (!user?.id) return;
      try {
        setLoading(true);
        const data = await apiRequest<Internship[]>(`/api/saved?user_id=${encodeURIComponent(user.id)}`);
        setSaved(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load saved internships.');
      } finally {
        setLoading(false);
      }
    };

    fetchSaved();
  }, [user?.id]);

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8 text-gray-950 dark:bg-gray-900 dark:text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-200">
            <Bookmark className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Saved Internships</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Bookmarked roles you can revisit and compare.</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading saved internships...
          </div>
        ) : error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">
            {error}
          </div>
        ) : saved.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 bg-white p-10 text-center dark:border-gray-700 dark:bg-gray-800">
            <h2 className="text-lg font-semibold">No saved internships yet</h2>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Use the bookmark action on internship cards to build your shortlist.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {saved.map((internship) => (
              <article key={internship.id} className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-800">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold">{internship.title}</h2>
                    <p className="mt-1 text-sm font-semibold text-indigo-600 dark:text-indigo-300">{internship.company}</p>
                  </div>
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-600 dark:bg-gray-700 dark:text-gray-200">
                    {internship.source}
                  </span>
                </div>
                <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">{internship.location || 'Location not specified'}</p>
                <div className="mt-5">
                  <a
                    href={internship.apply_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
                  >
                    Open posting
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
