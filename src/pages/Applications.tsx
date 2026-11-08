import React, { useEffect, useState } from 'react';
import { ExternalLink, FileCheck, Loader2 } from 'lucide-react';
import { apiRequest, type ApplicationRecord } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

const statusStyles: Record<ApplicationRecord['status'], string> = {
  applied: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-200',
  interviewing: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-200',
  offer: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200',
  rejected: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-200',
  withdrawn: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
};

export default function Applications() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchApplications = async () => {
      if (!user?.id) return;
      try {
        setLoading(true);
        const data = await apiRequest<ApplicationRecord[]>(`/api/applications?user_id=${encodeURIComponent(user.id)}`);
        setApplications(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load applications.');
      } finally {
        setLoading(false);
      }
    };

    fetchApplications();
  }, [user?.id]);

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8 text-gray-950 dark:bg-gray-900 dark:text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-200">
            <FileCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Applications</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Track applications created from internship cards.</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading applications...
          </div>
        ) : error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">
            {error}
          </div>
        ) : applications.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 bg-white p-10 text-center dark:border-gray-700 dark:bg-gray-800">
            <h2 className="text-lg font-semibold">No tracked applications yet</h2>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Use the file-check action on an internship card after you apply.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-800">
            <div className="grid grid-cols-12 border-b border-gray-200 px-5 py-3 text-xs font-bold uppercase tracking-wide text-gray-500 dark:border-gray-700 dark:text-gray-400">
              <span className="col-span-5">Role</span>
              <span className="col-span-3">Company</span>
              <span className="col-span-2">Status</span>
              <span className="col-span-2 text-right">Posting</span>
            </div>
            {applications.map((application) => (
              <article key={application.id} className="grid grid-cols-12 items-center gap-3 border-b border-gray-100 px-5 py-4 last:border-b-0 dark:border-gray-700">
                <div className="col-span-12 sm:col-span-5">
                  <h2 className="font-semibold">{application.internship.title}</h2>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{application.internship.location || 'Location not specified'}</p>
                </div>
                <p className="col-span-6 text-sm font-medium sm:col-span-3">{application.internship.company}</p>
                <div className="col-span-4 sm:col-span-2">
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold capitalize ${statusStyles[application.status]}`}>
                    {application.status}
                  </span>
                </div>
                <div className="col-span-2 text-right">
                  <a
                    href={application.internship.apply_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-700"
                    aria-label={`Open ${application.internship.title} posting`}
                  >
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
