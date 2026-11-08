import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { Bookmark, CalendarDays, CheckCircle2, Clock3, ExternalLink, FileCheck, Loader2, MapPin, RefreshCw, Search, Briefcase } from 'lucide-react';
import { apiRequest, internshipSearchPath, semanticInternshipSearchPath, type ApplicationRecord, type Internship } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

const PAGE_SIZE = 24;
const PAGE_FETCH_SIZE = PAGE_SIZE + 1;

const getDaysUntilDeadline = (deadline: string) => {
  const [year, month, day] = deadline.split('-').map(Number);
  if (!year || !month || !day) return null;

  const now = new Date();
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const dueDate = Date.UTC(year, month - 1, day);
  const parsedDueDate = new Date(dueDate);
  if (
    parsedDueDate.getUTCFullYear() !== year
    || parsedDueDate.getUTCMonth() !== month - 1
    || parsedDueDate.getUTCDate() !== day
  ) return null;

  const daysUntil = Math.round((dueDate - today) / 86_400_000);
  return daysUntil >= 0 ? daysUntil : null;
};

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
}) => {
  const daysUntilDeadline = internship.deadline
    ? getDaysUntilDeadline(internship.deadline)
    : null;
  const deadlineUrgency = daysUntilDeadline === 0
    ? 'Closes today'
    : daysUntilDeadline === 1
      ? 'Closes tomorrow'
      : daysUntilDeadline !== null
        ? `Closes in ${daysUntilDeadline} days`
        : null;
  const deadlineUrgencyClass = daysUntilDeadline !== null && daysUntilDeadline <= 3
    ? 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300'
    : 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300';

  return (
  <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 flex flex-col">
    <div className="flex-grow">
      <div className="flex justify-between items-start">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">{internship.title}</h3>
        <span className={`px-3 py-1 text-xs font-bold rounded-full text-white ${internship.source === 'LinkedIn' ? 'bg-blue-600' : 'bg-teal-500'}`}>
          {internship.source}
        </span>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <p className="text-md text-indigo-600 dark:text-indigo-400 font-semibold">{internship.company}</p>
        {typeof internship.similarity === 'number' && Number.isFinite(internship.similarity) && (
          <span
            className="rounded-full bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-200"
            title="Similarity to your AI search. This is a ranking signal, not a probability."
          >
            AI similarity {internship.similarity.toFixed(2)}
          </span>
        )}
      </div>
      <div className="flex items-center text-gray-600 dark:text-gray-400 mt-2 text-sm">
        <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
        <span>{internship.location}</span>
      </div>
      <div className="flex items-center text-gray-600 dark:text-gray-400 mt-2 text-sm">
        <Briefcase className="h-4 w-4 mr-2 flex-shrink-0" />
        <span>{internship.mode || 'Work mode not disclosed'}</span>
      </div>
      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Stipend: {internship.stipend || 'Not disclosed'}</p>
      {internship.description?.trim() && (
        <p className="mt-3 line-clamp-3 text-sm leading-6 text-gray-600 dark:text-gray-400">
          {internship.description}
        </p>
      )}
      {internship.deadline && (
        <div className="mt-2 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <CalendarDays className="h-4 w-4" />
          <span>Apply by {new Date(`${internship.deadline}T00:00:00`).toLocaleDateString()}</span>
          {deadlineUrgency && daysUntilDeadline !== null && daysUntilDeadline <= 7 && (
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${deadlineUrgencyClass}`}>
              {deadlineUrgency}
            </span>
          )}
        </div>
      )}
      {internship.last_seen_at && (
        <div className="mt-2 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <Clock3 className="h-3.5 w-3.5" />
          <span>Last seen {new Date(internship.last_seen_at).toLocaleDateString()}</span>
        </div>
      )}
      {internship.matched_skills && internship.matched_skills.length > 0 && (
        <p className="mt-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300">Matches your profile: {internship.matched_skills.join(', ')}</p>
      )}
      {internship.skills && internship.skills.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {internship.skills.slice(0, 4).map((skill) => (
            <span key={skill} className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-200">
              {skill}
            </span>
          ))}
        </div>
      )}
      <Link to="/resume-scanner" onClick={() => {
        try {
          localStorage.setItem('interniq.tailorPosting', JSON.stringify({
            title: internship.title,
            company: internship.company,
            skills: internship.skills ?? [],
            description: internship.description ?? '',
          }));
        } catch (storageError) {
          console.warn('Could not save the selected internship in browser storage:', storageError);
        }
      }} className="mt-3 inline-flex text-xs font-semibold text-indigo-700 underline dark:text-indigo-300">Tailor my resume for this role →</Link>
    </div>
    <div className="mt-6 grid grid-cols-3 gap-2">
      <button
        onClick={() => onSave(internship.id)}
        disabled={pendingActions[`${internship.id}:save`]}
        className="inline-flex items-center justify-center rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-wait disabled:opacity-60 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-700"
        aria-label={actionState?.saved ? `Remove ${internship.title} from saved internships` : `Save ${internship.title}`}
        aria-pressed={Boolean(actionState?.saved)}
        title={actionState?.saved ? 'Remove from saved' : 'Save internship'}
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
      {internship.apply_link ? (
        <a
          href={internship.apply_link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          aria-label={`Open application link for ${internship.title}`}
        >
          <ExternalLink className="h-4 w-4" />
        </a>
      ) : (
        <button
          type="button"
          disabled
          title="Application link unavailable"
          aria-label={`Application link unavailable for ${internship.title}`}
          className="inline-flex cursor-not-allowed items-center justify-center rounded-lg bg-gray-300 px-3 py-2 text-sm font-semibold text-gray-600 dark:bg-gray-700 dark:text-gray-400"
        >
          <ExternalLink className="h-4 w-4" />
        </button>
      )}
    </div>
  </div>
  );
};

export const InternshipFeed = () => {
  const { user } = useAuth();
  const currentLocation = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const routeQuery = searchParams.get('q') ?? '';
  const [allInternships, setAllInternships] = useState<Internship[]>([]);
  const [searchTerm, setSearchTerm] = useState(routeQuery);
  const [searchMode, setSearchMode] = useState<'keyword' | 'semantic'>('keyword');
  const [location, setLocation] = useState('');
  const [source, setSource] = useState('All');
  const [mode, setMode] = useState('All');
  const [sort, setSort] = useState('relevance');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionState, setActionState] = useState<Record<string, { saved?: boolean; applied?: boolean }>>({});
  const [pendingActions, setPendingActions] = useState<Record<string, boolean>>({});
  const [retryCount, setRetryCount] = useState(0);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [paginationError, setPaginationError] = useState<string | null>(null);
  const paginationController = useRef<AbortController | null>(null);

  useEffect(() => {
    setSearchTerm(routeQuery);
  }, [routeQuery]);

  const handleSearchTermChange = (value: string) => {
    setSearchTerm(value);
    const nextParams = new URLSearchParams(searchParams);
    if (value.trim()) nextParams.set('q', value);
    else nextParams.delete('q');
    setSearchParams(nextParams, { replace: true });
  };

  const refreshListings = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    setRefreshMessage(null);
    try {
      const result = await apiRequest<{ message: string }>('/api/internships/update', { method: 'POST' });
      setRefreshMessage(result.message);
      setRetryCount((count) => count + 1);
    } catch (refreshError: unknown) {
      setRefreshMessage(refreshError instanceof Error ? refreshError.message : 'Could not refresh internship sources.');
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setHasMore(false);
    setOffset(0);
    setLoadingMore(false);
    setPaginationError(null);
    paginationController.current?.abort();

    const timeoutId = window.setTimeout(async () => {
      try {
        const searchParams = {
          q: searchTerm.trim() || undefined,
          location: location.trim() || undefined,
          source,
          mode,
          sort,
          limit: PAGE_FETCH_SIZE,
          offset: 0,
        };
        const searchPath = searchMode === 'semantic'
          ? semanticInternshipSearchPath(searchParams)
          : internshipSearchPath(searchParams);
        const data = await apiRequest<Internship[]>(searchPath, { signal: controller.signal });
        if (!controller.signal.aborted) {
          const visiblePage = data.slice(0, PAGE_SIZE);
          setAllInternships(visiblePage);
          setOffset(visiblePage.length);
          setHasMore(data.length > PAGE_SIZE);
        }
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
      paginationController.current?.abort();
    };
  }, [searchTerm, searchMode, location, source, mode, sort, retryCount]);

  const loadMore = async () => {
    if (!hasMore || loadingMore) return;
    const controller = new AbortController();
    paginationController.current?.abort();
    paginationController.current = controller;
    setLoadingMore(true);
    setPaginationError(null);

    try {
      const searchParams = {
        q: searchTerm.trim() || undefined,
        location: location.trim() || undefined,
        source,
        mode,
        sort,
        limit: PAGE_FETCH_SIZE,
        offset,
      };
      const searchPath = searchMode === 'semantic'
        ? semanticInternshipSearchPath(searchParams)
        : internshipSearchPath(searchParams);
      const data = await apiRequest<Internship[]>(searchPath, { signal: controller.signal });
      if (controller.signal.aborted) return;

      const visiblePage = data.slice(0, PAGE_SIZE);
      setAllInternships((current) => {
        const knownIds = new Set(current.map((internship) => internship.id));
        return [...current, ...visiblePage.filter((internship) => !knownIds.has(internship.id))];
      });
      setOffset((current) => current + visiblePage.length);
      setHasMore(data.length > PAGE_SIZE);
    } catch (err: unknown) {
      if (controller.signal.aborted) return;
      setPaginationError(err instanceof Error ? err.message : 'Could not load more internships.');
    } finally {
      if (!controller.signal.aborted) {
        setLoadingMore(false);
        paginationController.current = null;
      }
    }
  };

  useEffect(() => {
    let active = true;
    setActionState({});
    setActionError(null);
    setPendingActions({});

    if (!user?.id) {
      setSearchMode('keyword');
      return () => { active = false; };
    }

    const userId = encodeURIComponent(user.id);
    void Promise.all([
      apiRequest<Internship[]>(`/api/saved?user_id=${userId}`),
      apiRequest<ApplicationRecord[]>(`/api/applications?user_id=${userId}`),
    ])
      .then(([savedInternships, applications]) => {
        if (!active) return;
        const nextState: Record<string, { saved?: boolean; applied?: boolean }> = {};
        for (const internship of savedInternships) {
          nextState[internship.id] = { ...nextState[internship.id], saved: true };
        }
        for (const application of applications) {
          const internshipId = application.internship.id;
          nextState[internshipId] = { ...nextState[internshipId], applied: true };
        }
        setActionState(nextState);
      })
      .catch((err: unknown) => {
        if (!active) return;
        console.error('Could not load saved internship and application state:', err);
        setActionError('Could not load your saved and tracked internship status. You can still use the actions below.');
      });

    return () => { active = false; };
  }, [user?.id]);

  const handleSave = async (internshipId: string) => {
    if (!user?.id) {
      setActionError('Sign in to save internships to your shortlist.');
      return;
    }
    const actionKey = `${internshipId}:save`;
    const isSaved = Boolean(actionState[internshipId]?.saved);
    setActionError(null);
    setPendingActions((current) => ({ ...current, [actionKey]: true }));
    try {
      if (isSaved) {
        await apiRequest(`/api/saved/${encodeURIComponent(internshipId)}`, { method: 'DELETE' });
      } else {
        await apiRequest('/api/saved', {
          method: 'POST',
          body: JSON.stringify({ user_id: user.id, internship_id: internshipId }),
        });
      }
      setActionState((current) => ({
        ...current,
        [internshipId]: { ...current[internshipId], saved: !isSaved },
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
                  <label htmlFor="search" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {searchMode === 'semantic' ? 'AI Semantic Search' : 'Keyword Search'}
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      id="search"
                      placeholder={searchMode === 'semantic' ? 'Describe the role you want...' : 'Title, company...'}
                      value={searchTerm}
                      onChange={e => handleSearchTermChange(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 border-transparent focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-70"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setSearchMode((mode) => mode === 'semantic' ? 'keyword' : 'semantic')}
                    disabled={!user?.id || (searchMode === 'keyword' && searchTerm.trim().length < 3)}
                    title={!user?.id ? 'Sign in to use AI semantic search' : undefined}
                    aria-pressed={searchMode === 'semantic'}
                    className="mt-2 rounded-md px-2 py-1 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:text-gray-400 dark:text-indigo-300 dark:hover:bg-indigo-500/10 dark:disabled:text-gray-500"
                  >
                    {searchMode === 'semantic' ? 'AI matching on · Switch to keyword' : user?.id ? 'Try AI semantic search' : 'Sign in for AI semantic search'}
                  </button>
                  {searchMode === 'semantic' && (
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">AI matching uses your query plus your profile skills (set them in Profile Setup). Results show why each role matched.</p>
                  )}
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
                    <option>Jobicy</option>
                    <option>Greenhouse</option>
                    <option>Lever</option>
                    <option>Ashby</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="work-mode" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Work mode</label>
                  <select
                    id="work-mode"
                    value={mode}
                    onChange={(e) => setMode(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 border-transparent focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option>All</option>
                    <option>Remote</option>
                    <option>Hybrid</option>
                    <option>On-site</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="sort-results" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Sort results</label>
                  <select
                    id="sort-results"
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 border-transparent focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="relevance">Most relevant</option>
                    <option value="recent">Recently posted</option>
                    <option value="deadline">Closing soon</option>
                  </select>
                </div>
              </div>
            </div>
          </aside>

          {/* Internship Listings */}
          <main className="md:w-3/4">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-indigo-100 bg-white px-4 py-3 shadow-sm dark:border-indigo-900/60 dark:bg-gray-800">
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">Live career-board listings</p>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Refresh public sources to check for newly published internships.</p>
                {refreshMessage && <p role="status" className="mt-2 text-xs font-medium text-indigo-700 dark:text-indigo-300">{refreshMessage}</p>}
              </div>
              <button
                type="button"
                onClick={() => void refreshListings()}
                disabled={isRefreshing}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-60"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
                {isRefreshing ? 'Checking sources…' : 'Refresh live listings'}
              </button>
            </div>
            {actionError && (
              <div role="alert" className="mb-5 flex items-center justify-between gap-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
                <p>{actionError}</p>
                {!user?.id && (
                  <Link
                    to="/login"
                    state={{ from: currentLocation }}
                    className="shrink-0 font-semibold underline"
                  >
                    Sign in
                  </Link>
                )}
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
                    <h3 className="text-xl font-semibold">No matching live internships</h3>
                    <p className="mx-auto mt-2 max-w-lg text-sm text-gray-500">Try a wider search or refresh the connected public career boards. New listings appear here as soon as a source provides them.</p>
                  </div>
                )}
              </div>
            )}
            {!loading && !error && hasMore && (
              <div className="mt-8 flex flex-col items-center gap-3">
                {paginationError && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{paginationError}</p>}
                <button
                  type="button"
                  onClick={() => void loadMore()}
                  disabled={loadingMore}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-800 transition hover:bg-gray-50 disabled:cursor-wait disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
                >
                  {loadingMore && <Loader2 className="h-4 w-4 animate-spin" />}
                  {loadingMore ? 'Loading…' : 'Load more internships'}
                </button>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};
