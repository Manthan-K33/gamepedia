# GamePedia — Game Library & Price Tracker

A browsable, wiki-style catalog of 48 games: cover art, store prices, Metacritic and
community reception, playtime estimates, trivia, awards, platforms, and series links.

Built with React 18 + TypeScript + Vite + Tailwind. Game data lives in Cloudflare D1
(SQLite) and is served to the browser by a Pages Function at `/api/catalog`.

## Stack

| Layer | Choice |
|---|---|
| UI | React 18, TypeScript, Tailwind CSS 3 |
| Build | Vite 7 |
| Data | Cloudflare D1 (`games`, `game_prices`, `platforms`) |
| API | Pages Function `functions/api/catalog.ts` |
| Routing | Hash router (`#/`, `#/browse`, `#/game/:slug`) |
| Hosting | Cloudflare Pages + Pages Functions |

## Local development

```sh
npm install
npm run dev            # http://localhost:5173
```

`vite dev` has no Pages Functions, so it falls back to the checked-in snapshot
`src/data/catalog.json`. To run against a real D1 binding locally:

```sh
npm run build
wrangler d1 execute game-pedia --local --file=db/schema.sql
wrangler d1 execute game-pedia --local --file=db/seed.sql
wrangler pages dev dist
```

Refreshing the data from Supabase (the original import source) is optional and is
the only step that needs credentials (`.env`, git-ignored):

```
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
```

Then `npm run data:export` rewrites the snapshot, and `npm run db:seed:generate`
turns it into `db/seed.sql`. Never put a `service_role` key in `.env`.

## Database

```
db/schema.sql   tables, indexes, FKs
db/seed.sql     generated idempotent load (48 games, 159 prices)
```

| Command | Purpose |
|---|---|
| `npm run db:schema` | Apply the schema to remote D1 |
| `npm run db:seed` | Load `db/seed.sql` into remote D1 |
| `npm run db:seed:generate` | Regenerate `db/seed.sql` from the snapshot |
| `npm run db:query` | Interactive SQL against remote D1 |

The browser fetches `/api/catalog`, which the function caches for 60 seconds
(`stale-while-revalidate=300`). Editing a row in D1 shows up within that window;
`?cb=<timestamp>` bypasses the edge cache while testing.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Vite dev server (snapshot fallback, no API) |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the built output locally |
| `npm run data:export` | Refresh `src/data/catalog.json` from Supabase |
| `npm run typecheck` | `tsc --noEmit` over the app project |
| `npm run lint` | ESLint |

## Deploying

Both the static assets and the API are deployed together. The D1 binding is declared
in `wrangler.toml`, so no dashboard configuration is needed.

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
wrangler d1 create game-pedia            # copy the id into wrangler.toml
npm run db:schema                        # create tables
npm run db:seed                          # load the catalog
```

`wrangler pages deploy` uploads `dist/` plus the `functions/` bundle. Pages projects
are public by default and `public/_redirects` provides the SPA fallback
(`/* /index.html 200`). For Git-based continuous deploys, connect the repository in
the Cloudflare dashboard with build command `npm run build` and output directory
`dist`; keep the D1 binding in `wrangler.toml`.

### Other hosts

The app needs a SQLite-compatible database and a serverless function for
`/api/catalog`. Netlify or Vercel would require porting `functions/api/catalog.ts`
to their function format and moving the data to their database.

## Project layout

```
src/
  App.tsx              hash routing + data loading + filter state
  components/          Header, Footer, GameCard, GameCover
  pages/               Home, Browse, GameDetail (wiki entry)
  data/catalog.json    import snapshot, used by `vite dev` and as seed source
  lib/                 API data access, price helpers, types
functions/
  api/catalog.ts       Pages Function reading D1
db/
  schema.sql           D1 schema
  seed.sql             generated catalog load
scripts/
  export-data.mjs      pulls the catalog from Supabase into src/data
  generate-seed.mjs    turns the snapshot into db/seed.sql
supabase/
  migrations/          schema + 48-game catalog and wiki data
  covers/              source cover images
public/covers/         served cover art
```

## Notes

- All 48 games have complete wiki fields (reception, trivia, awards, playtime,
  engine, series, ESRB, platforms, modes).
- Prices in D1 are a snapshot from the original import. Update them with SQL or by
  re-running the export → seed → deploy chain; the API caches for 60 seconds.
- `game-pedia-source.tar.gz` and `game-pedia-source.zip` are export artifacts from
  the original Bolt project; they are not used at runtime.
