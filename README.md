# GamePedia — Game Library & Price Tracker

A browsable, wiki-style catalog of 48 games: cover art, store prices, Metacritic and
community reception, playtime estimates, trivia, awards, platforms, and series links.

Built with React 18 + TypeScript + Vite + Tailwind, backed by Supabase (Postgres + RLS).

## Stack

| Layer | Choice |
|---|---|
| UI | React 18, TypeScript, Tailwind CSS 3 |
| Build | Vite 7 |
| Data | Supabase (`games`, `game_prices`, `platforms`) |
| Routing | Hash router (`#/`, `#/browse`, `#/game/:slug`) |
| Hosting | Netlify (static build) |

## Local development

```sh
npm install
cp .env.example .env   # then fill in the two variables below
npm run dev            # http://localhost:5173
```

Environment variables (`.env`, git-ignored):

```
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
```

The anon key is a public, RLS-scoped key intended for browser use. Never put a
`service_role` key in this file.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Vite dev server with HMR |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the built output locally |
| `npm run typecheck` | `tsc --noEmit` over the app project |
| `npm run lint` | ESLint |

## Deploying

Two free static hosts are supported. Both need only the built `dist/` directory,
because the Supabase env vars are baked in at build time.

### Cloudflare Pages (current production host)

```sh
npm run build
wrangler pages deploy dist --project-name gamepedia --branch main
```

First-time setup:

```sh
npm i -g wrangler
wrangler login
wrangler pages project create gamepedia --production-branch main
```

Pages projects are public by default. `public/_redirects` provides the SPA
fallback (`/* /index.html 200`). For Git-based continuous deploys, connect the
repository in the Cloudflare dashboard with build command `npm run build`,
output directory `dist`, and the two `VITE_SUPABASE_*` variables.

### Netlify (alternative)

The app is a static SPA, so Netlify's free tier runs it with no server code.

**Option A — manual deploy from this machine**

```sh
npm run build
npx netlify-cli deploy --prod --dir=dist
```

The first run authenticates and creates/links a site. Build-time env vars are baked
in locally, so nothing needs configuring in the dashboard.

**Option B — continuous deploy from Git**

1. Push this repo to GitHub.
2. In Netlify: *Add new site → Import an existing project*.
3. Build command `npm run build`, publish directory `dist` (already in `netlify.toml`).
4. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` under
   *Site configuration → Environment variables*.

Every push to the production branch then rebuilds and redeploys for free.

> On credit-based Free plans, new Netlify projects start **private** (team login
> required). Change that under *Project configuration → General → Visitor access →
> Project visibility → Public*. There is no API/CLI for this setting.

## Project layout

```
src/
  App.tsx              hash routing + data loading + filter state
  components/          Header, Footer, GameCard, GameCover
  pages/               Home, Browse, GameDetail (wiki entry)
  lib/                 supabase client, data access, types
supabase/
  migrations/          schema + 48-game catalog and wiki data
  covers/              source cover images
public/covers/         served cover art
```

## Notes

- All 48 games have complete wiki fields (reception, trivia, awards, playtime,
  engine, series, ESRB, platforms, modes).
- `game-pedia-source.tar.gz` and `game-pedia-source.zip` are export artifacts from
  the original Bolt project; they are not used at runtime.
