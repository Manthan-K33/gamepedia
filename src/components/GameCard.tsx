import { useState, useEffect } from 'react';
import { Heart, Star, Tag } from 'lucide-react';
import type { Game } from '@/lib/types';
import { bestDeal, discountPercent, formatPrice } from '@/lib/games';
import GameCover from '@/components/GameCover';

interface GameCardProps {
  game: Game;
  onOpen: (slug: string) => void;
}

export default function GameCard({ game, onOpen }: GameCardProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const [landscapeArt, setLandscapeArt] = useState(false);

  const cover = game.box_image ?? game.hero_image ?? '';
  const [wishlisted, setWishlisted] = useState(() => {
    try {
      return JSON.parse(
        localStorage.getItem(`wishlist-${game.slug}`) ?? 'false'
      );
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      setWishlisted(
        JSON.parse(localStorage.getItem(`wishlist-${game.slug}`) ?? 'false')
      );
    } catch {
      setWishlisted(false);
    }
  }, [game.slug]);

  const toggleWishlist = () => {
    const next = !wishlisted;
    setWishlisted(next);
    try {
      localStorage.setItem(`wishlist-${game.slug}`, JSON.stringify(next));
    } catch {
      // Storage can be unavailable (private mode); keep the in-memory state.
    }
  };

  const deal = bestDeal(game);
  const discount = deal ? discountPercent(deal) : null;
  const platformCount = game.game_prices.length;

  return (
    <div
      onClick={() => onOpen(game.slug)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(game.slug);
        }
      }}
      className="group cursor-pointer overflow-hidden rounded-lg border border-white/5 bg-[#1a1a22] transition-all duration-200 hover:-translate-y-1 hover:border-sky-400/40 hover:shadow-lg hover:shadow-sky-500/10"
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-[#14141b]">
        {!cover || imageFailed ? (
          <GameCover game={game} />
        ) : landscapeArt ? (
          // Wide logo art (Fortnite, Minecraft) is a title card, not a poster:
          // show the whole logo on a light panel instead of cropping it.
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#dfe7f3] via-[#f3f6fb] to-[#c9d5e8] p-5">
            <img
              src={cover}
              alt={`${game.title} logo`}
              loading="lazy"
              className="max-h-[42%] w-[88%] object-contain drop-shadow-sm"
              onError={() => setImageFailed(true)}
            />
          </div>
        ) : (
          <img
            src={cover}
            alt={`${game.title} cover art`}
            loading="lazy"
            onLoad={(event) => {
              const { naturalWidth, naturalHeight } = event.currentTarget;
              if (naturalHeight > 0 && naturalWidth / naturalHeight > 1.15) {
                setLandscapeArt(true);
              }
            }}
            onError={() => setImageFailed(true)}
            className="h-full w-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a22] via-transparent to-transparent" />
        {discount !== null && (
          <span className="absolute left-2 top-2 rounded bg-emerald-400 px-1.5 py-0.5 text-xs font-bold text-emerald-950">
            -{discount}%
          </span>
        )}
        {game.featured && (
          <span className="absolute right-2 top-2 rounded bg-amber-500/90 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-black">
            Featured
          </span>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleWishlist();
          }}
          aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          className={`absolute bottom-2 right-2 rounded-full p-1.5 backdrop-blur transition-colors ${
            wishlisted
              ? 'bg-rose-500 text-white'
              : 'bg-black/50 text-gray-300 hover:bg-black/70 hover:text-white'
          }`}
        >
          <Heart className="h-4 w-4" fill={wishlisted ? 'currentColor' : 'none'} />
        </button>
      </div>

      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-1 text-sm font-semibold text-white">
            <a
              href={`#/game/${game.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-block py-0.5 underline underline-offset-2 hover:text-sky-400"
            >
              {game.title}
            </a>
          </h3>
          {game.rating !== null && (
            <span className="flex shrink-0 items-center gap-1 rounded bg-amber-500/15 px-1.5 py-0.5 text-xs font-semibold text-amber-400">
              <Star className="h-3 w-3" fill="currentColor" />
              {Number(game.rating).toFixed(0)}
            </span>
          )}
        </div>
        <p className="mt-1 line-clamp-1 text-xs text-gray-400">
          {game.genres.slice(0, 3).join(' • ')}
        </p>
        <div className="mt-2 flex items-center justify-between">
          {deal ? (
            <div className="flex items-baseline gap-1.5">
              {discount !== null && deal.regular_price !== null && (
                <span className="text-xs text-gray-400 line-through">
                  {formatPrice(deal.regular_price)}
                </span>
              )}
              <span className="text-sm font-bold text-white">
                {formatPrice(deal.price, deal.currency)}
              </span>
            </div>
          ) : (
            <span className="text-sm font-bold text-white">Free</span>
          )}
          <span className="flex items-center gap-1 text-[11px] text-gray-400">
            <Tag className="h-3 w-3" />
            {platformCount} store{platformCount !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
    </div>
  );
}
