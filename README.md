# GamePedia — Game Library & Price Tracker

A browsable, wiki-style catalog of 115 games: cover art, store prices, Metacritic and
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
| Prices | Daily sync from Steam, Nintendo eShop and Xbox (GitHub Actions) |
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
db/seed.sql     generated idempotent load (115 games, 322 prices)
```

| Command | Purpose |
|---|---|
| `npm run db:schema` | Apply the schema to remote D1 |
| `npm run db:seed` | Load `db/seed.sql` into remote D1 |
| `npm run db:seed:generate` | Regenerate `db/seed.sql` from the snapshot |
| `npm run db:migrate` | Apply missing migrations to remote D1 |
| `npm run db:query` | Interactive SQL against remote D1 |

The browser fetches `/api/catalog`, which the function caches for 60 seconds
(`stale-while-revalidate=300`). Editing a row in D1 shows up within that window;
`?cb=<timestamp>` bypasses the edge cache while testing.

Schema changes on an existing database are applied from `db/migrations/`:

```sh
npm run db:migrate      # applies every migration whose column is missing
```

## Prices and store links

`game_prices.updated_at` records when each store price was last verified, and the
catalog exposes a `prices_updated_at` timestamp used by the footer and the game
page ("Prices last checked …").

`game_prices.product_url` holds the direct page for that game on the store, so
the "Visit" button on a game page opens the game itself rather than a search.
Rows without a verified page keep a "Search" link instead.

`scripts/store-link-overrides.json` pins pages that a store's public endpoints
cannot return (they are verified by hand and always win), and the Epic search
fallback uses the store's `/browse?q=` route.

| Command | Purpose |
|---|---|
| `npm run prices:resolve` | Re-resolve store product IDs into `scripts/store-ids.json` |
| `npm run prices:links` | Resolve direct product pages into `scripts/store-links.json` and the snapshot |
| `npm run prices:links:apply` | Same, then push the page URLs to remote D1 |
| `npm run prices:sync` | Fetch current prices, update the snapshot and `db/prices-sync.sql` |
| `npm run prices:apply` | Same, then push the fetched price updates to remote D1 |

Sources are public and key-free:

| Store | Endpoint |
|---|---|
| Steam | `store.steampowered.com/api/appdetails` |
| Nintendo Switch | `api.ec.nintendo.com/v1/price` |
| Xbox | `displaycatalog.mp.microsoft.com/v7.0/products` |

Epic Games Store, PlayStation and GOG do not expose a public price API, so those
rows keep their catalog snapshot and are labelled `Catalog snapshot` in the UI.

`.github/workflows/price-sync.yml` runs `npm run prices:apply` every day at 05:23
UTC. It needs two repository secrets:

| Secret | Where to get it |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Cloudflare dashboard → My Profile → API Tokens → *Edit Cloudflare Workers* template, plus **D1 Edit** |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare dashboard → Workers & Pages → Account ID |

Without the secrets the workflow logs a notice and skips, leaving the site on the
last applied prices. `npm run prices:apply` works locally with `wrangler login`.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Vite dev server (snapshot fallback, no API) |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the built output locally |
| `npm run data:export` | Refresh `src/data/catalog.json` from Supabase |
| `npm run prices:resolve` | Re-resolve store product IDs |
| `npm run prices:links` | Re-resolve direct store pages |
| `npm run prices:links:apply` | Re-resolve direct store pages and push them to D1 |
| `npm run prices:sync` | Refresh prices into the snapshot + SQL |
| `npm run prices:apply` | Refresh prices and push them to D1 |
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
  add-games.cjs        adds curated games (art, prices, per-store rows)
  new-games/           curated game files consumed by add-games.cjs
  store-pins.json      hand-picked store product IDs for matcher misses
  resolve-store-ids.cjs  maps games to Steam / Nintendo / Xbox product IDs
  resolve-store-links.cjs  resolves the direct product page on every store
  sync-prices.cjs      fetches live prices into the catalog and D1
  store-ids.json       resolved store product IDs (checked in)
  store-links.json     resolved direct product pages (checked in)
  store-link-overrides.json  hand-verified pages the store endpoints miss
supabase/
  migrations/          schema + 115-game catalog and wiki data
  covers/              source cover images
public/covers/         served cover art
```

## Notes

- Every game carries the full wiki field set (reception, trivia, awards, playtime,
  engine, series, ESRB, platforms, modes); values that could not be verified stay
  empty instead of being guessed.
- Prices are synced daily for Steam, Nintendo Switch and Xbox; Epic Games Store,
  PlayStation and GOG show the catalog snapshot and are labelled that way on each
  game page. The API caches for 60 seconds.
- "Visit" opens the exact game page on the store. When a store does not sell the
  game (or the page is delisted), the button becomes "Search" and opens the store's
  search for that title.
- `game-pedia-source.tar.gz` and `game-pedia-source.zip` are export artifacts from
  the original Bolt project; they are not used at runtime.
