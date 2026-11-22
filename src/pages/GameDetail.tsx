import { useEffect, useMemo, useState } from 'react';
import {
  Star,
  Calendar,
  Building2,
  ArrowUpRight,
  Tag,
  Check,
  Trophy,
  Lightbulb,
  ChevronDown,
  Gamepad2,
  MonitorSmartphone,
  Users,
  Cpu,
  BookOpen,
  BarChart3,
  Clock,
  Layers,
} from 'lucide-react';
import type { Game } from '@/lib/types';
import { discountPercent, formatPrice } from '@/lib/games';

// Document title and meta tags
const pageTitle = (game: Game) =>
  `${game.title} - GamePedia Game Library & Price Tracker`;

const metaDescription = (game: Game) =>
  `${game.short_description || game.about || 'Information about ' + game.title}. Compare prices, check ratings, and find the best deals across stores.`;

const metaKeywords = (game: Game) =>
  [
    game.title,
    ...(game.genres || []),
    ...(game.tags || []),
    ...(game.platforms_released || []),
  ]
    .filter(Boolean)
    .join(', ');

// Reuses (or creates) a
// <meta name="..."> tag so the page can carry per-game SEO data.
function ensureMeta(name: string): HTMLMetaElement {
  const existing = document.head.querySelector<HTMLMetaElement>(
    `meta[name="${name}"]`
  );
  if (existing) return existing;
  const tag = document.createElement('meta');
  tag.setAttribute('name', name);
  document.head.appendChild(tag);
  return tag;
}


interface GameDetailProps {
  game: Game;
  related: Game[];
  seriesGames: Game[];
  onOpenGame: (slug: string) => void;
  onBack: () => void;
  onFilterGenre: (genre: string) => void;
  onFilterTag: (tag: string) => void;
  onFilterPlatform: (name: string) => void;
}

function formatHours(h: number | null): string | null {
  if (h === null) return null;
  if (h === 0) return null;
  if (h < 1) return `${Math.round(h * 60)} min`;
  return `${Math.round(h)} hours`;
}

function useScrollProgress(): number {
  const [pct, setPct] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement;
      const max = el.scrollHeight - el.clientHeight;
      setPct(max > 0 ? Math.min(100, (el.scrollTop / max) * 100) : 0);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);
  return pct;
}

function useActiveSection(ids: string[]): string {
  const [active, setActive] = useState(ids[0] ?? '');
  useEffect(() => {
    const els = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (els.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const top = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (top) setActive(top.target.id);
      },
      { rootMargin: '-96px 0px -60% 0px', threshold: [0.05, 0.25, 0.6] }
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [ids]);
  return active;
}

function InfoRow({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Building2;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" />
      <div className="min-w-0">
        <dt className="text-xs text-gray-500">{label}</dt>
        <dd className="font-semibold text-white">{children}</dd>
      </div>
    </div>
  );
}

function SectionCard({
  id,
  title,
  icon: Icon,
  action,
  children,
}: {
  id?: string;
  title: string;
  icon?: typeof Building2;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-32 rounded-lg border border-white/5 bg-[#1a1a22] p-5"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-400">
          {Icon && <Icon className="h-3.5 w-3.5" />}
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Chip({
  label,
  onClick,
  tone = 'neutral',
}: {
  label: string;
  onClick: () => void;
  tone?: 'neutral' | 'sky' | 'emerald';
}) {
  const tones = {
    neutral:
      'bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white border border-transparent hover:border-white/20',
    sky: 'bg-sky-400/10 text-sky-200 hover:bg-sky-400/20 border border-sky-400/10',
    emerald:
      'bg-emerald-400/10 text-emerald-200 hover:bg-emerald-400/20 border border-emerald-400/10',
  };
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${tones[tone]}`}
    >
      {label}
    </button>
  );
}

function ReviewBar({ score }: { score: number }) {
  const pct = Math.min(100, Math.max(0, score));
  const color =
    pct >= 75 ? 'bg-emerald-400' : pct >= 50 ? 'bg-amber-400' : 'bg-rose-400';
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
      <div
        className={`h-full rounded-full ${color} transition-all duration-500`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function PlaytimeRow({
  label,
  hours,
  max,
  tone,
}: {
  label: string;
  hours: number;
  max: number;
  tone: string;
}) {
  const pct = max > 0 ? Math.max(4, (hours / max) * 100) : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm text-gray-400">{label}</span>
        <span className="text-sm font-semibold text-white">
          {formatHours(hours)}
        </span>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full ${tone} transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function triviaHeadline(text: string): string {
  const clean = text.trim();
  // Find the first sentence end, but skip internal periods like "R. R. Martin"
  // Strategy: look for [.!?] followed by space + capital letter + lowercase letters (real word)
  const sentenceMatch = clean.match(/^[^.!?]{20,120}([.!?](?=\s+[A-Z][a-z]|\s*$))/);
  if (sentenceMatch) {
    const sentence = sentenceMatch[1]
      ? clean.slice(0, clean.indexOf(sentenceMatch[1]) + 1).trim()
      : clean.slice(0, 120).trim();
    if (sentence.length <= 110) return sentence;
  }
  return clean.length > 100 ? `${clean.slice(0, 97).trimEnd()}…` : clean;
}

function TriviaItem({
  text,
  index,
  open,
  onToggle,
}: {
  text: string;
  index: number;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-white/5 bg-white/[0.03]">
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.04]"
        aria-expanded={open}
      >
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-400/10 text-xs font-bold text-sky-300">
          {index + 1}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-200">
          {triviaHeadline(text)}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      <div
        className={`grid transition-all duration-200 ${open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
      >
        <div className="overflow-hidden">
          <p className="px-4 pb-3 pl-14 text-sm leading-relaxed text-gray-400">
            {text}
          </p>
        </div>
      </div>
    </div>
  );
}

function GameThumb({
  game,
  onOpen,
}: {
  game: Game;
  onOpen: (slug: string) => void;
}) {
  return (
    <button
      onClick={() => onOpen(game.slug)}
      className="group overflow-hidden rounded-lg border border-white/5 bg-[#1a1a22] text-left transition-all hover:border-sky-400/40"
    >
      <img
        src={game.box_image ?? game.hero_image ?? ''}
        alt={`${game.title} cover art`}
        loading="lazy"
        className="aspect-[3/4] w-full object-contain"
      />
      <div className="p-2.5">
        <p className="truncate text-sm font-semibold text-white">
          {game.title}
        </p>
        <p className="truncate text-xs text-gray-500">
          {game.genres.slice(0, 2).join(' • ')}
        </p>
      </div>
    </button>
  );
}

export default function GameDetail({
  game,
  related,
  seriesGames,
  onOpenGame,
  onBack,
  onFilterGenre,
  onFilterTag,
  onFilterPlatform,
}: GameDetailProps) {
  const prices = [...game.game_prices].sort((a, b) => {
    const pa = a.price ?? Infinity;
    const pb = b.price ?? Infinity;
    if (a.on_sale) return -1;
    if (b.on_sale) return 1;
    return pa - pb;
  });

  const releaseDate = game.release_date
    ? new Date(game.release_date + 'T00:00:00').toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  const mainHours = formatHours(game.main_story_hours);
  const completionHours = formatHours(game.completionist_hours);
  const progress = useScrollProgress();

  // Keep the browser tab title and meta tags in sync with the open game,
  // restoring the previous values when the page unmounts.
  useEffect(() => {
    const previousTitle = document.title;
    const descriptionTag = ensureMeta('description');
    const keywordsTag = ensureMeta('keywords');
    const previousDescription = descriptionTag.content;
    const previousKeywords = keywordsTag.content;

    document.title = pageTitle(game);
    descriptionTag.setAttribute('content', metaDescription(game));
    keywordsTag.setAttribute('content', metaKeywords(game));

    return () => {
      document.title = previousTitle;
      descriptionTag.setAttribute('content', previousDescription);
      keywordsTag.setAttribute('content', previousKeywords);
    };
  }, [game]);

  const sections = useMemo(() => {
    const list: { id: string; label: string }[] = [
      { id: 'about', label: 'About' },
    ];
    if (game.metacritic_score !== null || game.steam_reviews_label)
      list.push({ id: 'reception', label: 'Reception' });
    if (mainHours || completionHours)
      list.push({ id: 'playtime', label: 'Playtime' });
    if (game.trivia && game.trivia.length > 0)
      list.push({ id: 'trivia', label: 'Did you know?' });
    if (game.awards && game.awards.length > 0)
      list.push({ id: 'awards', label: 'Awards' });
    list.push({ id: 'pricing', label: 'Pricing' });
    return list;
  }, [game, mainHours, completionHours]);

  const sectionIds = useMemo(() => sections.map((s) => s.id), [sections]);
  const activeSection = useActiveSection(sectionIds);

  const [openTrivia, setOpenTrivia] = useState<Set<number>>(new Set([0]));
  useEffect(() => {
    setOpenTrivia(new Set([0]));
  }, [game.slug]);

  const triviaCount = game.trivia?.length ?? 0;
  const allTriviaOpen = triviaCount > 0 && openTrivia.size === triviaCount;

  const jumpTo = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - 88;
    window.scrollTo({ top: y, behavior: 'smooth' });
  };

  const playtimeMax = Math.max(
    game.main_story_hours ?? 0,
    game.completionist_hours ?? 0
  );

  const awards = game.awards ?? [];
  const trivia = game.trivia ?? [];
  const platformsReleased = game.platforms_released ?? [];
  const gameModes = game.game_modes ?? [];
  const features = game.features ?? [];
  const tags = game.tags ?? [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      {/* Reading progress */}
      <div className="fixed inset-x-0 top-16 z-40 h-0.5 bg-transparent">
        <div
          className="h-full bg-sky-400/80 transition-[width] duration-150"
          style={{ width: `${progress}%` }}
        />
      </div>

      <button
        onClick={onBack}
        className="mb-4 text-sm font-semibold text-gray-400 transition-colors hover:text-white"
      >
        &larr; Back
      </button>

      {/* Hero banner */}
      <section className="relative overflow-hidden rounded-xl border border-white/5">
        <div className="relative h-[300px] w-full bg-[#0b0b10] sm:h-[380px]">
          {game.hero_image && (
            <img
              src={game.hero_image}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 h-full w-full object-cover object-center scale-110 opacity-30 blur-2xl"
            />
          )}
          {game.hero_image && (
            <img
              src={game.hero_image}
              alt={game.title}
              className="absolute inset-0 h-full w-full object-cover object-center"
            />
          )}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#0e0e12] via-black/50 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            {game.title}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-gray-300">
            {game.rating !== null && (
              <span className="flex items-center gap-1 font-bold text-amber-400">
                <Star className="h-4 w-4" fill="currentColor" />
                {Number(game.rating).toFixed(0)}
                <span className="ml-1 font-normal text-gray-400">/ 100</span>
              </span>
            )}
            <span className="flex flex-wrap items-center gap-1.5">
              {game.genres.map((genre) => (
                <button
                  key={genre}
                  onClick={() => onFilterGenre(genre)}
                  className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-medium text-gray-200 transition-colors hover:bg-sky-400/20 hover:text-sky-100"
                >
                  {genre}
                </button>
              ))}
            </span>
          </div>
        </div>
      </section>

      {/* Quick facts strip */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {game.esrb_rating && (
          <div className="rounded-lg border border-white/5 bg-[#1a1a22] p-3">
            <p className="text-[11px] uppercase tracking-wide text-gray-500">
              Age rating
            </p>
            <p className="mt-0.5 truncate text-sm font-semibold text-white">
              {game.esrb_rating}
            </p>
          </div>
        )}
        {game.series && (
          <div className="rounded-lg border border-white/5 bg-[#1a1a22] p-3">
            <p className="text-[11px] uppercase tracking-wide text-gray-500">
              Series
            </p>
            <p className="mt-0.5 truncate text-sm font-semibold text-white">
              {game.series}
            </p>
          </div>
        )}
        {(mainHours || completionHours) && (
          <div className="rounded-lg border border-white/5 bg-[#1a1a22] p-3">
            <p className="text-[11px] uppercase tracking-wide text-gray-500">
              Playtime
            </p>
            <p className="mt-0.5 truncate text-sm font-semibold text-white">
              {mainHours ?? '—'}
              {completionHours ? ` – ${completionHours}` : ''}
            </p>
          </div>
        )}
        {awards.length > 0 && (
          <div className="rounded-lg border border-white/5 bg-[#1a1a22] p-3">
            <p className="text-[11px] uppercase tracking-wide text-gray-500">
              Awards
            </p>
            <p className="mt-0.5 truncate text-sm font-semibold text-white">
              {awards.length} {awards.length === 1 ? 'honor' : 'honors'}
            </p>
          </div>
        )}
      </div>

      {/* Section navigation */}
      {sections.length > 2 && (
        <nav className="sticky top-16 z-30 -mx-4 mt-6 border-y border-white/5 bg-[#0e0e12]/95 px-4 backdrop-blur sm:-mx-6 sm:px-6">
          <div className="flex gap-1 overflow-x-auto py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {sections.map((s) => (
              <button
                key={s.id}
                onClick={() => jumpTo(s.id)}
                className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  activeSection === s.id
                    ? 'bg-sky-400/15 text-sky-300'
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </nav>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px] overflow-x-hidden">
        {/* Main column */}
        <div className="space-y-6">
          <SectionCard id="about" title="About this game">
            <p className="mt-3 text-sm leading-relaxed text-gray-300">
              {game.about ?? game.short_description}
            </p>
          </SectionCard>

          {/* Reception */}
          {(game.metacritic_score !== null || game.steam_reviews_label) && (
            <SectionCard id="reception" title="Reception" icon={BarChart3}>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 grid-cols-1">
                {game.metacritic_score !== null && (
                  <div className="rounded-lg bg-white/[0.03] p-4">
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-extrabold text-white">
                        {game.metacritic_score}
                      </span>
                      <span className="text-xs text-gray-500">/ 100</span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      Metacritic critic score
                    </p>
                    <div className="mt-3">
                      <ReviewBar score={game.metacritic_score} />
                    </div>
                  </div>
                )}
                {game.steam_reviews_label && (
                  <div className="rounded-lg bg-white/[0.03] p-4">
                    <p className="text-sm font-bold text-sky-300">
                      {game.steam_reviews_label}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      Community review summary
                    </p>
                  </div>
                )}
                {game.player_count && (
                  <div className="rounded-lg bg-white/[0.03] p-4 sm:col-span-2">
                    <p className="text-xs text-gray-500">Player base</p>
                    <p className="mt-1 text-sm font-semibold text-white">
                      {game.player_count}
                    </p>
                  </div>
                )}
              </div>
            </SectionCard>
          )}

          {/* Playtime guide */}
          {(mainHours || completionHours) && (
            <SectionCard
              id="playtime"
              title="How long to beat"
              icon={Clock}
            >
              <div className="mt-4 space-y-4">
                {game.main_story_hours !== null && (
                  <PlaytimeRow
                    label="Main story"
                    hours={game.main_story_hours}
                    max={playtimeMax}
                    tone="bg-sky-400"
                  />
                )}
                {game.completionist_hours !== null && (
                  <PlaytimeRow
                    label="Completionist"
                    hours={game.completionist_hours}
                    max={playtimeMax}
                    tone="bg-emerald-400"
                  />
                )}
              </div>
              <p className="mt-4 text-xs text-gray-500">
                Community-reported averages for a typical playthrough. Actual
                time varies with difficulty, exploration, and play style.
              </p>
            </SectionCard>
          )}

          {/* Trivia */}
          {trivia.length > 0 && (
            <SectionCard
              id="trivia"
              title="Did you know?"
              icon={Lightbulb}
              action={
                <button
                  onClick={() =>
                    setOpenTrivia(
                      allTriviaOpen
                        ? new Set()
                        : new Set(trivia.map((_, i) => i))
                    )
                  }
                  className="text-[11px] font-semibold text-gray-500 transition-colors hover:text-sky-300"
                >
                  {allTriviaOpen ? 'Collapse all' : 'Expand all'}
                </button>
              }
            >
              <div className="mt-4 space-y-2">
                {trivia.map((t, i) => (
                  <TriviaItem
                    key={i}
                    text={t}
                    index={i}
                    open={openTrivia.has(i)}
                    onToggle={() =>
                      setOpenTrivia((prev) => {
                        const next = new Set(prev);
                        if (next.has(i)) next.delete(i);
                        else next.add(i);
                        return next;
                      })
                    }
                  />
                ))}
              </div>
            </SectionCard>
          )}

          {/* Awards */}
          {awards.length > 0 && (
            <SectionCard
              id="awards"
              title={`Awards (${awards.length})`}
              icon={Trophy}
            >
              <ul className="mt-4 space-y-2">
                {awards.map((a) => (
                  <li
                    key={a}
                    className="flex items-start gap-2 text-sm text-gray-300"
                  >
                    <Trophy className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
                    {a}
                  </li>
                ))}
              </ul>
            </SectionCard>
          )}

          <SectionCard id="pricing" title="Availability & pricing">
            <p className="mt-1 text-xs text-gray-500">
              Compare where this game is sold and for how much. Purchases are
              made on the store&apos;s website.
            </p>
            <div className="mt-4 divide-y divide-white/5">
              {prices.map((p) => {
                const discount = discountPercent(p);
                const platform = p.platforms;
                return (
                  <div
                    key={p.id}
                    className="flex items-center gap-4 py-3 first:pt-0 last:pb-0"
                  >
                    <span
                      className="h-8 w-1.5 shrink-0 rounded-full"
                      style={{
                        backgroundColor: platform?.color ?? '#94a3b8',
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white">
                        {platform?.name ?? 'Unknown store'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {discount !== null ? (
                          <span className="font-semibold text-emerald-400">
                            Save {discount}%
                          </span>
                        ) : (
                          'Standard edition'
                        )}
                      </p>
                    </div>
                    <div className="text-right">
                      {p.price === 0 ? (
                        <span className="text-sm font-bold text-emerald-400">
                          Free
                        </span>
                      ) : (
                        <div className="flex items-baseline justify-end gap-2">
                          {discount !== null && p.regular_price !== null && (
                            <span className="text-xs text-gray-500 line-through">
                              {formatPrice(p.regular_price, p.currency)}
                            </span>
                          )}
                          <span
                            className={`text-sm font-bold ${
                              discount !== null ? 'text-emerald-400' : 'text-white'
                            }`}
                          >
                            {formatPrice(p.price, p.currency)}
                          </span>
                        </div>
                      )}
                    </div>
                    {p.store_url && (
                      <a
                        href={p.store_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex shrink-0 items-center gap-1 rounded-md border border-white/10 px-3 py-1.5 text-xs font-semibold text-gray-300 transition-colors hover:border-sky-400/50 hover:text-sky-300"
                      >
                        Visit
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                );
              })}
              {prices.length === 0 && (
                <p className="py-4 text-sm text-gray-500">
                  No store information available for this game yet.
                </p>
              )}
            </div>
          </SectionCard>
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          <div className="overflow-hidden rounded-lg border border-white/5 bg-[#1a1a22]">
            <img
              src={game.box_image ?? game.hero_image ?? ''}
              alt={`${game.title} cover art`}
              className="aspect-[3/4] w-full object-contain"
            />
          </div>

          <SectionCard title="Game info">
            <dl className="mt-4 space-y-3">
              {game.developer && (
                <InfoRow icon={Building2} label="Developer">
                  {game.developer}
                </InfoRow>
              )}
              {game.publisher && game.publisher !== game.developer && (
                <InfoRow icon={Building2} label="Publisher">
                  {game.publisher}
                </InfoRow>
              )}
              {releaseDate && (
                <InfoRow icon={Calendar} label="Release date">
                  {releaseDate}
                </InfoRow>
              )}
              {game.engine && (
                <InfoRow icon={Cpu} label="Engine">
                  {game.engine}
                </InfoRow>
              )}
            </dl>
          </SectionCard>

          {platformsReleased.length > 0 && (
            <SectionCard title="Platforms" icon={MonitorSmartphone}>
              <ul className="mt-3 space-y-1">
                {platformsReleased.map((p) => (
                  <li key={p}>
                    <button
                      onClick={() => onFilterPlatform(p)}
                      className="flex w-full items-center gap-2 rounded px-1 py-1 text-left text-sm text-gray-300 transition-colors hover:bg-white/5 hover:text-white"
                    >
                      <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                      <span className="truncate">{p}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </SectionCard>
          )}

          {gameModes.length > 0 && (
            <SectionCard title="Game modes" icon={Users}>
              <div className="mt-3 flex flex-wrap gap-2">
                {gameModes.map((m) => (
                  <span
                    key={m}
                    className="rounded-full bg-sky-400/10 px-2.5 py-1 text-xs font-medium text-sky-200"
                  >
                    {m}
                  </span>
                ))}
              </div>
            </SectionCard>
          )}

          {features.length > 0 && (
            <SectionCard title="Features" icon={Gamepad2}>
              <ul className="mt-3 space-y-2">
                {features.map((f) => (
                  <li
                    key={f}
                    className="flex items-center gap-2 text-sm text-gray-300"
                  >
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    {f}
                  </li>
                ))}
              </ul>
            </SectionCard>
          )}

          {tags.length > 0 && (
            <SectionCard title="Tags" icon={Tag}>
              <div className="mt-3 flex flex-wrap gap-2">
                {tags.map((t) => (
                  <Chip key={t} label={t} onClick={() => onFilterTag(t)} />
                ))}
              </div>
            </SectionCard>
          )}

          <div className="rounded-lg border border-white/5 bg-[#1a1a22] p-4 text-xs leading-relaxed text-gray-500">
            <p className="flex items-center gap-1.5 font-semibold text-gray-400">
              <BookOpen className="h-3.5 w-3.5" />
              Wiki entry
            </p>
            <p className="mt-1">
              Facts, scores, and playtimes are community-compiled and may vary
              by region, edition, and play style.
            </p>
          </div>
        </aside>
      </div>

      {seriesGames.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-white">
            <Layers className="h-5 w-5 text-sky-400" />
            More in the {game.series} series
          </h2>          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {seriesGames.map((g) => (
              <GameThumb key={g.slug} game={g} onOpen={onOpenGame} />
            ))}
          </div>
        </section>
      )}

      {related.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 text-lg font-bold text-white">More like this</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {related.map((g) => (
              <GameThumb key={g.slug} game={g} onOpen={onOpenGame} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
