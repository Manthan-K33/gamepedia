import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, SlidersHorizontal, X } from 'lucide-react';
import type { Filters, Game, Platform, SortKey } from '@/lib/types';
import { allGenres, allTags, bestDeal } from '@/lib/games';
import GameCard from '@/components/GameCard';

const DEFAULT_FILTERS: Filters = {
  search: '',
  genres: [],
  tags: [],
  platforms: [],
  maxPrice: null,
  onSaleOnly: false,
  freeOnly: false,
  sort: 'relevance',
};

interface BrowseProps {
  games: Game[];
  platforms: Platform[];
  filters: Filters;
  onFiltersChange: (f: Filters) => void;
  onOpenGame: (slug: string) => void;
}

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'rating-desc', label: 'Highest rated' },
  { value: 'release-desc', label: 'Release date (newest)' },
  { value: 'release-asc', label: 'Release date (oldest)' },
  { value: 'price-asc', label: 'Price (low to high)' },
  { value: 'price-desc', label: 'Price (high to low)' },
  { value: 'title-asc', label: 'Name (A-Z)' },
];

const MAX_PRICE = 70;

function toggle<T>(arr: T[], v: T): T[] {
  return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
}

function FilterGroup({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-white/10 py-3">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between text-xs font-bold uppercase tracking-wider text-gray-400 hover:text-white"
      >
        {title}
        {open ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </button>
      {open && <div className="mt-3 space-y-1.5">{children}</div>}
    </div>
  );
}

function CheckRow({
  checked,
  onChange,
  label,
  count,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  count?: number;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 text-sm text-gray-300 hover:text-white">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 rounded border-white/20 bg-white/5 accent-sky-500"
      />
      <span className="flex-1">{label}</span>
      {count !== undefined && (
        <span className="text-xs text-gray-400">{count}</span>
      )}
    </label>
  );
}

export default function Browse({
  games,
  platforms,
  filters,
  onFiltersChange,
  onOpenGame,
}: BrowseProps) {
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileFiltersOpen(false);
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const genres = allGenres(games);
  const tags = allTags(games);
  const set = (patch: Partial<Filters>) =>
    onFiltersChange({ ...filters, ...patch });

  const genreCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const g of games)
      for (const gen of g.genres) m.set(gen, (m.get(gen) ?? 0) + 1);
    return m;
  }, [games]);

  const platformCounts = useMemo(() => {
    const m = new Map<number, number>();
    for (const g of games)
      for (const p of g.game_prices)
        m.set(p.platform_id, (m.get(p.platform_id) ?? 0) + 1);
    return m;
  }, [games]);

  const activeFilterCount =
    (filters.search.trim().length > 0 ? 1 : 0) +
    filters.genres.length +
    filters.tags.length +
    filters.platforms.length +
    (filters.maxPrice !== null ? 1 : 0) +
    (filters.onSaleOnly ? 1 : 0) +
    (filters.freeOnly ? 1 : 0);

  const filtered = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    const list = games.filter((g) => {
      if (
        q &&
        !g.title.toLowerCase().includes(q) &&
        !(g.developer ?? '').toLowerCase().includes(q) &&
        !(g.publisher ?? '').toLowerCase().includes(q) &&
        !g.tags.some((t) => t.toLowerCase().includes(q))
      )
        return false;
      if (
        filters.genres.length > 0 &&
        !filters.genres.some((gen) => g.genres.includes(gen))
      )
        return false;
      if (
        filters.tags.length > 0 &&
        !filters.tags.every((t) => g.tags.includes(t))
      )
        return false;
      if (
        filters.platforms.length > 0 &&
        !g.game_prices.some((p) => filters.platforms.includes(p.platform_id))
      )
        return false;
      const deal = bestDeal(g);
      const price = deal?.price ?? null;
      if (filters.freeOnly && price !== 0) return false;
      if (
        !filters.freeOnly &&
        filters.maxPrice !== null &&
        (price === null || price > filters.maxPrice)
      )
        return false;
      if (filters.onSaleOnly && !(deal?.on_sale ?? false)) return false;
      return true;
    });

    const priceOf = (g: Game) => {
      const p = bestDeal(g)?.price;
      // Games with no price sort after every priced game.
      return p === null || p === undefined ? Number.POSITIVE_INFINITY : p;
    };

    const relevance = (g: Game) => {
      if (!q) return 0;
      const title = g.title.toLowerCase();
      let score = 0;
      if (title === q) score += 1000;
      else if (title.startsWith(q)) score += 500;
      else if (title.includes(q)) score += 200;
      if ((g.developer ?? '').toLowerCase().includes(q)) score += 60;
      if ((g.publisher ?? '').toLowerCase().includes(q)) score += 40;
      if (g.genres.some((genre) => genre.toLowerCase().includes(q))) score += 20;
      if (g.tags.some((t) => t.toLowerCase().includes(q))) score += 10;
      return score;
    };

    const byTitle = (a: Game, b: Game) => a.title.localeCompare(b.title);

    switch (filters.sort) {
      case 'title-asc':
        list.sort(byTitle);
        break;
      case 'rating-desc':
        list.sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1) || byTitle(a, b));
        break;
      case 'release-desc':
      case 'release-asc': {
        const direction = filters.sort === 'release-desc' ? -1 : 1;
        list.sort((a, b) => {
          const aDate = a.release_date ?? '';
          const bDate = b.release_date ?? '';
          if (!aDate && !bDate) return byTitle(a, b);
          if (!aDate) return 1;
          if (!bDate) return -1;
          if (aDate === bDate) return byTitle(a, b);
          return aDate < bDate ? -direction : direction;
        });
        break;
      }
      case 'price-asc':
        list.sort((a, b) => priceOf(a) - priceOf(b) || byTitle(a, b));
        break;
      case 'price-desc':
        list.sort((a, b) => {
          const aPrice = priceOf(a);
          const bPrice = priceOf(b);
          if (aPrice === bPrice) return byTitle(a, b);
          if (!Number.isFinite(aPrice)) return 1;
          if (!Number.isFinite(bPrice)) return -1;
          return bPrice - aPrice;
        });
        break;
      default:
        // Relevance only reorders when the user has typed a query;
        // otherwise the curated catalog order is kept.
        if (q) list.sort((a, b) => relevance(b) - relevance(a) || byTitle(a, b));
    }

    return list;
  }, [games, filters]);

  const sidebar = (
    <div>
      <FilterGroup title="Genre">
        {genres.map((gen) => (
          <CheckRow
            key={gen}
            label={gen}
            count={genreCounts.get(gen)}
            checked={filters.genres.includes(gen)}
            onChange={() => set({ genres: toggle(filters.genres, gen) })}
          />
        ))}
      </FilterGroup>

      <FilterGroup title="Platform">
        {platforms.map((p) => (
          <CheckRow
            key={p.id}
            label={p.name}
            count={platformCounts.get(p.id)}
            checked={filters.platforms.includes(p.id)}
            onChange={() => set({ platforms: toggle(filters.platforms, p.id) })}
          />
        ))}
      </FilterGroup>

      <FilterGroup title="Price" defaultOpen={false}>
        <div className="flex flex-wrap gap-2">
          {[
            { label: 'Free', free: true, max: null },
            { label: 'Under $15', free: false, max: 15 },
            { label: 'Under $30', free: false, max: 30 },
            { label: 'Under $50', free: false, max: 50 },
            { label: 'Any price', free: false, max: null },
          ].map((opt) => {
            const active = filters.freeOnly
              ? opt.free
              : !opt.free &&
                filters.maxPrice === opt.max &&
                !filters.freeOnly;
            return (
              <button
                key={opt.label}
                onClick={() =>
                  set({
                    freeOnly: opt.free,
                    maxPrice: opt.free ? null : opt.max,
                  })
                }
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                  active
                    ? 'border-sky-400 bg-sky-500/15 text-sky-300'
                    : 'border-white/10 text-gray-400 hover:border-white/25 hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
        <div className="pt-2">
          <input
            type="range"
            min={0}
            max={MAX_PRICE}
            step={5}
            value={filters.maxPrice ?? MAX_PRICE}
            onChange={(e) =>
              set({
                maxPrice: Number(e.target.value) >= MAX_PRICE ? null : Number(e.target.value),
                freeOnly: false,
              })
            }
            className="w-full accent-sky-500"
          />
          <p className="text-xs text-gray-400">
            Max:{' '}
            {filters.maxPrice === null ? 'Any' : `$${filters.maxPrice}`}
          </p>
        </div>
      </FilterGroup>

      <FilterGroup title="Specials">
        <CheckRow
          label="On sale"
          checked={filters.onSaleOnly}
          onChange={() => set({ onSaleOnly: !filters.onSaleOnly })}
        />
        <CheckRow
          label="Free to play"
          checked={filters.freeOnly}
          onChange={() => set({ freeOnly: !filters.freeOnly })}
        />
      </FilterGroup>

      <FilterGroup title="Tags" defaultOpen={false}>
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <button
              key={tag}
              onClick={() => set({ tags: toggle(filters.tags, tag) })}
              className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                filters.tags.includes(tag)
                  ? 'border-sky-400 bg-sky-500/15 text-sky-300'
                  : 'border-white/10 text-gray-400 hover:border-white/25 hover:text-white'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </FilterGroup>
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">
            Browse
          </h1>
          <p className="text-sm text-gray-400">
            {filtered.length} game{filtered.length !== 1 ? 's' : ''} found
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMobileFiltersOpen((o) => !o)}
            className="flex items-center gap-2 rounded-md border border-white/10 px-3 py-2 text-sm font-semibold text-gray-300 hover:text-white lg:hidden"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="rounded-full bg-sky-400 px-1.5 text-xs font-bold text-slate-950">
                {activeFilterCount}
              </span>
            )}
          </button>
          <select
            aria-label="Sort games"
            value={filters.sort}
            onChange={(e) => set({ sort: e.target.value as SortKey })}
            className="rounded-md border border-white/10 bg-[#1a1a22] px-3 py-2 text-sm text-gray-300 focus:border-sky-400 focus:outline-none"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                Sort: {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {activeFilterCount > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {filters.genres.map((gen) => (
            <button
              key={gen}
              onClick={() => set({ genres: toggle(filters.genres, gen) })}
              className="flex items-center gap-1 rounded-full bg-sky-500/15 px-2.5 py-1 text-xs font-semibold text-sky-300"
            >
              {gen} <X className="h-3 w-3" />
            </button>
          ))}
          {filters.platforms.map((pid) => (
            <button
              key={pid}
              onClick={() => set({ platforms: toggle(filters.platforms, pid) })}
              className="flex items-center gap-1 rounded-full bg-sky-500/15 px-2.5 py-1 text-xs font-semibold text-sky-300"
            >
              {platforms.find((p) => p.id === pid)?.name}{' '}
              <X className="h-3 w-3" />
            </button>
          ))}
          <button
            onClick={() => onFiltersChange(DEFAULT_FILTERS)}
            className="rounded-full border border-white/10 px-2.5 py-1 text-xs font-semibold text-gray-400 hover:text-white"
          >
            Clear all
          </button>
        </div>
      )}

      <div className="flex gap-6">
        <aside className="hidden w-60 shrink-0 lg:block">{sidebar}</aside>

        {mobileFiltersOpen && (
          <aside className="fixed inset-x-0 bottom-16 top-16 z-40 overflow-y-auto bg-[#121216] p-4 lg:hidden">
            {sidebar}
            <button
              onClick={() => setMobileFiltersOpen(false)}
              className="absolute top-4 right-4 rounded-full bg-white/10 p-2 hover:bg-white/20 transition-colors text-white"
              aria-label="Close filters"
            >
              <X className="h-5 w-5" />
            </button>
          </aside>
        )}

        <div className="min-w-0 flex-1">
          <h2 className="sr-only">Game results</h2>
          {filtered.length === 0 ? (
            <div className="rounded-lg border border-white/5 bg-[#1a1a22] p-12 text-center">
              <p className="text-lg font-semibold text-white">No games found</p>
              <p className="mt-1 text-sm text-gray-400">
                Try removing some filters or broadening your search.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
              {filtered.map((g) => (
                <GameCard key={g.slug} game={g} onOpen={onOpenGame} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
