import { useEffect, useState } from 'react';
import { ExternalLink, FileCheck, Loader2, Save } from 'lucide-react';
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
  const [actionError, setActionError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<Record<string, boolean>>({});
  const [draftNotes, setDraftNotes] = useState<Record<string, string>>({});
  const [savingNotes, setSavingNotes] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchApplications = async () => {
      if (!user?.id) return;
      try {
        setLoading(true);
        const data = await apiRequest<ApplicationRecord[]>(`/api/applications?user_id=${encodeURIComponent(user.id)}`);
        setApplications(data);
        setDraftNotes(Object.fromEntries(data.map((application) => [application.id, application.notes ?? ''])));
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load applications.');
      } finally {
        setLoading(false);
      }
    };

    fetchApplications();
  }, [user?.id]);

  const updateStatus = async (application: ApplicationRecord, status: ApplicationRecord['status']) => {
    if (!user?.id || application.status === status || updating[application.id] || savingNotes[application.id]) return;
    setActionError(null);
    setUpdating((current) => ({ ...current, [application.id]: true }));

    try {
      const result = await apiRequest<{ status: ApplicationRecord['status']; updated_at: string }>('/api/applications', {
        method: 'POST',
        body: JSON.stringify({
          user_id: user.id,
          internship_id: application.internship.id,
          status,
          notes: application.notes ?? null,
        }),
      });
      setApplications((current) => current.map((item) => (
        item.id === application.id
          ? { ...item, status: result.status, updated_at: result.updated_at }
          : item
      )));
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Could not update application status.');
    } finally {
      setUpdating((current) => {
        const next = { ...current };
        delete next[application.id];
        return next;
      });
    }
  };

  const saveNotes = async (application: ApplicationRecord) => {
    if (!user?.id || updating[application.id] || savingNotes[application.id]) return;
    const notes = (draftNotes[application.id] ?? '').trim();
    setActionError(null);
    setSavingNotes((current) => ({ ...current, [application.id]: true }));

    try {
      const result = await apiRequest<{ status: ApplicationRecord['status']; updated_at: string }>('/api/applications', {
        method: 'POST',
        body: JSON.stringify({
          user_id: user.id,
          internship_id: application.internship.id,
          status: application.status,
          notes: notes || null,
        }),
      });
      setApplications((current) => current.map((item) => (
        item.id === application.id
          ? { ...item, notes: notes || null, updated_at: result.updated_at }
          : item
      )));
      setDraftNotes((current) => ({ ...current, [application.id]: notes }));
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Could not save application notes.');
    } finally {
      setSavingNotes((current) => {
        const next = { ...current };
        delete next[application.id];
        return next;
      });
    }
  };

  return (
    <section aria-label="Application tracker" className="min-h-screen bg-gray-50 px-4 py-8 text-gray-950 dark:bg-gray-900 dark:text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-200">
            <FileCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Applications</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Update each application as it moves through the hiring process.</p>
          </div>
        </div>

        {actionError && (
          <div role="alert" className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">
            {actionError}
          </div>
        )}

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
                  <select
                    value={application.status}
                    onChange={(event) => void updateStatus(application, event.currentTarget.value as ApplicationRecord['status'])}
                    disabled={updating[application.id] || savingNotes[application.id]}
                    aria-label={`Application status for ${application.internship.title}`}
                    aria-busy={Boolean(updating[application.id])}
                    className={`max-w-full rounded-full border-0 px-3 py-1 text-xs font-bold capitalize focus:ring-2 focus:ring-indigo-500 disabled:cursor-wait disabled:opacity-60 ${statusStyles[application.status]}`}
                  >
                    <option value="applied">Applied</option>
                    <option value="interviewing">Interviewing</option>
                    <option value="offer">Offer</option>
                    <option value="rejected">Rejected</option>
                    <option value="withdrawn">Withdrawn</option>
                  </select>
                </div>
                <div className="col-span-2 text-right">
                  {application.internship.apply_link ? (
                    <a
                      href={application.internship.apply_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-700"
                      aria-label={`Open ${application.internship.title} posting`}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  ) : (
                    <span title="Posting link unavailable" className="inline-flex h-9 w-9 cursor-not-allowed items-center justify-center rounded-lg border border-gray-200 text-gray-400 dark:border-gray-700">
                      <ExternalLink className="h-4 w-4" />
                    </span>
                  )}
                </div>
                <details className="col-span-12">
                  <summary className="cursor-pointer text-sm font-semibold text-indigo-700 hover:text-indigo-600 dark:text-indigo-300 dark:hover:text-indigo-200">
                    {application.notes ? 'Edit notes' : 'Add notes'}
                  </summary>
                  <div className="mt-3 rounded-lg bg-gray-50 p-4 dark:bg-gray-900/60">
                    <label htmlFor={`notes-${application.id}`} className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Private notes for this application
                    </label>
                    <textarea
                      id={`notes-${application.id}`}
                      value={draftNotes[application.id] ?? ''}
                      onChange={(event) => setDraftNotes((current) => ({ ...current, [application.id]: event.currentTarget.value }))}
                      maxLength={2000}
                      rows={3}
                      placeholder="Recruiter contact, interview prep, or follow-up date..."
                      className="w-full resize-y rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    />
                    <div className="mt-2 flex items-center justify-between gap-4">
                      <span className="text-xs text-gray-500 dark:text-gray-400">{(draftNotes[application.id] ?? '').length}/2000</span>
                      <button
                        type="button"
                        onClick={() => void saveNotes(application)}
                        disabled={savingNotes[application.id] || updating[application.id] || (draftNotes[application.id] ?? '') === (application.notes ?? '')}
                        className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {savingNotes[application.id] ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        {savingNotes[application.id] ? 'Saving…' : 'Save notes'}
                      </button>
                    </div>
                  </div>
                </details>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
