import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Gamepad2, Search } from 'lucide-react';
import type { Game } from '@/lib/types';
import { formatPrice, lowestPrice } from '@/lib/games';

interface HeaderProps {
  route: string;
  onNavigate: (route: string) => void;
  games: Game[];
  search: string;
  onSearch: (value: string) => void;
}

const MAX_RESULTS = 6;

/**
 * Ranks a game against the typed query. Lower is better; `null` means no match.
 * Titles win over people, people over genres, genres over tags.
 */
function matchScore(game: Game, q: string): number | null {
  const title = game.title.toLowerCase();
  if (title === q) return 0;
  if (title.startsWith(q)) return 1;
  if (title.includes(q)) return 2;
  if (title.split(/\s+/).some((word) => word.startsWith(q))) return 3;

  // Metadata matches only make sense from three characters on, and only at a
  // word boundary: otherwise "zz" would suggest every "Puzzle" game.
  if (q.length < 3) return null;
  const startsWord = (value: string) => {
    const haystack = value.toLowerCase();
    let index = haystack.indexOf(q);
    while (index !== -1) {
      const before = index === 0 ? '' : haystack[index - 1];
      if (!/[a-z0-9]/.test(before)) return true;
      index = haystack.indexOf(q, index + 1);
    }
    return false;
  };

  if (startsWord(game.developer ?? '')) return 4;
  if (startsWord(game.publisher ?? '')) return 5;
  if (game.genres.some(startsWord)) return 6;
  if (game.tags.some(startsWord)) return 7;
  return null;
}

export default function Header({
  route,
  onNavigate,
  games,
  search,
  onSearch,
}: HeaderProps) {
  const isBrowse = route.startsWith('/browse');
  const isHome = route === '/' || route.startsWith('/game/');

  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const query = search.trim().toLowerCase();

  const results = useMemo(() => {
    if (!query) return [];
    return games
      .map((game) => ({ game, score: matchScore(game, query) }))
      .filter((entry): entry is { game: Game; score: number } => entry.score !== null)
      .sort((a, b) => a.score - b.score || a.game.title.localeCompare(b.game.title))
      .slice(0, MAX_RESULTS)
      .map((entry) => entry.game);
  }, [games, query]);

  // Close the suggestion panel when the route changes.
  useEffect(() => {
    setOpen(false);
    setActive(-1);
  }, [route]);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        setActive(-1);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const changeSearch = (value: string) => {
    onSearch(value);
    setOpen(value.trim().length > 0);
    setActive(-1);
  };

  const chooseGame = (game: Game) => {
    setOpen(false);
    setActive(-1);
    onSearch('');
    inputRef.current?.blur();
    onNavigate(`/game/${game.slug}`);
  };

  const seeAllResults = () => {
    setOpen(false);
    setActive(-1);
    inputRef.current?.blur();
    onNavigate('/browse');
  };

  const onInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      if (results.length === 0) return;
      event.preventDefault();
      setOpen(true);
      setActive((index) => (index + 1 >= results.length ? 0 : index + 1));
    } else if (event.key === 'ArrowUp') {
      if (results.length === 0) return;
      event.preventDefault();
      setOpen(true);
      setActive((index) => (index <= 0 ? results.length - 1 : index - 1));
    } else if (event.key === 'Enter') {
      if (open && active >= 0 && results[active]) {
        event.preventDefault();
        chooseGame(results[active]);
      }
    } else if (event.key === 'Escape') {
      setOpen(false);
      setActive(-1);
    }
  };

  const showPanel = open && query.length > 0;

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#121216]/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:gap-6 sm:px-6">
        <button
          onClick={() => onNavigate('/')}
          className="flex shrink-0 items-center gap-2 text-white"
        >
          <Gamepad2 className="h-7 w-7 text-sky-400" strokeWidth={2.2} />
          <span className="hidden text-lg font-extrabold tracking-tight sm:inline">
            GAME<span className="text-sky-400">PEDIA</span>
          </span>
        </button>

        <nav className="hidden items-center gap-1 md:flex">
          {[
            { label: 'Home', active: isHome, route: '/' },
            { label: 'Browse', active: isBrowse, route: '/browse' },
          ].map((item) => (
            <button
              key={item.label}
              onClick={() => onNavigate(item.route)}
              className={`rounded px-3 py-1.5 text-sm font-semibold transition-colors ${
                item.active
                  ? 'text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <form
          className="ml-auto w-full min-w-0 max-w-sm"
          onSubmit={(event) => {
            event.preventDefault();
            seeAllResults();
          }}
          role="search"
        >
          <div ref={wrapperRef} className="relative w-full">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              ref={inputRef}
              id="game-search"
              type="search"
              role="combobox"
              aria-label="Search games"
              aria-expanded={showPanel}
              aria-controls="game-search-results"
              aria-autocomplete="list"
              aria-activedescendant={
                active >= 0 && results[active]
                  ? `game-search-option-${results[active].slug}`
                  : undefined
              }
              autoComplete="off"
              value={search}
              onChange={(event) => changeSearch(event.target.value)}
              onFocus={() => {
                if (query.length > 0) setOpen(true);
              }}
              onKeyDown={onInputKeyDown}
              placeholder="Search games..."
              className="w-full rounded-md border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-sm text-white placeholder:text-gray-400 focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
            />

            {showPanel && (
              <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-lg border border-white/10 bg-[#16161c] shadow-2xl shadow-black/60">
                {results.length > 0 ? (
                  <ul
                    id="game-search-results"
                    role="listbox"
                    aria-label="Game suggestions"
                    className="max-h-80 overflow-y-auto py-1"
                  >
                    {results.map((game, index) => {
                      const deal = lowestPrice(game);
                      return (
                        <li
                          key={game.slug}
                          id={`game-search-option-${game.slug}`}
                          role="option"
                          aria-selected={index === active}
                        >
                          <button
                            type="button"
                            tabIndex={-1}
                            onMouseDown={(event) => event.preventDefault()}
                            onMouseEnter={() => setActive(index)}
                            onClick={() => chooseGame(game)}
                            className={`flex w-full items-center gap-3 px-2 py-2 text-left transition-colors ${
                              index === active ? 'bg-white/10' : 'hover:bg-white/5'
                            }`}
                          >
                            <img
                              src={game.box_image ?? game.hero_image ?? ''}
                              alt=""
                              loading="lazy"
                              className="h-12 w-9 shrink-0 rounded object-cover object-center bg-white/5"
                            />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-semibold text-white">
                                {game.title}
                              </span>
                              <span className="block truncate text-xs text-gray-400">
                                {game.genres.slice(0, 2).join(' · ') ||
                                  game.developer ||
                                  'Game'}
                              </span>
                            </span>
                            {deal && (
                              <span className="shrink-0 text-xs font-bold text-sky-300">
                                {formatPrice(deal.price, deal.currency)}
                              </span>
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="px-3 py-3 text-sm text-gray-400">
                    No games match “{search.trim()}”.
                  </p>
                )}

                <button
                  type="button"
                  onClick={seeAllResults}
                  className="flex w-full items-center gap-2 border-t border-white/10 px-3 py-2 text-xs font-semibold text-sky-400 transition-colors hover:bg-white/5 hover:text-sky-300"
                >
                  <span className="min-w-0 flex-1 truncate text-left">
                    See all results for “{search.trim()}”
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 shrink-0" />
                </button>
              </div>
            )}
          </div>
        </form>

        <nav className="flex items-center gap-1 md:hidden">
          <button
            onClick={() => onNavigate('/')}
            className={`rounded px-2 py-1.5 text-sm font-semibold ${isHome ? 'text-white' : 'text-gray-400'}`}
          >
            Home
          </button>
          <button
            onClick={() => onNavigate('/browse')}
            className={`rounded px-2 py-1.5 text-sm font-semibold ${isBrowse ? 'text-white' : 'text-gray-400'}`}
          >
            Browse
          </button>
        </nav>
      </div>
    </header>
  );
}
