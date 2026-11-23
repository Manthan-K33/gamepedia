import { useState } from 'react';
import { ChevronLeft, ChevronRight, Star, Info } from 'lucide-react';
import type { Game } from '@/lib/types';
import { formatPrice, lowestPrice } from '@/lib/games';
import GameCard from '@/components/GameCard';

interface HomeProps {
  games: Game[];
  onOpenGame: (slug: string) => void;
  onBrowse: () => void;
}

export default function Home({ games, onOpenGame, onBrowse }: HomeProps) {
  const featured = games.filter((g) => g.featured);
  const hero = featured.length > 0 ? featured : games.slice(0, 4);
  const [heroIndex, setHeroIndex] = useState(0);
  const [slide, setSlide] = useState(0);

  if (games.length === 0) return null;

  const current = hero[heroIndex % hero.length];
  const currentDeal = lowestPrice(current);
  const visible = games.slice(slide, slide + 6);
  const canPrev = slide > 0;
  const canNext = slide + 6 < games.length;

  const goTo = (slug: string) => {
    // `heroIndex` indexes the featured list, not the full catalog.
    const idx = hero.findIndex((g) => g.slug === slug);
    if (idx >= 0) setHeroIndex(idx);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-xl border border-white/5">
        <img
          src={current.hero_image ?? ''}
          alt={current.title}
          className="h-[380px] w-full object-cover object-top sm:h-[440px]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0e0e12] via-black/60 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-6 sm:p-10">
          <span className="rounded bg-sky-500/20 px-2 py-1 text-xs font-bold uppercase tracking-wider text-sky-300">
            Featured
          </span>
          <h1 className="mt-3 max-w-2xl text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            {current.title}
          </h1>
          <p className="mt-2 flex items-center gap-3 text-sm text-gray-300">
            {current.rating !== null && (
              <span className="flex items-center gap-1 font-semibold text-amber-400">
                <Star className="h-4 w-4" fill="currentColor" />
                {Number(current.rating).toFixed(0)}
              </span>
            )}
            {current.genres.join(' • ')}
          </p>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-gray-400">
            {current.short_description}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              onClick={() => onOpenGame(current.slug)}
              className="flex items-center gap-2 rounded-md bg-sky-400 px-5 py-2.5 text-sm font-bold text-slate-950 transition-colors hover:bg-sky-300"
            >
              <Info className="h-4 w-4" />
              View details
            </button>
            {currentDeal && (
              <span className="text-sm text-gray-300">
                From{' '}
                <strong className="text-white">
                  {formatPrice(currentDeal.price, currentDeal.currency)}
                </strong>
              </span>
            )}
          </div>
        </div>

        <button
          onClick={() => setHeroIndex((heroIndex - 1 + hero.length) % hero.length)}
          aria-label="Previous game"
          className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white backdrop-blur transition-colors hover:bg-black/70"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          onClick={() => setHeroIndex((heroIndex + 1) % hero.length)}
          aria-label="Next game"
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white backdrop-blur transition-colors hover:bg-black/70"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
        <div className="absolute bottom-2 right-4 flex gap-1.5">
          {hero.map((g) => (
            <button
              key={g.slug}
              onClick={() => setHeroIndex(hero.indexOf(g))}
              aria-label={`Show ${g.title}`}
              className="flex h-6 w-6 items-center justify-center"
            >
              <span
                className={`block h-1.5 rounded-full transition-all ${
                  g.slug === current.slug ? 'w-6 bg-sky-400' : 'w-3 bg-white/30'
                }`}
              />
            </button>
          ))}
        </div>
      </section>

      {/* Small hero selector strip */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {hero.slice(0, 4).map((g) => (
          <button
            key={g.slug}
            onClick={() => goTo(g.slug)}
            className={`overflow-hidden rounded-lg border text-left transition-all ${
              g.slug === current.slug
                ? 'border-sky-400 ring-1 ring-sky-400/50'
                : 'border-white/5 opacity-70 hover:opacity-100'
            }`}
          >
            <img
              src={g.box_image ?? ''}
              alt={`${g.title} cover art`}
              className="h-20 w-full object-cover object-top"
            />
            <span className="block truncate px-2 py-1.5 text-xs font-semibold text-white">
              {g.title}
            </span>
          </button>
        ))}
      </div>

      {/* All games */}
      <section className="mt-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Discover</h2>
          <button
            onClick={onBrowse}
            className="rounded px-3 py-1.5 text-sm font-semibold text-sky-400 transition-colors hover:bg-white/5 hover:text-sky-300"
          >
            Browse all games
          </button>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {visible.map((g) => (
            <GameCard key={g.slug} game={g} onOpen={onOpenGame} />
          ))}
        </div>
        <div className="mt-4 flex items-center justify-center gap-3">
          <button
            onClick={() => setSlide(Math.max(0, slide - 6))}
            disabled={!canPrev}
            aria-label="Previous page"
            className="rounded-full border border-white/10 p-2 text-white transition-colors hover:bg-white/5 disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => setSlide(slide + 6)}
            disabled={!canNext}
            aria-label="Next page"
            className="rounded-full border border-white/10 p-2 text-white transition-colors hover:bg-white/5 disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </section>
    </div>
  );
}
