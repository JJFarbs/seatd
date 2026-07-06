'use client';
import { useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { AREAS, GENRES, tierMeta, fmt, serviceFee, searchClubs } from '@/lib/data';
import {
  S, useApp, mutate, venues, people, venue, tablesFor, bookingMath, paidCount,
  amountOutstanding, allPaid, adjustedShareAmount, tableCostRecovered, publicTableForBooking,
  publicJoinPrice, publicJoinCharge, publicSpotsOpen, openPublicTables, searchPeople,
  bookingLink, qrPayload, toggleFav, submitReview, addFriendFromDraft, sendBookingInvite,
  makePublic, savePublicPrice, requestJoinPublic, confirmJoinPayment, decideJoin,
  submitBooking, markPaid, nativeShare, copyText,
} from '@/lib/store';
import {
  Icon, Pin, CheckBig, LogoMark, Av, StatusChip, Empty, OfflineBar, Cover, Gallery,
  FavBtn, Stars, StarRating, ReviewRows, Availability, Deadline, Thumb,
} from './ui';

// ---------- tabbar ----------
export function UserTabbar() {
  const s = useApp();
  const myReq = s.requests.filter((r) => r.who === 'You' && (r.status === 'confirmed' || r.status === 'checkedin')).length;
  const unread = s.notifs.filter((n) => n.unread).length;
  const tabs = [
    ['discover', 'bolt', 'Tonight', 0],
    ['map', 'map', 'Map', 0],
    ['bookings', 'ticket', 'Bookings', myReq],
    ['messages', 'chat', 'Chats', 1],
    ['profile', 'user', 'Profile', unread],
  ];
  return (
    <div className="tabbar">
      {tabs.map(([id, icon, label, n]) => (
        <div key={id} className={`tab ${s.tab === id ? 'on' : ''}`} role="button" aria-label={label}
          onClick={() => mutate((x) => { x.tab = id; x.screen = 'home'; x.showFavs = false; })}>
          <span className="dot" />
          <div className="pos"><Icon name={icon} />{n ? <span className="badge-n">{n}</span> : null}</div>
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
}

// ---------- shared booking widgets ----------
export function PaymentRows({ r, editable }) {
  const ps = r.payments || [];
  if (!ps.length) return null;
  return (
    <div style={{ marginTop: 14, textAlign: 'left' }}>
      <div className="eyebrow" style={{ color: 'var(--teal)' }}>Payment pings</div>
      {ps.map((p) => (
        <div className={`payreq ${p.status === 'paid' ? 'paid' : ''}`} key={p.id}>
          <div className="left">
            <div>{p.id === 'host' ? <Av p={people.me} size={32} /> : people[p.id] ? <Av p={people[p.id]} size={32} /> :
              <div className="av" style={{ width: 32, height: 32, fontSize: 14, background: 'linear-gradient(135deg,var(--blue),var(--violet))' }}>?</div>}</div>
            <div>
              <div className="who">{p.name}</div>
              <div className="due">{fmt(r.status !== 'pending' ? adjustedShareAmount(p, r) : p.amount)} — {p.status === 'paid' ? 'paid' : 'waiting for payment'}</div>
            </div>
          </div>
          {editable && p.status !== 'paid'
            ? <button className="btn sm ghost" style={{ width: 'auto', padding: '8px 12px' }} onClick={() => markPaid(r, p.id)}>Mark paid</button>
            : <span className="badge" style={{ background: p.status === 'paid' ? 'rgba(63,224,160,.15)' : 'rgba(255,194,75,.14)', color: p.status === 'paid' ? 'var(--ok)' : 'var(--gold)' }}>{p.status === 'paid' ? 'PAID' : 'PINGED'}</span>}
        </div>
      ))}
    </div>
  );
}

export function PublicTableCard({ pt, mode }) {
  const requested = (pt.joinRequests || []).some((j) => j.userId === 'me' && j.status === 'pending');
  const joined = (pt.joiners || []).some((j) => j.id === 'me');
  const mPrice = publicJoinPrice(pt, 'male'), fPrice = publicJoinPrice(pt, 'female'), spots = publicSpotsOpen(pt);
  const js = (pt.joiners || []).filter((j) => j.status === 'approved');
  return (
    <div className="publiccard">
      <div className="row">
        <div>
          <div className="eyebrow" style={{ color: 'var(--teal)' }}>Open table</div>
          <div style={{ fontSize: 17, fontWeight: 800 }}>{pt.venue} — {pt.table}</div>
          <div className="meta2">Hosted by {pt.owner} · {tierMeta[pt.tier]?.label || 'Table'} · {spots} spots open</div>
        </div>
        <span className="badge" style={{ background: 'rgba(63,224,192,.14)', color: 'var(--teal)' }}>M {fmt(mPrice)} / F {fmt(fPrice)}</span>
      </div>
      {js.length
        ? <div className="joiners">{js.map((j, i) => <span className="miniav" key={i}>{(j.name || '?')[0]}</span>)}<span className="meta2">{js.length} joined — {fmt(js.reduce((a, j) => a + (j.amount || publicJoinPrice(pt, j.gender) || 0), 0))} recovered</span></div>
        : <div className="meta2" style={{ marginTop: 8 }}>No outside joiners approved yet.</div>}
      {mode === 'owner' ? <OwnerPublicControls pt={pt} /> : spots <= 0
        ? <button className="btn sm ghost" style={{ marginTop: 13 }} disabled>Table full</button>
        : requested || joined
          ? <button className="btn sm" style={{ marginTop: 13 }} disabled>{joined ? 'Already joined' : 'Request sent'}</button>
          : (
            <div className="splitrow" style={{ marginTop: 13 }}>
              <button className="btn sm" style={{ flex: 1 }} onClick={() => requestJoinPublic(pt.id, 'male')}>Join as male — {fmt(mPrice)}</button>
              <button className="btn sm ghost" style={{ flex: 1 }} onClick={() => requestJoinPublic(pt.id, 'female')}>Join as female — {fmt(fPrice)}</button>
            </div>
          )}
    </div>
  );
}
function OwnerPublicControls({ pt }) {
  const [m, setM] = useState(String(publicJoinPrice(pt, 'male')));
  const [f, setF] = useState(String(publicJoinPrice(pt, 'female')));
  const pending = (pt.joinRequests || []).filter((j) => j.status === 'pending');
  return (
    <div style={{ marginTop: 12 }}>
      <div className="splitrow">
        <div className="field" style={{ marginTop: 0, flex: 1 }}><label>Male join price</label>
          <input className="input" inputMode="numeric" value={m} onChange={(e) => setM(e.target.value)} /></div>
        <div className="field" style={{ marginTop: 0, flex: 1 }}><label>Female join price</label>
          <input className="input" inputMode="numeric" value={f} onChange={(e) => setF(e.target.value)} /></div>
      </div>
      <button className="btn sm ghost" style={{ marginTop: 8 }} onClick={() => savePublicPrice(pt.id, parseInt(m.replace(/\D/g, ''), 10), parseInt(f.replace(/\D/g, ''), 10))}>Save join prices</button>
      <div className="eyebrow" style={{ marginTop: 14, color: 'var(--gold)' }}>Join requests</div>
      {pending.length ? pending.map((j) => (
        <div className="joinreq" key={j.id}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 13 }}>{j.name}</div>
            <div className="meta2">{j.gender || 'male'} · wants to join for {fmt(j.amount || publicJoinCharge(pt, j.gender))}</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn sm" style={{ width: 'auto', padding: '8px 12px' }} onClick={() => decideJoin(pt.id, j.id, true)}>Approve</button>
            <button className="btn sm ghost" style={{ width: 'auto', padding: '8px 12px' }} onClick={() => decideJoin(pt.id, j.id, false)}>Deny</button>
          </div>
        </div>
      )) : <div className="meta2" style={{ marginTop: 8 }}>No pending join requests.</div>}
    </div>
  );
}

export function FriendSearch({ context }) {
  const s = useApp();
  const hits = searchPeople(s.friendDraft);
  const q = (s.friendDraft || '').trim();
  if (!hits.length) return <div className="searchresults"><div className="hintrow">No close match found. Press Add to create {q || 'a new friend'}.</div></div>;
  return (
    <div className="searchresults">
      {hits.map((x) => (
        <div className="searchhit" key={x.p.id}>
          <div style={{ cursor: 'pointer' }} onClick={() => mutate((st) => { st.viewFriend = x.p.id; st.tab = 'messages'; st.screen = 'friendprofile'; })}><Av p={x.p} size={34} /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="who">{x.p.name}</div>
            <div className="match">{x.p.handle} — {x.label}</div>
          </div>
          <button className="btn sm ghost" style={{ width: 'auto', padding: '8px 12px' }}
            onClick={() => mutate((st) => {
              if (!st.friends.includes(x.p.id)) st.friends.push(x.p.id);
              if (context === 'booking' && !st.invited.includes(x.p.id)) st.invited.push(x.p.id);
              st.friendDraft = '';
            })}>{context === 'booking' ? 'Invite' : 'Add'}</button>
        </div>
      ))}
    </div>
  );
}

export function ShareBlock({ r }) {
  const s = useApp();
  const link = bookingLink(r);
  const shareText = encodeURIComponent(`Join my table at ${r.venue} (${r.table}) — booking ref ${r.code}. ${link}`);
  const hits = searchPeople(s.shareDraft);
  return (
    <div className="sharebox">
      <div className="row">
        <div>
          <div className="eyebrow" style={{ color: 'var(--blue)' }}>Share booking</div>
          <div style={{ fontWeight: 800, fontSize: 15 }}>Send this table link</div>
        </div>
        <span className="badge" style={{ background: 'rgba(43,212,255,.14)', color: 'var(--blue)' }}>REF {r.code || r.id}</span>
      </div>
      <div className="sharelink">
        <input className="input" readOnly value={link} aria-label="Booking link" />
        <button className="btn sm ghost" style={{ width: 'auto', padding: '0 14px' }} onClick={() => { copyText(link, 'Booking link copied'); mutate((x) => { x.shareSent = r.id; }); }}>Copy</button>
      </div>
      <div className="sharerow">
        <button className="btn sm" onClick={() => nativeShare(r)}><Icon name="share" size={18} /> Share…</button>
        <a className="btn sm ghost" style={{ textDecoration: 'none' }} href={`https://wa.me/?text=${shareText}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>
        <a className="btn sm ghost" style={{ textDecoration: 'none' }} href={`sms:?&body=${shareText}`}>Messages</a>
      </div>
      <div className="nativeinvite">
        <div className="field" style={{ marginTop: 0 }}>
          <label>Send directly to a Seat&apos;d user</label>
          <input className="input" placeholder="Search name or @handle" value={s.shareDraft} onChange={(e) => mutate((x) => { x.shareDraft = e.target.value; })}
            onKeyDown={(e) => { if (e.key === 'Enter') sendBookingInvite(r.id, 'new'); }} />
        </div>
        {hits.length ? (
          <div className="searchresults">
            {hits.map((x) => (
              <div className="searchhit" key={x.p.id}>
                <div><Av p={x.p} size={34} /></div>
                <div style={{ flex: 1, minWidth: 0 }}><div className="who">{x.p.name}</div><div className="match">{x.p.handle} — {x.label}</div></div>
                <button className="btn sm" style={{ width: 'auto', padding: '8px 12px' }} onClick={() => sendBookingInvite(r.id, x.p.id)}>Send invite</button>
              </div>
            ))}
          </div>
        ) : <div className="searchresults"><div className="hintrow">No close match found. Type a name or @handle, then press Send invite to create/send.</div></div>}
        <button className="btn sm" style={{ marginTop: 10 }} onClick={() => sendBookingInvite(r.id, 'new')}>Send invite</button>
        {s.shareSent === r.id && <div className="toast">Invite sent inside Seat&apos;d.</div>}
      </div>
    </div>
  );
}

// ---------- discover ----------
function ClubCard({ v }) {
  const s = useApp();
  return (
    <div className="card" onClick={() => mutate((x) => { x.venueId = v.id; x.selTable = null; x.venueTab = 'tables'; x.screen = 'venue'; })}>
      <div className="cover" style={{ height: 180 }}>
        <Cover v={v} h={180} />
        <span className="genrebdg">{v.genre}</span><span className="when">{v.when}</span>
        <FavBtn vid={v.id} />
        <div className="covtag">
          <div className="nm">{v.name}</div>
          <div className="ar"><Pin />{v.area}{s.nearMe ? ` — ${v.dist} km` : ''}</div>
        </div>
      </div>
      <div className="meta">
        <div className="row">
          <div style={{ minWidth: 0 }}>
            <div className="sub" style={{ fontSize: 13 }}>{v.tagline}</div>
            <div style={{ marginTop: 7 }}><StarRating v={v} /></div>
          </div>
          <div className="pricefrom" style={{ textAlign: 'right' }}>from<br /><b>{fmt(v.minFrom)}</b></div>
        </div>
        <Availability id={v.id} />
      </div>
    </div>
  );
}
export function Discover() {
  const s = useApp();
  let list = venues.filter((v) => v.status === 'live');
  if (s.showFavs) list = list.filter((v) => s.favs.includes(v.id));
  if (s.area !== 'All') list = list.filter((v) => v.area === s.area);
  if (s.genre !== 'All') list = list.filter((v) => (v.genre || '').toLowerCase().includes(s.genre.toLowerCase()));
  const res = searchClubs(list, s.clubSearch);
  list = res.hits;
  if (s.nearMe) list = [...list].sort((a, b) => a.dist - b.dist);
  const pts = openPublicTables().filter((pt) => s.area === 'All' || (venue(pt.vid) && venue(pt.vid).area === s.area));
  return (
    <>
      <OfflineBar />
      <div className="body enter"><div className="pad">
        <div className="eyebrow">Out tonight — Joburg</div>
        <div className="h1">Find your<br />table</div>
        <input className="searchbar" type="search" placeholder="Search clubs, areas, music..." style={{ marginTop: 14 }}
          value={s.clubSearch} onChange={(e) => mutate((x) => { x.clubSearch = e.target.value; })} />
        <div className="chips">{AREAS.map((a) => <div key={a} className={`chip ${s.area === a ? 'on' : ''}`} onClick={() => mutate((x) => { x.area = a; })}>{a}</div>)}</div>
        <div className="chips" style={{ paddingTop: 0 }}>{GENRES.map((g) => <div key={g} className={`chip ${s.genre === g ? 'on' : ''}`} onClick={() => mutate((x) => { x.genre = g; })}>{g}</div>)}</div>
        <div className="wideactions">
          <button className={`locbtn ${s.nearMe ? 'on' : ''}`} style={{ flex: 1, minWidth: 200 }} onClick={() => mutate((x) => { x.nearMe = !x.nearMe; })}>
            <Pin />{s.nearMe ? 'Sorted by distance from Sandton' : "Sort by what's near me"}
          </button>
          <button className="btn ghost sm" style={{ minWidth: 150 }} onClick={() => mutate((x) => { x.showFavs = !x.showFavs; })}>
            <span style={{ color: 'var(--magenta)', display: 'inline-flex' }}><Icon name="heart" size={18} /></span>
            {s.showFavs ? 'Show all clubs' : `Favourites (${s.favs.length})`}
          </button>
        </div>
        {pts.length > 0 && (
          <>
            <div className="eyebrow" style={{ marginTop: 20, color: 'var(--teal)' }}>Join an open table</div>
            {pts.map((pt) => <PublicTableCard pt={pt} mode="join" key={pt.id} />)}
          </>
        )}
        <div className="eyebrow" style={{ marginTop: 20 }}>{s.showFavs ? 'Your favourites' : 'Book your own table'}</div>
        {res.fuzzy && list.length > 0 && <div className="meta2" style={{ marginTop: 14 }}>No exact match for “{s.clubSearch}” — showing the closest matches:</div>}
        <div className="cards stagger">
          {list.length ? list.map((v) => <ClubCard v={v} key={v.id} />)
            : <Empty><b style={{ color: 'var(--txt)' }}>No clubs found</b><br />Nothing matches “{s.clubSearch || s.genre || s.area}”. Try another name, area or genre.</Empty>}
        </div>
      </div></div>
      <UserTabbar />
    </>
  );
}

// ---------- map ----------
export function MapScreen() {
  useApp();
  const live = venues.filter((v) => v.status === 'live');
  const openVenue = (id) => mutate((x) => { x.venueId = id; x.selTable = null; x.venueTab = 'tables'; x.screen = 'venue'; });
  return (
    <>
      <OfflineBar />
      <div className="body enter"><div className="pad">
        <div className="h1" style={{ fontSize: 28 }}>Map</div>
        <div className="mapwrap" style={{ marginTop: 14, height: 250, position: 'relative', background: 'linear-gradient(160deg,#100B17,#0B0710)' }}>
          <svg viewBox="0 0 340 230" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
            <path d="M20 120 H320 M170 20 V210 M60 60 L300 180" stroke="#241d30" strokeWidth="2" fill="none" />
            {live.map((v, i) => {
              const x = 50 + (v.dist * 9) % 260, y = 40 + (i * 38) % 160;
              return (
                <g key={v.id} style={{ cursor: 'pointer' }} onClick={() => openVenue(v.id)}>
                  <circle className="ping" cx={x} cy={y} r="8" fill={v.g[0]} />
                  <circle cx={x} cy={y} r="7" fill={v.g[0]} />
                  <text x={x + 12} y={y + 4} fontFamily="Inter" fontSize="10" fontWeight="700" fill="#F5F0FA">{v.name}</text>
                </g>
              );
            })}
            <circle cx="170" cy="120" r="6" fill="#fff" /><circle className="ping" cx="170" cy="120" r="6" fill="#fff" />
            <text x="170" y="146" textAnchor="middle" fontFamily="Inter" fontSize="9" fill="#9A8FB0">You — Sandton</text>
          </svg>
        </div>
        <div className="stagger" style={{ marginTop: 16 }}>
          {[...live].sort((a, b) => a.dist - b.dist).map((v) => (
            <div className="lrow" key={v.id} style={{ border: '1px solid var(--line)', borderRadius: 16, padding: '13px 14px', marginTop: 10, maxWidth: 'none' }} onClick={() => openVenue(v.id)}>
              <Thumb v={v} size={44} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="nm">{v.name}</div>
                <div className="meta2">{v.area} · {v.dist} km · from {fmt(v.minFrom)}</div>
              </div>
              <span style={{ color: 'var(--muted)' }}><Icon name="arrow" size={20} stroke={2.5} /></span>
            </div>
          ))}
        </div>
      </div></div>
      <UserTabbar />
    </>
  );
}

// ---------- venue detail ----------
export function VenueScreen() {
  const s = useApp();
  const v = venue(s.venueId);
  if (!v) return null;
  const tabs = [['tables', 'Tables'], ['events', 'Events'], ['info', 'Club info'], ['reviews', 'Reviews']];
  const tables = tablesFor(s.venueId);
  const sel = tables.find((t) => t.id === s.selTable);
  return (
    <>
      <OfflineBar />
      <div style={{ position: 'relative' }}>
        <div className="cover" style={{ height: 130 }}>
          <Cover v={v} h={130} />
          <button className="back" aria-label="Back" style={{ position: 'absolute', top: 10, left: 14, zIndex: 5, background: 'rgba(11,7,16,.6)' }}
            onClick={() => mutate((x) => { x.screen = 'home'; x.tab = 'discover'; x.venueTab = 'tables'; })}><Icon name="back" size={22} stroke={2.8} /></button>
          <FavBtn vid={v.id} />
          <div className="covtag"><div className="nm" style={{ fontSize: 24 }}>{v.name}</div><div className="ar">{v.area} · {v.genre}</div></div>
        </div>
      </div>
      <div className="body"><div className="pad" style={{ paddingBottom: s.venueTab === 'tables' ? 150 : 34 }}>
        <div className="subtabs">{tabs.map(([id, label]) => <div key={id} className={`chip ${s.venueTab === id ? 'on' : ''}`} onClick={() => mutate((x) => { x.venueTab = id; })}>{label}</div>)}</div>
        {s.venueTab === 'tables' && <FloorMap v={v} tables={tables} />}
        {s.venueTab === 'events' && <VenueEvents v={v} />}
        {s.venueTab === 'info' && <VenueInfo v={v} />}
        {s.venueTab === 'reviews' && <VenueReviews v={v} />}
      </div></div>
      {s.venueTab === 'tables' && (sel ? (
        <div className="bookbar"><div style={{ maxWidth: 640, margin: '0 auto' }}>
          <div className="row" style={{ marginBottom: 12 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{tierMeta[sel.tier].label} — {sel.id}</div>
              <div className="sub" style={{ fontSize: 13 }}>Seats {sel.seats} · min spend {fmt(sel.min)}</div>
            </div>
            <div className="pill" style={{ background: tierMeta[sel.tier].color, color: '#0B0710' }}>Selected</div>
          </div>
          <button className="btn" onClick={() => mutate((x) => { x.screen = 'booking'; x.friendDraft = ''; })}>Continue to payment</button>
        </div></div>
      ) : (
        <div className="bookbar"><div className="sub" style={{ textAlign: 'center', paddingBottom: 6 }}>Tap an available table to book it</div></div>
      ))}
    </>
  );
}
function FloorMap({ v, tables }) {
  const s = useApp();
  return (
    <>
      <div className="legend">
        <span><i className="swatch" style={{ background: tierMeta.vip.color }} />VIP</span>
        <span><i className="swatch" style={{ background: tierMeta.booth.color }} />Booth</span>
        <span><i className="swatch" style={{ background: tierMeta.std.color }} />Standard</span>
        <span><i className="swatch" style={{ background: '#241d30', border: '1px solid #3a3148' }} />Booked</span>
      </div>
      <div className="mapwrap">
        <svg viewBox="0 0 340 360" width="100%">
          <rect x="6" y="6" width="328" height="348" rx="20" fill="none" stroke="#2B2336" strokeWidth="1.5" />
          <rect x="120" y="18" width="100" height="26" rx="8" fill="rgba(122,77,255,.18)" stroke="#7A4DFF" />
          <text x="170" y="35" textAnchor="middle" fontFamily="Anton" fontSize="12" fill="#b9a6ff">DJ BOOTH</text>
          <rect x="92" y="110" width="156" height="160" rx="14" fill="url(#dance)" />
          <text x="170" y="195" textAnchor="middle" fontFamily="Anton" fontSize="13" fill="rgba(245,240,250,.55)">DANCE FLOOR</text>
          <rect x="300" y="250" width="28" height="96" rx="8" fill="rgba(43,212,255,.12)" stroke="#2BD4FF" />
          <text x="314" y="300" textAnchor="middle" fontFamily="Anton" fontSize="11" fill="#9fe9ff" transform="rotate(90 314 300)">BAR</text>
          <defs><linearGradient id="dance" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="rgba(255,61,174,.10)" /><stop offset="1" stopColor="rgba(43,212,255,.10)" /></linearGradient></defs>
          {tables.map((t) => {
            const m = tierMeta[t.tier], selOn = s.selTable === t.id;
            const fill = t.booked ? '#241d30' : selOn ? m.color : 'rgba(255,255,255,.04)';
            const stroke = t.booked ? '#3a3148' : m.color;
            const txtc = t.booked ? '#5b5270' : selOn ? '#0B0710' : m.color;
            return (
              <g key={t.id} className={`tbl ${t.booked ? 'booked' : ''} ${!t.booked && !selOn ? 'glow' : ''}`}
                onClick={() => { if (!t.booked) mutate((x) => { x.selTable = t.id; }); }}>
                <rect x={t.x} y={t.y} width={t.w} height={t.h} rx="9" fill={fill} stroke={stroke} strokeWidth={selOn ? 2.5 : 1.5} />
                <text x={t.x + t.w / 2} y={t.y + t.h / 2 + 4} textAnchor="middle" fontFamily="Anton" fontSize="13" fill={txtc} style={{ pointerEvents: 'none' }}>{t.id}</text>
              </g>
            );
          })}
        </svg>
      </div>
      <Availability id={v.id} />
    </>
  );
}
function VenueEvents({ v }) {
  const evs = v.events || [];
  return (
    <>
      <div className="eyebrow" style={{ marginTop: 14 }}>Upcoming events</div>
      {evs.length ? evs.map((e, i) => (
        <div className="eventcard" key={i}>
          <div className="day"><div className="d1">{e[0]}</div><div className="d2">This week</div></div>
          <div style={{ flex: 1, minWidth: 0 }}><div className="enm">{e[1]}</div><div className="emeta">{e[2]}</div></div>
          <button className="btn sm" style={{ width: 'auto', padding: '10px 16px' }} onClick={() => mutate((x) => { x.venueTab = 'tables'; })}>Book</button>
        </div>
      )) : <Empty>No events listed yet.</Empty>}
    </>
  );
}
function VenueInfo({ v }) {
  const rows = [['Music genre', v.genre], ['Dress code', v.dress || '—'], ['Parking', v.parking || '—'], ['Minimum spend', 'From ' + fmt(v.minFrom)], ['Opening times', v.open || '—'], ['VIP contact', v.vip || '—'], ['Capacity', (v.capacity || '—') + ' people']];
  return (
    <>
      <div className="eyebrow" style={{ marginTop: 14 }}>Gallery</div>
      <Gallery v={v} />
      <div className="eyebrow" style={{ marginTop: 20 }}>The essentials</div>
      <div className="infogrid">{rows.map(([k, val]) => <div className="infocard" key={k}><div className="k">{k}</div><div className="v">{val}</div></div>)}</div>
      <div className="eyebrow" style={{ marginTop: 20 }}>Bottle menu</div>
      <div className="summary" style={{ marginTop: 10 }}>
        {(v.menu || []).length ? (v.menu || []).map((m, i) => <div className="minirow" key={i}><span>{m[0]}</span><b>{fmt(m[1])}</b></div>) : <div className="meta2">Menu coming soon.</div>}
      </div>
      <div className="eyebrow" style={{ marginTop: 20 }}>Find us</div>
      <div className="mapwrap" style={{ marginTop: 10, height: 150, maxWidth: 780 }}>
        <svg viewBox="0 0 340 130" width="100%" height="100%">
          <path d="M10 70 H330 M170 10 V120 M40 30 L300 110" stroke="#241d30" strokeWidth="2" />
          <circle className="ping" cx="170" cy="65" r="9" fill={v.g[0]} /><circle cx="170" cy="65" r="8" fill={v.g[0]} />
          <text x="170" y="95" textAnchor="middle" fontFamily="Inter" fontSize="10" fontWeight="700" fill="#F5F0FA">{v.name} — {v.area}</text>
        </svg>
      </div>
    </>
  );
}
function VenueReviews({ v }) {
  const s = useApp();
  const [text, setText] = useState('');
  return (
    <>
      <div className="summary" style={{ marginTop: 14, maxWidth: 780 }}>
        <div className="row"><div><div className="eyebrow">Ratings &amp; reviews</div><div style={{ marginTop: 8 }}><StarRating v={v} /></div></div></div>
        <ReviewRows v={v} />
      </div>
      <div className="summary" style={{ maxWidth: 780 }}>
        <div className="eyebrow">Leave a review</div>
        <div className="field"><label>Your rating</label>
          <div className="starpick">
            {[1, 2, 3, 4, 5].map((i) => (
              <button key={i} aria-label={`${i} star${i === 1 ? '' : 's'}`} onClick={() => mutate((x) => { x.myStars = i; })}>
                <svg viewBox="0 0 24 24" fill={i <= s.myStars ? '#FFC24B' : 'none'} stroke="#FFC24B" strokeWidth="1.6">
                  <path d="M12 2.6l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.5l-5.9 3.1 1.2-6.5L2.5 9.5l6.6-.9z" />
                </svg>
              </button>
            ))}
          </div>
        </div>
        <div className="field" style={{ marginTop: 6 }}><label>Your review</label>
          <textarea className="input" rows={2} placeholder="How was the club?" value={text} onChange={(e) => setText(e.target.value)} /></div>
        <button className="btn sm" style={{ marginTop: 10 }} onClick={() => { submitReview(text); setText(''); }}>Submit review</button>
      </div>
    </>
  );
}

// ---------- booking / pay / join ----------
export function BookingScreen() {
  const s = useApp();
  const t = tablesFor(s.venueId).find((x) => x.id === s.selTable);
  const v = venue(s.venueId);
  if (!t || !v) return null;
  const m = bookingMath(t);
  const partySize = s.men + s.women, overLimit = partySize > t.seats;
  const step = (k, d) => mutate((x) => {
    const nv = x[k] + d;
    const total = k === 'men' ? nv + x.women : nv + x.men;
    if (nv >= 0 && total >= 1 && total <= t.seats) x[k] = nv;
  });
  return (
    <>
      <div className="topbar">
        <button className="back" aria-label="Back" onClick={() => mutate((x) => { x.screen = 'venue'; })}><Icon name="back" size={22} stroke={2.8} /></button>
        <div><div className="h2" style={{ fontSize: 20 }}>{tierMeta[t.tier].label} — {t.id}</div><div className="sub" style={{ fontSize: 12 }}>{v.name}</div></div>
      </div>
      <div className="body enter"><div className="pad" style={{ paddingBottom: 130 }}>
        <div className="eyebrow">Your party</div>
        <div className="splitrow" style={{ marginTop: 12 }}>
          {[['men', 'Guys'], ['women', 'Girls']].map(([k, label]) => (
            <div className="col" key={k}>
              <div className="sub" style={{ fontSize: 12, marginBottom: 10 }}>{label}</div>
              <div className="stepper">
                <button aria-label={`Remove ${label}`} onClick={() => step(k, -1)}>−</button>
                <span className="val">{s[k]}</span>
                <button aria-label={`Add ${label}`} onClick={() => step(k, 1)}>+</button>
              </div>
            </div>
          ))}
        </div>
        <div className="field" style={{ maxWidth: 680 }}>
          <label>Invite crew / split payment</label>
          <div className="chips" style={{ paddingTop: 0 }}>
            {s.friends.map((id) => {
              const p = people[id];
              return p ? (
                <div key={id} className={`invitechip ${s.invited.includes(id) ? 'on' : ''}`}
                  onClick={() => mutate((x) => { x.invited = x.invited.includes(id) ? x.invited.filter((y) => y !== id) : x.invited.concat(id); })}>
                  <Av p={p} size={24} /> {p.name.split(' ')[0]}
                </div>
              ) : null;
            })}
          </div>
          <div className="addfriend">
            <input className="input" placeholder="Search friend by name or @handle" value={s.friendDraft}
              onChange={(e) => mutate((x) => { x.friendDraft = e.target.value; })}
              onKeyDown={(e) => { if (e.key === 'Enter') addFriendFromDraft(); }} />
            <button className="btn sm ghost" style={{ width: 'auto', padding: '0 14px' }} onClick={addFriendFromDraft}>Add</button>
          </div>
          <FriendSearch context="booking" />
          <div className="setrow" style={{ padding: '12px 0 0', border: 0 }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14 }}>Ping everyone to pay</div>
              <div className="meta2">You pay your share, friends get their own payment request.</div>
            </div>
            <div className={`tog ${s.splitPay ? 'on' : ''}`} role="switch" aria-checked={s.splitPay} onClick={() => mutate((x) => { x.splitPay = !x.splitPay; })}><i /></div>
          </div>
        </div>
        <div className="promobox">
          <div className="row">
            <div><div style={{ fontWeight: 800, fontSize: 15 }}>Promoter code</div><div className="meta2">Tracks commission and gives the group priority.</div></div>
            <span className="badge" style={{ background: 'rgba(255,194,75,.18)', color: 'var(--gold)' }}>{s.promoterCode}</span>
          </div>
          <input className="input" style={{ marginTop: 10 }} placeholder="PROMO CODE" value={s.promoterCode}
            onChange={(e) => mutate((x) => { x.promoterCode = e.target.value.toUpperCase(); })} />
        </div>
        <div className="summary">
          <div className="li"><span>Party composition</span><b>{s.men} guys / {s.women} girls</b></div>
          <div className="li"><span>Seats used</span><b style={{ color: overLimit ? 'var(--warn)' : 'var(--txt)' }}>{partySize}/{t.seats}</b></div>
          <div className="li"><span>Table minimum spend</span><b>{fmt(t.min)}</b></div>
          <div className="li"><span>Seat&apos;d service charge (5%)</span><b>{fmt(m.fee)}</b></div>
          <div className="li"><span>Group payable total</span><b>{fmt(m.chargeTotal)}</b></div>
          <div className="li"><span>Payment pings sent after you pay</span><b>{s.splitPay ? s.invited.length : 0}</b></div>
          <div className="total"><span className="sub">{s.splitPay ? 'Your share today' : 'Total payable now'}</span><span className="amt">{fmt(m.myShare)}</span></div>
          <div className="micro">Table minimum spend is charged upfront and becomes bar credit. With split-pay you only pay your own share now; friends get their own payment links. Fully refunded if declined.</div>
        </div>
      </div></div>
      <div className="bookbar">
        <button className="btn" disabled={overLimit} onClick={() => mutate((x) => { x.screen = 'pay'; })}>
          {overLimit ? 'Too many guests for this table' : `Continue to payment — ${fmt(m.myShare)}`}
        </button>
      </div>
    </>
  );
}
export function PayScreen() {
  const s = useApp();
  const t = tablesFor(s.venueId).find((x) => x.id === s.selTable);
  if (!t) return null;
  const m = bookingMath(t);
  return (
    <>
      <div className="topbar">
        <button className="back" aria-label="Back" onClick={() => mutate((x) => { x.screen = 'booking'; })}><Icon name="back" size={22} stroke={2.8} /></button>
        <div className="h2" style={{ fontSize: 20 }}>Payment</div>
      </div>
      <div className="body enter"><div className="pad" style={{ paddingBottom: 130, maxWidth: 680 }}>
        <CardFields />
        <div className="summary">
          <div className="li"><span>Minimum spend subtotal</span><b>{fmt(m.groupTotal)}</b></div>
          <div className="li"><span>Seat&apos;d service charge (5%)</span><b>{fmt(m.fee)}</b></div>
          <div className="li"><span>Group total</span><b>{fmt(m.chargeTotal)}</b></div>
          <div className="li"><span>Split between</span><b>{m.splitCount} {m.splitCount === 1 ? 'person' : 'people'}</b></div>
          <div className="total"><span className="sub">You pay now</span><span className="amt">{fmt(m.myShare)}</span></div>
        </div>
        <div className="micro" style={{ marginTop: 18 }}>Demo only — no real charge. In production this routes through a local processor (Paystack / Yoco).</div>
      </div></div>
      <div className="bookbar">
        <button className="btn gold" disabled={s.offline} onClick={submitBooking}>{s.offline ? 'Offline — reconnect to pay' : `Pay ${fmt(m.myShare)}`}</button>
      </div>
    </>
  );
}
function CardFields() {
  return (
    <>
      <div className="field"><label>Card number</label><input className="input" inputMode="numeric" autoComplete="cc-number" defaultValue="4242 4242 4242 4242" /></div>
      <div className="splitrow">
        <div style={{ flex: 1, minWidth: 120 }}><div className="field"><label>Expiry</label><input className="input" inputMode="numeric" defaultValue="12 / 27" /></div></div>
        <div style={{ flex: 1, minWidth: 120 }}><div className="field"><label>CVC</label><input className="input" inputMode="numeric" defaultValue="123" /></div></div>
      </div>
      <div className="field"><label>Name on card</label><input className="input" autoComplete="cc-name" defaultValue={people.me.name} /></div>
    </>
  );
}
export function JoinPayScreen() {
  const s = useApp();
  const aj = s.activeJoin || {};
  const pt = s.publicTables.find((x) => x.id === aj.ptId);
  if (!pt) return null;
  const gender = aj.gender === 'female' ? 'female' : 'male';
  const subtotal = publicJoinPrice(pt, gender);
  const fee = serviceFee(subtotal);
  const total = subtotal + fee;
  return (
    <>
      <div className="topbar">
        <button className="back" aria-label="Back" onClick={() => mutate((x) => { x.screen = 'home'; x.tab = 'discover'; })}><Icon name="back" size={22} stroke={2.8} /></button>
        <div><div className="h2" style={{ fontSize: 20 }}>Join table</div><div className="sub" style={{ fontSize: 12 }}>{pt.venue} — {pt.table}</div></div>
      </div>
      <div className="body enter"><div className="pad" style={{ paddingBottom: 130, maxWidth: 680 }}>
        <div className="publiccard">
          <div className="row">
            <div>
              <div className="eyebrow" style={{ color: 'var(--teal)' }}>Public table request</div>
              <div style={{ fontWeight: 800, fontSize: 17 }}>Join as {gender}</div>
              <div className="meta2">Owner approves your request after payment confirmation.</div>
            </div>
            <span className="badge" style={{ background: 'rgba(63,224,160,.15)', color: 'var(--ok)' }}>{publicSpotsOpen(pt)} seat{publicSpotsOpen(pt) === 1 ? '' : 's'} open</span>
          </div>
        </div>
        <CardFields />
        <div className="summary">
          <div className="li"><span>Join price</span><b>{fmt(subtotal)}</b></div>
          <div className="li"><span>Seat&apos;d service charge (5%)</span><b>{fmt(fee)}</b></div>
          <div className="total"><span className="sub">You pay now</span><span className="amt">{fmt(total)}</span></div>
        </div>
      </div></div>
      <div className="bookbar">
        <button className="btn gold" disabled={s.offline} onClick={confirmJoinPayment}>{s.offline ? 'Offline — reconnect to pay' : `Pay ${fmt(total)}`}</button>
      </div>
    </>
  );
}

// ---------- status / pass ----------
export function StatusScreen() {
  const s = useApp();
  const r = s.requests.find((x) => x.id === s.activeReq);
  if (!r) return <Discover />;
  const backBtn = (
    <button className="btn ghost" style={{ width: 'auto', padding: '14px 26px', marginTop: 18 }} onClick={() => mutate((x) => { x.screen = 'home'; x.tab = 'discover'; })}>Find another</button>
  );
  if (r.status === 'pending') return (
    <>
      <OfflineBar />
      <div className="body enter">
        <div className="center" style={{ flex: 'none', padding: '28px 26px 10px' }}>
          <div className="spinner" />
          <div className="h2">Payment pings sent</div>
          <div style={{ marginTop: 8 }}><StatusChip st="pending" /></div>
          <div className="sub" style={{ maxWidth: 280, marginTop: 8 }}>You paid {fmt(r.paidNow || 0)}. Friends were pinged to pay their own shares, then the club can approve the table.</div>
        </div>
        <div className="pad">
          <Deadline r={r} who="client" />
          <div className="summary">
            <div className="li"><span>Reference</span><b>{r.code}</b></div>
            <div className="li"><span>Paid</span><b>{paidCount(r)}</b></div>
            <div className="li"><span>Still outstanding</span><b>{fmt(amountOutstanding(r))}</b></div>
            <div className="li"><span>Group total</span><b>{fmt(r.total)}</b></div>
          </div>
          <PaymentRows r={r} editable />
          <div className="sub" style={{ fontSize: 12, marginTop: 18, opacity: 0.75, textAlign: 'center' }}>Demo: tap Mark paid to simulate friends paying, or switch to <b style={{ color: 'var(--magenta)' }}>Club</b> to approve.</div>
        </div>
      </div>
      <UserTabbar />
    </>
  );
  if (r.status === 'cancelled') return (
    <>
      <div className="center enter">
        <div className="checkwrap" style={{ background: '#241d30', border: '1px solid var(--warn)' }}><span style={{ fontSize: 26 }}>✕</span></div>
        <div className="h2" style={{ marginTop: 12 }}>Booking cancelled</div>
        <div style={{ marginTop: 8 }}><StatusChip st="cancelled" /></div>
        <div className="sub" style={{ maxWidth: 280, marginTop: 8 }}>{r.cancelReason || 'Not everyone paid within 20 minutes.'} Any paid shares are refunded and the table released.</div>
        {backBtn}
      </div>
      <UserTabbar />
    </>
  );
  if (r.status === 'rejected') return (
    <>
      <div className="center enter">
        <div className="checkwrap" style={{ background: '#241d30', border: '1px solid var(--warn)' }}><span style={{ fontSize: 20, fontWeight: 900 }}>REFUND</span></div>
        <div className="h2" style={{ marginTop: 12 }}>Table declined</div>
        <div style={{ marginTop: 8 }}><StatusChip st="rejected" /></div>
        <div className="sub" style={{ maxWidth: 260, marginTop: 8 }}>{r.venue} couldn&apos;t fit {r.table}. {fmt(r.paidNow || r.total)} refunded to your card.</div>
        {backBtn}
      </div>
      <UserTabbar />
    </>
  );
  const checked = r.status === 'checkedin';
  return (
    <>
      <OfflineBar />
      <div className="body enter">
        <div className="center" style={{ flex: 'none', padding: '24px 30px 6px' }}>
          <div className="checkwrap pop"><CheckBig /></div>
          <div className="h2" style={{ marginTop: 14 }}>{checked ? "You're inside" : "You're in"}</div>
          <div style={{ marginTop: 6 }}><StatusChip st={r.status} /></div>
          <div className="sub" style={{ marginTop: 6 }}>{r.venue} {checked ? 'scanned your pass' : 'confirmed your table'}</div>
        </div>
        <div className="pass enter">
          <div className="head">
            <div className="row">
              <div className="covtag nm" style={{ fontSize: 22, position: 'static', maxWidth: 'none' }}>{r.venue}</div>
              <span className="pill" style={{ background: tierMeta[r.tier].color, color: '#0B0710' }}>{tierMeta[r.tier].label}</span>
            </div>
            <div className="sub" style={{ fontSize: 13, marginTop: 4 }}>{r.date} · entry until 01:00</div>
          </div>
          <div className="qr"><div className="qrbox"><QRCodeCanvas value={qrPayload(r)} size={140} bgColor="#F5F0FA" fgColor="#0B0710" level="M" /></div></div>
          <div className="det">
            <div><div className="k">Table</div><div className="v">{r.table}</div></div>
            <div><div className="k">Party</div><div className="v">{r.men + r.women} guests</div></div>
            <div><div className="k">You paid</div><div className="v">{fmt(r.paidNow || r.total)}</div></div>
            <div><div className="k">Booking ref</div><div className="v">{r.code}</div></div>
          </div>
        </div>
        <div className="bypass">
          <div className="ico">✓</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 14 }}>Queue bypass enabled</div>
            <div className="meta2">Use the Seat&apos;d lane. Door staff scan once, then your table opens.</div>
          </div>
        </div>
        <div className="pad">
          <div className="micro" style={{ textAlign: 'center', maxWidth: 560, margin: '10px auto 0' }}>Show this at the door. {fmt(r.min)} prepaid minimum spend is credited to your table tab.</div>
          <ShareBlock r={r} />
        </div>
      </div>
      <UserTabbar />
    </>
  );
}

// ---------- my bookings ----------
export function MyBookings() {
  const s = useApp();
  const mine = s.requests.filter((r) => r.who === 'You' || (r.payments || []).some((p) => p.id === 'host' && p.name === people.me.name));
  return (
    <>
      <OfflineBar />
      <div className="body enter"><div className="pad">
        <div className="h1" style={{ fontSize: 28 }}>My<br />bookings</div>
        <div className="sub" style={{ marginTop: 6 }}>Track your table, who has paid, countdowns, and booking references.</div>
        <div className="stagger" style={{ marginTop: 16 }}>
          {mine.length ? mine.map((r) => {
            const confirmed = r.status === 'confirmed' || r.status === 'checkedin';
            const pt = publicTableForBooking(r.id);
            return (
              <div className="req" key={r.id}>
                <div className="row">
                  <div>
                    <div className="nm" style={{ fontSize: 17, fontWeight: 800 }}>{r.venue} — {r.table}</div>
                    <div className="meta2">{tierMeta[r.tier].label} · {r.men + r.women} guests · {r.date || ''}</div>
                  </div>
                  <StatusChip st={r.status} />
                </div>
                <Deadline r={r} who="client" />
                <div className="summary" style={{ marginTop: 14 }}>
                  <div className="li"><span>Booking reference</span><b>{r.code || r.id}</b></div>
                  <div className="li"><span>Your payment</span><b>{fmt(r.paidNow || 0)}</b></div>
                  <div className="li"><span>Group total</span><b>{fmt(r.total)}</b></div>
                  <div className="li"><span>Paid participants</span><b>{paidCount(r)}</b></div>
                  <div className="li"><span>Outstanding</span><b>{fmt(amountOutstanding(r))}</b></div>
                  <div className="li"><span>Recovered from public joiners</span><b>{fmt(tableCostRecovered(r))}</b></div>
                </div>
                <PaymentRows r={r} editable={r.status === 'pending'} />
                {confirmed && <ShareBlock r={r} />}
                {confirmed && (pt ? <PublicTableCard pt={pt} mode="owner" /> : (
                  <div className="publiccard">
                    <div className="row"><div>
                      <div className="eyebrow" style={{ color: 'var(--teal)' }}>Public table</div>
                      <div style={{ fontWeight: 800, fontSize: 16 }}>Open this table to other users?</div>
                      <div className="meta2">Set a join price. Approved joiners reduce the original group&apos;s effective cost.</div>
                    </div></div>
                    <button className="btn sm" style={{ marginTop: 13 }} onClick={() => makePublic(r.id)}>Make table public</button>
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                  <button className={`btn sm ${confirmed ? '' : 'ghost'}`} style={{ flex: 1 }} onClick={() => mutate((x) => { x.activeReq = r.id; x.screen = 'status'; })}>
                    {confirmed ? 'Open pass' : 'Track booking'}
                  </button>
                </div>
              </div>
            );
          }) : <Empty>No bookings yet.<br />Book a table and it will appear here with payment tracking and your reference.</Empty>}
        </div>
      </div></div>
      <UserTabbar />
    </>
  );
}
