'use client';
import { IMG, GALLERY_POOL, initials, avgRating, fmt } from '@/lib/data';
import { S, toggleFav, availabilityFor, timeLeftText, timeLeftMs, useApp } from '@/lib/store';
import { useEffect, useState } from 'react';

// ---------- icons ----------
const paths = {
  bolt: <path d="M13 2L4 14h7l-1 8 9-12h-7z" />,
  map: (<><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2z" /><path d="M9 4v14M15 6v14" /></>),
  chat: <path d="M21 12a8 8 0 0 1-8 8H7l-4 3V12a8 8 0 0 1 8-8h2a8 8 0 0 1 8 8z" />,
  user: (<><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></>),
  ticket: (<><path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2 2 2 0 0 0 0 4 2 2 0 0 1-2 2H5a2 2 0 0 1-2-2 2 2 0 0 0 0-4z" /><path d="M14 6v12" strokeDasharray="2 3" /></>),
  store: <path d="M3 9l1.5-5h15L21 9M3 9v11h18V9M3 9h18M9 13h6" />,
  chart: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  heart: <path d="M12 21s-7.5-4.6-10-9.6C.6 8.2 2.6 4.5 6.4 4.5c2.2 0 3.9 1.2 5.6 3.3 1.7-2.1 3.4-3.3 5.6-3.3 3.8 0 5.8 3.7 4.4 6.9C19.5 16.4 12 21 12 21z" />,
  bell: <path d="M18 9a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8M10 21a2.4 2.4 0 0 0 4 0" />,
  back: <path d="M15 5L8 12l7 7" />,
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  pencil: <path d="M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4" />,
  share: (<><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" /></>),
};
export function Icon({ name, size = 24, stroke = 2, style }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" style={style} aria-hidden="true">
      {paths[name] || paths.bell}
    </svg>
  );
}
export function Pin() {
  return (<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z" /></svg>);
}
export function CheckBig() {
  return (<svg viewBox="0 0 24 24" width="42" height="42" fill="none" stroke="#0B0710" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 13l5 5L20 6" /></svg>);
}
export function LogoMark({ size = 46 }) {
  return (
    <div className="logomark" style={{ width: size, height: size, borderRadius: size * 0.28 }}>
      <svg viewBox="0 0 64 64" style={{ width: size * 0.65, height: size * 0.65 }} aria-hidden="true">
        <defs><linearGradient id="lm" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#FF3DAE" /><stop offset="1" stopColor="#7A4DFF" /></linearGradient></defs>
        <path d="M20 44 V30 a12 12 0 0 1 24 0 v14" fill="none" stroke="url(#lm)" strokeWidth="7" strokeLinecap="round" />
        <rect x="16" y="42" width="32" height="7" rx="3.5" fill="url(#lm)" />
      </svg>
    </div>
  );
}

// ---------- avatar / status / empty ----------
export function Av({ p, size = 44 }) {
  const f = Math.round(size * 0.42);
  return (
    <div className="pos" style={{ width: size, height: size }}>
      <div className="av" style={{ width: size, height: size, fontSize: f, background: `linear-gradient(135deg,${p.g[0]},${p.g[1]})` }}>{initials(p.name)}</div>
      {p.online ? <span className="online" /> : null}
    </div>
  );
}
const chipMap = {
  confirmed: ['st-confirmed', 'Confirmed'],
  pending: ['st-pending', 'Waiting for payments'],
  cancelled: ['st-cancelled', 'Cancelled'],
  rejected: ['st-cancelled', 'Declined'],
  checkedin: ['st-checkedin', 'Checked in'],
};
export function StatusChip({ st }) {
  const m = chipMap[st] || chipMap.pending;
  return (<span className={`statuschip ${m[0]}`}><i />{m[1]}</span>);
}
export function Empty({ children }) {
  return (
    <div className="empty">
      <svg viewBox="0 0 80 80" fill="none" aria-hidden="true">
        <circle cx="40" cy="40" r="34" stroke="#2B2336" strokeWidth="2" strokeDasharray="5 6" />
        <path d="M28 52 V36 a12 12 0 0 1 24 0 v16" stroke="#FF3DAE" strokeWidth="4" strokeLinecap="round" opacity=".8" />
        <rect x="24" y="50" width="32" height="5" rx="2.5" fill="#7A4DFF" opacity=".8" />
        <circle cx="58" cy="24" r="3" fill="#2BD4FF" opacity=".7" />
        <circle cx="22" cy="20" r="2" fill="#FFC24B" opacity=".7" />
      </svg>
      {children}
    </div>
  );
}
export function OfflineBar() {
  const s = useApp();
  return s.offline ? <div className="offlinebar">You&apos;re offline — showing cached demo data. Payments are paused.</div> : null;
}

// ---------- covers / images ----------
export function CoverArt({ v, h = 160 }) {
  const a = v.g[0], b = v.g[1];
  const id = (v.id || 'x') + Math.round(h);
  return (
    <svg viewBox={`0 0 340 ${h}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id={`bg-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#050308" /><stop offset=".4" stopColor={a} stopOpacity=".7" /><stop offset="1" stopColor={b} stopOpacity=".75" />
        </linearGradient>
        <filter id={`gl-${id}`}><feGaussianBlur stdDeviation="3" /></filter>
      </defs>
      <rect width="340" height={h} fill={`url(#bg-${id})`} />
      <path className="beam" d={`M60 -8 L110 ${h + 8}`} stroke={a} strokeWidth="3" opacity=".4" filter={`url(#gl-${id})`} />
      <path className="beam" d={`M250 -8 L200 ${h + 8}`} stroke={b} strokeWidth="3" opacity=".4" filter={`url(#gl-${id})`} />
      <circle className="glow" cx="80" cy={h * 0.3} r="5" fill="#fff" opacity=".5" filter={`url(#gl-${id})`} />
      <circle className="glow" cx="260" cy={h * 0.2} r="7" fill={a} opacity=".45" filter={`url(#gl-${id})`} />
      <rect y={h * 0.62} width="340" height={h * 0.38} fill="#000" opacity=".55" />
    </svg>
  );
}
function HideOnError(props) {
  const [ok, setOk] = useState(true);
  if (!ok) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img alt="" loading="lazy" decoding="async" onError={() => setOk(false)} {...props} />;
}
export function Cover({ v, h = 160 }) {
  return (
    <>
      <CoverArt v={v} h={h} />
      {v.img ? <HideOnError className="ph" src={IMG(v.img, h > 200 ? 1200 : 700)} alt={v.name} /> : null}
      <span className="scrim" />
    </>
  );
}
export function Gallery({ v }) {
  const imgs = [v.img, ...GALLERY_POOL.slice(0, 3)].filter(Boolean);
  return (
    <div className="gallery">
      {imgs.map((id, i) => (
        <div className="g" key={i}>
          <CoverArt v={v} h={i ? 110 : 230} />
          <HideOnError src={IMG(id, i ? 500 : 900)} alt={`${v.name} photo ${i + 1}`} style={{ position: 'absolute', inset: 0 }} />
        </div>
      ))}
    </div>
  );
}
export function Thumb({ v, size = 44 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: 12, overflow: 'hidden', flex: 'none', position: 'relative' }}>
      <CoverArt v={v} h={size} />
      <HideOnError src={IMG(v.img, 200)} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
    </div>
  );
}

// ---------- favourites ----------
export function FavBtn({ vid }) {
  const s = useApp();
  const on = s.favs.includes(vid);
  const [beat, setBeat] = useState(false);
  return (
    <button
      className={`favbtn ${on ? 'on' : ''} ${beat ? 'heartbeat' : ''}`}
      aria-label={on ? 'Remove from favourites' : 'Add to favourites'}
      onClick={(e) => { e.stopPropagation(); toggleFav(vid); setBeat(true); setTimeout(() => setBeat(false), 500); }}
    >
      <svg viewBox="0 0 24 24" fill={on ? '#0B0710' : 'none'} stroke={on ? '#0B0710' : '#fff'} strokeWidth="2" strokeLinejoin="round">
        <path d="M12 21s-7.5-4.6-10-9.6C.6 8.2 2.6 4.5 6.4 4.5c2.2 0 3.9 1.2 5.6 3.3 1.7-2.1 3.4-3.3 5.6-3.3 3.8 0 5.8 3.7 4.4 6.9C19.5 16.4 12 21 12 21z" />
      </svg>
    </button>
  );
}

// ---------- stars / reviews ----------
export function Stars({ n, size = 14 }) {
  const r = Math.round(Number(n) || 0);
  return (
    <span className="stars">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} viewBox="0 0 24 24" style={{ width: size, height: size }} fill={i <= r ? '#FFC24B' : 'none'} stroke="#FFC24B" strokeWidth="1.6">
          <path d="M12 2.6l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.5l-5.9 3.1 1.2-6.5L2.5 9.5l6.6-.9z" />
        </svg>
      ))}
    </span>
  );
}
export function StarRating({ v }) {
  const a = avgRating(v);
  const count = (v.reviews || []).length;
  return (
    <div className="rating">
      <Stars n={a} size={13} />
      <span>{a ? a.toFixed(1) : '–'}</span>
      <span style={{ color: 'var(--muted)', fontWeight: 600 }}>({count} review{count === 1 ? '' : 's'})</span>
    </div>
  );
}
export function ReviewRows({ v }) {
  const rs = v.reviews || [];
  if (!rs.length) return <div className="meta2" style={{ padding: '12px 0' }}>No reviews yet. Be the first.</div>;
  return rs.map((r, i) => (
    <div className="reviewrow" key={i}>
      <div className="rhead">
        <div className="av" style={{ width: 34, height: 34, fontSize: 14, background: 'linear-gradient(135deg,var(--violet),var(--blue))' }}>{initials(r.name)}</div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 13 }}>{r.name}</div>
          <div style={{ marginTop: 2 }}><Stars n={r.stars} size={12} /></div>
        </div>
        <span className="rdate">{r.date || ''}</span>
      </div>
      <div className="rtext">{r.text}</div>
    </div>
  ));
}

// ---------- availability ----------
export function Availability({ id }) {
  const a = availabilityFor(id);
  const rows = [['vip', 'VIP'], ['booth', 'Booths'], ['std', 'Standard']];
  return (
    <div className="availability">
      {rows.map(([k, label]) => {
        const n = a[k][0], cls = n === 0 ? 'out' : n <= 1 ? 'low' : '';
        return (
          <div className={`a ${cls}`} key={k}>
            <div className="n">{n || 'Sold'}</div>
            <div className="l">{n ? label : 'out'}</div>
          </div>
        );
      })}
    </div>
  );
}

// ---------- ticking countdown ----------
export function Timerbox({ r, who }) {
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const danger = timeLeftMs(r) <= 5 * 60000;
  return (
    <div className={`timerbox ${danger ? 'danger' : ''}`}>
      <div>
        <div style={{ fontWeight: 800, fontSize: 14 }}>{who === 'club' ? 'Payment window' : 'Complete payment window'}</div>
        <div className="meta2">Auto-cancels unless every invited person pays in 20 minutes.</div>
      </div>
      <div className="time">{timeLeftText(r)}</div>
    </div>
  );
}
export function Deadline({ r, who }) {
  const paid = (r.payments || []).length > 0 && (r.payments || []).every((p) => p.status === 'paid');
  if (r.status !== 'pending' || !r.deadlineMs || paid) return null;
  return <Timerbox r={r} who={who} />;
}
