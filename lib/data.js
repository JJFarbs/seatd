// ---------- Pure data + helpers (no React) ----------
export const fmt = (n) => 'R' + Math.round(n).toLocaleString('en-ZA');
export const SERVICE_RATE = 0.05;
export const serviceFee = (n) => Math.ceil((Number(n) || 0) * SERVICE_RATE);
export const withServiceFee = (n) => (Number(n) || 0) + serviceFee(n);
export const todayStr = () =>
  new Date().toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
const REFCHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const refCode = (tier) => {
  const pre = tier === 'vip' ? 'VIP' : tier === 'booth' ? 'BTH' : 'STD';
  let s = '';
  for (let i = 0; i < 6; i++) s += REFCHARS[Math.floor(Math.random() * REFCHARS.length)];
  return pre + '-' + s;
};
export const initials = (n) =>
  (n || '?').trim().split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();

export const IMG = (id, w) =>
  `https://images.unsplash.com/photo-${id}?w=${w || 900}&q=60&auto=format&fit=crop`;
export const GALLERY_POOL = [
  '1470229722913-7c0e2dbbafd3',
  '1429962714451-bb934ecdc4ec',
  '1501281668745-f7f57925c3b4',
  '1459749411175-04bf5292ceea',
];

export const AREAS = ['All', 'Sandton', 'Rosebank', 'Braamfontein', 'Maboneng', 'Soweto'];
export const GENRES = ['All', 'Amapiano', 'House', 'R&B', 'Hip-Hop', 'Afro-Tech', 'Deep House', 'Gqom', 'Techno'];
export const tierMeta = {
  vip: { label: 'VIP', color: '#FFC24B' },
  booth: { label: 'Booth', color: '#FF3DAE' },
  std: { label: 'Standard', color: '#2BD4FF' },
};

export const initialVenues = () => [
  { id: 'v1', name: 'Cobalt Room', area: 'Sandton', dist: 0.8, genre: 'Amapiano / House', when: 'Tonight 22:00', minFrom: 1500, tagline: 'Rooftop sessions, deep house till late.', g: ['#2BD4FF', '#7A4DFF'], status: 'live', img: '1566737236500-c8ac43014a67',
    dress: 'Smart casual — no sportswear', parking: 'Secure basement parking, R30', open: 'Thu–Sat 21:00–04:00, Sun 14:00–22:00', vip: '+27 82 555 0101 (tables@cobaltroom.co.za)', capacity: 520,
    menu: [['Belvedere 750ml', 1800], ['Moët Brut', 2200], ['Jameson 750ml', 1200], ['Corona bucket (6)', 480], ['Red Bull mixers (4)', 260]],
    events: [['Fri', 'Summer Launch', 'Amapiano — doors 21:00'], ['Sat', 'Neon Night', 'House & Afro-Tech — doors 22:00'], ['Sun', 'Brunch Party', 'Day party — 14:00–20:00']],
    reviews: [
      { name: 'Mandla T.', stars: 5, text: 'Smooth entry and the table was ready when we arrived.', date: '28 Jun 2026' },
      { name: 'Jess P.', stars: 4, text: 'Way easier than WhatsApping a promoter. Music was unreal.', date: '20 Jun 2026' },
      { name: 'Kagiso M.', stars: 5, text: 'Queue bypass actually works. Straight to the booth.', date: '13 Jun 2026' },
    ] },
  { id: 'v2', name: 'Velvet & Vine', area: 'Rosebank', dist: 3.4, genre: 'R&B / Hip-Hop', when: 'Fri 23:00', minFrom: 2000, tagline: 'Low light, good people, better bottles.', g: ['#FF3DAE', '#7A4DFF'], status: 'live', img: '1514525253161-7a46d19cd819',
    dress: 'Dress to impress — collared shirts', parking: 'Valet at door, R80', open: 'Fri–Sat 22:00–04:00', vip: '+27 83 555 0242', capacity: 340,
    menu: [['Hennessy VS 750ml', 1600], ['Veuve Clicquot', 2600], ['Tanqueray 750ml', 1100], ['Still/sparkling water', 60]],
    events: [['Fri', 'Velvet Fridays', 'R&B all night — doors 22:00'], ['Sat', 'Trap House', 'Hip-hop takeover — doors 23:00']],
    reviews: [
      { name: 'Zinhle K.', stars: 5, text: 'Booth service was quick, loved the vibe.', date: '27 Jun 2026' },
      { name: 'Dean W.', stars: 4, text: 'Pricey but worth it for a birthday.', date: '19 Jun 2026' },
    ] },
  { id: 'v3', name: 'The Loft 88', area: 'Braamfontein', dist: 6.1, genre: 'Afro-Tech', when: 'Sat 22:30', minFrom: 1000, tagline: 'Underground room, no phones on the floor.', g: ['#FFC24B', '#FF3DAE'], status: 'live', img: '1493225457124-a3eb161ffa5f',
    dress: 'No dress code — come as you are', parking: 'Street parking with guards', open: 'Fri–Sun 22:00–06:00', vip: 'DM @loft88jhb', capacity: 280,
    menu: [['Jägermeister 750ml', 950], ['Local craft beer', 75], ['Tequila tray (6)', 420]],
    events: [['Fri', 'Warehouse 88', 'Afro-tech marathon — doors 22:00'], ['Sun', 'Sunday Service', 'Minimal & deep — doors 20:00']],
    reviews: [
      { name: 'Thando N.', stars: 5, text: 'Best sound system in Joburg. Period.', date: '22 Jun 2026' },
      { name: 'Ruby L.', stars: 3, text: 'Great music but the bar queue was long.', date: '11 Jun 2026' },
    ] },
  { id: 'v4', name: 'Mzansi Skybar', area: 'Maboneng', dist: 7.8, genre: 'Deep House', when: 'Tonight 21:00', minFrom: 1200, tagline: 'Skyline views, sunset to sunrise.', g: ['#3FE0C0', '#2BD4FF'], status: 'live', img: '1533174072545-7a4b6ad7a6c3',
    dress: 'Smart casual', parking: 'Rooftop parkade next door, R40', open: 'Wed–Sun 17:00–02:00', vip: '+27 84 555 0777', capacity: 420,
    menu: [['Aperol Spritz jug', 480], ['Inverroche 750ml', 1050], ['Sushi platter', 380], ['Bubbly by the glass', 120]],
    events: [['Fri', 'Golden Hour', 'Sunset deep house — 17:00'], ['Sat', 'Skyline Sessions', 'House till 02:00'], ['Sun', 'Brunch Party', 'Bottomless brunch — 11:00–16:00']],
    reviews: [
      { name: 'Aisha B.', stars: 5, text: 'That view with the sunset set... unforgettable.', date: '29 Jun 2026' },
      { name: 'Marco D.', stars: 4, text: 'Chilled crowd, great cocktails.', date: '15 Jun 2026' },
    ] },
  { id: 'v5', name: 'Ember', area: 'Soweto', dist: 18.5, genre: 'Gqom / Amapiano', when: 'Sat 22:00', minFrom: 800, tagline: 'Where the night actually starts.', g: ['#FF8A3D', '#FF3DAE'], status: 'live', img: '1516450360452-9312f5e86fc7',
    dress: 'Casual', parking: 'Free on-site parking', open: 'Fri–Sat 20:00–05:00', vip: '+27 81 555 0909', capacity: 600,
    menu: [['Savanna bucket (6)', 330], ['Klipdrift 750ml', 680], ['Amarula 750ml', 520]],
    events: [['Fri', 'Ekasi Fridays', 'Gqom heavyweights — doors 20:00'], ['Sat', 'Piano Republic', 'Amapiano — doors 21:00']],
    reviews: [
      { name: 'Sbu M.', stars: 5, text: 'Energy is on another level. Real ones know.', date: '25 Jun 2026' },
      { name: 'Lerato P.', stars: 4, text: 'Affordable tables and the DJs go hard.', date: '8 Jun 2026' },
    ] },
];

export const initialPendingClub = () => ({
  id: 'v6', name: 'Lumen', area: 'Sandton', dist: 1.2, genre: 'Techno', when: '-', minFrom: 2500, tagline: 'New techno cathedral.', g: ['#9A8FB0', '#2BD4FF'], status: 'pending', applicant: 'Nadia R.', img: '1470229722913-7c0e2dbbafd3',
  dress: 'All black encouraged', parking: 'Parkade opposite', open: 'Sat 22:00–07:00', vip: 'hello@lumen.club', capacity: 800,
  menu: [['House vodka 750ml', 900]], events: [['Sat', 'Opening Ritual', 'Techno — doors 22:00']], reviews: [],
});

export const initialPeople = () => ({
  me: { id: 'me', name: 'Lebo Khumalo', handle: '@lebok', g: ['#FF3DAE', '#7A4DFF'], bio: 'Amapiano > everything. Sandton based.', out: true, nights: 14, tables: 6, crew: 23 },
  p1: { id: 'p1', name: 'Naledi M.', handle: '@naledi', g: ['#3FE0C0', '#2BD4FF'], online: true, bio: 'Deep house diaries.' },
  p2: { id: 'p2', name: 'Sipho D.', handle: '@siphod', g: ['#FFC24B', '#FF8A3D'], online: false, bio: 'Weekend warrior.' },
  p3: { id: 'p3', name: 'Kara V.', handle: '@karav', g: ['#FF3DAE', '#FFC24B'], online: true, bio: 'VIP or nothing.' },
  p4: { id: 'p4', name: 'Tumi B.', handle: '@tumi', g: ['#7A4DFF', '#2BD4FF'], online: false, bio: 'Braam regular.' },
  p5: { id: 'p5', name: 'Jay R.', handle: '@jayr', g: ['#2BD4FF', '#3FE0C0'], online: true, bio: 'Catch me at the Skybar.' },
});

export const makeTables = () => [
  { id: 'V1', x: 46, y: 60, w: 64, h: 38, tier: 'vip', seats: 8, min: 6000, booked: false },
  { id: 'V2', x: 230, y: 60, w: 64, h: 38, tier: 'vip', seats: 8, min: 6000, booked: true },
  { id: 'B1', x: 18, y: 140, w: 54, h: 34, tier: 'booth', seats: 6, min: 3000, booked: false },
  { id: 'B2', x: 18, y: 188, w: 54, h: 34, tier: 'booth', seats: 6, min: 3000, booked: false },
  { id: 'B3', x: 268, y: 140, w: 54, h: 34, tier: 'booth', seats: 6, min: 3000, booked: true },
  { id: 'B4', x: 268, y: 188, w: 54, h: 34, tier: 'booth', seats: 6, min: 3000, booked: false },
  { id: 'S1', x: 60, y: 300, w: 48, h: 30, tier: 'std', seats: 4, min: 1500, booked: false },
  { id: 'S2', x: 146, y: 300, w: 48, h: 30, tier: 'std', seats: 4, min: 1500, booked: false },
  { id: 'S3', x: 232, y: 300, w: 48, h: 30, tier: 'std', seats: 4, min: 1500, booked: true },
];

// ---------- search scoring ----------
export function scoreText(hay, q) {
  hay = hay.toLowerCase();
  if (hay === q) return 100;
  if (hay.startsWith(q)) return 85;
  if (hay.split(/[\s/&-]+/).some((w) => w.startsWith(q))) return 75;
  if (hay.includes(q)) return 60;
  const uniq = new Set(q);
  if (uniq.size < 3) return 0; // too little signal for fuzzy matching
  let hits = 0;
  for (const c of uniq) if (hay.includes(c)) hits++;
  return Math.round((28 * hits) / uniq.size);
}
export function searchClubs(list, raw) {
  const q = (raw || '').trim().toLowerCase();
  if (!q) return { hits: list, fuzzy: false };
  const scored = list.map((v) => ({
    v,
    s: Math.max(scoreText(v.name, q), scoreText(v.area, q) - 8, scoreText(v.genre, q) - 8, scoreText(v.tagline || '', q) - 20),
  }));
  const direct = scored.filter((x) => x.s >= 55).sort((a, b) => b.s - a.s).map((x) => x.v);
  if (direct.length) return { hits: direct, fuzzy: false };
  const close = scored.filter((x) => x.s >= 20).sort((a, b) => b.s - a.s).slice(0, 3).map((x) => x.v);
  return { hits: close, fuzzy: true };
}

// ---------- reviews ----------
export function avgRating(v) {
  const rs = v.reviews || [];
  if (!rs.length) return 0;
  return rs.reduce((a, r) => a + (Number(r.stars) || 0), 0) / rs.length;
}
