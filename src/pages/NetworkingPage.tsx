import { useEffect, useMemo, useState } from 'react';
import { Check, Copy, MessageCircle, RotateCcw } from 'lucide-react';
import { CareerToolLayout, inputClass, labelClass, toolCardClass } from '../components/CareerToolLayout';

type MessageType = 'connect' | 'informational' | 'thanks';
const messageTypeLabels: Record<MessageType, string> = { connect: 'Connection note', informational: 'Informational chat request', thanks: 'Thank-you follow-up' };

const NetworkingPage = () => {
  const [type, setType] = useState<MessageType>('connect');
  const [yourName, setYourName] = useState('');
  const [theirName, setTheirName] = useState('');
  const [sharedContext, setSharedContext] = useState('');
  const [specificDetail, setSpecificDetail] = useState('');
  const [copyStatus, setCopyStatus] = useState('');

  const message = useMemo(() => {
    const recipient = theirName.trim() || '[Name]';
    const sender = yourName.trim() || '[Your name]';
    const context = sharedContext.trim();
    const detail = specificDetail.trim();
    if (type === 'connect') return `Hi ${recipient}, I'm ${sender}${context ? `, ${context}` : ''}. ${detail ? `I noticed ${detail}. ` : ''}I'd love to connect and learn more about your work. Thanks!`;
    if (type === 'informational') return `Hi ${recipient}, I'm ${sender}${context ? `, ${context}` : ''}. ${detail ? `I was interested to read about ${detail}. ` : ''}Would you be open to a brief 15-minute conversation about your experience? I understand if your schedule is full. Thank you for considering it.`;
    return `Hi ${recipient}, thank you for taking the time to speak with me. ${detail ? `I especially appreciated your perspective on ${detail}. ` : ''}Our conversation gave me a clearer next step, and I appreciate your generosity. Best, ${sender}`;
  }, [type, yourName, theirName, sharedContext, specificDetail]);

  useEffect(() => { setCopyStatus(''); }, [type, yourName, theirName, sharedContext, specificDetail]);

  const copyMessage = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopyStatus('Copied. Personalize the draft before sending.');
    } catch {
      setCopyStatus('Clipboard access is unavailable. Select the message and copy it manually.');
    }
  };

  return (
    <CareerToolLayout eyebrow="Career practice" title="Networking message studio" description="Start with a short, respectful note and make it specific to the person. Choose a message type, add your context, then review the draft before you send it anywhere.">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <section className={toolCardClass}>
          <label className={labelClass} htmlFor="message-type">Message type</label>
          <select id="message-type" className={inputClass} value={type} onChange={(event) => { setType(event.target.value as MessageType); setCopyStatus(''); }}>
            {(Object.entries(messageTypeLabels) as [MessageType, string][]).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className={labelClass}>Your name<input className={inputClass} value={yourName} onChange={(event) => setYourName(event.target.value)} placeholder="Jordan" /></label>
            <label className={labelClass}>Their name<input className={inputClass} value={theirName} onChange={(event) => setTheirName(event.target.value)} placeholder="Alex" /></label>
          </div>
          {type !== 'thanks' && <label className={`${labelClass} mt-4 block`}>Your context<input className={inputClass} value={sharedContext} onChange={(event) => setSharedContext(event.target.value)} placeholder="a computer science student exploring data internships" /></label>}
          <label className={`${labelClass} mt-4 block`}>{type === 'thanks' ? 'One thing you appreciated' : 'A specific reason you are reaching out'}<textarea className={inputClass} rows={3} maxLength={300} value={specificDetail} onChange={(event) => setSpecificDetail(event.target.value)} placeholder={type === 'thanks' ? 'your advice about preparing for a technical interview' : 'your recent accessibility project or a talk you gave'} /></label>
          <div className="mt-5 rounded-xl bg-slate-50 p-4 dark:bg-slate-950"><h2 className="text-sm font-bold">Before sending</h2><ul className="mt-2 list-inside list-disc space-y-1 text-sm text-slate-600 dark:text-slate-300"><li>Check the person's name and the detail you mention.</li><li>Keep the request easy to answer and pressure-free.</li><li>Do not imply a relationship or experience you do not have.</li></ul></div>
        </section>

        <section className={`${toolCardClass} flex flex-col`} aria-labelledby="message-preview-title">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-300"><MessageCircle className="h-5 w-5" aria-hidden="true" /><p className="text-sm font-bold uppercase tracking-wider">Preview</p></div>
          <h2 id="message-preview-title" className="mt-2 text-xl font-bold">{messageTypeLabels[type]}</h2>
          <textarea aria-label="Message draft preview" className={`${inputClass} mt-4 min-h-52 flex-1 leading-6`} value={message} readOnly />
          <div className="mt-3 flex items-center justify-between gap-3 text-xs text-slate-500"><span>{message.length} characters · edit the fields to personalize</span><button type="button" onClick={() => { setYourName(''); setTheirName(''); setSharedContext(''); setSpecificDetail(''); setCopyStatus(''); }} className="inline-flex items-center gap-1 rounded px-2 py-1 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"><RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> Reset</button></div>
          <button type="button" onClick={copyMessage} className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"><Copy className="h-4 w-4" aria-hidden="true" /> Copy draft</button>
          <p className="mt-3 min-h-5 text-sm text-slate-600 dark:text-slate-300" role="status">{copyStatus && <><Check className="mr-1 inline h-4 w-4 text-emerald-600" aria-hidden="true" />{copyStatus}</>}</p>
        </section>
      </div>
    </CareerToolLayout>
  );
};

export default NetworkingPage;
