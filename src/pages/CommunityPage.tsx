import { useCallback, useEffect, useState } from 'react';
import { CareerToolLayout, inputClass, labelClass, toolCardClass } from '../components/CareerToolLayout';
import { apiRequest } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

type Community = { id: string; name: string; description: string; member_count: number; post_count: number; joined: boolean };
type Post = { id: string; body: string; created_at: string; author: string };
type EventItem = { id: string; title: string; description: string; starts_at: string; location: string; rsvp_count: number; rsvped: boolean };
type Notif = { items: { id: string; title: string; body: string; link: string; created_at: string }[]; unread_count: number };

const CommunityPage = () => {
  const { user } = useAuth();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [notifs, setNotifs] = useState<Notif | null>(null);
  const [activeId, setActiveId] = useState('');
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [postBody, setPostBody] = useState('');
  const [eventTitle, setEventTitle] = useState('');
  const [eventWhen, setEventWhen] = useState('');
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    if (!user?.id) return;
    try {
      const [cs, es, ns] = await Promise.all([
        apiRequest<Community[]>('/api/communities'),
        apiRequest<EventItem[]>('/api/events'),
        apiRequest<Notif>('/api/notifications'),
      ]);
      setCommunities(cs); setEvents(es); setNotifs(ns);
      if (!activeId && cs.length) setActiveId(cs[0].id);
    } catch (e) { setMsg(e instanceof Error ? e.message : 'Could not load community.'); }
  }, [user?.id, activeId]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const t = setInterval(() => { void load(); }, 15000);
    return () => clearInterval(t);
  }, [load]);
  useEffect(() => {
    if (!activeId) return;
    apiRequest<Post[]>(`/api/communities/posts?community_id=${encodeURIComponent(activeId)}`).then(setPosts).catch(() => setPosts([]));
  }, [activeId, communities.length]);

  if (!user?.id) return <CareerToolLayout eyebrow="Network" title="Community" description="Sign in to join communities, post, and RSVP to events."><p className="text-sm">Please sign in first.</p></CareerToolLayout>;

  const createCommunity = async () => {
    try { await apiRequest('/api/communities', { method: 'POST', body: JSON.stringify({ name, description: desc }) }); setName(''); setDesc(''); await load(); } catch (e) { setMsg(e instanceof Error ? e.message : 'Could not create.'); }
  };
  const join = async (id: string) => { try { await apiRequest('/api/communities/join', { method: 'POST', body: JSON.stringify({ community_id: id, body: 'join' }) }); await load(); } catch (e) { setMsg(e instanceof Error ? e.message : 'Could not join.'); } };
  const createPost = async () => { try { await apiRequest('/api/communities/posts', { method: 'POST', body: JSON.stringify({ community_id: activeId, body: postBody }) }); setPostBody(''); await load(); } catch (e) { setMsg(e instanceof Error ? e.message : 'Could not post.'); } };
  const createEvent = async () => { try { await apiRequest('/api/events', { method: 'POST', body: JSON.stringify({ title: eventTitle, starts_at: eventWhen, community_id: activeId || null }) }); setEventTitle(''); setEventWhen(''); await load(); } catch (e) { setMsg(e instanceof Error ? e.message : 'Could not create event.'); } };
  const rsvp = async (id: string) => { try { await apiRequest('/api/events/rsvp', { method: 'POST', body: JSON.stringify({ community_id: id, body: 'rsvp' }) }); await load(); } catch (e) { setMsg(e instanceof Error ? e.message : 'Could not RSVP.'); } };
  const markRead = async () => {
    try {
      await apiRequest('/api/notifications/read', { method: 'POST' });
      await load();
    } catch (error) {
      setMsg(error instanceof Error ? error.message : 'Could not mark notifications as read.');
    }
  };

  return (
    <CareerToolLayout eyebrow="Network" title="Community & events" description="Ask questions, share wins, and join events. Posts notify other members; this page refreshes every 15 seconds.">
      {msg && <p role="status" className="mb-4 rounded-lg bg-amber-50 p-3 text-sm">{msg}</p>}
      <div className="grid gap-5 lg:grid-cols-3">
        <section className={toolCardClass}>
          <h2 className="font-bold">Communities</h2>
          <label className={`${labelClass} mt-3 block`}>New community<input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Data Interns India" /></label>
          <label className={`${labelClass} mt-2 block`}>Description<input className={inputClass} value={desc} onChange={(e) => setDesc(e.target.value)} /></label>
          <button type="button" onClick={() => void createCommunity()} className="mt-3 w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white">Create community</button>
          <div className="mt-4 space-y-2">
            {communities.map((c) => (
              <div key={c.id} className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                <button type="button" onClick={() => setActiveId(c.id)} className="font-semibold">{c.name}</button>
                <p className="text-xs text-slate-500">{c.member_count} members · {c.post_count} posts{c.joined ? ' · joined' : ''}</p>
                {!c.joined && <button type="button" onClick={() => void join(c.id)} className="mt-1 text-xs font-semibold text-indigo-700 underline">Join</button>}
              </div>
            ))}
            {!communities.length && <p className="text-sm text-slate-500">No communities yet — create the first one.</p>}
          </div>
        </section>
        <section className={toolCardClass}>
          <h2 className="font-bold">Posts {activeId ? '' : '(pick a community)'}</h2>
          <textarea className={`${inputClass} mt-3`} rows={3} value={postBody} onChange={(e) => setPostBody(e.target.value)} placeholder="Ask a question or share an update…" />
          <button type="button" disabled={!activeId} onClick={() => void createPost()} className="mt-2 w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Post</button>
          <div className="mt-4 space-y-3">
            {posts.map((p) => <article key={p.id} className="rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-800"><p className="font-semibold">{p.author}</p><p className="mt-1">{p.body}</p><p className="mt-1 text-xs text-slate-500">{new Date(p.created_at).toLocaleString()}</p></article>)}
            {!posts.length && <p className="text-sm text-slate-500">No posts yet.</p>}
          </div>
        </section>
        <section className={toolCardClass}>
          <h2 className="font-bold">Events {notifs?.unread_count ? <span className="ml-2 rounded-full bg-indigo-600 px-2 py-0.5 text-xs text-white">{notifs.unread_count} new</span> : null}</h2>
          <label className={`${labelClass} mt-3 block`}>New event<input className={inputClass} value={eventTitle} onChange={(e) => setEventTitle(e.target.value)} placeholder="Resume workshop" /></label>
          <label className={`${labelClass} mt-2 block`}>Starts at<input className={inputClass} type="datetime-local" value={eventWhen} onChange={(e) => setEventWhen(e.target.value)} /></label>
          <button type="button" onClick={() => void createEvent()} className="mt-3 w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white">Create event</button>
          <div className="mt-4 space-y-2">
            {events.map((e) => <div key={e.id} className="rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-700"><p className="font-semibold">{e.title}</p><p className="text-xs text-slate-500">{new Date(e.starts_at).toLocaleString()} · {e.rsvp_count} going</p>{!e.rsvped && <button type="button" onClick={() => void rsvp(e.id)} className="mt-1 font-semibold text-indigo-700 underline">RSVP</button>}</div>)}
            {!events.length && <p className="text-sm text-slate-500">No events yet.</p>}
          </div>
          <h3 className="mt-5 font-bold">Notifications</h3>
          {notifs?.items.slice(0, 5).map((n) => <p key={n.id} className="mt-1 text-xs">{n.title} — {n.body}</p>)}
          {!!notifs?.unread_count && <button type="button" onClick={() => void markRead()} className="mt-2 text-xs font-semibold underline">Mark all read</button>}
        </section>
      </div>
    </CareerToolLayout>
  );
};
export default CommunityPage;
