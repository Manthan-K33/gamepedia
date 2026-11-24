// GET /api/catalog — the full catalog from D1, shaped like the old Supabase query.
// Runs as a Cloudflare Pages Function with the DB binding from wrangler.toml.

interface D1Result<T> {
  results: T[];
}

interface D1Prepared {
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
}

interface Env {
  DB: { prepare(query: string): D1Prepared };
}

interface GameRow {
  id: string;
  slug: string;
  title: string;
  genres: string;
  tags: string;
  features: string;
  platforms_released: string | null;
  game_modes: string | null;
  awards: string | null;
  trivia: string | null;
  featured: number;
  [key: string]: unknown;
}

interface PriceRow {
  id: string;
  game_id: string;
  platform_id: number;
  price: number | null;
  regular_price: number | null;
  currency: string;
  store_url: string | null;
  product_url: string | null;
  on_sale: number;
  updated_at: string | null;
  platform_name: string | null;
  platform_slug: string | null;
  platform_color: string | null;
  [key: string]: unknown;
}

const JSON_FIELDS = [
  'genres',
  'tags',
  'features',
  'platforms_released',
  'game_modes',
  'awards',
  'trivia',
] as const;

function parseJson(value: unknown): unknown {
  if (typeof value !== 'string' || value === '') return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function shapeGame(row: GameRow) {
  const game: Record<string, unknown> = { ...row, featured: Boolean(row.featured) };
  for (const field of JSON_FIELDS) game[field] = parseJson(row[field]);
  return game;
}

export async function onRequestGet({ env }: { env: Env }): Promise<Response> {
  const [games, prices, platforms, meta] = await Promise.all([
    env.DB.prepare('SELECT * FROM games ORDER BY title').all<GameRow>(),
    env.DB.prepare(
      `SELECT p.*, pl.name AS platform_name, pl.slug AS platform_slug, pl.color AS platform_color
       FROM game_prices p
       LEFT JOIN platforms pl ON pl.id = p.platform_id
       ORDER BY p.price`
    ).all<PriceRow>(),
    env.DB.prepare('SELECT id, name, slug, color FROM platforms ORDER BY id').all<{
      id: number;
      name: string;
      slug: string;
      color: string;
    }>(),
    env.DB.prepare('SELECT key, value FROM catalog_meta').all<{ key: string; value: string }>(),
  ]);

  const byGame = new Map<string, unknown[]>();
  for (const p of prices.results) {
    const entry = {
      id: p.id,
      platform_id: p.platform_id,
      price: p.price === null ? null : Number(p.price),
      regular_price: p.regular_price === null ? null : Number(p.regular_price),
      currency: p.currency,
      store_url: p.store_url,
      product_url: p.product_url ?? null,
      on_sale: Boolean(p.on_sale),
      updated_at: p.updated_at ?? null,
      platforms: p.platform_name
        ? {
            id: p.platform_id,
            name: p.platform_name,
            slug: p.platform_slug,
            color: p.platform_color,
          }
        : null,
    };
    const list = byGame.get(p.game_id) ?? [];
    list.push(entry);
    byGame.set(p.game_id, list);
  }

  const payload = {
    generated_at:
      meta.results.find((m) => m.key === 'generated_at')?.value ?? new Date().toISOString(),
    prices_updated_at:
      meta.results.find((m) => m.key === 'prices_updated_at')?.value ??
      meta.results.find((m) => m.key === 'generated_at')?.value ??
      new Date().toISOString(),
    games: games.results.map((g) => ({
      ...shapeGame(g),
      game_prices: byGame.get(g.id) ?? [],
    })),
    platforms: platforms.results,
  };

  return new Response(JSON.stringify(payload), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'public, max-age=60, stale-while-revalidate=300',
    },
  });
}
