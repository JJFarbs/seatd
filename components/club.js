'use client';
import { useState, useEffect, useRef } from 'react';
import { Chart as ChartJS, registerables } from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import { AREAS, ALL_SLOTS, DEFAULT_SLOTS, tierMeta, fmt, serviceFee, slotDay, isoToday } from '@/lib/data';
import {
  useApp, mutate, venues, venue, clubVenue, tablesFor, allPaid, paidCount,
  amountOutstanding, decide, scanNext, toast, syncVenueToDb, saveVenueLayout,
  FLOOR_SLOTS, authSignOut, saveVenueLocation, processScan, ticketsFor, saveVenueTickets, saveVenueMenu,
  fetchPaystackBanks, saveVenuePayout,
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
                <div className="sub" style={{ fontSize: 14, marginTop: 12, color: 'var(--txt)' }}>{r.slotTime ? 'Reservation' : tierMeta[r.tier].label} <b>{r.table}</b> — {r.slotTime ? `${r.party || r.men} guests` : `${(r.men || 0) + (r.women || 0)} guests`}</div>
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
        <PayoutSetup v={v} />
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
          {[['name', 'Venue name'], ['tagline', 'Tagline'], ['genre', v.kind === 'restaurant' ? 'Cuisine' : 'Music / genre'], ['dress', 'Dress code'], ['open', 'Opening times'], ['vip', 'VIP contact']].map(([k, label]) => (
            <div className="field" key={k}><label>{label}</label><input className="input" value={f[k]} onChange={set(k)} /></div>
          ))}
          <div className="field"><label>Venue type</label>
            <div className="chips" style={{ paddingTop: 0 }}>
              {[['club', 'Club'], ['restaurant', 'Restaurant']].map(([k, l]) => <div key={k} className={`chip ${(v.kind || 'club') === k ? 'on' : ''}`} onClick={() => mutate(() => { v.kind = k; })}>{l}</div>)}
            </div>
          </div>
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
        {v.kind === 'restaurant' ? (() => {
          const today = new Date().toISOString().slice(0, 10);
          const mine = s.requests.filter((r) => r.vid === v.id && r.slotDate && ['pending', 'confirmed', 'checkedin'].includes(r.status));
          const todays = mine.filter((r) => r.slotDate === today);
          const covers = todays.reduce((a, r) => a + (r.party || 0), 0);
          const upcoming = mine.filter((r) => r.slotDate >= today).length;
          return (
            <div className="featuregrid">
              <div className="featurecard"><div className="n">{todays.length}</div><div className="l">Reservations today</div></div>
              <div className="featurecard"><div className="n">{covers}</div><div className="l">Covers today</div></div>
              <div className="featurecard"><div className="n">{upcoming}</div><div className="l">Upcoming bookings</div></div>
              <div className="featurecard"><div className="n">{v.slotCovers || 40}</div><div className="l">Covers per time slot</div></div>
            </div>
          );
        })() : (
          <div className="featuregrid">
            <div className="featurecard"><div className="n">{booked}/{ts.length}</div><div className="l">Tables occupied</div></div>
            <div className="featurecard"><div className="n">{ts.length ? Math.round((booked / ts.length) * 100) : 0}%</div><div className="l">Floor usage</div></div>
            <div className="featurecard"><div className="n">{v.capacity || '—'}</div><div className="l">Capacity</div></div>
            <div className="featurecard"><div className="n">22:00</div><div className="l">Doors open</div></div>
          </div>
        )}
        {v.kind === 'restaurant' ? <ReservationSettings v={v} /> : (
          <div className="summary" style={{ maxWidth: 780 }}>
            <div className="eyebrow">Next event date</div>
            <div className="meta2" style={{ marginTop: 4 }}>Table bookings are stamped with this date. Guests&apos; bookings move to Previous bookings 24 hours after the night is over.</div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginTop: 12 }}>
              <input className="input" type="date" min={isoToday()} value={v.eventDate || ''} onChange={(e) => mutate(() => { v.eventDate = e.target.value || null; })} style={{ width: 180 }} />
              <button className="btn sm" style={{ width: 'auto', padding: '0 18px' }} onClick={() => { syncVenueToDb(v); toast('Event date saved'); }}>Save date</button>
            </div>
          </div>
        )}
        {v.kind !== 'restaurant' && <TableLayoutEditor v={v} />}
        <FeeSettings v={v} />
        <TicketEditor v={v} />
        <MenuEditor v={v} />
        <LocationPicker v={v} />
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

// Payout setup: links the venue's own bank account as a Paystack subaccount.
// Every real booking/ticket payment splits at Paystack — this venue gets its share
// settled straight to its own bank, Seat'd only ever receives its 5% service fee.
// Guests can't pay real money into this venue until this is done.
function PayoutSetup({ v }) {
  const [banks, setBanks] = useState([]);
  const [banksLoading, setBanksLoading] = useState(false);
  const [bankCode, setBankCode] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [businessName, setBusinessName] = useState(v.name);
  const [busy, setBusy] = useState(false);
  const active = v.payoutStatus === 'active';
  const loadBanks = async () => {
    if (banks.length || banksLoading) return;
    setBanksLoading(true);
    setBanks(await fetchPaystackBanks());
    setBanksLoading(false);
  };
  const save = async () => {
    if (!bankCode || !accountNumber.trim() || !businessName.trim()) { toast('Fill in bank, account number and business name'); return; }
    setBusy(true);
    const bankName = banks.find((b) => b.code === bankCode)?.name || '';
    await saveVenuePayout(v, { bankCode, bankName, accountNumber: accountNumber.trim(), businessName: businessName.trim() });
    setBusy(false);
    setAccountNumber('');
  };
  return (
    <div className="summary" style={{ maxWidth: 780, borderColor: active ? undefined : 'rgba(255,194,75,.5)' }}>
      <div className="row">
        <div>
          <div className="eyebrow">Payouts</div>
          <div className="meta2" style={{ marginTop: 4 }}>Link your bank account so guest payments settle straight to you, minus Seat&apos;d&apos;s 5% fee.</div>
        </div>
        <span className="badge" style={{ background: active ? 'rgba(63,224,160,.15)' : 'rgba(255,194,75,.15)', color: active ? 'var(--ok)' : 'var(--gold)' }}>
          {active ? 'ACTIVE' : 'NOT SET UP'}
        </span>
      </div>
      {active ? (
        <div className="minirow"><span>Payouts go to</span><b>{v.payoutBankName} · account ending {v.payoutAccountLast4}</b></div>
      ) : (
        <div className="meta2" style={{ marginTop: 8, color: 'var(--warn)' }}>Guests can&apos;t pay real money for this venue&apos;s tables or tickets until this is set up.</div>
      )}
      <div className="field" style={{ marginTop: 12 }}>
        <label>Business / account holder name</label>
        <input className="input" value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
      </div>
      <div className="field">
        <label>Bank</label>
        <select className="input" value={bankCode} onFocus={loadBanks} onChange={(e) => setBankCode(e.target.value)}>
          <option value="">{banksLoading ? 'Loading banks…' : 'Select your bank'}</option>
          {banks.map((b) => <option key={b.code} value={b.code}>{b.name}</option>)}
        </select>
      </div>
      <div className="field">
        <label>Account number</label>
        <input className="input" inputMode="numeric" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))} placeholder={active ? 'Enter a new number to update' : ''} />
      </div>
      <button className="btn sm" style={{ marginTop: 10 }} disabled={busy} onClick={save}>{busy ? 'Saving…' : active ? 'Update payout details' : 'Save payout details'}</button>
    </div>
  );
}

// Location picker: tap (or drag the pin) to set where the venue sits on the map.
function LocationPicker({ v }) {
  const mapEl = useRef(null);
  const mapObj = useRef(null);
  const markerRef = useRef(null);
  const posRef = useRef(null);
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    let dead = false;
    (async () => {
      const L = (await import('leaflet')).default;
      if (dead || !mapEl.current || mapObj.current) return;
      const start = [v.lat || -26.1076, v.lng || 28.0567];
      const map = L.map(mapEl.current, { zoomControl: true }).setView(start, v.lat ? 14 : 11);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors', maxZoom: 19, className: 'dark-tiles',
      }).addTo(map);
      const icon = L.divIcon({
        className: 'club-pin',
        html: `<span class="club-pin-dot" style="--c:${v.g?.[0] || '#FF3DAE'}"></span><span class="club-pin-label">${v.name}</span>`,
        iconSize: [12, 12], iconAnchor: [6, 6],
      });
      const marker = L.marker(start, { icon, draggable: true }).addTo(map);
      marker.on('dragend', () => { const p = marker.getLatLng(); posRef.current = [p.lat, p.lng]; setDirty(true); });
      map.on('click', (e) => { marker.setLatLng(e.latlng); posRef.current = [e.latlng.lat, e.latlng.lng]; setDirty(true); });
      markerRef.current = marker;
      mapObj.current = map;
    })();
    return () => { dead = true; if (mapObj.current) { mapObj.current.remove(); mapObj.current = null; } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v.id]);
  return (
    <div className="summary" style={{ maxWidth: 780 }}>
      <div className="eyebrow">Venue location</div>
      <div className="meta2" style={{ marginTop: 4 }}>Tap the map (or drag the pin) to where your club actually is — guests see this on the city map.</div>
      <div className="mapwrap" style={{ marginTop: 12, height: 260, position: 'relative', overflow: 'hidden', padding: 0, maxWidth: 'none' }}>
        <div ref={mapEl} style={{ position: 'absolute', inset: 0, borderRadius: 22 }} />
      </div>
      <button className="btn sm" style={{ marginTop: 12 }} disabled={!dirty}
        onClick={() => { if (posRef.current) { saveVenueLocation(v, posRef.current[0], posRef.current[1]); setDirty(false); } }}>
        {dirty ? 'Save location' : v.lat ? 'Location set' : 'Tap the map to place your pin'}
      </button>
    </div>
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

// Single-ticket editor: owners define ticket types (name, price, quantity) sold
// alongside tables — guests buy these under the club's Tickets sub-menu.
function TicketEditor({ v }) {
  useApp();
  const ts = ticketsFor(v.id);
  const nextId = () => {
    let n = 1;
    while (ts.some((t) => t.id === 'T' + n)) n++;
    return 'T' + n;
  };
  const add = () => mutate(() => { v.tickets = [...(v.tickets || []), { id: nextId(), name: 'General entry', price: 150, qty: 100 }]; });
  const remove = (id) => mutate(() => { v.tickets = (v.tickets || []).filter((t) => t.id !== id); });
  const setField = (id, key) => (e) => {
    const raw = e.target.value;
    mutate(() => {
      const t = (v.tickets || []).find((x) => x.id === id);
      if (!t) return;
      if (key === 'name') t.name = raw;
      else if (key === 'date') t.date = raw || null;
      else { const val = parseInt(String(raw).replace(/\D/g, ''), 10); t[key] = isNaN(val) ? 0 : val; }
    });
  };
  return (
    <div className="summary" style={{ maxWidth: 780 }}>
      <div className="row">
        <div><div className="eyebrow">Tickets</div><div className="meta2" style={{ marginTop: 4 }}>Sell single-entry tickets alongside tables — guests buy these under the club&apos;s Tickets tab.</div></div>
      </div>
      {ts.map((t) => (
        <div className="minirow" key={t.id} style={{ flexWrap: 'wrap', gap: 8 }}>
          <input className="input" value={t.name} onChange={setField(t.id, 'name')} style={{ flex: '1 1 160px', minHeight: 38, padding: '6px 10px' }} />
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <label className="meta2" style={{ fontSize: 11 }}>Event date</label>
            <input className="input" type="date" min={isoToday()} value={t.date || ''} onChange={setField(t.id, 'date')} style={{ width: 150, minHeight: 38, padding: '6px 10px' }} />
            <label className="meta2" style={{ fontSize: 11 }}>Price R</label>
            <input className="input" inputMode="numeric" value={t.price} onChange={setField(t.id, 'price')} style={{ width: 84, minHeight: 38, padding: '6px 10px' }} />
            <label className="meta2" style={{ fontSize: 11 }}>Qty</label>
            <input className="input" inputMode="numeric" value={t.qty} onChange={setField(t.id, 'qty')} style={{ width: 74, minHeight: 38, padding: '6px 10px' }} />
            <span className="meta2" style={{ fontSize: 11 }}>{t.sold || 0} sold</span>
            <button className="btn sm ghost" style={{ width: 'auto', padding: '6px 10px', minHeight: 38 }} onClick={() => remove(t.id)}>Remove</button>
          </span>
        </div>
      ))}
      {!ts.length && <div className="meta2" style={{ marginTop: 8 }}>No ticket types yet — add one below.</div>}
      <div className="wideactions" style={{ marginTop: 12 }}>
        <button className="btn sm ghost" onClick={add}>+ Ticket type</button>
      </div>
      <button className="btn sm" style={{ marginTop: 12 }} onClick={() => saveVenueTickets(v, v.tickets || [])}>Save tickets</button>
    </div>
  );
}

// Restaurants: seating times, party size limit, covers per slot and the booking deposit.
function ReservationSettings({ v }) {
  useApp();
  const slots = v.slots && v.slots.length ? v.slots : DEFAULT_SLOTS;
  const num = (raw) => { const n = parseInt(String(raw).replace(/\D/g, ''), 10); return isNaN(n) ? 0 : n; };
  const toggle = (t) => mutate(() => {
    const cur = new Set(slots);
    if (cur.has(t)) cur.delete(t); else cur.add(t);
    v.slots = ALL_SLOTS.filter((x) => cur.has(x));
  });
  return (
    <div className="summary" style={{ maxWidth: 780 }}>
      <div className="eyebrow">Reservations</div>
      <div className="meta2" style={{ marginTop: 4 }}>Guests pick a day, party size and one of your seating times. A deposit holds the table and is credited to their bill.</div>
      <div className="field" style={{ marginTop: 14 }}><label>Seating times (tap to switch on / off)</label>
        <div className="chips" style={{ paddingTop: 0 }}>
          {ALL_SLOTS.map((t) => <div key={t} className={`chip ${slots.includes(t) ? 'on' : ''}`} onClick={() => toggle(t)}>{t}</div>)}
        </div>
      </div>
      <div className="field"><label>Deposit type</label>
        <div className="chips" style={{ paddingTop: 0 }}>
          {[['person', 'Per person'], ['booking', 'Per booking']].map(([k, l]) => <div key={k} className={`chip ${v.depositMode === k ? 'on' : ''}`} onClick={() => mutate(() => { v.depositMode = k; })}>{l}</div>)}
        </div>
      </div>
      {[['depositPP', v.depositMode === 'booking' ? 'Deposit per booking (R)' : 'Deposit per person (R)'], ['slotCovers', 'Max guests per seating time'], ['maxParty', 'Largest party bookable online']].map(([k, label]) => (
        <div className="field" key={k}><label>{label}</label>
          <input className="input" inputMode="numeric" value={v[k]} onChange={(e) => mutate(() => { v[k] = num(e.target.value); })} style={{ maxWidth: 200 }} />
        </div>
      ))}
      <button className="btn sm" style={{ marginTop: 6 }} onClick={() => {
        mutate(() => { if (!(v.depositPP >= 0)) v.depositPP = 0; if (!(v.slotCovers > 0)) v.slotCovers = 40; if (!(v.maxParty > 0)) v.maxParty = 10; if (!v.slots || !v.slots.length) v.slots = DEFAULT_SLOTS; });
        syncVenueToDb(v); toast('Reservation settings saved');
      }}>Save reservation settings</button>
    </div>
  );
}

// Who pays Seat'd's 5% service charge: the guest (added at checkout) or the venue (taken out of the payout).
function FeeSettings({ v }) {
  useApp();
  return (
    <div className="summary" style={{ maxWidth: 780 }}>
      <div className="eyebrow">Who pays the Seat&apos;d fee?</div>
      <div className="meta2" style={{ marginTop: 4 }}>Seat&apos;d charges 5% on every booking and ticket. Either guests see it added at checkout, or you absorb it and guests pay exactly your price.</div>
      <div className="chips" style={{ paddingTop: 12 }}>
        {[['guest', 'Guest pays (default)'], ['venue', 'I pay it']].map(([k, l]) => <div key={k} className={`chip ${(v.feePayer || 'guest') === k ? 'on' : ''}`} onClick={() => mutate(() => { v.feePayer = k; })}>{l}</div>)}
      </div>
      <button className="btn sm" style={{ marginTop: 12 }} onClick={() => { syncVenueToDb(v); toast('Fee setting saved'); }}>Save</button>
    </div>
  );
}

// Bottle/drink menu editor — shown to guests under the club's Info tab. Restaurants get food sections.
function MenuEditor({ v }) {
  useApp();
  const rest = v.kind === 'restaurant';
  const items = v.menu || [];
  const add = () => mutate(() => { v.menu = [...(v.menu || []), rest ? ['New dish', 100, (v.menu || []).length ? ((v.menu || [])[(v.menu || []).length - 1][2] || 'Mains') : 'Mains'] : ['New item', 100]]; });
  const remove = (i) => mutate(() => { v.menu = (v.menu || []).filter((_, idx) => idx !== i); });
  const setField = (i, key) => (e) => {
    const raw = e.target.value;
    mutate(() => {
      const arr = [...(v.menu || [])];
      const item = [...arr[i]];
      if (key === 'name') item[0] = raw;
      else if (key === 'section') item[2] = raw;
      else { const val = parseInt(String(raw).replace(/\D/g, ''), 10); item[1] = isNaN(val) ? 0 : val; }
      arr[i] = item;
      v.menu = arr;
    });
  };
  return (
    <div className="summary" style={{ maxWidth: 780 }}>
      <div className="row">
        <div><div className="eyebrow">{rest ? 'Food & drinks menu' : 'Bottle menu'}</div><div className="meta2" style={{ marginTop: 4 }}>{rest ? 'Shown to guests under Info & menu — group dishes into sections like Starters, Mains, Desserts, Drinks.' : 'Shown to guests under Club info — add your bottles/drinks and prices.'}</div></div>
      </div>
      {items.map((m, i) => (
        <div className="minirow" key={i} style={{ flexWrap: 'wrap', gap: 8 }}>
          <input className="input" value={m[0]} onChange={setField(i, 'name')} style={{ flex: '1 1 160px', minHeight: 38, padding: '6px 10px' }} />
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            {rest && <input className="input" placeholder="Section" value={m[2] || ''} onChange={setField(i, 'section')} style={{ width: 120, minHeight: 38, padding: '6px 10px' }} />}
            <label className="meta2" style={{ fontSize: 11 }}>Price R</label>
            <input className="input" inputMode="numeric" value={m[1]} onChange={setField(i, 'price')} style={{ width: 84, minHeight: 38, padding: '6px 10px' }} />
            <button className="btn sm ghost" style={{ width: 'auto', padding: '6px 10px', minHeight: 38 }} onClick={() => remove(i)}>Remove</button>
          </span>
        </div>
      ))}
      {!items.length && <div className="meta2" style={{ marginTop: 8 }}>No menu items yet — add one below.</div>}
      <div className="wideactions" style={{ marginTop: 12 }}>
        <button className="btn sm ghost" onClick={add}>{rest ? '+ Dish' : '+ Menu item'}</button>
      </div>
      <button className="btn sm" style={{ marginTop: 12 }} onClick={() => saveVenueMenu(v, v.menu || [])}>Save menu</button>
    </div>
  );
}

function StaffMode() {
  const s = useApp();
  const v = clubVenue();
  const list = s.requests.filter((r) => r.vid === v.id && (r.status === 'confirmed' || r.status === 'checkedin'));
  const ticketList = s.ticketPurchases.filter((p) => p.vid === v.id && p.status !== 'refunded');
  const [scanning, setScanning] = useState(false);
  const [camErr, setCamErr] = useState(null);
  const [result, setResult] = useState(null);
  const qrRef = useRef(null);
  const lastRef = useRef({ ref: '', t: 0 });

  const stopScanner = async () => {
    try { await qrRef.current?.stop(); qrRef.current?.clear(); } catch (_e) {}
    qrRef.current = null;
    setScanning(false);
  };
  const onDecoded = (text) => {
    const now = Date.now();
    // ignore the same code re-read within 4 seconds (cameras fire continuously)
    if (text === lastRef.current.ref && now - lastRef.current.t < 4000) return;
    lastRef.current = { ref: text, t: now };
    setResult(processScan(text));
  };
  const startScanner = async () => {
    setCamErr(null); setResult(null);
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const q = new Html5Qrcode('qr-reader');
      qrRef.current = q;
      await q.start({ facingMode: 'environment' }, { fps: 8, qrbox: { width: 220, height: 220 } }, onDecoded, () => {});
      setScanning(true);
    } catch (e) {
      setCamErr(e?.message || 'Camera unavailable — allow camera access and use HTTPS');
      setScanning(false);
    }
  };
  useEffect(() => () => { stopScanner(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <OfflineBar />
      <div className="body enter"><div className="pad">
        <div className="h1" style={{ fontSize: 28 }}>Door<br />staff</div>
        <ClubSelector />
        <div className="scanbox">
          <div className="eyebrow">QR scanner</div>
          <div id="qr-reader" style={{ width: '100%', maxWidth: 340, margin: scanning ? '12px auto' : '0 auto', borderRadius: 18, overflow: 'hidden' }} />
          {!scanning && <div className="scanframe" />}
          <button className="btn" style={{ maxWidth: 300, margin: '0 auto' }} onClick={scanning ? stopScanner : startScanner}>
            {scanning ? 'Stop camera' : 'Open camera scanner'}
          </button>
          {camErr && <div className="meta2" style={{ marginTop: 10, color: 'var(--warn)' }}>{camErr}</div>}
          <button className="btn sm ghost" style={{ maxWidth: 300, margin: '10px auto 0' }} onClick={scanNext}>Simulate a check-in (demo)</button>
          {result && (
            <div className="summary" style={{ marginTop: 14, textAlign: 'left', borderColor: result.ok ? 'rgba(63,224,160,.5)' : result.already ? 'rgba(255,194,75,.5)' : 'rgba(255,107,107,.5)' }}>
              <div className="minirow"><span>Result</span>
                <b style={{ color: result.ok ? 'var(--ok)' : result.already ? 'var(--gold)' : 'var(--warn)' }}>
                  {result.ok ? '✓ VALID — CHECKED IN' : result.already ? '⚠ ALREADY CHECKED IN' : '✕ NOT VALID'}
                </b></div>
              {result.name && <div className="minirow"><span>Guest</span><b>{result.name}{result.party ? ` · ${result.party} guests` : ''}</b></div>}
              {result.table && <div className="minirow"><span>Table</span><b>{result.table}</b></div>}
              <div className="minirow"><span>Ref</span><b>{result.ref}</b></div>
              <div className="minirow"><span>Action</span><b>{result.ok ? result.msg : result.msg}</b></div>
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
          <div className="eyebrow">Tonight&apos;s ticket holders</div>
          {ticketList.length ? ticketList.map((p) => (
            <div className="minirow" key={p.id}>
              <span>{p.name} — {p.ticketName} · {p.qty} guest{p.qty === 1 ? '' : 's'} {p.status === 'checkedin' ? <b style={{ color: 'var(--blue)' }}>· checked in</b> : null}</span>
              <b>{p.code || p.id}</b>
            </div>
          )) : <div className="minirow"><span>No tickets sold yet</span><b>—</b></div>}
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
  const ticketSales = s.ticketPurchases.filter((p) => p.vid === v.id && p.status !== 'refunded');
  const ticketRevenue = ticketSales.reduce((a, p) => a + (Number(p.total) || 0), 0);
  const revenue = confirmed.reduce((a, r) => a + (Number(r.total) || 0), 0);
  const service = confirmed.reduce((a, r) => a + ((r.serviceFee != null ? Number(r.serviceFee) : serviceFee(r.subtotal || r.min || 0))), 0);
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
          <div className="minirow"><span>Ticket sales ({ticketSales.reduce((a, p) => a + (p.qty || 0), 0)})</span><b>{fmt(ticketRevenue)}</b></div>
          <div className="minirow"><span>Seat&apos;d service fees</span><b>{fmt(service)}</b></div>
          <div className="minirow"><span>Promoter commission owed</span><b>{fmt(Math.round(revenue * 0.05))}</b></div>
        </div>
      </div></div>
      <ClubTabbar />
    </>
  );
}
