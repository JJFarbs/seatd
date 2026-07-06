'use client';
import { useEffect } from 'react';
import { useApp, mutate, setRole, finishSignup } from '@/lib/store';
import { Icon, LogoMark } from './ui';

export function AuthView() {
  const s = useApp();
  useEffect(() => {
    if (!s.splashDone) {
      const t = setTimeout(() => mutate((x) => { x.splashDone = true; }), 1750);
      return () => clearTimeout(t);
    }
  }, [s.splashDone]);
  if (s.screen === 'signup') return <SignupScreen />;
  return (
    <>
      {!s.splashDone && (
        <div className="splash">
          <LogoMark size={66} />
          <div className="logo" style={{ fontSize: 64 }}>Seat&apos;d</div>
          <div className="sub" style={{ letterSpacing: '.18em', textTransform: 'uppercase', fontSize: 12 }}>Tables. Not phone calls.</div>
          <div className="splashbar"><i /></div>
        </div>
      )}
      <div className="body enter">
        <div className="pad" style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'flex-end', paddingBottom: 36, minHeight: 560 }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <LogoMark />
              <div className="logo h1" style={{ fontSize: 'clamp(44px,7vw,64px)' }}>Seat&apos;d</div>
            </div>
            <div className="sub" style={{ fontSize: 16, marginTop: 10, maxWidth: 320 }}>
              Book the table, pay upfront, walk past the queue. Nightlife without the chaos.
            </div>
          </div>
          <button className="btn" onClick={() => mutate((x) => { x.screen = 'signup'; })}>Create account <Icon name="arrow" size={20} stroke={2.5} /></button>
          <button className="btn ghost" style={{ marginTop: 12 }} onClick={() => setRole('user')}>I already have one</button>
          <div className="micro" style={{ textAlign: 'center' }}>
            By continuing you agree to Seat&apos;d&apos;s{' '}
            <b style={{ cursor: 'pointer', color: 'var(--muted)', textDecoration: 'underline' }} onClick={() => mutate((x) => { x.legalPage = 'terms'; x.screen = 'legal'; })}>Terms</b> and{' '}
            <b style={{ cursor: 'pointer', color: 'var(--muted)', textDecoration: 'underline' }} onClick={() => mutate((x) => { x.legalPage = 'privacy'; x.screen = 'legal'; })}>Privacy Policy</b>. You must be 18+.
          </div>
        </div>
      </div>
    </>
  );
}

function SignupScreen() {
  const s = useApp();
  const roles = [
    ['user', 'Going out', 'Find clubs & book tables', 'user'],
    ['club', 'I run a venue', 'List events, take bookings', 'store'],
    ['admin', 'Platform admin', 'Approve clubs, oversee city', 'chart'],
  ];
  const ok = s.auth.name.trim().length > 1;
  return (
    <>
      <div className="topbar">
        <button className="back" aria-label="Back" onClick={() => mutate((x) => { x.screen = 'home'; })}><Icon name="back" size={22} stroke={2.8} /></button>
        <div className="h2">Create account</div>
      </div>
      <div className="body enter"><div className="pad">
        <div className="sub">Who are you on Seat&apos;d?</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14, maxWidth: 680 }}>
          {roles.map(([id, t, d, icon]) => (
            <div className="seg" style={{ margin: 0 }} key={id}>
              <div className={`opt ${s.signupRole === id ? 'on' : ''}`} style={{ textAlign: 'left', flex: 1, display: 'flex', alignItems: 'center', gap: 12 }}
                onClick={() => mutate((x) => { x.signupRole = id; })}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(255,61,174,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--magenta)' }}>
                  <Icon name={icon} />
                </div>
                <div><div className="t">{t}</div><div className="d">{d}</div></div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ maxWidth: 680 }}>
          <div className="field"><label>Full name</label>
            <input className="input" placeholder="Your name" value={s.auth.name} onChange={(e) => mutate((x) => { x.auth.name = e.target.value; })} /></div>
          <div className="field"><label>{s.signupRole === 'club' ? 'Venue name' : 'Username'}</label>
            <input className="input" placeholder={s.signupRole === 'club' ? 'e.g. Cobalt Room' : '@you'} value={s.auth.handle} onChange={(e) => mutate((x) => { x.auth.handle = e.target.value; })} /></div>
          <div className="field"><label>Email</label>
            <input className="input" type="email" placeholder="you@email.com" value={s.auth.email} onChange={(e) => mutate((x) => { x.auth.email = e.target.value; })} /></div>
          <button className="btn" style={{ marginTop: 22 }} disabled={!ok} onClick={finishSignup}>Create {s.signupRole} account</button>
          {s.signupRole === 'club' && <div className="micro" style={{ textAlign: 'center' }}>Clubs go live once a Seat&apos;d admin approves your venue.</div>}
        </div>
      </div></div>
    </>
  );
}
