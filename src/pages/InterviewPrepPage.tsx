import { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, Eye, EyeOff, MessageSquareText, RotateCcw } from 'lucide-react';
import { CareerToolLayout, inputClass, labelClass, toolCardClass } from '../components/CareerToolLayout';

type PracticeQuestion = { prompt: string; intent: string; prompts: string[] };
const sharedQuestions: PracticeQuestion[] = [
  { prompt: 'Tell me about yourself.', intent: 'The interviewer is looking for a concise story that connects your present skills to this opportunity.', prompts: ['Your current focus or studies', 'One relevant project or experience', 'Why this role is a logical next step'] },
  { prompt: 'Tell me about a challenge you worked through.', intent: 'Use a specific example and make your contribution easy to understand.', prompts: ['Situation: set the context briefly', 'Task: name the goal or obstacle', 'Action: explain what you personally did', 'Result: share the outcome and what you learned'] },
  { prompt: 'What would you like to learn in this internship?', intent: 'Connect your learning goals to the actual work and show how you will contribute while learning.', prompts: ['Choose one concrete skill or area', 'Explain why it matters for your direction', 'Say how you would put the learning to use'] },
  { prompt: 'What questions do you have for us?', intent: 'Prepare thoughtful questions that help you understand the work and the team.', prompts: ['What would a useful first month look like?', 'How does the team give feedback to interns?', 'What project would this person likely support?'] },
];
const roleQuestions: Record<string, PracticeQuestion[]> = {
  'Software engineering': [
    { prompt: 'Walk me through a technical project you are proud of.', intent: 'Show how you make decisions, validate your work, and communicate tradeoffs.', prompts: ['Who or what was the project for?', 'What was your part and the hardest decision?', 'How did you test or measure the result?'] },
    { prompt: 'How do you debug something you do not understand yet?', intent: 'Interviewers want a repeatable problem-solving approach, not instant recall.', prompts: ['Reproduce and narrow the issue', 'Check assumptions with logs or a minimal case', 'Test one change at a time and document the fix'] },
  ],
  'Data & analytics': [
    { prompt: 'How would you check whether a dataset is trustworthy?', intent: 'Demonstrate care with definitions, quality, and how conclusions will be used.', prompts: ['Confirm source, scope, and field definitions', 'Check missing, duplicated, and unexpected values', 'Compare totals or samples against a trusted reference'] },
    { prompt: 'Tell me about a time you turned information into a recommendation.', intent: 'Explain how analysis led to a decision, while keeping limits visible.', prompts: ['State the stakeholder question', 'Describe your method and key finding', 'Share the recommendation and any uncertainty'] },
  ],
  'Design & product': [
    { prompt: 'How do you learn what a user needs?', intent: 'Show curiosity, evidence gathering, and the ability to turn observations into a testable next step.', prompts: ['Name the user and the context', 'Describe what you observed or asked', 'Show how the insight changed your design or priority'] },
    { prompt: 'Tell me about feedback that changed your work.', intent: 'Show that you can receive critique without losing sight of the goal.', prompts: ['What was the original goal?', 'What feedback did you receive?', 'What changed, and how did you check the result?'] },
  ],
  'Business & marketing': [
    { prompt: 'How would you decide whether a campaign is working?', intent: 'Connect a clear goal to useful measures and a next action.', prompts: ['Define the audience and intended outcome', 'Choose a primary measure and supporting signals', 'Explain how you would learn from the result'] },
    { prompt: 'Tell me about a time you persuaded someone with an idea.', intent: `Show that you understand the other person's needs and can support your proposal.`, prompts: ['Describe their concern or goal', 'Explain the evidence or framing you used', 'Share the decision or what you learned'] },
  ],
};
const roleOptions = Object.keys(roleQuestions);

const InterviewPrepPage = () => {
  const [role, setRole] = useState(roleOptions[0]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [showFramework, setShowFramework] = useState(false);
  const questions = useMemo(() => [...sharedQuestions.slice(0, 2), ...roleQuestions[role], ...sharedQuestions.slice(2)], [role]);
  const question = questions[questionIndex];

  const changeRole = (nextRole: string) => { setRole(nextRole); setQuestionIndex(0); setAnswer(''); setShowFramework(false); };
  const changeQuestion = (nextIndex: number) => { setQuestionIndex((nextIndex + questions.length) % questions.length); setAnswer(''); setShowFramework(false); };

  return (
    <CareerToolLayout eyebrow="Career practice" title="Interview preparation" description="Practice common internship questions with prompts that help you shape a clear, specific answer. Use the guidance to review yourself; this tool does not record or score your responses.">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)]">
        <aside className={toolCardClass}>
          <label htmlFor="interview-role" className={labelClass}>Practice area</label>
          <select id="interview-role" className={inputClass} value={role} onChange={(event) => changeRole(event.target.value)}>{roleOptions.map((option) => <option key={option}>{option}</option>)}</select>
          <div className="mt-6 rounded-xl bg-indigo-50 p-4 dark:bg-indigo-950/40"><p className="text-sm font-semibold text-indigo-950 dark:text-indigo-100">A simple answer structure</p><ol className="mt-3 space-y-2 text-sm text-indigo-900 dark:text-indigo-200"><li><strong>Context</strong> — give only the details needed.</li><li><strong>Action</strong> — focus on what you did and why.</li><li><strong>Outcome</strong> — explain what changed or what you learned.</li></ol></div>
          <div className="mt-6"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Question list</p><ol className="mt-2 space-y-1">{questions.map((item, index) => <li key={item.prompt}><button type="button" onClick={() => changeQuestion(index)} aria-current={questionIndex === index ? 'step' : undefined} className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${questionIndex === index ? 'bg-indigo-100 font-semibold text-indigo-900 dark:bg-indigo-900/60 dark:text-indigo-100' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'}`}><span className="mr-2 text-xs text-slate-600 dark:text-slate-300">{String(index + 1).padStart(2, '0')}</span>{item.prompt}</button></li>)}</ol></div>
        </aside>

        <section className={toolCardClass} aria-live="polite">
          <div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold text-indigo-600 dark:text-indigo-300">Question {questionIndex + 1} of {questions.length}</p><button type="button" onClick={() => { setAnswer(''); setShowFramework(false); }} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><RotateCcw className="h-4 w-4" aria-hidden="true" /> Clear answer</button></div>
          <h2 className="mt-4 text-2xl font-bold leading-snug">{question.prompt}</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{question.intent}</p>
          <label htmlFor="practice-answer" className={`${labelClass} mt-6`}>Your practice answer <span className="font-normal text-slate-500">(stays in this page)</span></label>
          <textarea id="practice-answer" className={`${inputClass} mt-2`} rows={8} maxLength={3000} value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder="Try saying your answer out loud, then jot down the main points here." />
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500"><span>{answer.trim() ? `${answer.trim().split(/\s+/).length} words · read it aloud once` : 'Tip: one specific example is more memorable than a list of claims.'}</span><span>{answer.length}/3000</span></div>
          <button type="button" onClick={() => setShowFramework((current) => !current)} aria-expanded={showFramework} className="mt-5 inline-flex items-center gap-2 rounded-xl border border-indigo-200 px-4 py-2.5 text-sm font-semibold text-indigo-800 hover:bg-indigo-50 dark:border-indigo-900 dark:text-indigo-200 dark:hover:bg-indigo-950/50">{showFramework ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}{showFramework ? 'Hide answer prompts' : 'Show answer prompts'}</button>
          {showFramework && <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950"><p className="text-sm font-semibold">Use these prompts to review your answer</p><ul className="mt-3 space-y-2">{question.prompts.map((prompt) => <li key={prompt} className="flex gap-2 text-sm leading-5 text-slate-600 dark:text-slate-300"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />{prompt}</li>)}</ul></div>}
          <div className="mt-6 flex justify-between border-t border-slate-200 pt-5 dark:border-slate-800"><button type="button" onClick={() => changeQuestion(questionIndex - 1)} className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Previous</button><button type="button" onClick={() => changeQuestion(questionIndex + 1)} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"><MessageSquareText className="h-4 w-4" aria-hidden="true" /> Next question <ArrowRight className="h-4 w-4" aria-hidden="true" /></button></div>
        </section>
      </div>
    </CareerToolLayout>
  );
};

export default InterviewPrepPage;
