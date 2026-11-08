import { useEffect, useState } from 'react';
import { ArrowRight, BellRing, BriefcaseBusiness, CheckCircle2, Loader2, Sparkles, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

type ProfileResponse = {
  target_role?: unknown;
  skills?: unknown;
};

const asSkills = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((skill): skill is string => typeof skill === 'string' && skill.trim().length > 0)
    : [];

/**
 * Connects a new account to the parts of InternIQ that need a profile.
 * Matching and deadline alerts are useless until the student adds skills, and
 * nothing else in the app says so.
 */
export const ProfileOnboarding = () => {
  const { user } = useAuth();
  const [skills, setSkills] = useState<string[]>([]);
  const [targetRole, setTargetRole] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!user?.id) {
      setSkills([]);
      setTargetRole('');
      setIsLoading(false);
      return;
    }
    let active = true;
    setIsLoading(true);
    setFailed(false);
    void apiRequest<ProfileResponse>('/api/profile')
      .then((profile) => {
        if (!active) return;
        setSkills(asSkills(profile.skills));
        setTargetRole(typeof profile.target_role === 'string' ? profile.target_role.trim() : '');
      })
      .catch(() => {
        // A failed lookup must not invent a "profile incomplete" claim.
        if (active) setFailed(true);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user?.id]);

  if (!user?.id || failed) {
    return null;
  }

  if (isLoading) {
    return (
      <div
        role="status"
        className="mt-6 flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-5 py-4 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/70 dark:text-zinc-400"
      >
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Checking your profile…
      </div>
    );
  }

  const matchHref = targetRole
    ? `/internships?q=${encodeURIComponent(targetRole)}&match=1`
    : '/internships';
  const isReady = skills.length > 0 || targetRole.length > 0;

  if (isReady) {
    return (
      <section
        aria-labelledby="matching-status"
        className="mt-6 flex flex-col gap-4 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 dark:border-emerald-500/30 dark:bg-emerald-500/10 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 flex-none text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
          <div>
            <h2 id="matching-status" className="text-sm font-bold text-emerald-900 dark:text-emerald-100">
              Matching is on{skills.length > 0 ? ` for ${skills.length} skill${skills.length === 1 ? '' : 's'}` : ''}
            </h2>
            <p className="mt-1 text-sm text-emerald-800/90 dark:text-emerald-100/80">
              {targetRole
                ? `Roles aimed at “${targetRole}” are ranked by the skills you listed.`
                : 'Add a target role to sharpen the ranking, or browse current listings.'}
            </p>
          </div>
        </div>
        <div className="flex flex-none flex-wrap gap-2">
          <Link
            to={matchHref}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            See my matches <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link
            to="/profile-setup"
            className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-white/70 px-4 py-2 text-sm font-semibold text-emerald-800 transition hover:bg-white dark:border-emerald-400/30 dark:bg-transparent dark:text-emerald-100"
          >
            Edit profile
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="onboarding-heading"
      className="mt-6 overflow-hidden rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-white p-6 dark:border-indigo-500/30 dark:from-indigo-950/40 dark:via-zinc-900 dark:to-zinc-900"
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-xl">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-bold uppercase tracking-wide text-indigo-700 dark:bg-white/10 dark:text-indigo-200">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> Two minutes to your first match
          </p>
          <h2 id="onboarding-heading" className="mt-3 text-xl font-black text-zinc-900 dark:text-white">
            Tell InternIQ what you can do
          </h2>
          <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
            Matching, ranked search, and internship alerts all read from your profile. Without skills, the feed can only show
            everything — not the roles worth your time.
          </p>
        </div>
        <div className="flex flex-none flex-col gap-2 pr-14 sm:flex-row sm:pr-0 lg:flex-col lg:pr-0">
          <Link
            to="/profile-setup"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            <UserRound className="h-4 w-4" aria-hidden="true" /> Add your skills
          </Link>
          <Link
            to="/internships"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
          >
            <BriefcaseBusiness className="h-4 w-4" aria-hidden="true" /> Browse first
          </Link>
        </div>
      </div>

      <ol className="mt-6 grid gap-3 sm:grid-cols-3">
        {[
          { title: 'Add 3–5 skills', detail: 'Languages, tools, or methods you would use on day one.', icon: UserRound, to: '/profile-setup' },
          { title: 'Review ranked roles', detail: 'See which listings overlap your skills, and why.', icon: BriefcaseBusiness, to: '/internships' },
          { title: 'Turn on alerts', detail: 'Get new matches and closing deadlines without checking.', icon: BellRing, to: '/settings/alerts' },
        ].map((step, index) => (
          <li key={step.title}>
            <Link
              to={step.to}
              className="group flex h-full items-start gap-3 rounded-xl border border-white/70 bg-white/70 p-4 transition hover:border-indigo-300 hover:bg-white dark:border-zinc-800 dark:bg-zinc-950/40 dark:hover:border-indigo-500/50"
            >
              <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-indigo-100 text-xs font-black text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-200">
                {index + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 text-sm font-semibold text-zinc-900 dark:text-white">
                  <step.icon className="h-4 w-4 text-indigo-600 dark:text-indigo-300" aria-hidden="true" /> {step.title}
                </span>
                <span className="mt-1 block text-xs leading-5 text-zinc-600 dark:text-zinc-400">{step.detail}</span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
};

export default ProfileOnboarding;
