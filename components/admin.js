'use client';
import { Chart as ChartJS, registerables } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { fmt, serviceFee } from '@/lib/data';
import { useApp, mutate, venues, venue, people, approveClub, rejectClub } from '@/lib/store';
import { Icon, Empty, OfflineBar, StatusChip, Thumb } from './ui';

ChartJS.register(...registerables);
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const chartOpts = {
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: { grid: { display: false }, ticks: { color: '#9A8FB0', font: { family: 'Inter', size: 11 } } },
    y: { grid: { color: 'rgba(43,35,54,.6)' }, ticks: { color: '#9A8FB0', font: { family: 'Inter', size: 11 } }, beginAtZero: true },
  },
};

export function AdminTabbar() {
  const s = useApp();
  const tabs = [
    ['clubs', 'store', 'Clubs', s.pendingClubs.length],
    ['bookings', 'ticket', 'Bookings', 0],
    ['payouts', 'chart', 'Payouts', 0],
    ['reports', 'chat', 'Reports', s.reports.filter((r) => r.status === 'open').length],
    ['overview', 'bolt', 'Overview', 0],
  ];
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

export function AdminView() {
  const s = useApp();
  if (s.tab === 'bookings') return <AdminBookings />;
  if (s.tab === 'payouts') return <AdminPayouts />;
  if (s.tab === 'reports') return <AdminReports />;
  if (s.tab === 'overview') return <AdminOverview />;
  return <AdminClubs />;
}

function AdminClubs() {
  const s = useApp();
  const suspended = venues.filter((v) => v.status === 'suspended');
  return (
    <>
      <OfflineBar />
      <div className="body enter"><div className="pad">
        <div className="eyebrow" style={{ color: 'var(--blue)' }}>Seat&apos;d — Joburg ops</div>
        <div className="h1" style={{ fontSize: 30 }}>Club<br />applications</div>
        <div className="stagger">
          {s.pendingClubs.length ? s.pendingClubs.map((v) => (
            <div className="req" key={v.id}>
              <div className="row">
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', minWidth: 0 }}>
                  <Thumb v={v} size={46} />
                  <div style={{ minWidth: 0 }}>
                    <div className="nm" style={{ fontSize: 17, fontWeight: 800 }}>{v.name}</div>
                    <div className="meta2" style={{ fontSize: 12 }}>by {v.applicant || 'applicant'} · {v.area}</div>
                  </div>
                </div>
                <span className="badge" style={{ background: 'rgba(255,194,75,.15)', color: 'var(--gold)' }}>REVIEW</span>
              </div>
              <div className="sub" style={{ fontSize: 13, marginTop: 10 }}>{v.genre} — {v.tagline}</div>
              <div className="actions">
                <button className="btn ghost sm" style={{ flex: 1 }} onClick={() => rejectClub(v.id)}>Reject</button>
                <button className="btn sm" style={{ flex: 1 }} onClick={() => approveClub(v.id)}>Approve &amp; list</button>
              </div>
            </div>
          )) : <Empty>No clubs awaiting review.<br />New venue applications appear here.</Empty>}
        </div>
        <div className="eyebrow" style={{ marginTop: 26 }}>Live venues</div>
        {venues.filter((v) => v.status === 'live').map((v) => (
          <div className="lrow" key={v.id}>
            <Thumb v={v} size={40} />
            <div style={{ flex: 1, minWidth: 0 }}><div className="nm">{v.name}</div><div className="meta2">{v.area} · {v.genre}</div></div>
            <span className="badge" style={{ background: 'rgba(63,224,160,.14)', color: 'var(--ok)' }}>LIVE</span>
          </div>
        ))}
        {suspended.length > 0 && (
          <>
            <div className="eyebrow" style={{ marginTop: 20, color: 'var(--warn)' }}>Suspended</div>
            {suspended.map((v) => (
              <div className="lrow" key={v.id}>
                <Thumb v={v} size={40} />
                <div style={{ flex: 1 }}><div className="nm">{v.name}</div></div>
                <span className="badge" style={{ background: 'rgba(255,107,107,.14)', color: 'var(--warn)' }}>SUSPENDED</span>
              </div>
            ))}
          </>
        )}
      </div></div>
      <AdminTabbar />
    </>
  );
}

function AdminBookings() {
  const s = useApp();
  return (
    <>
      <OfflineBar />
      <div className="body enter"><div className="pad">
        <div className="h1" style={{ fontSize: 28 }}>All<br />bookings</div>
        <div className="summary" style={{ maxWidth: 780 }}>
          {s.requests.length ? s.requests.map((r) => (
            <div className="minirow" key={r.id}>
              <span>
                <b style={{ color: 'var(--txt)' }}>{r.venue}</b> — {r.table} · {r.who} · {r.code}<br />
                <span style={{ display: 'inline-block', marginTop: 5 }}><StatusChip st={r.status} /></span>
              </span>
              <b>{fmt(r.total || 0)}</b>
            </div>
          )) : <div className="minirow"><span>No bookings yet</span><b>R0</b></div>}
        </div>
      </div></div>
      <AdminTabbar />
    </>
  );
}

function AdminPayouts() {
  const s = useApp();
  const by = {};
  s.requests.filter((r) => r.status === 'confirmed' || r.status === 'checkedin').forEach((r) => { by[r.venue] = (by[r.venue] || 0) + (r.subtotal || r.min || 0); });
  const entries = Object.entries(by);
  return (
    <>
      <OfflineBar />
      <div className="body enter"><div className="pad">
        <div className="h1" style={{ fontSize: 28 }}>Payout<br />management</div>
        <div className="summary" style={{ maxWidth: 780 }}>
          {entries.length ? entries.map(([k, val]) => <div className="minirow" key={k}><span>{k}</span><b>{fmt(val)} pending payout</b></div>)
            : <div className="minirow"><span>No payouts ready</span><b>R0</b></div>}
        </div>
        <div className="micro">Venues receive the prepaid table subtotal. Seat&apos;d keeps the service fee.</div>
      </div></div>
      <AdminTabbar />
    </>
  );
}

function AdminReports() {
  const s = useApp();
  const demo = venues.find((x) => x.id === 'v5');
  return (
    <>
      <OfflineBar />
      <div className="body enter"><div className="pad">
        <div className="h1" style={{ fontSize: 28 }}>User<br />reports</div>
        <div className="summary" style={{ maxWidth: 780 }}>
          {s.reports.map((r) => (
            <div className="minirow" key={r.id}><span>{r.user} — {r.about}</span><b style={{ color: r.status === 'open' ? 'var(--gold)' : 'var(--ok)' }}>{r.status}</b></div>
          ))}
        </div>
        <div className="wideactions">
          <button className="btn ghost" onClick={() => mutate((x) => { x.reports = x.reports.map((r) => ({ ...r, status: 'resolved' })); })}>Resolve demo reports</button>
          <button className="btn ghost" onClick={() => mutate(() => { if (demo) demo.status = demo.status === 'suspended' ? 'live' : 'suspended'; })}>
            {demo?.status === 'suspended' ? 'Reinstate demo venue' : 'Suspend demo venue'}
          </button>
        </div>
      </div></div>
      <AdminTabbar />
    </>
  );
}

function AdminOverview() {
  const s = useApp();
  const confirmed = s.requests.filter((r) => r.status === 'confirmed' || r.status === 'checkedin');
  const gmv = confirmed.reduce((a, r) => a + (r.total || 0), 0);
  const fees = confirmed.reduce((a, r) => a + (r.serviceFee || serviceFee(r.subtotal || r.min || 0)), 0);
  const byClub = {}; confirmed.forEach((r) => { byClub[r.venue] = (byClub[r.venue] || 0) + 1; });
  const popular = Object.entries(byClub).sort((a, b) => b[1] - a[1])[0];
  const byCity = {}; s.requests.forEach((r) => { const vv = venue(r.vid); if (vv) byCity[vv.area] = (byCity[vv.area] || 0) + 1; });
  const topCity = Object.entries(byCity).sort((a, b) => b[1] - a[1])[0];
  const gmvData = [42, 55, 48, 71, 96, 118 + confirmed.length * 6, 84].map((x) => x * 1000);
  const cards = [
    [fmt(gmv), 'Platform revenue'], ['2,418', 'Daily users'], [s.requests.length, 'Bookings today'],
    [popular ? popular[0] : '—', 'Most popular club'], [topCity ? topCity[0] : '—', 'Most booked area'], [fmt(fees), 'Service fees earned'],
  ];
  return (
    <>
      <OfflineBar />
      <div className="body enter"><div className="pad">
        <div className="h1" style={{ fontSize: 28 }}>Platform<br />analytics</div>
        <div className="featuregrid">
          {cards.map(([n, l], i) => (
            <div className="featurecard" key={i}><div className="n" style={{ fontSize: typeof n === 'string' && n.length > 9 ? 19 : 25 }}>{n}</div><div className="l">{l}</div></div>
          ))}
        </div>
        <div className="chartbox">
          <div className="eyebrow">Platform GMV — last 7 days</div>
          <div className="cwrap"><Bar data={{ labels: DAYS, datasets: [{ data: gmvData, backgroundColor: 'rgba(255,61,174,.65)', borderRadius: 8 }] }} options={chartOpts} /></div>
        </div>
        <div className="eyebrow" style={{ marginTop: 22 }}>Recent activity</div>
        <div className="activityfeed">
          {s.notifs.slice(0, 6).map((n) => (
            <div className="notifrow" key={n.id}>
              <div className="nico"><Icon name="bolt" size={20} /></div>
              <div style={{ flex: 1 }}><div className="ntxt">{n.text}</div><div className="ntime">{n.time}</div></div>
            </div>
          ))}
        </div>
        <div className="summary">
          <div className="eyebrow">Operational controls</div>
          <div className="minirow"><span>Club approvals</span><b>{s.pendingClubs.length} waiting</b></div>
          <div className="minirow"><span>Payment webhook simulation</span><b style={{ color: 'var(--ok)' }}>Healthy</b></div>
          <div className="minirow"><span>Auto-cancel watchdog</span><b style={{ color: 'var(--ok)' }}>Running</b></div>
        </div>
      </div></div>
      <AdminTabbar />
    </>
  );
}
