export interface Platform {
  id: number;
  name: string;
  slug: string;
  color: string;
}

export interface Price {
  id: string;
  platform_id: number;
  price: number | null;
  regular_price: number | null;
  currency: string;
  store_url: string | null;
  on_sale: boolean;
  platforms: Platform | null;
}

export interface Game {
  id: string;
  slug: string;
  title: string;
  short_description: string | null;
  about: string | null;
  developer: string | null;
  publisher: string | null;
  release_date: string | null;
  genres: string[];
  tags: string[];
  features: string[];
  hero_image: string | null;
  box_image: string | null;
  rating: number | null;
  price_display: string | null;
  featured: boolean;
  platforms_released: string[] | null;
  game_modes: string[] | null;
  esrb_rating: string | null;
  engine: string | null;
  series: string | null;
  metacritic_score: number | null;
  steam_reviews_label: string | null;
  player_count: string | null;
  main_story_hours: number | null;
  completionist_hours: number | null;
  awards: string[] | null;
  trivia: string[] | null;
  game_prices: Price[];
}

export interface Filters {
  search: string;
  genres: string[];
  tags: string[];
  platforms: number[];
  maxPrice: number | null;
  onSaleOnly: boolean;
  freeOnly: boolean;
  sort: SortKey;
}

export type SortKey =
  | 'relevance'
  | 'rating-desc'
  | 'release-desc'
  | 'release-asc'
  | 'price-asc'
  | 'price-desc'
  | 'title-asc';
