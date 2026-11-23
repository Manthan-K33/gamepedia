import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Home from '@/pages/Home';
import Browse from '@/pages/Browse';
import GameDetail from '@/pages/GameDetail';
import type { Filters, Game, Platform } from '@/lib/types';
import { fetchGames, fetchPlatforms } from '@/lib/games';

type Route =
  | { name: 'home' }
  | { name: 'browse' }
  | { name: 'game'; slug: string }
  | { name: 'notfound' };

function parseRoute(hash: string): Route {
  const clean = hash.replace(/^#/, '');
  if (clean === '' || clean === '/') return { name: 'home' };
  if (clean.startsWith('/browse')) return { name: 'browse' };
  if (clean.startsWith('/game/') && clean.length > '/game/'.length) {
    try {
      return {
        name: 'game',
        slug: decodeURIComponent(clean.slice('/game/'.length)),
      };
    } catch {
      return { name: 'notfound' };
    }
  }
  return { name: 'notfound' };
}

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

export default function App() {
  const [route, setRoute] = useState(() => parseRoute(window.location.hash));
  const [games, setGames] = useState<Game[]>([]);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);

  useEffect(() => {
    const onHashChange = () => {
      setRoute(parseRoute(window.location.hash));
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [gameData, platformData] = await Promise.all([
          fetchGames(),
          fetchPlatforms(),
        ]);
        if (!cancelled) {
          setGames(gameData);
          setPlatforms(platformData);
        }
      } catch (e) {
        if (!cancelled)
          setError(
            e instanceof Error ? e.message : 'Something went wrong loading games.'
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const navigate = (path: string) => {
    if (path === '-1') {
      window.history.back();
      return;
    }
    window.location.hash = path;
  };

  const openGame = (slug: string) => navigate(`/game/${slug}`);

  const openWithFilters = (patch: Partial<Filters>) => {
    setFilters({ ...DEFAULT_FILTERS, ...patch });
    navigate('/browse');
  };

  const filterByPlatform = (label: string) => {
    const norm = label.toLowerCase();
    const exact = platforms.find((p) => p.name.toLowerCase() === norm);
    if (exact) {
      openWithFilters({ platforms: [exact.id] });
      return;
    }
    // Console names ("PlayStation 4/5") map to their storefront ("PlayStation").
    const fuzzy = platforms.filter((p) => {
      const name = p.name.toLowerCase();
      return norm.includes(name) || name.includes(norm);
    });
    if (fuzzy.length > 0) {
      openWithFilters({ platforms: fuzzy.map((p) => p.id) });
      return;
    }
    // "PC" spans several storefronts.
    if (/^pc\b/i.test(label)) {
      const pcStores = platforms.filter((p) =>
        ['steam', 'epic games store', 'gog'].includes(p.name.toLowerCase())
      );
      if (pcStores.length > 0) {
        openWithFilters({ platforms: pcStores.map((p) => p.id) });
        return;
      }
    }
    openWithFilters({ search: label });
  };

  const searchChanged = (value: string) => {
    setFilters((f) => ({ ...f, search: value }));
  };

  const goBrowse = () => navigate('/browse');

  let content: React.ReactNode;
  if (loading) {
    content = (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/10 border-t-sky-400" />
      </div>
    );
  } else if (error) {
    content = (
      <div className="mx-auto max-w-7xl px-4 py-20 text-center sm:px-6">
        <p className="text-lg font-semibold text-white">
          We couldn't load the game library
        </p>
        <p className="mt-2 text-sm text-gray-400">{error}</p>
        <button
          onClick={() => window.history.back()}
          className="mt-6 rounded-md bg-sky-400 px-5 py-2.5 text-sm font-bold text-slate-950 hover:bg-sky-300"
        >
          Try again
        </button>
      </div>
    );
  } else if (route.name === 'game') {
    const game = games.find((g) => g.slug === route.slug);
    if (game) {
      const related = games
        .filter(
          (g) =>
            g.slug !== game.slug &&
            g.genres.some((gen) => game.genres.includes(gen))
        )
        .slice(0, 5);
      const seriesGames = game.series
        ? games
            .filter(
              (g) =>
                g.slug !== game.slug &&
                g.series !== null &&
                g.series === game.series
            )
            .slice(0, 5)
        : [];
      content = (
        <GameDetail
          game={game}
          related={related}
          seriesGames={seriesGames}
          onOpenGame={openGame}
          onBack={() => navigate('-1')}
          onFilterGenre={(genre) => openWithFilters({ genres: [genre] })}
          onFilterTag={(tag) => openWithFilters({ tags: [tag] })}
          onFilterPlatform={filterByPlatform}
        />
      );
    } else {
      content = (
        <div className="mx-auto max-w-7xl px-4 py-20 text-center sm:px-6">
          <p className="text-lg font-semibold text-white">Game not found</p>
          <button
            onClick={goBrowse}
            className="mt-6 rounded-md bg-sky-400 px-5 py-2.5 text-sm font-bold text-slate-950 hover:bg-sky-300"
          >
            Browse all games
          </button>
        </div>
      );
    }
  } else if (route.name === 'browse') {
    content = (
      <Browse
        games={games}
        platforms={platforms}
        filters={filters}
        onFiltersChange={setFilters}
        onOpenGame={openGame}
      />
    );
  } else if (route.name === 'notfound') {
    content = (
      <div className="mx-auto max-w-7xl px-4 py-20 text-center sm:px-6">
        <p className="text-xs font-bold uppercase tracking-wider text-sky-400">
          404
        </p>
        <h1 className="mt-2 text-2xl font-bold text-white">Page not found</h1>
        <p className="mt-2 text-sm text-gray-400">
          The page you&apos;re looking for doesn&apos;t exist or may have moved.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            onClick={goBrowse}
            className="rounded-md bg-sky-400 px-5 py-2.5 text-sm font-bold text-slate-950 hover:bg-sky-300"
          >
            Browse all games
          </button>
          <button
            onClick={() => navigate('/')}
            className="rounded-md border border-white/15 px-5 py-2.5 text-sm font-bold text-white hover:border-white/30"
          >
            Go home
          </button>
        </div>
      </div>
    );
  } else {
    content = (
      <Home games={games} onOpenGame={openGame} onBrowse={goBrowse} />
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#0e0e12] font-sans text-white">
      <Header
        route={route.name === 'game' ? '/' : `/${route.name}`}
        onNavigate={navigate}
        games={games}
        search={filters.search}
        onSearch={searchChanged}
      />
      <main className="flex-1">{content}</main>
      <Footer />
    </div>
  );
}
