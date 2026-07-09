'use client';
import { useState, useRef } from 'react';
import { todayStr } from '@/lib/data';
import { useApp, mutate, people, toast, authSignOut, saveProfileToDb, readAllNotifs, uploadAvatar } from '@/lib/store';
import { Icon, Av, Empty, LogoMark, OfflineBar } from './ui';
import { UserTabbar } from './user';

export function ProfileScreen() {
  const s = useApp();
  const m = people.me;
  const unread = s.notifs.filter((n) => n.unread).length;
  const goLegal = (page) => mutate((x) => { x.legalPage = page; x.screen = 'legal'; });
  return (
    <>
      <OfflineBar />
      <div className="body enter">
        <div className="phero">
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}><Av p={m} size={88} /></div>
          <div className="h2" style={{ fontSize: 24 }}>{m.name}</div>
          <div className="sub">{m.handle}{s.session ? ` · ${s.session.user.email}` : ' · guest'}</div>
          <div className="sub" style={{ maxWidth: 280, margin: '8px auto 0' }}>{m.bio}</div>
          <div className="pstats">
            {(() => {
              const uid = s.session?.user?.id;
              const mineB = uid ? s.requests.filter((r) => r.userId === uid) : [];
              // real stats from your actual activity — demo numbers only without a database
              const stats = s.dbReady
                ? { nights: mineB.filter((r) => r.status === 'checkedin').length, tables: mineB.filter((r) => r.status === 'confirmed' || r.status === 'checkedin').length, crew: s.friends.length }
                : { nights: m.nights, tables: m.tables, crew: m.crew };
              return (
                <>
                  <div className="b"><div className="n">{stats.nights}</div><div className="l">Nights out</div></div>
                  <div className="b"><div className="n">{stats.tables}</div><div className="l">Tables</div></div>
                  <div className="b"><div className="n">{stats.crew}</div><div className="l">Crew</div></div>
                </>
              );
            })()}
          </div>
          <div className="promobox" style={{ textAlign: 'left', marginLeft: 'auto', marginRight: 'auto', maxWidth: 560 }}>
            <div className="row">
              <div><div style={{ fontWeight: 800 }}>Promoter mode</div><div className="meta2">Share your link and earn 8% on prepaid entry fees.</div></div>
              <span className="badge" style={{ background: 'rgba(255,194,75,.18)', color: 'var(--gold)' }}>{s.promoterCode}</span>
            </div>
          </div>
        </div>
        <div className="pad">
          <div className="featuregrid" style={{ gridTemplateColumns: 'repeat(2,minmax(0,1fr))' }}>
            <div className="featurecard" style={{ cursor: 'pointer' }} onClick={() => mutate((x) => { x.showFavs = true; x.tab = 'discover'; x.screen = 'home'; })}>
              <div className="n">{s.favs.length}</div><div className="l">Favourite clubs</div>
            </div>
            <div className="featurecard" style={{ cursor: 'pointer' }} onClick={() => mutate((x) => { x.tab = 'bookings'; x.screen = 'home'; })}>
              <div className="n">{s.session ? s.requests.filter((r) => r.userId === s.session.user.id).length : s.dbReady ? 0 : s.requests.filter((r) => r.who === 'You').length}</div><div className="l">Bookings</div>
            </div>
          </div>
          <div className="setrow" style={{ cursor: 'pointer' }} onClick={() => mutate((x) => { x.screen = 'notifs'; })}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 22, height: 22, color: 'var(--magenta)' }}><Icon name="bell" size={22} /></span>
              <div className="nm" style={{ fontSize: 15 }}>Notifications</div>
              {unread > 0 && <span className="badge" style={{ background: 'var(--magenta)', color: '#0B0710' }}>{unread} new</span>}
            </div>
            <span style={{ color: 'var(--muted)' }}><Icon name="arrow" size={20} stroke={2.5} /></span>
          </div>
          <div className="setrow">
            <div><div className="nm" style={{ fontSize: 15 }}>Going out tonight</div><div className="meta2">Let your crew see you&apos;re out</div></div>
            <div className={`tog ${m.out ? 'on' : ''}`} role="switch" aria-checked={m.out} onClick={() => mutate(() => { m.out = !m.out; })}><i /></div>
          </div>
          <div className="setrow" style={{ cursor: 'pointer' }} onClick={() => mutate((x) => { x.tab = 'bookings'; x.screen = 'home'; })}>
            <div className="nm" style={{ fontSize: 15 }}>My bookings</div><span style={{ color: 'var(--muted)' }}><Icon name="arrow" size={20} stroke={2.5} /></span>
          </div>
          <div className="setrow" style={{ cursor: 'pointer' }} onClick={() => mutate((x) => { x.screen = 'editprofile'; })}>
            <div className="nm" style={{ fontSize: 15 }}>Edit profile</div><span style={{ color: 'var(--muted)' }}><Icon name="arrow" size={20} stroke={2.5} /></span>
          </div>
          <div className="eyebrow" style={{ marginTop: 24 }}>About</div>
          {[['terms', 'Terms of service'], ['privacy', 'Privacy policy'], ['faq', 'FAQ'], ['contact', 'Contact us']].map(([id, label]) => (
            <div className="setrow" key={id} style={{ cursor: 'pointer' }} onClick={() => goLegal(id)}>
              <div className="nm" style={{ fontSize: 15 }}>{label}</div><span style={{ color: 'var(--muted)' }}><Icon name="arrow" size={20} stroke={2.5} /></span>
            </div>
          ))}
          <button className="btn ghost" style={{ marginTop: 20, maxWidth: 400 }} onClick={authSignOut}>{s.session ? 'Log out' : 'Exit guest mode'}</button>
        </div>
      </div>
      <UserTabbar />
    </>
  );
}

export function EditProfile() {
  const s = useApp();
  const m = people.me;
  const [name, setName] = useState(m.name);
  const [handle, setHandle] = useState(m.handle);
  const [bio, setBio] = useState(m.bio);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);
  const pickPhoto = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    await uploadAvatar(file);
    setBusy(false);
  };
  return (
    <>
      <div className="topbar">
        <button className="back" aria-label="Back" onClick={() => mutate((x) => { x.screen = 'home'; })}><Icon name="back" size={22} stroke={2.8} /></button>
        <div className="h2">Edit profile</div>
      </div>
      <div className="body enter"><div className="pad" style={{ maxWidth: 680 }}>
        <div style={{ display: 'flex', justifyContent: 'center', margin: '6px 0 4px' }}><Av p={m} size={84} /></div>
        <div style={{ textAlign: 'center' }}>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={pickPhoto} />
          <button className="btn sm ghost" style={{ width: 'auto', padding: '8px 16px', margin: '8px auto 0' }} disabled={busy || !s.session}
            onClick={() => fileRef.current?.click()}>
            {busy ? 'Uploading…' : s.session ? 'Change photo' : 'Log in to set a photo'}
          </button>
        </div>
        <div className="field"><label>Name</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div className="field"><label>Username</label><input className="input" value={handle} onChange={(e) => setHandle(e.target.value)} /></div>
        <div className="field"><label>Bio</label><textarea className="input" rows={3} value={bio} onChange={(e) => setBio(e.target.value)} /></div>
        <button className="btn" style={{ marginTop: 22 }} onClick={() => {
          const newName = name.trim() || m.name;
          const newHandle = handle.trim() ? (handle.startsWith('@') ? handle : '@' + handle) : m.handle;
          mutate((x) => {
            m.name = newName;
            m.handle = newHandle;
            m.bio = bio;
            x.screen = 'home';
          });
          saveProfileToDb({ name: newName, handle: newHandle, bio });
          toast('Profile saved');
        }}>Save changes</button>
      </div></div>
    </>
  );
}

export function NotifScreen() {
  const s = useApp();
  return (
    <>
      <div className="topbar">
        <button className="back" aria-label="Back" onClick={() => mutate((x) => { x.screen = 'home'; })}><Icon name="back" size={22} stroke={2.8} /></button>
        <div className="h2">Notifications</div>
      </div>
      <div className="body enter"><div className="pad">
        {s.notifs.length ? s.notifs.map((n) => (
          <div className={`notifrow ${n.unread ? 'unread' : ''}`} key={n.id}>
            <div className="nico"><Icon name={n.icon === 'check' ? 'bolt' : n.icon} size={20} /></div>
            <div style={{ flex: 1, minWidth: 0 }}><div className="ntxt">{n.text}</div><div className="ntime">{n.time}</div></div>
            {n.unread && <span className="badge" style={{ background: 'rgba(255,61,174,.16)', color: 'var(--magenta)' }}>NEW</span>}
          </div>
        )) : <Empty>All caught up.<br />Payment pings, approvals and invites land here.</Empty>}
        {s.notifs.some((n) => n.unread) && (
          <button className="btn ghost sm" style={{ marginTop: 18, maxWidth: 300 }} onClick={readAllNotifs}>Mark all as read</button>
        )}
      </div></div>
      <UserTabbar />
    </>
  );
}

const FAQS = [
  ['How do refunds work?', 'If the club declines your request, or your group misses the 20-minute payment window, every paid share is automatically refunded to the original card.'],
  ['What is the 5% service charge?', "It's Seat'd's platform fee, added to the table minimum. The minimum spend itself becomes bar credit at your table."],
  ['Can I change my table after booking?', 'Before club approval, cancel and rebook. After approval, message the venue via VIP contact on the club page.'],
  ['How does split-pay work?', 'You pay your share upfront; invited friends get their own payment pings. The booking confirms once everyone has paid and the club approves.'],
  ["What if my friends bail?", "If invited friends don't pay in 20 minutes, the booking auto-cancels and you get refunded. You can also mark shares as paid to cover them yourself."],
];
export function LegalScreen() {
  const s = useApp();
  const page = s.legalPage || 'terms';
  const titles = { terms: 'Terms of service', privacy: 'Privacy policy', contact: 'Contact us', faq: 'FAQ' };
  return (
    <>
      <div className="topbar">
        <button className="back" aria-label="Back" onClick={() => mutate((x) => { x.screen = 'home'; })}><Icon name="back" size={22} stroke={2.8} /></button>
        <div className="h2">{titles[page]}</div>
      </div>
      <div className="body enter"><div className="pad legalbody">
        {page === 'terms' && (
          <>
            <h3>1. The service</h3><p>Seat&apos;d connects nightlife venues with guests who prebook tables and prepay minimum spend. Seat&apos;d is a booking platform, not the venue — entry decisions remain with the venue.</p>
            <h3>2. Payments &amp; refunds</h3><p>Table minimum spend plus a 5% Seat&apos;d service charge is collected upfront. If a venue declines your request, you are refunded in full within 3–5 business days. Auto-cancelled split payments are refunded to each payer.</p>
            <h3>3. Conduct</h3><p>You must be 18 or older. Venues may refuse entry for intoxication, dress code, or safety reasons without refund of consumed credit.</p>
            <h3>4. Promoters</h3><p>Promoter codes track commissions payable by venues, not by guests. Abuse of codes may lead to account suspension.</p>
          </>
        )}
        {page === 'privacy' && (
          <>
            <h3>What we collect</h3><p>Account details (name, handle, email), booking history, and payment tokens processed by our payment partners. We never store full card numbers.</p>
            <h3>How we use it</h3><p>To operate bookings, prevent fraud, and show venues anonymised crowd stats. We do not sell personal data.</p>
            <h3>Your rights</h3><p>Request export or deletion of your data any time via privacy@seatd.app (POPIA compliant).</p>
          </>
        )}
        {page === 'contact' && (
          <>
            <h3>Talk to us</h3>
            <p>Support: <a href="mailto:support@seatd.app" style={{ color: 'var(--blue)' }}>support@seatd.app</a></p>
            <p>Venues &amp; partnerships: <a href="mailto:venues@seatd.app" style={{ color: 'var(--blue)' }}>venues@seatd.app</a></p>
            <p>WhatsApp line: +27 10 555 0123 (Thu–Sun 18:00–04:00)</p>
            <p>Johannesburg HQ: 24 Central, Gwen Lane, Sandton.</p>
          </>
        )}
        {page === 'faq' && FAQS.map(([q, a], i) => (
          <details className="faq" key={i}><summary>{q}</summary><div className="ans">{a}</div></details>
        ))}
        <div className="micro" style={{ marginTop: 26 }}>Seat&apos;d (Pty) Ltd · Demo prototype · Last updated {todayStr()}</div>
      </div></div>
      <UserTabbar />
    </>
  );
}

export function NotFound() {
  return (
    <div className="center enter">
      <LogoMark size={74} />
      <div className="h1" style={{ fontSize: 64, marginTop: 14 }}>404</div>
      <div className="sub" style={{ maxWidth: 280 }}>This page slipped past the bouncer. It doesn&apos;t exist — or it went home early.</div>
      <button className="btn" style={{ width: 'auto', padding: '14px 28px', marginTop: 18 }} onClick={() => mutate((x) => { x.screen = 'home'; x.tab = 'discover'; })}>Back to Tonight</button>
    </div>
  );
}
