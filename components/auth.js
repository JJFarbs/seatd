'use client';
import { useEffect, useState } from 'react';
import { useApp, mutate, signInEmail, signUpEmail, signInGoogle, browseAsGuest } from '@/lib/store';
import { Icon, LogoMark } from './ui';

const GoogleG = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#EA4335" d="M12 5.4c1.6 0 3 .55 4.1 1.62l3.06-3.06C17.3 2.2 14.85 1.2 12 1.2 7.8 1.2 4.16 3.6 2.36 7.1l3.57 2.77C6.8 7.3 9.18 5.4 12 5.4z" />
    <path fill="#4285F4" d="M23.5 12.27c0-.9-.08-1.55-.25-2.23H12v4.26h6.54c-.13 1.1-.84 2.74-2.42 3.85l3.5 2.7c2.1-1.93 3.88-4.78 3.88-8.58z" />
    <path fill="#FBBC05" d="M5.93 14.13a7.06 7.06 0 0 1 0-4.26L2.36 7.1a11.9 11.9 0 0 0 0 9.8l3.57-2.77z" />
    <path fill="#34A853" d="M12 22.8c3.24 0 5.96-1.07 7.95-2.9l-3.5-2.71c-.98.66-2.28 1.11-4.45 1.11-2.82 0-5.2-1.9-6.07-4.47L2.36 16.9C4.16 20.4 7.8 22.8 12 22.8z" />
  </svg>
);

export function AuthView() {
  const s = useApp();
  const [mode, setMode] = useState('welcome'); // welcome | login | signup
  useEffect(() => {
    if (!s.splashDone) {
      const t = setTimeout(() => mutate((x) => { x.splashDone = true; }), 1750);
      return () => clearTimeout(t);
    }
  }, [s.splashDone]);
  if (mode === 'login') return <LoginForm back={() => setMode('welcome')} toSignup={() => setMode('signup')} />;
  if (mode === 'signup') return <SignupForm back={() => setMode('welcome')} toLogin={() => setMode('login')} />;
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
        <div className="pad" style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'flex-end', paddingBottom: 36, minHeight: 560, maxWidth: 560 }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <LogoMark />
              <div className="logo h1" style={{ fontSize: 'clamp(44px,7vw,64px)' }}>Seat&apos;d</div>
            </div>
            <div className="sub" style={{ fontSize: 16, marginTop: 10, maxWidth: 320 }}>
              Book the table, pay upfront, walk past the queue. Nightlife without the chaos.
            </div>
          </div>
          <button className="btn" onClick={() => setMode('signup')}>Create account <Icon name="arrow" size={20} stroke={2.5} /></button>
          <button className="btn ghost" style={{ marginTop: 12 }} onClick={() => setMode('login')}>Log in</button>
          <button className="btn ghost" style={{ marginTop: 12 }} onClick={signInGoogle}><GoogleG /> Continue with Google</button>
          <div className="micro" style={{ textAlign: 'center', marginTop: 14 }}>
            <span style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={browseAsGuest}>Just browsing? Explore as a guest</span>
            {' '}· By continuing you agree to our{' '}
            <b style={{ cursor: 'pointer', color: 'var(--muted)', textDecoration: 'underline' }} onClick={() => mutate((x) => { x.legalPage = 'terms'; x.screen = 'legal'; x.role = 'user'; })}>Terms</b>. 18+ only.
          </div>
        </div>
      </div>
    </>
  );
}

function AuthShell({ title, back, children }) {
  return (
    <>
      <div className="topbar">
        <button className="back" aria-label="Back" onClick={back}><Icon name="back" size={22} stroke={2.8} /></button>
        <div className="h2">{title}</div>
      </div>
      <div className="body enter"><div className="pad" style={{ maxWidth: 560 }}>{children}</div></div>
    </>
  );
}
function AuthError() {
  const s = useApp();
  if (!s.authError) return null;
  return <div className="fee-banner" style={{ borderColor: 'rgba(255,107,107,.4)', background: 'rgba(255,107,107,.09)', color: 'var(--warn)', margin: '14px 0 0' }}>{s.authError}</div>;
}

function LoginForm({ back, toSignup }) {
  const s = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const ok = email.includes('@') && password.length >= 6;
  return (
    <AuthShell title="Log in" back={back}>
      <div className="field"><label>Email</label>
        <input className="input" type="email" autoComplete="email" placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
      <div className="field"><label>Password</label>
        <input className="input" type="password" autoComplete="current-password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && ok) signInEmail(email, password); }} /></div>
      <AuthError />
      <button className="btn" style={{ marginTop: 22 }} disabled={!ok || s.authBusy} onClick={() => signInEmail(email, password)}>
        {s.authBusy ? 'Logging in…' : 'Log in'}
      </button>
      <button className="btn ghost" style={{ marginTop: 12 }} onClick={signInGoogle}><GoogleG /> Continue with Google</button>
      <div className="micro" style={{ textAlign: 'center', marginTop: 14 }}>
        New here? <b style={{ cursor: 'pointer', color: 'var(--magenta)' }} onClick={toSignup}>Create an account</b>
      </div>
    </AuthShell>
  );
}

function SignupForm({ back, toLogin }) {
  const s = useApp();
  const [asClub, setAsClub] = useState(false);
  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');
  const [venueName, setVenueName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const ok = name.trim().length > 1 && email.includes('@') && password.length >= 6 && (!asClub || venueName.trim().length > 1);
  const submit = () => signUpEmail({ email: email.trim(), password, name: name.trim(), handle: handle.trim(), asClub, venueName: venueName.trim() });
  return (
    <AuthShell title="Create account" back={back}>
      <div className="sub">Who are you on Seat&apos;d?</div>
      <div className="seg">
        <div className={`opt ${!asClub ? 'on' : ''}`} onClick={() => setAsClub(false)}>
          <div className="t">Going out</div><div className="d">Find clubs &amp; book tables</div>
        </div>
        <div className={`opt ${asClub ? 'on' : ''}`} onClick={() => setAsClub(true)}>
          <div className="t">I run a venue</div><div className="d">List events, take bookings</div>
        </div>
      </div>
      <div className="field"><label>Full name</label>
        <input className="input" autoComplete="name" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} /></div>
      {asClub ? (
        <div className="field"><label>Venue name</label>
          <input className="input" placeholder="e.g. Cobalt Room" value={venueName} onChange={(e) => setVenueName(e.target.value)} /></div>
      ) : (
        <div className="field"><label>Username (optional)</label>
          <input className="input" placeholder="@you" value={handle} onChange={(e) => setHandle(e.target.value)} /></div>
      )}
      <div className="field"><label>Email</label>
        <input className="input" type="email" autoComplete="email" placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
      <div className="field"><label>Password (min 6 characters)</label>
        <input className="input" type="password" autoComplete="new-password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && ok) submit(); }} /></div>
      <AuthError />
      <button className="btn" style={{ marginTop: 22 }} disabled={!ok || s.authBusy} onClick={submit}>
        {s.authBusy ? 'Creating account…' : `Create ${asClub ? 'venue ' : ''}account`}
      </button>
      <button className="btn ghost" style={{ marginTop: 12 }} onClick={signInGoogle}><GoogleG /> Continue with Google</button>
      {asClub && <div className="micro" style={{ textAlign: 'center' }}>Your venue goes live once a Seat&apos;d admin approves it.</div>}
      <div className="micro" style={{ textAlign: 'center', marginTop: 8 }}>
        Already have an account? <b style={{ cursor: 'pointer', color: 'var(--magenta)' }} onClick={toLogin}>Log in</b>
      </div>
    </AuthShell>
  );
}
