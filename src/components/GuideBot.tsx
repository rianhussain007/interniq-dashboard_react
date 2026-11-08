import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { HelpCircle, X } from 'lucide-react';

type Intent = { id: string; label: string; answer: string; link: string; linkLabel: string };

const INTENTS: Intent[] = [
  { id: 'find', label: 'Find internships for me', answer: 'Use keyword or AI semantic search. AI search also uses your profile skills — set them in Profile Setup so results show "Matches your profile".', link: '/internships', linkLabel: 'Go to search' },
  { id: 'resume', label: 'Help with my resume', answer: 'Build → scan against a job description → tailor → export PDF. Start in the Builder, then check it in the Scanner with the JD pasted in.', link: '/resume-builder', linkLabel: 'Open Builder' },
  { id: 'tailor', label: 'Tailor for a specific role', answer: 'Open any internship card and click "Tailor my resume for this role". The Scanner will load that job description for you.', link: '/internships', linkLabel: 'Browse roles' },
  { id: 'track', label: 'Track my applications', answer: 'Save roles you like, then track them in Applications. Your dashboard counts applied / interviewing / offers.', link: '/applications', linkLabel: 'Open Applications' },
  { id: 'community', label: 'Meet other students', answer: 'Join a community, post a question, and RSVP to events. You get notifications when someone posts in your community.', link: '/community', linkLabel: 'Open Community' },
  { id: 'mentor', label: 'Ask a career question', answer: 'The Mentor answers with sources from real postings and your profile. It needs an account and provider keys on the server.', link: '/branding-tips', linkLabel: 'Career tips' },
];

const GuideBot = () => {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<Intent | null>(null);
  const location = useLocation();
  return (
    <div className="fixed bottom-4 right-4 z-[60]">
      {open && (
        <div className="mb-3 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-700 dark:bg-gray-800" role="dialog" aria-label="InternIQ guide">
          <div className="flex items-start justify-between gap-2">
            <div><p className="font-bold">InternIQ Guide</p><p className="text-xs text-slate-500">I guide you through the app. For career advice, use the Mentor.</p></div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close guide" className="rounded p-1 hover:bg-slate-100 dark:hover:bg-gray-700"><X className="h-4 w-4" /></button>
          </div>
          <p className="mt-2 text-xs text-slate-500">You are on: {location.pathname}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {INTENTS.map((i) => <button key={i.id} type="button" onClick={() => setActive(i)} className="rounded-full border border-indigo-200 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-300 dark:hover:bg-indigo-500/10">{i.label}</button>)}
          </div>
          {active && (
            <div className="mt-3 rounded-xl bg-indigo-50 p-3 text-sm dark:bg-indigo-950/40">
              <p>{active.answer}</p>
              <Link to={active.link} onClick={() => { setOpen(false); setActive(null); }} className="mt-2 inline-block font-semibold text-indigo-700 underline dark:text-indigo-300">{active.linkLabel} →</Link>
            </div>
          )}
        </div>
      )}
      <button type="button" onClick={() => setOpen((v) => !v)} aria-label="Open InternIQ guide" aria-expanded={open} className="ml-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg hover:bg-indigo-700">
        {open ? <X className="h-5 w-5" /> : <HelpCircle className="h-5 w-5" />}
      </button>
    </div>
  );
};
export default GuideBot;
