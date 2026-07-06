'use client';
import { useEffect } from 'react';
import { useApp, mutate, setRole, refreshExpiries } from '@/lib/store';
import { AuthView } from '@/components/auth';
import { Discover, MapScreen, VenueScreen, BookingScreen, PayScreen, JoinPayScreen, StatusScreen, MyBookings } from '@/components/user';
import { MessagesHome, FriendsScreen, FriendProfile, ChatScreen } from '@/components/social';
import { ProfileScreen, EditProfile, NotifScreen, LegalScreen, NotFound } from '@/components/profile';
import { ClubView } from '@/components/club';
import { AdminView } from '@/components/admin';

const USER_SCREENS = ['home', 'venue', 'booking', 'pay', 'joinpay', 'status', 'editprofile', 'notifs', 'legal', 'chat', 'friends', 'friendprofile', 'signup'];

function Skeleton() {
  return (
    <div className="body"><div className="pad">
      <div className="skel" style={{ width: 140, height: 14 }} />
      <div className="skel" style={{ width: 'min(320px,70%)', height: 44, marginTop: 12 }} />
      <div className="skel" style={{ width: '100%', height: 50, marginTop: 16, borderRadius: 16 }} />
      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
        {[0, 1, 2, 3].map((i) => <div className="skel" key={i} style={{ width: 86, height: 40, borderRadius: 999 }} />)}
      </div>
      <div className="cards" style={{ marginTop: 18 }}>
        {[0, 1, 2].map((i) => <div className="skel" key={i} style={{ height: 280, borderRadius: 22 }} />)}
      </div>
    </div></div>
  );
}

function Screen() {
  const s = useApp();
  if (s.booting) return <Skeleton />;
  if (!s.role) return <AuthView />;
  if (s.screen === 'legal') return <LegalScreen />;
  if (s.role === 'club') return <ClubView />;
  if (s.role === 'admin') return <AdminView />;
  if (!USER_SCREENS.includes(s.screen)) return <NotFound />;
  if (s.screen === 'venue') return <VenueScreen />;
  if (s.screen === 'booking') return <BookingScreen />;
  if (s.screen === 'pay') return <PayScreen />;
  if (s.screen === 'joinpay') return <JoinPayScreen />;
  if (s.screen === 'status') return <StatusScreen />;
  if (s.screen === 'editprofile') return <EditProfile />;
  if (s.screen === 'notifs') return <NotifScreen />;
  if (s.screen === 'chat') return <ChatScreen />;
  if (s.screen === 'friends') return <FriendsScreen />;
  if (s.screen === 'friendprofile') return <FriendProfile />;
  if (s.tab === 'bookings') return <MyBookings />;
  if (s.tab === 'map') return <MapScreen />;
  if (s.tab === 'messages') return <MessagesHome />;
  if (s.tab === 'profile') return <ProfileScreen />;
  return <Discover />;
}

export default function App() {
  const s = useApp();

  // boot skeleton
  useEffect(() => {
    const t = setTimeout(() => mutate((x) => { x.booting = false; }), 700);
    return () => clearTimeout(t);
  }, []);

  // auto-cancel watchdog
  useEffect(() => {
    const t = setInterval(() => { if (refreshExpiries()) mutate(() => {}); }, 1000);
    return () => clearInterval(t);
  }, []);

  // network status
  useEffect(() => {
    mutate((x) => { x.offline = !navigator.onLine; });
    const off = () => mutate((x) => { x.offline = true; });
    const on = () => mutate((x) => { x.offline = false; });
    window.addEventListener('offline', off);
    window.addEventListener('online', on);
    return () => { window.removeEventListener('offline', off); window.removeEventListener('online', on); };
  }, []);

  // ripple effect on buttons/chips/tabs
  useEffect(() => {
    const handler = (e) => {
      const b = e.target.closest('.btn,.chip,.tab');
      if (!b || b.disabled) return;
      const r = b.getBoundingClientRect(), d = Math.max(r.width, r.height);
      const sp = document.createElement('span');
      sp.className = 'rip';
      sp.style.cssText = `width:${d}px;height:${d}px;left:${e.clientX - r.left - d / 2}px;top:${e.clientY - r.top - d / 2}px`;
      b.appendChild(sp);
      setTimeout(() => sp.remove(), 520);
    };
    document.addEventListener('pointerdown', handler);
    return () => document.removeEventListener('pointerdown', handler);
  }, []);

  const roleLabel = s.role ? s.role[0].toUpperCase() + s.role.slice(1) : 'Guest';
  return (
    <div className="stage">
      <div className="roleswitch" role="tablist">
        {['user', 'club', 'admin'].map((r) => (
          <button key={r} className={s.role === r ? 'on' : ''} onClick={() => setRole(r)}>{r[0].toUpperCase() + r.slice(1)}</button>
        ))}
      </div>
      <div className="hint">
        {s.role
          ? <>Viewing as <b>{roleLabel}</b>. Book in <b>User</b>, approve in <b>Club</b>, list venues in <b>Admin</b> — they&apos;re connected.</>
          : <>Sign up, or jump straight in with the role switcher above.</>}
      </div>
      <div className="phone"><div className="screen">
        <Screen />
        {s.toastMsg && <div className="apptoast">{s.toastMsg}</div>}
      </div></div>
    </div>
  );
}
