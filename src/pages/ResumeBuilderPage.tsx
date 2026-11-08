import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Download, Printer, RotateCcw } from 'lucide-react';
import { CareerToolLayout, inputClass, labelClass, toolCardClass } from '../components/CareerToolLayout';
import { resumeTemplates } from '../lib/resumeTemplates';

type ResumeDraft = {
  name: string;
  targetRole: string;
  email: string;
  location: string;
  linkedIn: string;
  summary: string;
  skills: string;
  experience: string;
  projects: string;
  education: string;
};

const emptyDraft: ResumeDraft = {
  name: '', targetRole: '', email: '', location: '', linkedIn: '', summary: '', skills: '',
  experience: '', projects: '', education: '',
};
const storageKey = 'interniq.resumeDraft.v1';

const readDraft = (): ResumeDraft => {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(storageKey) ?? 'null');
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return emptyDraft;
    const draft = { ...emptyDraft };
    for (const key of Object.keys(emptyDraft) as (keyof ResumeDraft)[]) {
      const value = (saved as Record<string, unknown>)[key];
      if (typeof value === 'string') draft[key] = value;
    }
    return draft;
  } catch {
    return emptyDraft;
  }
};

const lines = (value: string) => value.split('\n').map((line) => line.trim()).filter(Boolean);

const ResumeBuilderPage = () => {
  const [searchParams] = useSearchParams();
  const requestedTemplate = searchParams.get('template');
  const template = resumeTemplates.find((item) => item.id === requestedTemplate) ?? resumeTemplates[0];
  const [draft, setDraft] = useState<ResumeDraft>(readDraft);
  const [savedAt, setSavedAt] = useState('');

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(draft));
      setSavedAt(new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }));
    } catch {
      setSavedAt('');
    }
  }, [draft]);

  const update = (field: keyof ResumeDraft, value: string) => setDraft((current) => ({ ...current, [field]: value }));
  const downloadText = () => {
    const content = [draft.name, draft.targetRole, [draft.email, draft.location, draft.linkedIn].filter(Boolean).join(' | '), '', 'SUMMARY', draft.summary, '', 'SKILLS', draft.skills, '', 'EXPERIENCE', draft.experience, '', 'PROJECTS', draft.projects, '', 'EDUCATION', draft.education].join('\n');
    const url = URL.createObjectURL(new Blob([content], { type: 'text/plain;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${(draft.name || 'my-resume').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.txt`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  return (
    <CareerToolLayout eyebrow="Resume tools" title="Resume builder" description="Draft a focused, evidence-led resume and preview it as you go. Your draft stays in this browser; print or save to PDF when it is ready.">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-950 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-100">
        <span><strong>{template.name} template</strong> · {template.description}</span>
        <span aria-live="polite">{savedAt ? `Saved in this browser at ${savedAt}` : 'Draft is only stored on this device'}</span>
      </div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <section className={`${toolCardClass} resume-editor`} aria-labelledby="resume-editor-heading">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div><h2 id="resume-editor-heading" className="text-lg font-bold">Your details</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">One achievement or item per line works best.</p></div>
            <button type="button" onClick={() => { setDraft(emptyDraft); try { localStorage.removeItem(storageKey); } catch { setSavedAt(''); } }} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"><RotateCcw className="h-4 w-4" aria-hidden="true" /> Reset</button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={labelClass}>Full name<input className={inputClass} autoComplete="name" value={draft.name} onChange={(event) => update('name', event.target.value)} placeholder="Jordan Lee" /></label>
            <label className={labelClass}>Target role<input className={inputClass} value={draft.targetRole} onChange={(event) => update('targetRole', event.target.value)} placeholder="Software Engineering Intern" /></label>
            <label className={labelClass}>Email<input className={inputClass} type="email" autoComplete="email" value={draft.email} onChange={(event) => update('email', event.target.value)} placeholder="jordan@example.com" /></label>
            <label className={labelClass}>Location<input className={inputClass} autoComplete="address-level2" value={draft.location} onChange={(event) => update('location', event.target.value)} placeholder="Austin, TX" /></label>
            <label className={`${labelClass} sm:col-span-2`}>LinkedIn or portfolio<input className={inputClass} value={draft.linkedIn} onChange={(event) => update('linkedIn', event.target.value)} placeholder="linkedin.com/in/jordanlee" /></label>
            <label className={`${labelClass} sm:col-span-2`}>Professional summary<textarea className={inputClass} rows={3} maxLength={500} value={draft.summary} onChange={(event) => update('summary', event.target.value)} placeholder="Your area of focus, strongest skills, and the value you bring." /></label>
            <label className={`${labelClass} sm:col-span-2`}>Skills, separated by commas<textarea className={inputClass} rows={2} value={draft.skills} onChange={(event) => update('skills', event.target.value)} placeholder="Python, SQL, Figma, research" /></label>
            <label className={`${labelClass} sm:col-span-2`}>Experience<textarea className={inputClass} rows={4} value={draft.experience} onChange={(event) => update('experience', event.target.value)} placeholder={'Role · Organization · Dates\nWhat you did, how you did it, and the result'} /></label>
            <label className={`${labelClass} sm:col-span-2`}>Projects<textarea className={inputClass} rows={3} value={draft.projects} onChange={(event) => update('projects', event.target.value)} placeholder={'Project name · tools used\nProblem, contribution, and measurable result'} /></label>
            <label className={`${labelClass} sm:col-span-2`}>Education<textarea className={inputClass} rows={3} value={draft.education} onChange={(event) => update('education', event.target.value)} placeholder={'Degree · Institution · Expected graduation\nRelevant coursework, honors, or activities'} /></label>
          </div>
        </section>
        <section className="resume-preview rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-white dark:text-slate-900 sm:p-9" aria-label="Live resume preview">
          <div className="mb-6 flex justify-end gap-2 resume-toolbar">
            <button type="button" onClick={downloadText} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"><Download className="h-4 w-4" aria-hidden="true" /> Download text</button>
            <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700"><Printer className="h-4 w-4" aria-hidden="true" /> Print / Save PDF</button>
          </div>
          <article className={`mx-auto min-h-[680px] max-w-2xl ${template.id === 'compact' ? 'text-[13px]' : 'text-sm'}`}>
            <header className={`border-b-2 pb-4 ${template.id === 'classic' ? 'border-slate-700 text-center' : 'border-indigo-600'}`}>
              <h2 className="text-3xl font-bold tracking-tight">{draft.name || 'Your name'}</h2>
              <p className="mt-1 text-base font-medium text-slate-600">{draft.targetRole || 'Target internship or role'}</p>
              <p className="mt-2 text-xs text-slate-500">{[draft.email, draft.location, draft.linkedIn].filter(Boolean).join(' · ') || 'Email · Location · LinkedIn / portfolio'}</p>
            </header>
            {([['Summary', draft.summary], ['Skills', draft.skills], ['Experience', draft.experience], ['Projects', draft.projects], ['Education', draft.education]] as const).map(([heading, value]) => {
              const items = heading === 'Skills' ? value.split(',').map((skill) => skill.trim()).filter(Boolean) : lines(value);
              return items.length ? <section className="mt-5" key={heading}><h3 className={`mb-2 text-xs font-bold uppercase tracking-[0.14em] ${template.id === 'classic' ? 'text-slate-800' : 'text-indigo-700'}`}>{heading}</h3>{heading === 'Skills' ? <p className="leading-6">{items.join(' · ')}</p> : <ul className="space-y-1.5">{items.map((item, index) => <li className="leading-6" key={`${heading}-${index}`}>{heading === 'Summary' ? item : <span className="before:mr-2 before:text-indigo-600 before:content-['•']">{item}</span>}</li>)}</ul>}</section> : null;
            })}
            {!draft.summary && !draft.skills && !draft.experience && !draft.projects && !draft.education && <p className="mt-10 rounded-lg border border-dashed border-slate-300 p-5 text-center text-slate-500">Your resume sections will appear here as you write.</p>}
          </article>
        </section>
      </div>
      <style>{'@media print { body * { visibility: hidden !important; } .resume-preview, .resume-preview * { visibility: visible !important; } .resume-preview { position: absolute !important; inset: 0 !important; width: 100% !important; border: 0 !important; box-shadow: none !important; color: #111827 !important; } .resume-toolbar { display: none !important; } .resume-editor { display: none !important; } }'}</style>
    </CareerToolLayout>
  );
};

export default ResumeBuilderPage;
