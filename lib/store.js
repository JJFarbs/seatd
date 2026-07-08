'use client';
import { useSyncExternalStore } from 'react';
import {
  initialVenues, initialPendingClub, initialPeople, makeTables,
  serviceFee, withServiceFee, refCode, todayStr, fmt,
} from './data';
import { sb } from './supabaseBrowser';

// ---------- mutable app state (single source of truth, like the original S) ----------
export const venues = initialVenues();
export const people = initialPeople();

export const S = {
  role: null, splashDone: false, booting: true,
  screen: 'home', tab: 'discover',
  auth: { name: '', handle: '', email: '' }, signupRole: 'user',
  area: 'All', genre: 'All', nearMe: false, clubSearch: '', showFavs: false,
  favs: ['v1'],
  venueId: null, venueTab: 'tables', selTable: null, men: 1, women: 1, activeReq: null,
  splitPay: true, invited: ['p1', 'p3'], promoterCode: 'JESSE10', friendDraft: '', shareDraft: '', shareSent: null,
  clubVenueId: 'v1', clubRequestVenueId: 'all', viewFriend: null, myStars: 5, legalPage: 'terms',
  scannerResult: null, installEvt: null, offline: false, toastMsg: null,
  session: null, profile: null, authBusy: false, authError: null, lockedVenueId: null,
  notifs: [
    { id: 'n1', icon: 'ticket', text: 'Thabo M. requested booth B2 at Cobalt Room.', time: '2 min ago', unread: true },
    { id: 'n2', icon: 'chat', text: "Kara V.: send me the Seat'd link", time: '1 hr ago', unread: true },
    { id: 'n3', icon: 'check', text: 'Your table B1 at Cobalt Room was confirmed.', time: 'Yesterday', unread: false },
  ],
  reports: [
    { id: 'rep1', user: 'Guest complaint', about: 'Queue issue at Cobalt Room', status: 'open' },
    { id: 'rep2', user: 'Venue report', about: 'Duplicate listing claim', status: 'review' },
  ],
  publicTables: [
    { id: 'pub-own-demo', bookingId: 'r-own-demo', venue: 'Cobalt Room', vid: 'v1', table: 'B1', tier: 'booth', owner: 'Lebo Khumalo', ownerId: 'me', malePrice: 650, femalePrice: 450, price: 650, seatsOpen: 2, status: 'open', joinRequests: [{ id: 'jr-own-demo', userId: 'p5', name: 'Jay R.', gender: 'male', amount: 650, status: 'pending' }], joiners: [] },
    { id: 'pub-demo', bookingId: null, venue: 'Cobalt Room', vid: 'v1', table: 'B2', tier: 'booth', owner: 'Naledi M.', ownerId: 'p1', malePrice: 700, femalePrice: 500, price: 700, seatsOpen: 3, status: 'open', joinRequests: [{ id: 'jr-demo', userId: 'p5', name: 'Jay R.', gender: 'male', amount: 700, status: 'pending' }], joiners: [{ id: 'p2', name: 'Sipho D.', gender: 'female', amount: 500, status: 'approved' }] },
  ],
  requests: [
    { id: 'r-own-demo', venue: 'Cobalt Room', vid: 'v1', table: 'B1', tier: 'booth', men: 2, women: 2, total: 3150, subtotal: 3000, serviceFee: 150, paidNow: 3150, min: 3000, status: 'confirmed', deadlineMs: null, code: 'BTH-DEMO1A', who: 'You', t: 'confirmed', splitPay: false, invited: [], promo: 'JESSE10', date: todayStr(), payments: [{ id: 'host', name: 'Lebo Khumalo', amount: 3150, status: 'paid' }] },
    { id: 'r-seed', venue: 'Cobalt Room', vid: 'v1', table: 'B2', tier: 'booth', men: 3, women: 2, total: 3150, subtotal: 3000, serviceFee: 150, paidNow: 1050, min: 3000, status: 'pending', deadlineMs: Date.now() + 18 * 60 * 1000, who: 'Thabo M.', t: '2 min ago', splitPay: true, invited: ['p1', 'p3'], promo: 'THABO10', date: todayStr(), payments: [{ id: 'host', name: 'Thabo M.', amount: 1050, status: 'paid' }, { id: 'p1', name: 'Naledi M.', amount: 1050, status: 'pending' }, { id: 'p3', name: 'Kara V.', amount: 1050, status: 'pending' }] },
    { id: 'r-rose', venue: 'Velvet & Vine', vid: 'v2', table: 'V1', tier: 'vip', men: 2, women: 3, total: 6300, subtotal: 6000, serviceFee: 300, paidNow: 6300, min: 6000, status: 'pending', deadlineMs: Date.now() + 12 * 60 * 1000, who: 'Kara V.', t: '8 min ago', splitPay: false, invited: [], promo: 'KARA', date: todayStr(), payments: [{ id: 'host', name: 'Kara V.', amount: 6300, status: 'paid' }] },
  ],
  friends: ['p1', 'p2', 'p3'],
  convos: {
    p1: [{ f: 'them', t: 'You going to Cobalt tonight??' }, { f: 'me', t: 'Booked a booth already nice' }],
    p3: [{ f: 'them', t: "send me the Seat'd link" }],
  },
  activeChat: null, activeJoin: null,
  pendingClubs: [initialPendingClub()],
  tables: {},
};

// ---------- tiny external store ----------
let version = 0;
const listeners = new Set();
const emit = () => { version++; listeners.forEach((l) => l()); };
const subscribe = (l) => { listeners.add(l); return () => listeners.delete(l); };
export function mutate(fn) { fn(S); emit(); }
export function useApp() {
  useSyncExternalStore(subscribe, () => version, () => version);
  return S;
}

// ---------- database sync (Supabase via our API routes) ----------
// Fire-and-forget: the UI updates optimistically, the DB catches up.
// If the DB isn't configured, S.dbReady stays false and the app runs on demo data.
async function api(path, opts) {
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (S.session?.access_token) headers.Authorization = 'Bearer ' + S.session.access_token;
    const r = await fetch(path, { headers, ...opts });
    return await r.json();
  } catch (_e) { return null; }
}
const rowToBooking = (b) => ({
  id: b.id, venue: b.venue_name, vid: b.venue_id, table: b.table_id, tier: b.tier,
  men: b.men, women: b.women, total: b.total, subtotal: b.subtotal, serviceFee: b.service_fee,
  paidNow: b.paid_now, min: b.min_spend, status: b.status, deadlineMs: b.deadline_ms ? Number(b.deadline_ms) : null,
  code: b.code, who: b.who, t: b.t_label, splitPay: b.split_pay, invited: b.invited || [],
  promo: b.promo, date: b.date_label, payments: b.payments || [], cancelReason: b.cancel_reason,
  userId: b.user_id || null,
});
const bookingToRow = (r) => ({
  id: r.id, venue_id: r.vid, venue_name: r.venue, table_id: r.table, tier: r.tier,
  men: r.men, women: r.women, total: r.total, subtotal: r.subtotal, service_fee: r.serviceFee,
  paid_now: r.paidNow, min_spend: r.min, status: r.status, deadline_ms: r.deadlineMs,
  code: r.code, who: r.who, t_label: r.t, split_pay: !!r.splitPay, invited: r.invited || [],
  promo: r.promo, date_label: r.date || '', payments: r.payments || [],
  user_id: r.userId || null,
});
const rowToVenue = (row, reviews) => ({
  id: row.id, name: row.name, area: row.area, dist: Number(row.dist) || 0, genre: row.genre,
  when: row.when_label, minFrom: row.min_from, tagline: row.tagline, g: row.g || ['#FF3DAE', '#7A4DFF'],
  status: row.status, img: row.img, dress: row.dress, parking: row.parking, open: row.open_hours,
  vip: row.vip, capacity: row.capacity, menu: row.menu || [], events: row.events || [],
  reviews: (reviews || []).filter((x) => x.venue_id === row.id).map((x) => ({ name: x.name, stars: x.stars, text: x.text, date: x.date_label })),
});
export async function hydrateFromDb() {
  const v = await api('/api/venues');
  if (v && v.db && Array.isArray(v.venues) && v.venues.length) {
    const mapped = v.venues.map((row) => rowToVenue(row, v.reviews));
    venues.length = 0;
    venues.push(...mapped);
    S.dbReady = true;
  }
  const b = await api('/api/bookings');
  if (b && b.db && Array.isArray(b.bookings)) {
    S.requests = b.bookings.map(rowToBooking);
  }
  mutate(() => {});
}
// ---------- auth (Supabase) ----------
const roleToView = (role) => (role === 'club_owner' ? 'club' : role === 'admin' ? 'admin' : 'user');
async function loadProfile(uid) {
  const { data } = await sb.from('profiles').select('*').eq('id', uid).single();
  return data || null;
}
function applyProfile(profile) {
  if (!profile) return;
  S.profile = profile;
  people.me.name = profile.name || people.me.name;
  people.me.handle = profile.handle || people.me.handle;
  people.me.bio = profile.bio || '';
  if (Array.isArray(profile.g) && profile.g.length === 2) people.me.g = profile.g;
  if (profile.role === 'club_owner' && profile.venue_id) {
    S.lockedVenueId = profile.venue_id;
    S.clubVenueId = profile.venue_id;
    S.clubRequestVenueId = profile.venue_id;
  } else {
    S.lockedVenueId = null;
  }
}
async function onSignedIn(session) {
  S.session = session;
  const profile = await loadProfile(session.user.id);
  applyProfile(profile);
  if (!S.role) {
    const view = roleToView(profile?.role);
    S.role = view === 'admin' ? 'user' : view; // admins land on the user side, switcher unlocks the rest
    S.tab = S.role === 'club' ? 'requests' : 'discover';
  }
  S.screen = 'home';
  mutate(() => {});
}
export async function initAuth() {
  try {
    const { data } = await sb.auth.getSession();
    if (data?.session) await onSignedIn(data.session);
    sb.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session && !S.session) onSignedIn(session);
      if (event === 'SIGNED_OUT') mutate((s) => { s.session = null; s.profile = null; s.role = null; s.lockedVenueId = null; });
      if (event === 'TOKEN_REFRESHED' && session) mutate((s) => { s.session = session; });
    });
  } catch (_e) { /* auth unavailable — app keeps working as guest/demo */ }
}
export async function signInEmail(email, password) {
  mutate((s) => { s.authBusy = true; s.authError = null; });
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) { mutate((s) => { s.authBusy = false; s.authError = error.message; }); return; }
  mutate((s) => { s.authBusy = false; });
  await onSignedIn(data.session);
}
export async function signUpEmail({ email, password, name, handle, asClub, venueName }) {
  mutate((s) => { s.authBusy = true; s.authError = null; });
  const meta = { name: name || email.split('@')[0], handle: handle ? (handle.startsWith('@') ? handle : '@' + handle) : undefined, role: asClub ? 'club_owner' : 'user' };
  const { data, error } = await sb.auth.signUp({ email, password, options: { data: meta } });
  if (error) { mutate((s) => { s.authBusy = false; s.authError = error.message; }); return; }
  if (!data.session) {
    mutate((s) => { s.authBusy = false; s.authError = 'Check your email to confirm your account, then log in.'; });
    return;
  }
  S.session = data.session;
  if (asClub) {
    const vid = 'v' + (Date.now() % 1000000);
    await api('/api/venues', { method: 'POST', body: JSON.stringify({ id: vid, name: venueName || (name + "'s venue"), area: 'Sandton', genre: 'House', when_label: 'Soon', min_from: 1500, tagline: "Just joined Seat'd.", status: 'pending', applicant: meta.name }) });
    await sb.from('profiles').update({ venue_id: vid }).eq('id', data.session.user.id);
    notify('store', `${venueName || 'New venue'} applied to join Seat'd.`);
  }
  mutate((s) => { s.authBusy = false; });
  await onSignedIn(data.session);
}
export async function signInGoogle() {
  mutate((s) => { s.authError = null; });
  const { error } = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined } });
  if (error) mutate((s) => { s.authError = 'Google sign-in is not configured yet.'; });
}
export async function authSignOut() {
  try { await sb.auth.signOut(); } catch (_e) {}
  mutate((s) => { s.session = null; s.profile = null; s.role = null; s.screen = 'home'; s.splashDone = true; s.lockedVenueId = null; });
}
export function browseAsGuest() {
  mutate((s) => { s.role = 'user'; s.screen = 'home'; s.tab = 'discover'; });
}
export async function saveProfileToDb(fields) {
  if (!S.session) return;
  await sb.from('profiles').update(fields).eq('id', S.session.user.id);
  mutate((s) => { if (s.profile) Object.assign(s.profile, fields); });
}

function syncBooking(r, fields) {
  if (!S.dbReady) return;
  api('/api/bookings/' + encodeURIComponent(r.id), { method: 'PATCH', body: JSON.stringify(fields) });
}
export function syncVenueToDb(v) {
  if (!S.dbReady) return;
  api('/api/venues', {
    method: 'PATCH',
    body: JSON.stringify({ id: v.id, name: v.name, area: v.area, genre: v.genre, tagline: v.tagline, dress: v.dress, open_hours: v.open, vip: v.vip, status: v.status }),
  });
}

let toastTimer = null;
export function toast(msg) {
  mutate((s) => { s.toastMsg = msg; });
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => mutate((s) => { s.toastMsg = null; }), 2200);
}
export function notify(icon, text) {
  S.notifs.unshift({ id: 'n' + Date.now(), icon, text, time: 'just now', unread: true });
}

// ---------- derived helpers (read S) ----------
export const venue = (id) => venues.find((v) => v.id === id) || S.pendingClubs.find((v) => v.id === id);
export const clubVenue = () => venue(S.clubVenueId) || venue('v1');
export const tablesFor = (id) => { if (!S.tables[id]) S.tables[id] = makeTables(); return S.tables[id]; };
export const publicJoinPrice = (pt, gender) => (gender === 'female' ? pt.femalePrice || pt.price || 0 : pt.malePrice || pt.price || 0);
export const publicJoinCharge = (pt, gender) => withServiceFee(publicJoinPrice(pt, gender));
export function bookingMath(t) {
  const groupTotal = t.min;
  const fee = serviceFee(groupTotal);
  const chargeTotal = groupTotal + fee;
  const splitCount = S.splitPay ? Math.max(1, S.invited.length + 1) : 1;
  const myShare = S.splitPay ? Math.ceil(chargeTotal / splitCount) : chargeTotal;
  return { groupTotal, fee, chargeTotal, splitCount, myShare };
}
export function splitPaymentsFor(t) {
  const m = bookingMath(t);
  const invited = S.splitPay ? S.invited.slice() : [];
  const base = Math.floor(m.chargeTotal / m.splitCount);
  const remainder = m.chargeTotal - base * m.splitCount;
  const hostAmount = S.splitPay ? base + remainder : m.chargeTotal;
  const rows = [{ id: 'host', name: people.me.name, amount: hostAmount, status: 'paid' }];
  invited.forEach((id) => { const p = people[id]; if (p) rows.push({ id, name: p.name, amount: base, status: 'pending' }); });
  return rows;
}
export const paidCount = (r) => { const ps = r.payments || []; return ps.filter((p) => p.status === 'paid').length + '/' + (ps.length || 1); };
export const amountOutstanding = (r) => (r.payments || []).filter((p) => p.status !== 'paid').reduce((a, p) => a + p.amount, 0);
export const allPaid = (r) => { const ps = r.payments || []; return ps.length > 0 && ps.every((p) => p.status === 'paid'); };
export const timeLeftMs = (r) => (!r.deadlineMs ? 0 : Math.max(0, r.deadlineMs - Date.now()));
export const timeLeftText = (r) => {
  const ms = timeLeftMs(r);
  const m = Math.floor(ms / 60000), sec = Math.floor((ms % 60000) / 1000);
  return String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
};
export function refreshExpiries() {
  let changed = false;
  S.requests.forEach((r) => {
    if (r.status === 'pending' && r.deadlineMs && !allPaid(r) && Date.now() >= r.deadlineMs) {
      r.status = 'cancelled';
      r.cancelReason = 'Payment window expired';
      notify('ticket', `Booking ${r.code} auto-cancelled — payment window expired.`);
      syncBooking(r, { status: 'cancelled', cancel_reason: r.cancelReason });
      changed = true;
    }
  });
  return changed;
}
export function tableCostRecovered(r) {
  return S.publicTables
    .filter((pt) => pt.bookingId === r.id)
    .reduce((sum, pt) => sum + (pt.joiners || []).filter((j) => j.status === 'approved').reduce((a, j) => a + (j.amount || publicJoinPrice(pt, j.gender) || 0), 0), 0);
}
export function adjustedShareAmount(p, r) {
  const paid = (r.payments || []).filter((x) => x.status === 'paid');
  const base = p.amount || 0;
  if (!paid.length) return base;
  const credit = Math.floor(tableCostRecovered(r) / paid.length);
  return Math.max(0, base - credit);
}
export const publicTableForBooking = (id) => S.publicTables.find((pt) => pt.bookingId === id);
export const tableSeatLimitBy = (vid, tableId) => { const t = tablesFor(vid).find((x) => x.id === tableId); return t ? t.seats : 0; };
export const publicInitialCount = (pt) => { const r = pt.bookingId ? S.requests.find((x) => x.id === pt.bookingId) : null; return r ? (r.men || 0) + (r.women || 0) : 2; };
export const publicApprovedCount = (pt) => (pt.joiners || []).filter((j) => j.status === 'approved').length;
export function publicSpotsOpen(pt) {
  const limit = tableSeatLimitBy(pt.vid, pt.table) || publicInitialCount(pt) + (pt.seatsOpen || 0) + publicApprovedCount(pt);
  return Math.max(0, limit - publicInitialCount(pt) - publicApprovedCount(pt));
}
export const openPublicTables = () => S.publicTables.filter((pt) => pt.status === 'open' && publicSpotsOpen(pt) > 0);
export function availabilityFor(id) {
  const ts = tablesFor(id), by = { vip: [0, 0], booth: [0, 0], std: [0, 0] };
  ts.forEach((t) => { by[t.tier][1]++; if (!t.booked) by[t.tier][0]++; });
  return by;
}
export function searchPeople(raw) {
  const scoreText = (hay, q) => {
    hay = hay.toLowerCase();
    if (hay === q) return 100;
    if (hay.startsWith(q)) return 85;
    if (hay.split(/[\s/&-]+/).some((w) => w.startsWith(q))) return 75;
    if (hay.includes(q)) return 60;
    const uniq = new Set(q);
    if (uniq.size < 3) return 0;
    let hits = 0;
    for (const c of uniq) if (hay.includes(c)) hits++;
    return Math.round((28 * hits) / uniq.size);
  };
  const q = (raw || '').trim().toLowerCase().replace(/^@/, '');
  const pool = Object.values(people).filter((p) => p.id !== 'me' && !S.friends.includes(p.id));
  if (!q) return pool.slice(0, 3).map((p) => ({ p, score: 0, label: 'Suggested' }));
  const score = (p) => Math.max(scoreText(p.name, q), scoreText(p.handle.replace(/^@/, ''), q));
  return pool.map((p) => ({ p, score: score(p), label: score(p) >= 55 ? 'Match' : 'Closest result' })).filter((x) => x.score > 0).sort((a, b) => b.score - a.score).slice(0, 3);
}
export const bookingLink = (r) => 'https://seatd.app/booking/' + encodeURIComponent(r.code || r.id);
export const qrPayload = (r) => JSON.stringify({ ref: r.code || r.id, club: r.venue, date: r.date || todayStr(), table: r.table });

// ---------- actions ----------
export function setRole(r) {
  // Only admins may switch roles freely; everyone else stays on their account's side.
  if (S.profile && S.profile.role !== 'admin') {
    const own = S.profile.role === 'club_owner' ? 'club' : 'user';
    if (r !== own) { toast('Your account is a ' + (own === 'club' ? 'club' : 'user') + ' account'); return; }
  }
  mutate((s) => {
    s.role = r; s.screen = 'home';
    s.tab = r === 'club' ? 'requests' : r === 'admin' ? 'clubs' : 'discover';
  });
}
export function copyText(text, msg) {
  const done = () => toast(msg || 'Copied to clipboard');
  if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(done, done);
  } else done();
}
export function toggleFav(id) {
  const adding = !S.favs.includes(id);
  mutate((s) => { s.favs = adding ? s.favs.concat(id) : s.favs.filter((x) => x !== id); });
  toast(adding ? 'Added to favourites' : 'Removed from favourites');
}
export function submitReview(text) {
  const v = venue(S.venueId);
  if (!v) return;
  if (!text || !text.trim()) { toast('Write a few words first'); return; }
  mutate(() => {
    v.reviews = v.reviews || [];
    v.reviews.unshift({ name: people.me.name, stars: S.myStars, text: text.trim(), date: todayStr() });
    notify('heart', `You rated ${v.name} ${S.myStars}/5.`);
  });
  if (S.dbReady) api('/api/reviews', { method: 'POST', body: JSON.stringify({ venue_id: v.id, name: people.me.name, stars: S.myStars, text: text.trim(), date_label: todayStr() }) });
  toast('Review posted — rating updated');
}
export function addFriendFromDraft() {
  const raw = (S.friendDraft || '').trim();
  if (!raw) { toast('Type a name first'); return; }
  const id = 'p' + Date.now();
  const clean = raw.startsWith('@') ? raw.slice(1) : raw;
  mutate((s) => {
    people[id] = { id, name: clean.replace(/^./, (c) => c.toUpperCase()), handle: raw.startsWith('@') ? raw : '@' + clean.toLowerCase().replace(/\s+/g, ''), g: ['#2BD4FF', '#7A4DFF'], online: false };
    s.friends.push(id);
    if (s.screen === 'booking') s.invited.push(id);
    s.friendDraft = '';
  });
  toast(`${people[id].name} added`);
}
export function sendBookingInvite(bid, uid) {
  const r = S.requests.find((x) => x.id === bid);
  if (!r) return;
  let id = uid;
  if (uid === 'new') {
    const raw = (S.shareDraft || '').trim();
    if (!raw) { toast('Type a name or @handle first'); return; }
    const clean = raw.startsWith('@') ? raw.slice(1) : raw;
    id = 'p' + Date.now();
    people[id] = { id, name: clean.replace(/^./, (c) => c.toUpperCase()), handle: raw.startsWith('@') ? raw : '@' + clean.toLowerCase().replace(/\s+/g, ''), g: ['#2BD4FF', '#7A4DFF'], online: false };
  }
  const p = people[id];
  if (!p) return;
  mutate((s) => {
    if (!s.friends.includes(id)) s.friends.push(id);
    s.convos[id] = s.convos[id] || [];
    s.convos[id].push({ f: 'me', t: `Seat'd invite: join my table at ${r.venue} (${r.table}). Booking ref ${r.code || r.id}. Link: ${bookingLink(r)}` });
    s.shareSent = bid; s.shareDraft = '';
  });
}
export function makePublic(bookingId) {
  const r = S.requests.find((x) => x.id === bookingId);
  if (!r || publicTableForBooking(bookingId)) return;
  const limit = tableSeatLimitBy(r.vid, r.table) || 8;
  const open = Math.max(0, limit - ((r.men || 0) + (r.women || 0)));
  mutate((s) => {
    s.publicTables.unshift({ id: 'pub' + Date.now(), bookingId: r.id, venue: r.venue, vid: r.vid, table: r.table, tier: r.tier, owner: people.me.name, ownerId: 'me', malePrice: Math.ceil((r.total || r.min || 0) / 4), femalePrice: Math.ceil((r.total || r.min || 0) / 5), price: Math.ceil((r.total || r.min || 0) / 4), seatsOpen: open, status: 'open', joinRequests: open > 0 ? [{ id: 'jr' + Date.now(), userId: 'p5', name: 'Jay R.', gender: 'male', amount: Math.ceil((r.total || r.min || 0) / 4), status: 'pending' }] : [], joiners: [] });
    notify('ticket', `Your table ${r.table} at ${r.venue} is now public.`);
  });
}
export function savePublicPrice(id, mVal, fVal) {
  const pt = S.publicTables.find((x) => x.id === id);
  if (!pt) return;
  mutate(() => {
    if (mVal > 0) { pt.malePrice = mVal; pt.price = mVal; }
    if (fVal > 0) pt.femalePrice = fVal;
  });
  toast('Join prices saved');
}
export function requestJoinPublic(id, gender) {
  const pt = S.publicTables.find((x) => x.id === id);
  if (!pt) return;
  if (publicSpotsOpen(pt) <= 0) { toast('Table just filled up'); return; }
  if ((pt.joinRequests || []).some((j) => j.userId === 'me' && j.status === 'pending') || (pt.joiners || []).some((j) => j.id === 'me')) return;
  mutate((s) => { s.activeJoin = { ptId: id, gender }; s.screen = 'joinpay'; });
}
export function confirmJoinPayment() {
  if (!S.activeJoin) return;
  const { ptId, gender } = S.activeJoin;
  const pt = S.publicTables.find((x) => x.id === ptId);
  if (!pt) return;
  pt.joinRequests = pt.joinRequests || [];
  if (publicSpotsOpen(pt) <= 0) {
    mutate((s) => { s.activeJoin = null; s.screen = 'home'; });
    toast('Table just filled up — refunded');
    return;
  }
  const amount = publicJoinPrice(pt, gender);
  mutate((s) => {
    if (!pt.joinRequests.some((j) => j.userId === 'me' && j.status === 'pending') && !(pt.joiners || []).some((j) => j.id === 'me')) {
      pt.joinRequests.push({ id: 'jr' + Date.now(), userId: 'me', name: people.me.name, gender, amount, subtotal: amount, serviceFee: serviceFee(amount), total: withServiceFee(amount), status: 'pending' });
      notify('ticket', `Join request sent for ${pt.venue} ${pt.table}.`);
    }
    s.activeJoin = null; s.screen = 'home'; s.tab = 'discover';
  });
  toast('Paid — waiting for host approval');
}
export function decideJoin(ptid, jrid, ok) {
  const pt = S.publicTables.find((x) => x.id === ptid);
  if (!pt) return;
  const j = (pt.joinRequests || []).find((x) => x.id === jrid);
  if (!j) return;
  if (ok && publicSpotsOpen(pt) <= 0) { toast('No seats left'); return; }
  mutate(() => {
    if (ok) {
      j.status = 'approved';
      pt.joiners = pt.joiners || [];
      if (!pt.joiners.some((x) => x.id === j.userId)) pt.joiners.push({ id: j.userId, name: j.name, gender: j.gender, amount: j.amount || publicJoinCharge(pt, j.gender), status: 'approved' });
      pt.seatsOpen = publicSpotsOpen(pt);
      notify('user', `${j.name} joined your table ${pt.table} at ${pt.venue}.`);
    } else j.status = 'denied';
  });
}
export function submitBooking() {
  if (S.dbReady && !S.session) {
    toast('Create a free account to book a table');
    mutate((s) => { s.role = null; s.screen = 'home'; });
    return;
  }
  const t = tablesFor(S.venueId).find((x) => x.id === S.selTable);
  const v = venue(S.venueId);
  if (!t || !v) { mutate((s) => { s.screen = 'home'; }); return; }
  if (S.men + S.women > t.seats) { mutate((s) => { s.screen = 'booking'; }); return; }
  const id = 'r' + Date.now();
  const m = bookingMath(t);
  const payments = splitPaymentsFor(t);
  const req = { id, venue: v.name, vid: v.id, table: t.id, tier: t.tier, men: S.men, women: S.women, total: m.chargeTotal, subtotal: m.groupTotal, serviceFee: m.fee, paidNow: payments[0].amount, min: t.min, status: 'pending', deadlineMs: Date.now() + 20 * 60 * 1000, code: refCode(t.tier), who: people.me.name || 'You', t: 'just now', date: todayStr(), invited: S.splitPay ? S.invited.slice() : [], splitPay: S.splitPay, promo: S.promoterCode, payments, userId: S.session ? S.session.user.id : null };
  mutate((s) => {
    s.requests.unshift(req);
    (req.invited || []).forEach((pid) => {
      const p = people[pid];
      if (!p) return;
      s.convos[pid] = s.convos[pid] || [];
      s.convos[pid].push({ f: 'me', t: `Seat'd payment request: ${req.venue} ${req.table}. Please pay your share (${fmt((req.payments || []).find((x) => x.id === pid)?.amount || 0)}) to confirm the table.` });
    });
    notify('ticket', `Payment received for ${v.name} ${t.id} — ref ${req.code}.`);
    s.activeReq = id; s.screen = 'status';
  });
  if (S.dbReady) api('/api/bookings', { method: 'POST', body: JSON.stringify(bookingToRow(req)) });
}
export function markPaid(r, pid) {
  const p = (r.payments || []).find((x) => x.id === pid);
  if (!p) return;
  mutate(() => { p.status = 'paid'; notify('check', `${p.name} paid their share for ${r.venue} ${r.table}.`); });
  syncBooking(r, { payments: r.payments });
}
export function decide(id, status) {
  const r = S.requests.find((x) => x.id === id);
  if (!r) return;
  if (status === 'confirmed' && !allPaid(r)) return;
  mutate(() => {
    r.status = status;
    if (status === 'confirmed' && r.vid && S.tables[r.vid]) {
      const tt = S.tables[r.vid].find((x) => x.id === r.table);
      if (tt) tt.booked = true;
      notify('check', `${r.venue} confirmed table ${r.table} — ref ${r.code}.`);
    }
    if (status === 'rejected') notify('ticket', `${r.venue} declined ${r.table}. ${fmt(r.paidNow || r.total)} refunded.`);
  });
  syncBooking(r, { status });
}
export function approveClub(id) {
  const v = S.pendingClubs.find((x) => x.id === id);
  if (!v) return;
  mutate((s) => {
    v.status = 'live'; v.when = 'This weekend';
    venues.push(v);
    s.pendingClubs = s.pendingClubs.filter((x) => x.id !== id);
    s.clubVenueId = id;
    notify('store', `${v.name} is now live on Seat'd.`);
  });
}
export function rejectClub(id) {
  mutate((s) => { s.pendingClubs = s.pendingClubs.filter((x) => x.id !== id); });
}
export function sendChat(text) {
  const id = S.activeChat;
  if (!text.trim() || !id) return;
  mutate((s) => { (s.convos[id] = s.convos[id] || []).push({ f: 'me', t: text.trim() }); });
  setTimeout(() => {
    const replies = ['hahahaha', 'say lessss', 'booking it now', 'where you sitting?', 'pulling up'];
    mutate((s) => { (s.convos[id] = s.convos[id] || []).push({ f: 'them', t: replies[Math.floor(Math.random() * replies.length)] }); });
  }, 1300);
}
export function scanNext() {
  const v = clubVenue();
  const r = S.requests.find((x) => x.vid === v.id && x.status === 'confirmed') || S.requests.find((x) => x.status === 'confirmed');
  if (r) {
    mutate((s) => { r.status = 'checkedin'; s.scannerResult = r.code || r.id; notify('check', `${r.who} checked in at ${r.venue} — ${r.table}.`); });
    syncBooking(r, { status: 'checkedin' });
  } else toast('No confirmed passes left to scan');
}
export function nativeShare(r) {
  const data = { title: "Seat'd booking", text: `Join my table at ${r.venue} (${r.table}) — ref ${r.code}`, url: bookingLink(r) };
  if (typeof navigator !== 'undefined' && navigator.share) navigator.share(data).catch(() => {});
  else copyText(`${data.text} ${data.url}`, 'Share not supported — link copied instead');
}
export function finishSignup() {
  mutate((s) => {
    if (s.auth.name) people.me.name = s.auth.name;
    if (s.signupRole === 'user' && s.auth.handle) people.me.handle = s.auth.handle.startsWith('@') ? s.auth.handle : '@' + s.auth.handle;
    if (s.signupRole === 'club') {
      const id = 'v' + (Date.now() % 100000);
      s.pendingClubs.push({ id, name: s.auth.handle || 'New Venue', area: 'Sandton', dist: 1, genre: 'House', when: 'Soon', minFrom: 1500, tagline: "Just joined Seat'd.", g: ['#FF3DAE', '#7A4DFF'], status: 'pending', applicant: s.auth.name, img: '1470229722913-7c0e2dbbafd3', reviews: [], events: [], menu: [] });
      notify('store', `${s.auth.handle || 'New venue'} applied to join Seat'd.`);
    }
  });
  setRole(S.signupRole);
}
