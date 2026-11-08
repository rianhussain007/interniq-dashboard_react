import { useRef, useState, type ChangeEvent } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { AlertCircle, CheckCircle2, FileSearch, LoaderCircle, ShieldCheck, Upload, XCircle } from 'lucide-react';
import { CareerToolLayout, inputClass, labelClass, toolCardClass } from '../components/CareerToolLayout';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

type ScanReview = {
  fileName: string;
  pageCount: number;
  emailFound: boolean;
  phoneFound: boolean;
  sections: string[];
  skills: string[];
  metricsCount: number;
  missingKeywords: string[];
  extractedTextLength: number;
};

const maxFileSize = 5 * 1024 * 1024;
const maxPages = 15;
const skillsToFind = ['Python', 'Java', 'JavaScript', 'TypeScript', 'C++', 'C#', 'React', 'Angular', 'Vue.js', 'Node.js', 'SQL', 'PostgreSQL', 'MongoDB', 'AWS', 'Azure', 'Docker', 'Kubernetes', 'Git', 'Machine Learning', 'Data Analysis', 'Figma', 'Excel', 'Tableau', 'Communication', 'Research', 'Leadership', 'Agile'];
const sectionChecks: Array<[string, RegExp]> = [
  ['Education', /\b(education|academic background|coursework)\b/i],
  ['Experience', /\b(experience|employment|internship|work history)\b/i],
  ['Projects', /\b(projects|selected work|portfolio)\b/i],
  ['Skills', /\b(skills|technical skills|tools)\b/i],
];
const stopWords = new Set('about after again against also among and any are because been before being between both but can could did does doing down each few for from further had has have having here how into its itself just more most other our out over own same should some such than that the their them then there these they this those through too under until very was were what when where which while who will with would your using used role internship intern experience required preferred learn team support'.split(' '));

const hasWholeTerm = (text: string, term: string) => {
  let position = text.indexOf(term);
  while (position !== -1) {
    const previous = text[position - 1] ?? '';
    const next = text[position + term.length] ?? '';
    const isWordCharacter = (character: string) => /[a-z0-9+#.]/i.test(character);
    if ((!previous || !isWordCharacter(previous)) && (!next || !isWordCharacter(next))) return true;
    position = text.indexOf(term, position + term.length);
  }
  return false;
};

const reviewPdf = async (file: File, jobDescription: string): Promise<ScanReview> => {
  const loadingTask = pdfjsLib.getDocument({ data: await file.arrayBuffer(), stopAtErrors: true });
  const pdf = await loadingTask.promise;
  if (pdf.numPages > maxPages) {
    await pdf.destroy();
    throw new Error(`This prototype scans up to ${maxPages} pages at a time. Please choose a shorter PDF.`);
  }

  let text = '';
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const pageContent = await page.getTextContent();
    text += ` ${pageContent.items.map((item) => 'str' in item ? item.str : '').join(' ')}`;
  }
  await pdf.destroy();

  const normalized = text.toLowerCase();
  const sections = sectionChecks.filter(([, matcher]) => matcher.test(text)).map(([name]) => name);
  const skills = skillsToFind.filter((skill) => hasWholeTerm(normalized, skill.toLowerCase()));
  const keywords = [...new Set(jobDescription.toLowerCase().match(/[a-z][a-z0-9+#.-]{2,}/g) ?? [])]
    .filter((word) => !stopWords.has(word))
    .slice(0, 60);

  return {
    fileName: file.name,
    pageCount: pdf.numPages,
    emailFound: /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(text),
    phoneFound: /(?:\+?\d[\d ().-]{7,}\d)/.test(text),
    sections,
    skills,
    metricsCount: (text.match(/(?:\$\s?\d[\d,.]*|\b\d+(?:\.\d+)?\s?(?:%|x|k|m|users?|customers?|projects?|hours?|days?|weeks?)\b)/gi) ?? []).length,
    missingKeywords: keywords.filter((keyword) => !normalized.includes(keyword)).slice(0, 12),
    extractedTextLength: text.trim().length,
  };
};

const ResumeScannerPage = () => {
  const fileInput = useRef<HTMLInputElement>(null);
  const [jobDescription, setJobDescription] = useState('');
  const [review, setReview] = useState<ScanReview | null>(null);
  const [error, setError] = useState('');
  const [isScanning, setIsScanning] = useState(false);

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = '';
    setError('');
    setReview(null);
    if (file.size > maxFileSize) { setError('Choose a PDF smaller than 5 MB.'); return; }
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) { setError('Choose a PDF file.'); return; }

    setIsScanning(true);
    try {
      const result = await reviewPdf(file, jobDescription);
      setReview(result);
      if (result.extractedTextLength < 80) setError('This PDF has little or no selectable text. It may be a scanned image; this browser-only prototype does not run OCR.');
    } catch (scanError) {
      setError(scanError instanceof Error ? scanError.message : 'The PDF could not be read. Try exporting it again as a text-based PDF.');
    } finally {
      setIsScanning(false);
    }
  };

  const missingSections = sectionChecks.map(([name]) => name).filter((section) => !review?.sections.includes(section));

  return (
    <CareerToolLayout eyebrow="Resume tools" title="Resume scanner" description="Check for readable contact details, common resume sections, relevant skills, and measurable outcomes. Add a job description to compare its key terms with your resume.">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <section className={toolCardClass} aria-labelledby="scan-upload-title">
          <div className="mb-5 flex items-start gap-3"><div className="rounded-xl bg-indigo-100 p-2.5 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-200"><FileSearch className="h-5 w-5" aria-hidden="true" /></div><div><h2 id="scan-upload-title" className="text-lg font-bold">Run a content check</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">PDF only · up to 5 MB and 15 pages</p></div></div>
          <label className={labelClass} htmlFor="job-description">Job description <span className="font-normal text-slate-500">(optional)</span></label>
          <textarea id="job-description" className={`${inputClass} mb-4`} rows={6} maxLength={8000} value={jobDescription} onChange={(event) => setJobDescription(event.target.value)} placeholder="Paste the internship description to find terms that may be missing from your resume." />
          <input ref={fileInput} type="file" accept="application/pdf,.pdf" className="sr-only" onChange={handleFile} aria-label="Choose resume PDF" />
          <button type="button" onClick={() => fileInput.current?.click()} disabled={isScanning} className="flex min-h-32 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-indigo-300 bg-indigo-50/60 px-5 text-center transition hover:border-indigo-500 hover:bg-indigo-50 disabled:opacity-60 dark:border-indigo-900 dark:bg-indigo-950/30 dark:hover:bg-indigo-950/60">
            {isScanning ? <LoaderCircle className="mb-2 h-6 w-6 animate-spin text-indigo-600" aria-hidden="true" /> : <Upload className="mb-2 h-6 w-6 text-indigo-600" aria-hidden="true" />}
            <span className="font-semibold">{isScanning ? 'Reading resume locally…' : 'Choose a resume PDF'}</span>
            <span className="mt-1 text-xs text-slate-500">The file is processed in this browser</span>
          </button>
          {error && <p className="mt-4 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-100" role="status"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />{error}</p>}
          <div className="mt-5 flex items-start gap-2 text-xs leading-5 text-slate-500 dark:text-slate-400"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /><p>Nothing is uploaded or saved by this scanner. Results are simple text checks, not an employer's ATS score, OCR, or AI review. Only include information you are comfortable analyzing in your browser.</p></div>
        </section>

        <section className={toolCardClass} aria-labelledby="scan-results-title" aria-live="polite">
          <h2 id="scan-results-title" className="text-lg font-bold">Review checklist</h2>
          {!review ? <div className="mt-5 rounded-xl border border-dashed border-slate-300 px-5 py-12 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400"><FileSearch className="mx-auto mb-3 h-8 w-8 opacity-50" aria-hidden="true" />Upload a PDF to see your checklist.</div> : <>
            <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">{review.fileName} · {review.pageCount} {review.pageCount === 1 ? 'page' : 'pages'}</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {[['Email address', review.emailFound], ['Phone number', review.phoneFound], ['Measurable outcomes', review.metricsCount > 0], ['Resume text readable', review.extractedTextLength >= 80]].map(([label, passed]) => <div key={String(label)} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2.5 text-sm dark:bg-slate-800"><CheckOrX passed={Boolean(passed)} /><span>{label}</span></div>)}
            </div>
            <div className="mt-6"><h3 className="text-sm font-bold">Common sections</h3><div className="mt-2 flex flex-wrap gap-2">{sectionChecks.map(([section]) => <span key={section} className={`rounded-full px-3 py-1 text-xs font-semibold ${review.sections.includes(section) ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>{review.sections.includes(section) ? 'Found' : 'Check'} · {section}</span>)}</div>{missingSections.length > 0 && <p className="mt-2 text-xs text-slate-500">If relevant, consider adding: {missingSections.join(', ')}.</p>}</div>
            <div className="mt-6"><h3 className="text-sm font-bold">Skills detected ({review.skills.length})</h3>{review.skills.length ? <div className="mt-2 flex flex-wrap gap-2">{review.skills.map((skill) => <span key={skill} className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200">{skill}</span>)}</div> : <p className="mt-1 text-sm text-slate-500">No terms from the scanner's small example list were found.</p>}</div>
            {jobDescription.trim() && <div className="mt-6"><h3 className="text-sm font-bold">Terms to review in context</h3><p className="mt-1 text-xs text-slate-500">A simple keyword comparison can miss synonyms and context. Add a term only if it accurately describes your experience.</p>{review.missingKeywords.length ? <div className="mt-2 flex flex-wrap gap-2">{review.missingKeywords.map((word) => <span key={word} className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-900 dark:bg-amber-950 dark:text-amber-100">{word}</span>)}</div> : <p className="mt-2 text-sm text-emerald-700 dark:text-emerald-300">No obvious missing terms from the first set checked.</p>}</div>}
          </>}
        </section>
      </div>
    </CareerToolLayout>
  );
};

const CheckOrX = ({ passed }: { passed: boolean }) => passed ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-label="Found" /> : <XCircle className="h-4 w-4 shrink-0 text-slate-400" aria-label="Not found" />;

export default ResumeScannerPage;
