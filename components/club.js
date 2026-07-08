'use client';
import { useState } from 'react';
import { Chart as ChartJS, registerables } from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import { AREAS, tierMeta, fmt, serviceFee } from '@/lib/data';
import {
  useApp, mutate, venues, venue, clubVenue, tablesFor, allPaid, paidCount,
  amountOutstanding, decide, scanNext, toast, syncVenueToDb, saveVenueLayout,
  FLOOR_SLOTS, authSignOut,
} from '@/lib/store';
import { Icon, Empty, OfflineBar, Cover, Deadline } from './ui';
import { PaymentRows } from './user';

ChartJS.register(...registerables);

const chartGrid = { color: 'rgba(43,35,54,.6)' };
const chartTicks = { color: '#9A8FB0', font: { family: 'Inter', size: 11 } };
const chartOpts = {
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: { x: { grid: { display: false }, ticks: chartTicks }, y: { grid: chartGrid, ticks: chartTicks, beginAtZero: true } },
};
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function ClubTabbar() {
  const s = useApp();
  const pend = s.requests.filter((r) => r.status === 'pending').length;
  const tabs = [['requests', 'ticket', 'Requests', pend], ['manage', 'store', 'Manage', 0], ['staff', 'user', 'Staff', 0], ['insights', 'chart', 'Insights', 0]];
  return (
    <div className="tabbar">
      {tabs.map(([id, icon, label, n]) => (
        <div key={id} className={`tab ${s.tab === id ? 'on' : ''}`} role="button" onClick={() => mutate((x) => { x.tab = id; x.screen = 'home'; })}>
          <span className="dot" />
          <div className="pos"><Icon name={icon} />{n ? <span className="badge-n">{n}</span> : null}</div>
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
}

function ClubSelector() {
  const s = useApp();
  let opts = [...venues.filter((v) => v.status !== 'suspended'), ...s.pendingClubs];
  if (s.lockedVenueId) opts = opts.filter((v) => v.id === s.lockedVenueId);
  return (
    <div className="clubselect">
      {opts.map((v) => (
        <div key={v.id} className={`clubopt ${s.clubVenueId === v.id ? 'on' : ''}`} onClick={() => mutate((x) => { x.clubVenueId = v.id; })}>
          <span className="clubdot" style={{ background: `linear-gradient(135deg,${v.g[0]},${v.g[1]})` }} />
          <div><div className="cname">{v.name}</div><div className="cmeta">{v.status === 'pending' ? 'Pending review' : v.area}</div></div>
        </div>
      ))}
    </div>
  );
}
function ClubRequestSelector() {
  const s = useApp();
  let opts = [...venues.filter((v) => v.status === 'live'), ...s.pendingClubs];
  if (s.lockedVenueId) opts = opts.filter((v) => v.id === s.lockedVenueId);
  const count = (id) => s.requests.filter((r) => (id === 'all' || r.vid === id) && r.status === 'pending').length;
  const pick = (id) => mutate((x) => { x.clubRequestVenueId = id; });
  return (
    <div className="clubselect">
      {!s.lockedVenueId && (
      <div className={`clubopt ${s.clubRequestVenueId === 'all' ? 'on' : ''}`} onClick={() => pick('all')}>
        <span className="clubdot" style={{ background: 'linear-gradient(135deg,var(--magenta),var(--blue))' }} />
        <div><div className="cname">All clubs</div><div className="cmeta">{count('all')} waiting</div></div>
      </div>
      )}
      {opts.map((v) => (
        <div key={v.id} className={`clubopt ${s.clubRequestVenueId === v.id ? 'on' : ''}`} onClick={() => pick(v.id)}>
          <span className="clubdot" style={{ background: `linear-gradient(135deg,${v.g[0]},${v.g[1]})` }} />
          <div><div className="cname">{v.name}</div><div className="cmeta">{count(v.id)} waiting</div></div>
        </div>
      ))}
    </div>
  );
}

export function ClubView() {
  const s = useApp();
  if (s.tab === 'manage') return <ClubManage />;
  if (s.tab === 'staff') return <StaffMode />;
  if (s.tab === 'insights') return <ClubInsights />;
  return <ClubRequests />;
}

function ClubRequests() {
  const s = useApp();
  const selected = s.clubRequestVenueId || 'all';
  const v = selected === 'all' ? null : venue(selected);
  const venueRequests = s.requests.filter((r) => selected === 'all' || r.vid === selected);
  const pend = venueRequests.filter((r) => r.status === 'pending');
  const conf = venueRequests.filter((r) => r.status === 'confirmed' || r.status === 'checkedin');
  const rev = conf.reduce((a, r) => a + r.total, 0);
  return (
    <>
      <OfflineBar />
      <div className="body enter"><div className="pad">
        <div className="eyebrow" style={{ color: 'var(--blue)' }}>{v ? v.name : 'All clubs'} — door</div>
        <div className="h1" style={{ fontSize: 30 }}>Tonight&apos;s<br />requests</div>
        <ClubRequestSelector />
        <div className="stat">
          <div className="box"><div className="n">{pend.length}</div><div className="l">Waiting</div></div>
          <div className="box"><div className="n">{conf.length}</div><div className="l">Confirmed</div></div>
          <div className="box"><div className="n">{fmt(rev)}</div><div className="l">Prepaid</div></div>
        </div>
        <div className="stagger">
          {pend.length ? pend.map((r) => {
            const ready = allPaid(r);
            return (
              <div className="req" key={r.id}>
                <div className="row">
                  <div>
                    <div className="nm" style={{ fontSize: 17, fontWeight: 800 }}>{r.who || 'New guest'}</div>
                    <div className="meta2" style={{ fontSize: 12 }}>{r.t || 'just now'} · {r.venue} · ref {r.code}</div>
                  </div>
                  <span className="badge" style={{ background: ready ? 'rgba(63,224,160,.15)' : 'rgba(255,194,75,.15)', color: ready ? 'var(--ok)' : 'var(--gold)' }}>
                    {ready ? 'READY TO APPROVE' : 'COLLECTING PAYMENTS'}
                  </span>
                </div>
                <Deadline r={r} who="club" />
                <div className="sub" style={{ fontSize: 14, marginTop: 12, color: 'var(--txt)' }}>{tierMeta[r.tier].label} <b>{r.table}</b> — {r.men} guys + {r.women} girls</div>
                <div className="sub" style={{ fontSize: 13, marginTop: 4 }}>Total booking <b style={{ color: 'var(--txt)' }}>{fmt(r.total)}</b> · outstanding {fmt(amountOutstanding(r))}</div>
                <div className="sub" style={{ fontSize: 12, marginTop: 4 }}>{r.splitPay ? 'Split-pay active' : 'Paid by host'} · {paidCount(r)} paid · promoter {r.promo || '—'}</div>
                <PaymentRows r={r} editable={false} />
                <div className="actions">
                  <button className="btn ghost sm" style={{ flex: 1 }} onClick={() => decide(r.id, 'rejected')}>Decline</button>
                  <button className="btn sm" style={{ flex: 1 }} disabled={!ready} onClick={() => decide(r.id, 'confirmed')}>Approve</button>
                </div>
              </div>
            );
          }) : <Empty>No requests waiting.<br />Paid table requests land here for one-tap approval.</Empty>}
        </div>
      </div></div>
      <ClubTabbar />
    </>
  );
}

function ClubManage() {
  const s = useApp();
  const v = clubVenue();
  const ts = tablesFor(v.id);
  const booked = ts.filter((t) => t.booked || s.requests.some((r) => r.vid === v.id && r.table === t.id && (r.status === 'confirmed' || r.status === 'checkedin'))).length;
  const [form, setForm] = useState(null);
  const f = form || { name: v.name, tagline: v.tagline, genre: v.genre, dress: v.dress || '', open: v.open || '', vip: v.vip || '' };
  const set = (k) => (e) => setForm({ ...f, [k]: e.target.value });
  return (
    <>
      <OfflineBar />
      <div className="body enter"><div className="pad">
        <div className="row">
          <div className="h1" style={{ fontSize: 28 }}>Venue<br />manager</div>
          <span className="badge" style={{ background: v.status === 'pending' ? 'rgba(255,194,75,.15)' : 'rgba(63,224,160,.14)', color: v.status === 'pending' ? 'var(--gold)' : 'var(--ok)' }}>
            {v.status === 'pending' ? 'PENDING' : 'LIVE'}
          </span>
        </div>
        <ClubSelector />
        <div className="sub">This is exactly how guests see the selected club. Edit below — it updates instantly.</div>
        <div className="studio-prev" style={{ marginTop: 14 }}>
          <div className="cover" style={{ height: 150 }}>
            <Cover v={v} h={150} />
            <span className="genrebdg">{v.genre}</span>
            <div className="covtag"><div className="nm">{v.name}</div><div className="ar">{v.area}</div></div>
          </div>
          <div className="meta"><div className="sub" style={{ fontSize: 13 }}>{v.tagline}</div></div>
        </div>
        <div style={{ maxWidth: 760 }}>
          {[['name', 'Venue name'], ['tagline', 'Tagline'], ['genre', 'Music / genre'], ['dress', 'Dress code'], ['open', 'Opening times'], ['vip', 'VIP contact']].map(([k, label]) => (
            <div className="field" key={k}><label>{label}</label><input className="input" value={f[k]} onChange={set(k)} /></div>
          ))}
          <div className="field"><label>Area</label>
            <div className="chips" style={{ paddingTop: 0 }}>
              {AREAS.slice(1).map((a) => <div key={a} className={`chip ${v.area === a ? 'on' : ''}`} onClick={() => mutate(() => { v.area = a; })}>{a}</div>)}
            </div>
          </div>
          <button className="btn" style={{ marginTop: 20 }} onClick={() => {
            mutate(() => {
              if (f.name.trim()) v.name = f.name.trim();
              v.tagline = f.tagline; v.genre = f.genre; v.dress = f.dress; v.open = f.open; v.vip = f.vip;
            });
            syncVenueToDb(v);
            setForm(null);
            toast('Venue published');
          }}>Save &amp; publish</button>
        </div>
        <div className="featuregrid">
          <div className="featurecard"><div className="n">{booked}/{ts.length}</div><div className="l">Tables occupied</div></div>
          <div className="featurecard"><div className="n">{Math.round((booked / ts.length) * 100)}%</div><div className="l">Floor usage</div></div>
          <div className="featurecard"><div className="n">{v.capacity || '—'}</div><div className="l">Capacity</div></div>
          <div className="featurecard"><div className="n">22:00</div><div className="l">Doors open</div></div>
        </div>
        <TableLayoutEditor v={v} />
        <div className="summary">
          <div className="eyebrow">Upcoming events</div>
          {(v.events || []).length ? (v.events || []).map((e, i) => (
            <div className="minirow" key={i}><span><b style={{ color: 'var(--txt)' }}>{e[0]}</b> — {e[1]}</span><b>{e[2]}</b></div>
          )) : <div className="meta2">No events yet.</div>}
        </div>
        <button className="btn ghost" style={{ marginTop: 24, maxWidth: 400 }} onClick={authSignOut}>Log out</button>
      </div></div>
      <ClubTabbar />
    </>
  );
}

// Small table-layout editor: tables fill fixed floor slots in order;
// owners control how many tables exist, their tier, seats and minimum spend.
const TIER_DEFAULTS = { vip: { seats: 8, min: 6000 }, booth: { seats: 6, min: 3000 }, std: { seats: 4, min: 1500 } };
function TableLayoutEditor({ v }) {
  useApp();
  const ts = tablesFor(v.id);
  const full = ts.length >= FLOOR_SLOTS.length;
  const nextId = (tier) => {
    const pre = tier === 'vip' ? 'V' : tier === 'booth' ? 'B' : 'S';
    let n = 1;
    while (ts.some((t) => t.id === pre + n)) n++;
    return pre + n;
  };
  const reslot = () => ts.forEach((t, i) => Object.assign(t, FLOOR_SLOTS[i]));
  const add = (tier) => {
    if (full) { toast('The floor is full (13 tables max)'); return; }
    mutate(() => { ts.push({ id: nextId(tier), ...FLOOR_SLOTS[ts.length], tier, ...TIER_DEFAULTS[tier], booked: false }); reslot(); });
  };
  const remove = (id) => mutate(() => {
    const i = ts.findIndex((t) => t.id === id);
    if (i >= 0) ts.splice(i, 1);
    reslot();
  });
  const setNum = (t, key) => (e) => {
    const val = parseInt(String(e.target.value).replace(/\D/g, ''), 10);
    mutate(() => { t[key] = isNaN(val) ? 0 : val; });
  };
  return (
    <div className="summary" style={{ maxWidth: 780 }}>
      <div className="row">
        <div><div className="eyebrow">Table layout</div><div className="meta2" style={{ marginTop: 4 }}>{ts.length}/{FLOOR_SLOTS.length} tables on the floor — guests see this map instantly.</div></div>
      </div>
      {ts.map((t) => (
        <div className="minirow" key={t.id} style={{ flexWrap: 'wrap', gap: 8 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 110 }}>
            <i className="swatch" style={{ background: tierMeta[t.tier].color }} />
            <b style={{ color: 'var(--txt)' }}>{t.id}</b> {tierMeta[t.tier].label}
            {t.booked ? <span className="badge" style={{ background: 'rgba(255,107,107,.14)', color: 'var(--warn)' }}>BOOKED</span> : null}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <label className="meta2" style={{ fontSize: 11 }}>Seats</label>
            <input className="input" inputMode="numeric" value={t.seats} onChange={setNum(t, 'seats')} style={{ width: 64, minHeight: 38, padding: '6px 10px' }} />
            <label className="meta2" style={{ fontSize: 11 }}>Min spend R</label>
            <input className="input" inputMode="numeric" value={t.min} onChange={setNum(t, 'min')} style={{ width: 90, minHeight: 38, padding: '6px 10px' }} />
            <button className="btn sm ghost" style={{ width: 'auto', padding: '6px 10px', minHeight: 38 }} disabled={!!t.booked} onClick={() => remove(t.id)}>Remove</button>
          </span>
        </div>
      ))}
      <div className="wideactions" style={{ marginTop: 12 }}>
        <button className="btn sm ghost" disabled={full} onClick={() => add('vip')}>+ VIP</button>
        <button className="btn sm ghost" disabled={full} onClick={() => add('booth')}>+ Booth</button>
        <button className="btn sm ghost" disabled={full} onClick={() => add('std')}>+ Standard</button>
      </div>
      <button className="btn sm" style={{ marginTop: 12 }} onClick={() => saveVenueLayout(v, ts)}>Save layout</button>
    </div>
  );
}

function StaffMode() {
  const s = useApp();
  const v = clubVenue();
  const list = s.requests.filter((r) => r.vid === v.id && (r.status === 'confirmed' || r.status === 'checkedin'));
  return (
    <>
      <OfflineBar />
      <div className="body enter"><div className="pad">
        <div className="h1" style={{ fontSize: 28 }}>Door<br />staff</div>
        <ClubSelector />
        <div className="scanbox">
          <div className="eyebrow">QR scanner</div>
          <div className="scanframe" />
          <button className="btn" style={{ maxWidth: 300, margin: '0 auto' }} onClick={scanNext}>Scan next pass</button>
          {s.scannerResult && (
            <div className="summary" style={{ marginTop: 14, textAlign: 'left' }}>
              <div className="minirow"><span>Result</span><b style={{ color: 'var(--ok)' }}>VALID — CHECKED IN</b></div>
              <div className="minirow"><span>Booking</span><b>{s.scannerResult}</b></div>
              <div className="minirow"><span>Action</span><b>Send to table</b></div>
            </div>
          )}
        </div>
        <div className="summary">
          <div className="eyebrow">Tonight&apos;s confirmed door list</div>
          {list.length ? list.map((r) => (
            <div className="minirow" key={r.id}>
              <span>{r.who} — {r.table} · {r.men + r.women} guests {r.status === 'checkedin' ? <b style={{ color: 'var(--blue)' }}>· checked in</b> : null}</span>
              <b>{r.code || r.id}</b>
            </div>
          )) : <div className="minirow"><span>No confirmed bookings yet</span><b>—</b></div>}
        </div>
        <div className="summary">
          <div className="eyebrow">Staff permissions</div>
          <div className="minirow"><span>Scan tickets</span><b style={{ color: 'var(--ok)' }}>Enabled</b></div>
          <div className="minirow"><span>Approve tables</span><b style={{ color: 'var(--gold)' }}>Manager only</b></div>
          <div className="minirow"><span>Refunds</span><b>Admin only</b></div>
        </div>
      </div></div>
      <ClubTabbar />
    </>
  );
}

function ClubInsights() {
  const s = useApp();
  const v = clubVenue();
  const reqs = s.requests.filter((r) => r.vid === v.id);
  const confirmed = reqs.filter((r) => r.status === 'confirmed' || r.status === 'checkedin');
  const pending = reqs.filter((r) => r.status === 'pending');
  const revenue = confirmed.reduce((a, r) => a + (Number(r.total) || 0), 0);
  const service = confirmed.reduce((a, r) => a + (Number(r.serviceFee) || serviceFee(r.subtotal || r.min || 0)), 0);
  const guests = confirmed.reduce((a, r) => a + (r.men || 0) + (r.women || 0), 0);
  const avgSpend = confirmed.length ? Math.round(revenue / confirmed.length) : 0;
  const ts = tablesFor(v.id);
  const occupied = ts.filter((t) => t.booked || confirmed.some((r) => r.table === t.id)).length;
  const occupancy = Math.round((occupied / ts.length) * 100);
  const by = {}; reqs.forEach((r) => { by[r.who] = (by[r.who] || 0) + 1; });
  const repeat = Object.values(by).filter((n) => n > 1).length + 3;
  const conf = confirmed.length, pend = pending.length;
  const bookingsData = [6, 9, 12, 17, 24, 26 + conf * 3 + pend, 14 + conf * 2];
  const revData = [8, 11, 14, 19, 32, Math.max(20, Math.round(revenue / 250)), 24].map((x) => x * 250);
  const cards = [
    [fmt(revenue), 'Revenue tonight'], [conf, 'Bookings today'], [conf + 7, 'Bookings this week'], [fmt(avgSpend), 'Average spend'],
    [occupancy + '%', 'Occupancy'], [pend, 'Pending requests'], [repeat, 'Repeat customers'], [guests, 'Guests through door'],
  ];
  return (
    <>
      <OfflineBar />
      <div className="body enter"><div className="pad">
        <div className="h1" style={{ fontSize: 28 }}>Club<br />dashboard</div>
        <div className="sub">{v.name} — live from approved transactions</div>
        <ClubSelector />
        <div className="featuregrid">{cards.map(([n, l], i) => <div className="featurecard" key={i}><div className="n">{n}</div><div className="l">{l}</div></div>)}</div>
        <div className="chartbox">
          <div className="eyebrow">Bookings by night</div>
          <div className="cwrap"><Bar data={{ labels: DAYS, datasets: [{ data: bookingsData, backgroundColor: DAYS.map((_, i) => (i === 5 ? '#FF3DAE' : 'rgba(122,77,255,.55)')), borderRadius: 8 }] }} options={chartOpts} /></div>
        </div>
        <div className="chartbox">
          <div className="eyebrow">Revenue this week</div>
          <div className="cwrap"><Line data={{ labels: DAYS, datasets: [{ data: revData, borderColor: '#2BD4FF', backgroundColor: 'rgba(43,212,255,.12)', fill: true, tension: 0.4, pointBackgroundColor: '#2BD4FF' }] }} options={chartOpts} /></div>
        </div>
        <div className="summary">
          <div className="eyebrow">Live floor occupancy</div>
          <div className="minirow"><span>VIP</span><b>{confirmed.filter((r) => r.tier === 'vip').length} booked</b></div>
          <div className="minirow"><span>Booths</span><b>{confirmed.filter((r) => r.tier === 'booth').length} booked</b></div>
          <div className="minirow"><span>Standard</span><b>{confirmed.filter((r) => r.tier === 'std').length} booked</b></div>
        </div>
        <div className="summary">
          <div className="eyebrow">Money</div>
          <div className="minirow"><span>Prepaid bar credit</span><b>{fmt(confirmed.reduce((a, r) => a + (r.min || 0), 0))}</b></div>
          <div className="minirow"><span>Seat&apos;d service fees</span><b>{fmt(service)}</b></div>
          <div className="minirow"><span>Promoter commission owed</span><b>{fmt(Math.round(revenue * 0.05))}</b></div>
        </div>
      </div></div>
      <ClubTabbar />
    </>
  );
}
