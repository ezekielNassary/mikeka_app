# Mikeka

Free, ad-supported football betting/odds site. No logins.

```
mikeka_app/
├── frontend/   # React + Vite + Tailwind (betting homepage, stats, matches)
├── backend/    # Express (ESM) + MySQL, SportyBet + FotMob services
└── scripts/    # build/deploy helpers
```

## Production (single port)

The backend hosts the built SPA **and** the API on one port (4000).

```
pnpm install:all          # install backend + frontend deps
pnpm build                # build the SPA -> frontend/dist -> backend/public
pnpm start                # serve app + /api on http://localhost:4000
```

- `pnpm build` runs the Vite build and copies `frontend/dist` into `backend/public`.
- `backend/src/app.js` serves `backend/public` and falls back to `index.html` for
  non-`/api` routes (SPA routing). Unknown `/api/*` routes still return JSON 404s.

## Deploy

Rebuild, commit, and push to `origin` in one command:

```
pnpm deploy -- "your commit message"
```

## Development

Backend (port 4000) — needs MySQL running:

```
cd backend && pnpm install && cp .env.example .env   # set DB creds
pnpm dev
```

Frontend dev server (port 5173, proxies `/api` to 4000):

```
cd frontend && pnpm install && pnpm dev
```

## API

- `GET /api/health` — status
- `GET /api/odds` — all SportyBet prematch odds
- `GET /api/odds/page/:pageNum` — one page of odds (progressive loading)
- `GET /api/odds/booking/:code` — matches inside a SportyBet booking code
- `GET /api/odds/team-stats?home=&away=` — FotMob last-5 + corners/cards
- `GET /api/odds/match-insight?home=&away=` — form/H2H prediction boost
- `GET /api/stats/leagues` — all FotMob competitions
- `GET /api/stats/league/:id` — standings + fixtures
- `GET /api/stats/team/:id` — team form + fixtures
- `GET /api/stats/team-search?q=` — team search
- `GET /api/stats/matches?date=YYYY-MM-DD` — all matches for a date
- `GET /api/stats/match/:id` — match detail (both teams' form + H2H)

New endpoints go in `backend/src/routes/`, register them in
`backend/src/routes/index.js`.
# mikeka_app
