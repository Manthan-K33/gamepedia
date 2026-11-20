import { useState } from 'react';
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
  Clock,
  BarChart3,
} from 'lucide-react';
import type { Game } from '@/lib/types';
import { discountPercent, formatPrice } from '@/lib/games';

interface GameDetailProps {
  game: Game;
  related: Game[];
  onOpenGame: (slug: string) => void;
  onBack: () => void;
}

function formatHours(h: number | null): string | null {
  if (h === null) return null;
  if (h === 0) return null;
  if (h < 1) return `${Math.round(h * 60)} min`;
  return `${Math.round(h)} hours`;
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
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon?: typeof Building2;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-white/5 bg-[#1a1a22] p-5">
      <h2 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-400">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {title}
      </h2>
      {children}
    </section>
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

function TriviaItem({ text, index }: { text: string; index: number }) {
  const [open, setOpen] = useState(index === 0);
  return (
    <div className="overflow-hidden rounded-lg border border-white/5 bg-white/[0.03]">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.04]"
        aria-expanded={open}
      >
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-400/10 text-xs font-bold text-sky-300">
          {index + 1}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-200">
          {text.split('.')[0]}.
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

export default function GameDetail({
  game,
  related,
  onOpenGame,
  onBack,
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

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <button
        onClick={onBack}
        className="mb-4 text-sm font-semibold text-gray-400 transition-colors hover:text-white"
      >
        &larr; Back
      </button>

      {/* Hero banner */}
      <section className="relative overflow-hidden rounded-xl border border-white/5">
        <img
          src={game.hero_image ?? ''}
          alt={game.title}
          className="h-[300px] w-full object-cover object-top sm:h-[380px]"
        />
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
            <span>{game.genres.join(' • ')}</span>
          </div>
        </div>
      </section>

      {/* Quick facts strip */}
      {(game.esrb_rating || game.series || mainHours) && (
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
          {mainHours && (
            <div className="rounded-lg border border-white/5 bg-[#1a1a22] p-3">
              <p className="text-[11px] uppercase tracking-wide text-gray-500">
                Main story
              </p>
              <p className="mt-0.5 truncate text-sm font-semibold text-white">
                ~{mainHours}
              </p>
            </div>
          )}
          {completionHours && (
            <div className="rounded-lg border border-white/5 bg-[#1a1a22] p-3">
              <p className="text-[11px] uppercase tracking-wide text-gray-500">
                Completionist
              </p>
              <p className="mt-0.5 truncate text-sm font-semibold text-white">
                ~{completionHours}
              </p>
            </div>
          )}
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Main column */}
        <div className="space-y-6">
          <SectionCard title="About this game">
            <p className="mt-3 text-sm leading-relaxed text-gray-300">
              {game.about ?? game.short_description}
            </p>
          </SectionCard>

          {/* Reception */}
          {(game.metacritic_score !== null || game.steam_reviews_label) && (
            <SectionCard title="Reception" icon={BarChart3}>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
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

          {/* Trivia */}
          {game.trivia && game.trivia.length > 0 && (
            <SectionCard title="Did you know?" icon={Lightbulb}>
              <div className="mt-4 space-y-2">
                {game.trivia.map((t, i) => (
                  <TriviaItem key={i} text={t} index={i} />
                ))}
              </div>
            </SectionCard>
          )}

          {/* Awards */}
          {game.awards && game.awards.length > 0 && (
            <SectionCard title="Awards" icon={Trophy}>
              <ul className="mt-4 space-y-2">
                {game.awards.map((a) => (
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

          <SectionCard title="Availability & pricing">
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
              src={game.box_image ?? ''}
              alt={`${game.title} cover art`}
              className="aspect-[3/4] w-full object-cover object-top"
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

          {game.platforms_released && game.platforms_released.length > 0 && (
            <SectionCard title="Platforms" icon={MonitorSmartphone}>
              <ul className="mt-3 space-y-2">
                {game.platforms_released.map((p) => (
                  <li
                    key={p}
                    className="flex items-center gap-2 text-sm text-gray-300"
                  >
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    {p}
                  </li>
                ))}
              </ul>
            </SectionCard>
          )}

          {game.game_modes && game.game_modes.length > 0 && (
            <SectionCard title="Game modes" icon={Users}>
              <div className="mt-3 flex flex-wrap gap-2">
                {game.game_modes.map((m) => (
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

          {game.features.length > 0 && (
            <SectionCard title="Features" icon={Gamepad2}>
              <ul className="mt-3 space-y-2">
                {game.features.map((f) => (
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

          <SectionCard title="Tags" icon={Tag}>
            <div className="mt-3 flex flex-wrap gap-2">
              {game.tags.map((t) => (
                <span
                  key={t}
                  className="rounded-full bg-white/5 px-2.5 py-1 text-xs text-gray-300"
                >
                  {t}
                </span>
              ))}
            </div>
          </SectionCard>

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

      {related.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 text-lg font-bold text-white">More like this</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {related.map((g) => (
              <button
                key={g.slug}
                onClick={() => onOpenGame(g.slug)}
                className="group overflow-hidden rounded-lg border border-white/5 bg-[#1a1a22] text-left transition-all hover:border-sky-400/40"
              >
                <img
                  src={g.box_image ?? ''}
                  alt={`${g.title} cover art`}
                  loading="lazy"
                  className="aspect-[3/4] w-full object-cover object-top"
                />
                <div className="p-2.5">
                  <p className="truncate text-sm font-semibold text-white">
                    {g.title}
                  </p>
                  <p className="truncate text-xs text-gray-500">
                    {g.genres.slice(0, 2).join(' • ')}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
