import { useEffect, useState } from 'react';
import { BellRing, CalendarClock, Loader2, MessagesSquare, CheckCircle2, ArrowLeft, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../lib/api';

type NotificationPreferences = {
  match_alerts: boolean;
  deadline_alerts: boolean;
  community_alerts: boolean;
  email_alerts: boolean;
  frequency_minutes: number;
  email_available: boolean;
  email_transport: 'disabled' | 'log' | 'resend';
};

const FREQUENCY_OPTIONS = [
  { value: 0, label: 'Immediately, then every minute while open' },
  { value: 15, label: 'Every 15 minutes while open' },
  { value: 60, label: 'Every hour while open' },
  { value: 240, label: 'Every 4 hours while open' },
];

const ALERT_KINDS = [
  {
    key: 'match_alerts' as const,
    title: 'New internship matches',
    description: 'Postings that overlap at least two of your profile skills.',
    icon: BellRing,
  },
  {
    key: 'deadline_alerts' as const,
    title: 'Application deadlines',
    description: 'A reminder for tracked applications closing within three days.',
    icon: CalendarClock,
  },
  {
    key: 'community_alerts' as const,
    title: 'Community posts',
    description: 'New posts in communities you have joined.',
    icon: MessagesSquare,
  },
];

export default function AlertSettingsPage() {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [savedPreferences, setSavedPreferences] = useState<NotificationPreferences | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    let active = true;
    void apiRequest<NotificationPreferences>('/api/notifications/preferences')
      .then((data) => {
        if (!active) return;
        setPreferences(data);
        setSavedPreferences(data);
      })
      .catch((error: Error) => {
        if (active) setLoadError(error.message || 'Could not load your alert settings.');
      });
    return () => {
      active = false;
    };
  }, []);

  const isDirty = Boolean(
    preferences &&
      savedPreferences &&
      (preferences.match_alerts !== savedPreferences.match_alerts ||
        preferences.deadline_alerts !== savedPreferences.deadline_alerts ||
        preferences.community_alerts !== savedPreferences.community_alerts ||
        preferences.email_alerts !== savedPreferences.email_alerts ||
        preferences.frequency_minutes !== savedPreferences.frequency_minutes),
  );

  const toggleKind = (key: 'match_alerts' | 'deadline_alerts' | 'community_alerts' | 'email_alerts') => {
    setPreferences((current) => (current ? { ...current, [key]: !current[key] } : current));
    setJustSaved(false);
  };

  const save = async () => {
    if (!preferences || isSaving) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      const payload = {
        match_alerts: preferences.match_alerts,
        deadline_alerts: preferences.deadline_alerts,
        community_alerts: preferences.community_alerts,
        email_alerts: preferences.email_alerts,
        frequency_minutes: preferences.frequency_minutes,
      };
      const updated = await apiRequest<NotificationPreferences>('/api/notifications/preferences', {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      setPreferences(updated);
      setSavedPreferences(updated);
      setJustSaved(true);
      window.dispatchEvent(new Event('interniq:alerts-settings-updated'));
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Could not save your alert settings.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10 dark:bg-gray-900">
      <div className="container mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <Link to="/internships" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:underline dark:text-indigo-300">
          <ArrowLeft className="h-4 w-4" /> Back to internships
        </Link>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Alert settings</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Choose which alerts reach you and how often InternIQ checks while you use the app.
          </p>

          {loadError ? (
            <p role="alert" className="mt-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
              {loadError}
            </p>
          ) : preferences === null ? (
            <div className="mt-6 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400" role="status">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading your settings…
            </div>
          ) : (
            <>
              <fieldset className="mt-6 space-y-4">
                <legend className="sr-only">Alert types</legend>
                {ALERT_KINDS.map(({ key, title, description, icon: Icon }) => (
                  <label
                    key={key}
                    className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 p-4 hover:border-indigo-300 dark:border-gray-700 dark:hover:border-indigo-400"
                  >
                    <input
                      type="checkbox"
                      checked={preferences[key]}
                      onChange={() => toggleKind(key)}
                      className="mt-1 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="flex-1">
                      <span className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                        <Icon className="h-4 w-4 text-indigo-600 dark:text-indigo-300" /> {title}
                      </span>
                      <span className="mt-1 block text-sm text-gray-600 dark:text-gray-400">{description}</span>
                    </span>
                  </label>
                ))}
              </fieldset>

              <label
                className={`mt-6 flex items-start gap-3 rounded-xl border border-gray-200 p-4 dark:border-gray-700 ${preferences.email_available ? 'cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-400' : 'opacity-70'}`}
              >
                <input
                  type="checkbox"
                  checked={preferences.email_alerts}
                  disabled={!preferences.email_available}
                  onChange={() => toggleKind('email_alerts')}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="flex-1">
                  <span className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                    <Mail className="h-4 w-4 text-indigo-600 dark:text-indigo-300" /> Email match and deadline alerts
                  </span>
                  <span className="mt-1 block text-sm text-gray-600 dark:text-gray-400">
                    {preferences.email_transport === 'log'
                      ? 'Development logging is enabled. Alert emails are written to a local file on this server and are not sent to your inbox. Community alerts stay in the app.'
                      : preferences.email_available
                      ? 'One summary email is sent to your account address when new matches or deadline alerts are created. Community alerts stay in the app.'
                      : 'Email delivery is not configured on this server yet. Ask the administrator to set an email API key and sender address.'}
                  </span>
                </span>
              </label>

              <fieldset className="mt-6">
                <legend className="text-sm font-semibold text-gray-900 dark:text-white">Check for new alerts</legend>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {FREQUENCY_OPTIONS.map((option) => (
                    <label
                      key={option.value}
                      className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:border-indigo-300 dark:border-gray-700 dark:text-gray-200 dark:hover:border-indigo-400"
                    >
                      <input
                        type="radio"
                        name="alert-frequency"
                        value={option.value}
                        checked={preferences.frequency_minutes === option.value}
                        onChange={() => {
                          setPreferences({ ...preferences, frequency_minutes: option.value });
                          setJustSaved(false);
                        }}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Checks run only while the app is open. For the immediate option, checks repeat every minute; each posting and deadline alerts once.
                </p>
              </fieldset>

              {saveError && (
                <p role="alert" className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
                  {saveError}
                </p>
              )}

              <div className="mt-6 flex items-center gap-3">
                <button
                  type="button"
                  onClick={save}
                  disabled={!isDirty || isSaving}
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save changes
                </button>
                {justSaved && !isDirty && (
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600 dark:text-emerald-400" role="status">
                    <CheckCircle2 className="h-4 w-4" /> Saved
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
