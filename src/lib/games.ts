import { supabase } from './supabase';
import type { Game, Platform, Price } from './types';

const FALLBACK_PLATFORMS: Platform[] = [
  { id: 1, name: 'Steam', slug: 'steam', color: '#1b2838' },
  { id: 2, name: 'Epic Games Store', slug: 'epic-games-store', color: '#2a2a2a' },
  { id: 3, name: 'Xbox', slug: 'xbox', color: '#107c10' },
  { id: 4, name: 'PlayStation', slug: 'playstation', color: '#0070d1' },
  { id: 5, name: 'Nintendo Switch', slug: 'nintendo-switch', color: '#e60012' },
  { id: 6, name: 'GOG', slug: 'gog', color: '#86328c' },
];

export async function fetchPlatforms(): Promise<Platform[]> {
  const { data, error } = await supabase
    .from('platforms')
    .select('id, name, slug, color')
    .order('id');
  if (error || !data || data.length === 0) return FALLBACK_PLATFORMS;
  return data;
}

export async function fetchGames(): Promise<Game[]> {
  const { data, error } = await supabase
    .from('games')
    .select(
      `*,
      game_prices (
        id, platform_id, price, regular_price, currency, store_url, on_sale,
        platforms ( id, name, slug, color )
      )`
    )
    .order('title');

  if (error) throw new Error(error.message);
  if (!data) return [];

  return (data as Game[]).map((g) => ({
    ...g,
    game_prices: (g.game_prices ?? []).map((p) => ({
      ...p,
      price: p.price !== null ? Number(p.price) : null,
      regular_price: p.regular_price !== null ? Number(p.regular_price) : null,
    })),
  }));
}

export function lowestPrice(game: Game): Price | null {
  const priced = game.game_prices.filter(
    (p) => p.price !== null && p.price > 0
  );
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
