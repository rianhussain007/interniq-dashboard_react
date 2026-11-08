import {
  ArrowRight,
  BellRing,
  Bookmark,
  BriefcaseBusiness,
  Calculator,
  ClipboardCheck,
  FileSearch,
  FileText,
  Github,
  LayoutTemplate,
  MessageSquareText,
  Network,
  Palette,
  UserRound,
  UsersRound,
} from 'lucide-react';
import { Link } from 'react-router-dom';

const workspaceGroups = [
  {
    title: 'Find opportunities',
    description: 'Search current employer listings and keep your pipeline organized.',
    accent: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-200',
    links: [
      { label: 'Browse internships', detail: 'Search live listings', to: '/internships', icon: BriefcaseBusiness },
      { label: 'Saved roles', detail: 'Review your shortlist', to: '/saved', icon: Bookmark },
      { label: 'Applications', detail: 'Track statuses and notes', to: '/applications', icon: ClipboardCheck },
    ],
  },
  {
    title: 'Build your profile',
    description: 'Shape your application materials and make your work easy to review.',
    accent: 'bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-200',
    links: [
      { label: 'Career profile', detail: 'Skills, interests, and goals', to: '/profile-setup', icon: UserRound },
      { label: 'Resume builder', detail: 'Draft, preview, and export', to: '/resume-builder', icon: FileText },
      { label: 'Resume scanner', detail: 'Check PDF content locally', to: '/resume-scanner', icon: FileSearch },
      { label: 'Resume analyzer', detail: 'Compare your resume with a role', to: '/resume-analyzer', icon: ClipboardCheck },
      { label: 'Resume templates', detail: 'Choose a layout', to: '/resume-templates', icon: LayoutTemplate },
      { label: 'GitHub tracker', detail: 'Review public profile and repos', to: '/github-tracker', icon: Github },
      { label: 'Branding tips', detail: 'Improve your online presence', to: '/branding-tips', icon: Palette },
    ],
  },
  {
    title: 'Get career ready',
    description: 'Practice, connect with people, and compare internship offers.',
    accent: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200',
    links: [
      { label: 'Interview prep', detail: 'Practice role-based questions', to: '/interview-prep', icon: MessageSquareText },
      { label: 'Networking studio', detail: 'Write and copy outreach drafts', to: '/networking', icon: Network },
      { label: 'Salary guide', detail: 'Compare offer terms', to: '/salary-guide', icon: Calculator },
      { label: 'Community & events', detail: 'Join groups and share updates', to: '/community', icon: UsersRound },
      { label: 'Alert settings', detail: 'Choose reminders and cadence', to: '/settings/alerts', icon: BellRing },
    ],
  },
];

export const DashboardWorkspace = () => (
  <section className="mt-6" aria-labelledby="workspace-heading">
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-300">Your career workspace</p>
        <h2 id="workspace-heading" className="mt-1 text-2xl font-black tracking-tight">Pick up where you left off</h2>
      </div>
      <p className="max-w-xl text-sm text-zinc-500 dark:text-zinc-400">Internships, application tracking, profile tools, and career prep—all in one place.</p>
    </div>

    <div className="grid gap-4 md:grid-cols-3">
      {workspaceGroups.map((group) => (
        <article key={group.title} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80 sm:p-6">
          <h3 className="text-lg font-bold">{group.title}</h3>
          <p className="mt-1 min-h-10 text-sm leading-5 text-zinc-500 dark:text-zinc-400">{group.description}</p>
          <nav aria-label={group.title} className="mt-4 space-y-1">
            {group.links.map(({ label, detail, to, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className="group/link flex min-w-0 items-center gap-3 rounded-xl px-2.5 py-2.5 transition hover:bg-zinc-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:hover:bg-zinc-800/70"
              >
                <span className={`flex h-9 w-9 flex-none items-center justify-center rounded-lg ${group.accent}`}>
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-zinc-800 dark:text-zinc-100">{label}</span>
                  <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">{detail}</span>
                </span>
                <ArrowRight className="h-4 w-4 flex-none text-zinc-400 transition group-hover/link:translate-x-0.5 group-hover/link:text-indigo-600 dark:group-hover/link:text-indigo-300" aria-hidden="true" />
              </Link>
            ))}
          </nav>
        </article>
      ))}
    </div>
  </section>
);

export default DashboardWorkspace;
