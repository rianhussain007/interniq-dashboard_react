import { Link } from 'react-router-dom';
import { ArrowRight, Check } from 'lucide-react';
import { CareerToolLayout, toolCardClass } from '../components/CareerToolLayout';
import { resumeTemplates } from '../lib/resumeTemplates';

const ResumeTemplatesPage = () => (
  <CareerToolLayout eyebrow="Resume tools" title="Resume templates" description="Choose a simple starting point, then tailor every section to the internship. The templates are intentionally text-first so the exported resume stays readable and easy to scan.">
    <div className="grid gap-5 md:grid-cols-3">
      {resumeTemplates.map((template, index) => (
        <article key={template.id} className={`${toolCardClass} flex flex-col`}>
          <div className="mb-5 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950" aria-hidden="true">
            <div className="mx-auto min-h-52 max-w-52 rounded-sm bg-white p-4 shadow-sm">
              <div className={`${template.accent} mb-3 h-1 w-14 rounded-full`} />
              <div className={`${index === 1 ? 'mx-auto' : ''} h-2 w-28 max-w-full rounded bg-slate-800`} />
              <div className={`${index === 1 ? 'mx-auto' : ''} mt-2 h-1.5 w-20 max-w-full rounded bg-slate-300`} />
              <div className={`${index === 1 ? 'mx-auto' : ''} mt-5 h-1.5 w-16 rounded bg-indigo-200`} />
              <div className="mt-2 space-y-1.5"><div className="h-1 w-full rounded bg-slate-200" /><div className="h-1 w-5/6 rounded bg-slate-200" /><div className="h-1 w-4/6 rounded bg-slate-200" /></div>
              <div className="mt-4 h-1.5 w-14 rounded bg-indigo-200" />
              <div className="mt-2 space-y-1.5"><div className="h-1 w-full rounded bg-slate-200" /><div className="h-1 w-3/4 rounded bg-slate-200" /></div>
            </div>
          </div>
          <div className="flex-1">
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-indigo-600 dark:text-indigo-300">Template {String(index + 1).padStart(2, '0')}</p>
            <h2 className="mt-1 text-xl font-bold">{template.name}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{template.style}</p>
          </div>
          <Link to={`/resume-builder?template=${template.id}`} className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
            Use this template <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </article>
      ))}
    </div>
    <div className="mt-6 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-100">
      <Check className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
      <p>All three layouts use standard headings and a single-column reading order. There is no template score or guarantee of passing an employer's screening system.</p>
    </div>
  </CareerToolLayout>
);

export default ResumeTemplatesPage;
