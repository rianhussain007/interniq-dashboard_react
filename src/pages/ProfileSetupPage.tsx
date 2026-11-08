import { useEffect, useState, type FormEvent } from 'react';
import { Check, Loader2, Save } from 'lucide-react';
import { apiRequest } from '../lib/api';
import { CareerToolLayout, inputClass, labelClass, toolCardClass } from '../components/CareerToolLayout';
import { useAuth } from '../contexts/AuthContext';

type ProfileDraft = {
  name: string;
  target_role: string;
  location: string;
  education: string;
  graduation_year: string;
  interests: string;
  skills: string;
};

const initialProfile: ProfileDraft = {
  name: '', target_role: '', location: '', education: '', graduation_year: '', interests: '', skills: '',
};

const splitList = (value: string) => [...new Set(value.split(/[,\n]/).map((item) => item.trim()).filter(Boolean))];

export default function ProfileSetupPage() {
  const { user, updateDisplayName } = useAuth();
  const [profile, setProfile] = useState<ProfileDraft>({ ...initialProfile, name: user?.name ?? '' });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let active = true;
    void apiRequest<Record<string, unknown>>('/api/profile')
      .then((data) => {
        if (!active) return;
        setProfile({
          name: typeof data.name === 'string' ? data.name : user?.name ?? '',
          target_role: typeof data.target_role === 'string' ? data.target_role : '',
          location: typeof data.location === 'string' ? data.location : '',
          education: typeof data.education === 'string' ? data.education : '',
          graduation_year: typeof data.graduation_year === 'string' ? data.graduation_year : '',
          interests: Array.isArray(data.interests) ? data.interests.filter((value): value is string => typeof value === 'string').join(', ') : '',
          skills: Array.isArray(data.skills) ? data.skills.filter((value): value is string => typeof value === 'string').join(', ') : '',
        });
        setError('');
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Could not load your profile.');
      })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, [user?.name]);

  const update = (field: keyof ProfileDraft, value: string) => {
    setProfile((current) => ({ ...current, [field]: value }));
    setSaved(false);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setError('');
    setSaved(false);
    try {
      await apiRequest('/api/profile', {
        method: 'PUT',
        body: JSON.stringify({
          ...profile,
          name: profile.name.trim(),
          interests: splitList(profile.interests),
          skills: splitList(profile.skills),
        }),
      });
      updateDisplayName(profile.name.trim());
      setSaved(true);
    } catch (saveError: unknown) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save your profile.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <CareerToolLayout eyebrow="Your account" title="Career profile" description="Keep your goals, skills, and location in one place so your internship search and career plan stay focused. This profile is private to your account.">
      {error && <p role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">{error}</p>}
      <form onSubmit={submit} className={toolCardClass}>
        {isLoading ? <div role="status" className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading your profile…</div> : <>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className={labelClass}>Full name<input className={inputClass} value={profile.name} onChange={(event) => update('name', event.target.value)} required maxLength={100} autoComplete="name" /></label>
            <label className={labelClass}>Target internship role<input className={inputClass} value={profile.target_role} onChange={(event) => update('target_role', event.target.value)} maxLength={160} placeholder="Product design intern" /></label>
            <label className={labelClass}>Preferred location<input className={inputClass} value={profile.location} onChange={(event) => update('location', event.target.value)} maxLength={160} placeholder="Remote, Bengaluru" /></label>
            <label className={labelClass}>Education<input className={inputClass} value={profile.education} onChange={(event) => update('education', event.target.value)} maxLength={240} placeholder="BSc Computer Science, North University" /></label>
            <label className={labelClass}>Expected graduation year<input className={inputClass} value={profile.graduation_year} onChange={(event) => update('graduation_year', event.target.value)} maxLength={20} inputMode="numeric" placeholder="2027" /></label>
            <label className={labelClass}>Skills<input className={inputClass} value={profile.skills} onChange={(event) => update('skills', event.target.value)} placeholder="React, SQL, research" /></label>
            <label className={`${labelClass} sm:col-span-2`}>Career interests<textarea className={inputClass} rows={3} value={profile.interests} onChange={(event) => update('interests', event.target.value)} placeholder="Data products, accessibility, early-stage startups" /></label>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <button type="submit" disabled={isSaving} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-60">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" aria-hidden="true" />}
              {isSaving ? 'Saving profile…' : 'Save profile'}
            </button>
            {saved && <p role="status" className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-300"><Check className="h-4 w-4" aria-hidden="true" /> Profile saved</p>}
          </div>
        </>}
      </form>
    </CareerToolLayout>
  );
}
