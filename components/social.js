'use client';
import { useState, useEffect, useRef } from 'react';
import { useApp, mutate, people, venues, sendChat, addFriendFromDraft, copyText, addFriend, refreshChat } from '@/lib/store';
import { Icon, Av, Stars, Empty, OfflineBar } from './ui';
import { UserTabbar, FriendSearch } from './user';

export function MessagesHome() {
  const s = useApp();
  const convos = [...new Set([...s.friends, ...Object.keys(s.convos)])].filter((id) => s.convos[id]?.length && people[id]);
  return (
    <>
      <OfflineBar />
      <div className="body enter"><div className="pad">
        <div className="row">
          <div className="h1" style={{ fontSize: 28 }}>Messages</div>
          <button className="btn sm ghost" style={{ width: 'auto', padding: '10px 14px' }} onClick={() => mutate((x) => { x.screen = 'friends'; x.friendDraft = ''; })}>Friends — {s.friends.length}</button>
        </div>
        <div className="stagger" style={{ marginTop: 8 }}>
          {convos.length ? convos.map((id) => {
            const p = people[id], last = s.convos[id][s.convos[id].length - 1];
            return (
              <div className="lrow" key={id} onClick={() => mutate((x) => { x.activeChat = id; x.screen = 'chat'; })}>
                <Av p={p} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="row"><span className="nm">{p.name}</span></div>
                  <div className="meta2" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{last.f === 'me' ? 'You: ' : ''}{last.t}</div>
                </div>
              </div>
            );
          }) : <Empty>No messages yet.<br />Add friends to start a thread.</Empty>}
        </div>
      </div></div>
      <UserTabbar />
    </>
  );
}

export function FriendsScreen() {
  const s = useApp();
  const suggest = Object.values(people).filter((p) => p.id !== 'me' && !s.friends.includes(p.id));
  const openProfile = (id) => mutate((x) => { x.viewFriend = id; x.screen = 'friendprofile'; });
  return (
    <>
      <div className="topbar">
        <button className="back" aria-label="Back" onClick={() => mutate((x) => { x.screen = 'home'; })}><Icon name="back" size={22} stroke={2.8} /></button>
        <div className="h2">Friends</div>
      </div>
      <div className="body enter"><div className="pad">
        <input className="input" placeholder="Search people by name or @handle" value={s.friendDraft}
          onChange={(e) => mutate((x) => { x.friendDraft = e.target.value; })}
          onKeyDown={(e) => { if (e.key === 'Enter' && !(s.dbReady && s.session)) addFriendFromDraft(); }} />
        {!(s.dbReady && s.session) && (
          <div className="addfriend">
            <button className="btn sm" style={{ width: '100%', padding: '13px 14px' }} onClick={addFriendFromDraft}>Add typed name as new friend</button>
          </div>
        )}
        <FriendSearch context="friends" />
        <div className="eyebrow" style={{ marginTop: 20 }}>Your crew</div>
        <div>
          {s.friends.map((id) => {
            const p = people[id];
            return p ? (
              <div className="lrow" key={id} onClick={() => openProfile(id)}>
                <Av p={p} />
                <div style={{ flex: 1, minWidth: 0 }}><div className="nm">{p.name}</div><div className="meta2">{p.handle}{p.online ? ' · online' : ''}</div></div>
                <button className="btn sm" style={{ width: 'auto', padding: '9px 14px' }} onClick={(e) => { e.stopPropagation(); mutate((x) => { x.activeChat = id; x.screen = 'chat'; }); }}>Message</button>
              </div>
            ) : null;
          })}
        </div>
        <div className="eyebrow" style={{ marginTop: 22 }}>Suggested</div>
        <div>
          {suggest.length ? suggest.map((p) => (
            <div className="lrow" key={p.id} onClick={() => openProfile(p.id)}>
              <Av p={p} />
              <div style={{ flex: 1, minWidth: 0 }}><div className="nm">{p.name}</div><div className="meta2">{p.handle}</div></div>
              <button className="btn sm ghost" style={{ width: 'auto', padding: '9px 14px' }} onClick={(e) => { e.stopPropagation(); addFriend(p.id); }}>Add</button>
            </div>
          )) : <div className="sub" style={{ padding: '14px 0' }}>You&apos;ve added everyone.</div>}
        </div>
      </div></div>
    </>
  );
}

export function FriendProfile() {
  const s = useApp();
  const p = people[s.viewFriend];
  if (!p) return <FriendsScreen />;
  const isFriend = s.friends.includes(p.id);
  const theirBookings = s.requests.filter((r) => r.who === p.name || (r.payments || []).some((x) => x.id === p.id));
  const theirReviews = [];
  venues.forEach((v) => (v.reviews || []).forEach((r) => { if (r.name === p.name) theirReviews.push({ ...r, venue: v.name }); }));
  const dbMode = s.dbReady && !!s.session;
  const mutual = dbMode ? [] : s.friends.filter((id) => id !== p.id && people[id]).slice(0, 3);
  const memberSince = p.since ? new Date(p.since).toLocaleDateString('en-ZA', { month: 'short', year: 'numeric' }) : '—';
  const link = `https://seatd.app/u/${p.handle.replace('@', '')}`;
  const shareText = encodeURIComponent(`Join me on Seat'd — add ${p.handle}. ${link}`);
  const invite = () => {
    if (typeof navigator !== 'undefined' && navigator.share) navigator.share({ title: "Seat'd", text: `Add ${p.name} on Seat'd`, url: link }).catch(() => {});
    else copyText(link, 'Invite link copied');
  };
  return (
    <>
      <div className="topbar">
        <button className="back" aria-label="Back" onClick={() => mutate((x) => { x.screen = 'home'; })}><Icon name="back" size={22} stroke={2.8} /></button>
        <div className="h2">Profile</div>
      </div>
      <div className="body enter">
        <div className="phero">
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}><Av p={p} size={88} /></div>
          <div className="h2" style={{ fontSize: 24 }}>{p.name}</div>
          <div className="sub">{p.handle}{p.online ? ' · online' : ''}</div>
          {p.bio && <div className="sub" style={{ maxWidth: 280, margin: '8px auto 0' }}>{p.bio}</div>}
          <div className="pstats">
            <div className="b"><div className="n">{theirBookings.length}</div><div className="l">Bookings</div></div>
            <div className="b"><div className="n">{theirReviews.length}</div><div className="l">Reviews</div></div>
            {dbMode
              ? <div className="b"><div className="n" style={{ fontSize: 17 }}>{memberSince}</div><div className="l">Member since</div></div>
              : <div className="b"><div className="n">{mutual.length}</div><div className="l">Mutual friends</div></div>}
          </div>
          <div className="wideactions" style={{ maxWidth: 420, margin: '16px auto 0' }}>
            {isFriend
              ? <button className="btn sm" onClick={() => mutate((x) => { x.activeChat = p.id; x.screen = 'chat'; })}>Message</button>
              : <button className="btn sm" onClick={() => addFriend(p.id)}>Add friend</button>}
            <button className="btn sm ghost" onClick={invite}><Icon name="share" size={18} /> Invite</button>
          </div>
        </div>
        <div className="pad">
          {mutual.length > 0 && (
            <>
              <div className="eyebrow">Mutual friends</div>
              <div className="joiners" style={{ marginTop: 10 }}>
                {mutual.map((id) => (
                  <span className="invitechip" key={id} style={{ cursor: 'pointer' }} onClick={() => mutate((x) => { x.viewFriend = id; })}>
                    <Av p={people[id]} size={24} /> {people[id].name.split(' ')[0]}
                  </span>
                ))}
              </div>
            </>
          )}
          <div className="eyebrow" style={{ marginTop: 20 }}>Recent bookings</div>
          <div className="summary" style={{ marginTop: 10 }}>
            {theirBookings.length ? theirBookings.map((r) => <div className="minirow" key={r.id}><span>{r.venue} — {r.table}</span><b>{r.date || ''}</b></div>) : <div className="meta2">Nothing on record yet.</div>}
          </div>
          <div className="eyebrow" style={{ marginTop: 20 }}>Reviews</div>
          <div className="summary" style={{ marginTop: 10 }}>
            {theirReviews.length ? theirReviews.map((r, i) => (
              <div className="reviewrow" key={i}>
                <div className="rhead"><Stars n={r.stars} size={12} /><b style={{ fontSize: 13 }}>{r.venue}</b><span className="rdate">{r.date || ''}</span></div>
                <div className="rtext">{r.text}</div>
              </div>
            )) : <div className="meta2">No reviews yet.</div>}
          </div>
          <div className="sharerow" style={{ marginTop: 18 }}>
            <a className="btn sm ghost" style={{ textDecoration: 'none' }} href={`https://wa.me/?text=${shareText}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>
            <a className="btn sm ghost" style={{ textDecoration: 'none' }} href={`sms:?&body=${shareText}`}>Messages</a>
            <button className="btn sm ghost" onClick={() => copyText(link, 'Invite link copied')}>Copy link</button>
          </div>
        </div>
      </div>
    </>
  );
}

export function ChatScreen() {
  const s = useApp();
  const p = people[s.activeChat];
  const [draft, setDraft] = useState('');
  const bodyRef = useRef(null);
  const msgs = (p && s.convos[s.activeChat]) || [];
  useEffect(() => { if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight; }, [msgs.length]);
  // poll for the other person's replies while the chat is open
  useEffect(() => {
    if (!(s.dbReady && s.session && s.activeChat)) return;
    const t = setInterval(() => refreshChat(s.activeChat), 4000);
    return () => clearInterval(t);
  }, [s.dbReady, s.session, s.activeChat]);
  if (!p) return <MessagesHome />;
  const doSend = () => { if (draft.trim()) { sendChat(draft); setDraft(''); } };
  return (
    <>
      <div className="topbar">
        <button className="back" aria-label="Back" onClick={() => mutate((x) => { x.screen = 'home'; })}><Icon name="back" size={22} stroke={2.8} /></button>
        <span style={{ cursor: 'pointer' }} onClick={() => mutate((x) => { x.viewFriend = p.id; x.screen = 'friendprofile'; })}><Av p={p} size={38} /></span>
        <div><div className="nm" style={{ fontWeight: 700 }}>{p.name}</div><div className="meta2" style={{ fontSize: 12 }}>{p.online ? 'online' : 'offline'}</div></div>
      </div>
      <div className="chatbody" ref={bodyRef}>
        {msgs.length ? msgs.map((m, i) => <div className={`bub ${m.f} pop`} key={i}>{m.t}</div>) : <div className="empty">Say hi 👋</div>}
      </div>
      <div className="composer">
        <input placeholder={`Message ${p.name.split(' ')[0]}...`} aria-label="Message" value={draft}
          onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') doSend(); }} />
        <button className="send" aria-label="Send" onClick={doSend}><Icon name="arrow" size={20} stroke={2.5} /></button>
      </div>
    </>
  );
}
