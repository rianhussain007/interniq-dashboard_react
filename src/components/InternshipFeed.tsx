import { useState, useEffect } from 'react';
import { Bookmark, CheckCircle2, ExternalLink, FileCheck, Loader2, MapPin, RefreshCw, Search, Briefcase } from 'lucide-react';
import { apiRequest, internshipSearchPath, type Internship } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
const InternshipCard = ({
  internship,
  onSave,
  onTrack,
  actionState,
  pendingActions,
}: {
  internship: Internship;
  onSave: (internshipId: string) => void;
  onTrack: (internshipId: string) => void;
  actionState?: { saved?: boolean; applied?: boolean };
  pendingActions: Record<string, boolean>;
}) => (
  <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 flex flex-col">
    <div className="flex-grow">
      <div className="flex justify-between items-start">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">{internship.title}</h3>
        <span className={`px-3 py-1 text-xs font-bold rounded-full text-white ${internship.source === 'LinkedIn' ? 'bg-blue-600' : 'bg-teal-500'}`}>
          {internship.source}
        </span>
      </div>
      <p className="text-md text-indigo-600 dark:text-indigo-400 font-semibold mt-1">{internship.company}</p>
      <div className="flex items-center text-gray-600 dark:text-gray-400 mt-2 text-sm">
        <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
        <span>{internship.location}</span>
      </div>
      <div className="flex items-center text-gray-600 dark:text-gray-400 mt-2 text-sm">
        <Briefcase className="h-4 w-4 mr-2 flex-shrink-0" />
        <span>{internship.stipend || internship.mode || 'Not Disclosed'}</span>
      </div>
      {internship.skills && internship.skills.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {internship.skills.slice(0, 4).map((skill) => (
            <span key={skill} className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-200">
              {skill}
            </span>
          ))}
        </div>
      )}
    </div>
    <div className="mt-6 grid grid-cols-3 gap-2">
      <button
        onClick={() => onSave(internship.id)}
        disabled={pendingActions[`${internship.id}:save`]}
        className="inline-flex items-center justify-center rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-wait disabled:opacity-60 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-700"
        aria-label={actionState?.saved ? `${internship.title} saved` : `Save ${internship.title}`}
        aria-pressed={Boolean(actionState?.saved)}
        title={actionState?.saved ? 'Saved' : 'Save internship'}
      >
        {pendingActions[`${internship.id}:save`] ? <Loader2 className="h-4 w-4 animate-spin" /> : actionState?.saved ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Bookmark className="h-4 w-4" />}
      </button>
      <button
        onClick={() => onTrack(internship.id)}
        disabled={pendingActions[`${internship.id}:track`]}
        className="inline-flex items-center justify-center rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-wait disabled:opacity-60 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-700"
        aria-label={actionState?.applied ? `${internship.title} application tracked` : `Track application for ${internship.title}`}
        aria-pressed={Boolean(actionState?.applied)}
        title={actionState?.applied ? 'Application tracked' : 'Track application'}
      >
        {pendingActions[`${internship.id}:track`] ? <Loader2 className="h-4 w-4 animate-spin" /> : actionState?.applied ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <FileCheck className="h-4 w-4" />}
      </button>
      <a
        href={internship.apply_link}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
        aria-label={`Open application link for ${internship.title}`}
      >
        <ExternalLink className="h-4 w-4" />
      </a>
    </div>
  </div>
);

export const InternshipFeed = () => {
  const { user } = useAuth();
  const [allInternships, setAllInternships] = useState<Internship[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [location, setLocation] = useState('');
  const [source, setSource] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionState, setActionState] = useState<Record<string, { saved?: boolean; applied?: boolean }>>({});
  const [pendingActions, setPendingActions] = useState<Record<string, boolean>>({});
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    const timeoutId = window.setTimeout(async () => {
      try {
        const data = await apiRequest<Internship[]>(internshipSearchPath({
          q: searchTerm.trim() || undefined,
          location: location.trim() || undefined,
          source,
        }), { signal: controller.signal });
        if (!controller.signal.aborted) setAllInternships(data);
      } catch (err: unknown) {
        if (controller.signal.aborted) return;
        console.error('Failed to fetch internships:', err);
        setError(err instanceof Error
          ? err.message
          : 'Failed to load internships. Please check your connection and try again.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [searchTerm, location, source, retryCount]);

  const handleSave = async (internshipId: string) => {
    if (!user?.id) {
      setActionError('Sign in to save internships to your shortlist.');
      return;
    }
    const actionKey = `${internshipId}:save`;
    setActionError(null);
    setPendingActions((current) => ({ ...current, [actionKey]: true }));
    try {
      await apiRequest('/api/saved', {
        method: 'POST',
        body: JSON.stringify({ user_id: user.id, internship_id: internshipId }),
      });
      setActionState((current) => ({
        ...current,
        [internshipId]: { ...current[internshipId], saved: true },
      }));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not save internship.');
    } finally {
      setPendingActions((current) => {
        const next = { ...current };
        delete next[actionKey];
        return next;
      });
    }
  };

  const handleTrack = async (internshipId: string) => {
    if (!user?.id) {
      setActionError('Sign in to track internship applications.');
      return;
    }
    const actionKey = `${internshipId}:track`;
    setActionError(null);
    setPendingActions((current) => ({ ...current, [actionKey]: true }));
    try {
      await apiRequest('/api/applications', {
        method: 'POST',
        body: JSON.stringify({ user_id: user.id, internship_id: internshipId, status: 'applied' }),
      });
      setActionState((current) => ({
        ...current,
        [internshipId]: { ...current[internshipId], applied: true },
      }));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not track application.');
    } finally {
      setPendingActions((current) => {
        const next = { ...current };
        delete next[actionKey];
        return next;
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">Find Your Next Internship</h1>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">Your journey to a dream career starts here.</p>
        </header>

        <div className="flex flex-col md:flex-row gap-8">
          {/* Filters Sidebar */}
          <aside className="md:w-1/4">
            <div className="sticky top-24 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
              <h2 className="text-2xl font-bold mb-6">Filters</h2>
              <div className="space-y-6">
                <div>
                  <label htmlFor="search" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Keyword Search</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      id="search"
                      placeholder="Title, company..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 border-transparent focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="location" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Location</label>
                  <input
                    type="text"
                    id="location"
                    placeholder="City, state, remote..."
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 border-transparent focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label htmlFor="source" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Source</label>
                  <select
                    id="source"
                    value={source}
                    onChange={e => setSource(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 border-transparent focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option>All</option>
                    <option>Internshala</option>
                    <option>LinkedIn</option>
                    <option>Naukri</option>
                  </select>
                </div>
              </div>
            </div>
          </aside>

          {/* Internship Listings */}
          <main className="md:w-3/4">
            {actionError && (
              <div role="alert" className="mb-5 flex items-center justify-between gap-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
                <p>{actionError}</p>
                <button type="button" onClick={() => setActionError(null)} className="font-semibold underline">Dismiss</button>
              </div>
            )}
            {loading ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md animate-pulse">
                    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-4"></div>
                    <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-12 px-4">
                <h2 className="text-2xl font-bold text-red-600 dark:text-red-400">Failed to Load Internships</h2>
                <p className="mx-auto mt-3 max-w-xl text-sm text-gray-600 dark:text-gray-300">{error}</p>
                <button
                  type="button"
                  onClick={() => setRetryCount((count) => count + 1)}
                  className="mt-5 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
                >
                  <RefreshCw className="h-4 w-4" />
                  Try again
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {allInternships.length > 0 ? (
                  allInternships.map(internship => (
                    <InternshipCard
                      key={internship.id}
                      internship={internship}
                      onSave={handleSave}
                      onTrack={handleTrack}
                      actionState={actionState[internship.id]}
                      pendingActions={pendingActions}
                    />
                  ))
                ) : (
                  <div className="lg:col-span-2 text-center py-12">
                    <h3 className="text-xl font-semibold">No Internships Found</h3>
                    <p className="text-gray-500 mt-2">Try adjusting your filters to find more opportunities.</p>
                  </div>
                )}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};
