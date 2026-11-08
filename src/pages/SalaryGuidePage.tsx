import { useState } from 'react';
import { Calculator, CircleHelp, Info } from 'lucide-react';
import { CareerToolLayout, inputClass, labelClass, toolCardClass } from '../components/CareerToolLayout';

type PayBasis = 'hourly' | 'weekly' | 'monthly' | 'total';
const formatMoney = (amount: number, currency: string) => new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount);

const SalaryGuidePage = () => {
  const [currency, setCurrency] = useState('USD');
  const [basis, setBasis] = useState<PayBasis>('hourly');
  const [offerAAmount, setOfferAAmount] = useState('25');
  const [offerBAmount, setOfferBAmount] = useState('27');
  const [hoursPerWeek, setHoursPerWeek] = useState('40');
  const [durationWeeks, setDurationWeeks] = useState('12');
  const [offerABenefits, setOfferABenefits] = useState('0');
  const [offerBBenefits, setOfferBBenefits] = useState('0');

  const payA = Math.max(0, Number(offerAAmount) || 0);
  const payB = Math.max(0, Number(offerBAmount) || 0);
  const hours = Math.max(0, Number(hoursPerWeek) || 0);
  const weeks = Math.max(0, Number(durationWeeks) || 0);
  const benefitsA = Math.max(0, Number(offerABenefits) || 0);
  const benefitsB = Math.max(0, Number(offerBBenefits) || 0);
  const contractPay = (pay: number) => basis === 'hourly' ? pay * hours * weeks : basis === 'weekly' ? pay * weeks : basis === 'monthly' ? pay * weeks / (52 / 12) : pay;
  const totalCompA = contractPay(payA) + benefitsA;
  const totalCompB = contractPay(payB) + benefitsB;
  const effectiveHourlyA = hours > 0 && weeks > 0 ? totalCompA / (hours * weeks) : null;
  const effectiveHourlyB = hours > 0 && weeks > 0 ? totalCompB / (hours * weeks) : null;
  const difference = totalCompB - totalCompA;

  return (
    <CareerToolLayout eyebrow="Career practice" title="Compensation comparison" description="Compare two internship offers using their pay basis, weekly hours, term length, and the benefit values you enter. See estimated contract earnings and effective hourly value side by side.">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <section className={toolCardClass}>
          <div className="mb-5 flex items-center gap-3"><div className="rounded-xl bg-indigo-100 p-2.5 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-200"><Calculator className="h-5 w-5" aria-hidden="true" /></div><div><h2 className="text-lg font-bold">Offer assumptions</h2><p className="text-sm text-slate-500 dark:text-slate-400">Enter the figures you want to compare.</p></div></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={labelClass}>Currency<select className={inputClass} value={currency} onChange={(event) => setCurrency(event.target.value)}>{[['USD', 'US dollar'], ['CAD', 'Canadian dollar'], ['EUR', 'Euro'], ['GBP', 'Pound sterling'], ['INR', 'Indian rupee'], ['AUD', 'Australian dollar']].map(([code, name]) => <option key={code} value={code}>{code} · {name}</option>)}</select></label>
            <label className={labelClass}>Pay basis<select className={inputClass} value={basis} onChange={(event) => setBasis(event.target.value as PayBasis)}><option value="hourly">Per hour</option><option value="weekly">Per week</option><option value="monthly">Per month</option><option value="total">Total for the internship</option></select></label>
            <label className={labelClass}>Offer A pay ({currency})<input className={inputClass} type="number" min="0" step="0.01" inputMode="decimal" value={offerAAmount} onChange={(event) => setOfferAAmount(event.target.value)} /></label>
            <label className={labelClass}>Offer B pay ({currency})<input className={inputClass} type="number" min="0" step="0.01" inputMode="decimal" value={offerBAmount} onChange={(event) => setOfferBAmount(event.target.value)} /></label>
            <label className={labelClass}>Hours per week<input className={inputClass} type="number" min="0" max="168" step="1" value={hoursPerWeek} onChange={(event) => setHoursPerWeek(event.target.value)} /></label>
            <label className={labelClass}>Duration (weeks)<input className={inputClass} type="number" min="0" max="260" step="1" value={durationWeeks} onChange={(event) => setDurationWeeks(event.target.value)} /></label>
            <label className={labelClass}>Offer A benefits / stipend ({currency})<input className={inputClass} type="number" min="0" step="0.01" value={offerABenefits} onChange={(event) => setOfferABenefits(event.target.value)} /><span className="mt-1 block text-xs font-normal text-slate-500">Optional total value for this term.</span></label>
            <label className={labelClass}>Offer B benefits / stipend ({currency})<input className={inputClass} type="number" min="0" step="0.01" value={offerBBenefits} onChange={(event) => setOfferBBenefits(event.target.value)} /><span className="mt-1 block text-xs font-normal text-slate-500">Optional total value for this term.</span></label>
          </div>
          <div className="mt-5 flex items-start gap-2 rounded-xl border border-slate-200 p-4 text-sm leading-6 text-slate-600 dark:border-slate-700 dark:text-slate-300"><CircleHelp className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" aria-hidden="true" /><p>Monthly pay is converted using 52 weeks ÷ 12 months. This assumes the entered schedule lasts for the full internship; adjust for unpaid leave or variable hours.</p></div>
        </section>

        <section className={`${toolCardClass} flex flex-col`} aria-live="polite">
          <div className="flex items-start gap-3"><Info className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600" aria-hidden="true" /><div><h2 className="text-lg font-bold">Estimated value for this term</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">A calculation from your inputs, before tax and other deductions.</p></div></div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {[
              { label: 'Offer A', cash: contractPay(payA), total: totalCompA, hourly: effectiveHourlyA },
              { label: 'Offer B', cash: contractPay(payB), total: totalCompB, hourly: effectiveHourlyB },
            ].map((offer) => <dl key={offer.label} className="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700"><dt className="text-sm font-bold text-indigo-700 dark:text-indigo-300">{offer.label}</dt><div><dt className="text-xs text-slate-500">Estimated cash</dt><dd className="text-lg font-bold">{formatMoney(offer.cash, currency)}</dd></div><div><dt className="text-xs text-slate-500">Including entered benefits</dt><dd className="text-lg font-bold">{formatMoney(offer.total, currency)}</dd></div><div><dt className="text-xs text-slate-500">Effective hourly value</dt><dd className="text-sm font-bold">{offer.hourly === null ? 'Enter hours and duration' : `${formatMoney(offer.hourly, currency)} / hour`}</dd></div></dl>)}
          </div>
          <p className="mt-4 rounded-xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100" aria-live="polite">{difference === 0 ? 'The offers are equal using the figures entered.' : `${difference > 0 ? 'Offer B' : 'Offer A'} is higher by ${formatMoney(Math.abs(difference), currency)} over this term.`}</p>
          <div className="mt-5 border-t border-slate-200 pt-4 text-sm leading-6 text-slate-600 dark:border-slate-800 dark:text-slate-300"><h3 className="font-semibold text-slate-800 dark:text-slate-100">Questions to ask before comparing</h3><ul className="mt-2 list-inside list-disc"><li>Are hours, dates, and payment frequency confirmed in writing?</li><li>Are housing, travel, equipment, or other costs your responsibility?</li><li>Does the offer describe benefits, overtime, or time off clearly?</li></ul></div>
          <p className="mt-auto pt-5 text-xs leading-5 text-slate-500">This tool does not include market-rate data, taxes, exchange rates, or legal advice. Compare offers in one currency and verify local rules and written terms.</p>
        </section>
      </div>
    </CareerToolLayout>
  );
};

export default SalaryGuidePage;
