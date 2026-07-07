# Seat'd — Next.js

Nightclub table-booking prototype (React port of seat'dv25.html).

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Production

```bash
npm run build
npm start
```

Deploys as-is to Vercel (zero config).

## Structure

- `app/page.js` — app shell: role switcher, screen router, global effects (ripple, offline, auto-cancel watchdog)
- `app/layout.js` — metadata, PWA tags; `app/manifest.js` — web app manifest
- `app/globals.css` — full design system (same CSS as the single-file version)
- `lib/data.js` — venue/people seed data + pure helpers (pricing, search scoring, refs)
- `lib/store.js` — single mutable state (`S`) + `useApp()` hook + all actions (booking, split-pay, favourites, reviews, approvals, check-in…)
- `components/ui.js` — shared UI (icons, avatars, stars, covers, countdowns)
- `components/auth.js`, `components/user.js`, `components/social.js`, `components/profile.js` — user-facing screens
- `components/club.js`, `components/admin.js` — club & platform dashboards (Chart.js)

QR codes: `qrcode.react`. Charts: `react-chartjs-2`. Images: Unsplash with SVG fallback.

All state is in-memory (demo). To go production: swap `lib/store.js` actions for API calls, add a database and auth.
