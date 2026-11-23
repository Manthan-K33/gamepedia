import type { Game, Platform, Price } from './types';

// The catalog lives in Cloudflare D1 and is served by /api/catalog.
// `npm run db:seed` loads the checked-in snapshot into the database.
interface Catalog {
  generated_at: string;
  games: Game[];
  platforms: Platform[];
}

let cached: Promise<Catalog> | null = null;

async function loadSnapshot(): Promise<Catalog> {
  const { default: snapshot } = await import('@/data/catalog.json');
  return snapshot as unknown as Catalog;
}

async function fetchCatalog(): Promise<Catalog> {
  try {
    const res = await fetch('/api/catalog');
    if (!res.ok) throw new Error(`Catalog API returned ${res.status}`);
    return (await res.json()) as Catalog;
  } catch (error) {
    // `vite dev` has no Pages Functions, so local development reads the snapshot.
    // Production surfaces the failure instead of hiding a broken database.
    if (import.meta.env.DEV) return loadSnapshot();
    throw error;
  }
}

function catalog(): Promise<Catalog> {
  if (!cached) {
    cached = fetchCatalog().catch((error) => {
      cached = null;
      throw error;
    });
  }
  return cached;
}

const FALLBACK_PLATFORMS: Platform[] = [
  { id: 1, name: 'Steam', slug: 'steam', color: '#1b2838' },
  { id: 2, name: 'Epic Games Store', slug: 'epic-games-store', color: '#2a2a2a' },
  { id: 3, name: 'Xbox', slug: 'xbox', color: '#107c10' },
  { id: 4, name: 'PlayStation', slug: 'playstation', color: '#0070d1' },
  { id: 5, name: 'Nintendo Switch', slug: 'nintendo-switch', color: '#e60012' },
  { id: 6, name: 'GOG', slug: 'gog', color: '#86328c' },
];

// Timestamp of the price snapshot the catalog was built from.
export async function fetchCatalogGeneratedAt(): Promise<string> {
  return (await catalog()).generated_at;
}

export function formatSnapshotDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// The stored `store_url` values point at storefront home pages, so build a
// store search URL for the game instead of dropping people on a front page.
const STORE_SEARCH: Record<string, (query: string) => string> = {
  steam: (q) => `https://store.steampowered.com/search/?term=${encodeURIComponent(q)}`,
  'epic-games-store': (q) =>
    `https://store.epicgames.com/en-US/search?q=${encodeURIComponent(q)}`,
  xbox: (q) => `https://www.xbox.com/en-US/search?q=${encodeURIComponent(q)}`,
  playstation: (q) =>
    `https://store.playstation.com/en-us/search/${encodeURIComponent(q)}`,
  'nintendo-switch': (q) =>
    `https://www.nintendo.com/us/search/#q=${encodeURIComponent(q)}&p=1`,
  gog: (q) => `https://www.gog.com/en/games?query=${encodeURIComponent(q)}`,
};

export function storeHref(
  storeUrl: string | null,
  platform: Platform | null,
  title: string
): string {
  if (platform) {
    const build = STORE_SEARCH[platform.slug];
    if (build) return build(title);
  }
  return storeUrl ?? '#';
}

export async function fetchPlatforms(): Promise<Platform[]> {
  const data = (await catalog()).platforms;
  if (!data || data.length === 0) return FALLBACK_PLATFORMS;
  return data;
}

export async function fetchGames(): Promise<Game[]> {
  const data = (await catalog()).games;
  if (!data) return [];

  return data.map((g) => ({
    ...g,
    // The source data used "N/A" as a placeholder; treat it as "no series".
    series:
      g.series && g.series.trim() && g.series.trim().toUpperCase() !== 'N/A'
        ? g.series.trim()
        : null,
    game_prices: (g.game_prices ?? []).map((p) => ({
      ...p,
      price: p.price !== null ? Number(p.price) : null,
      regular_price: p.regular_price !== null ? Number(p.regular_price) : null,
    })),
  }));
}

export function lowestPrice(game: Game): Price | null {
  // A price of 0 is a real listing ("Free"), not a missing price.
  const priced = game.game_prices.filter((p) => p.price !== null);
  if (priced.length === 0) return null;
  return priced.reduce((min, p) => (p.price! < min.price! ? p : min));
}

export function bestDeal(game: Game): Price | null {
  const sale = game.game_prices.filter((p) => p.on_sale && p.price !== null);
  if (sale.length === 0) return lowestPrice(game);
  return sale.reduce((min, p) => (p.price! < min.price! ? p : min));
}

export function allGenres(games: Game[]): string[] {
  return [...new Set(games.flatMap((g) => g.genres))].sort();
}

export function allTags(games: Game[]): string[] {
  return [...new Set(games.flatMap((g) => g.tags))].sort();
}

export function formatPrice(price: number | null, currency = 'USD'): string {
  if (price === null) return 'N/A';
  if (price === 0) return 'Free';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(price);
}

export function discountPercent(p: Price): number | null {
  if (!p.on_sale || !p.price || !p.regular_price || p.regular_price === 0)
    return null;
  return Math.round((1 - p.price / p.regular_price) * 100);
}
