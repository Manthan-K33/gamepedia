import {
  Bot,
  CloudSun,
  Crosshair,
  Crown,
  Hourglass,
  Layers,
  Mountain,
  Rocket,
  Shield,
  Sprout,
  Sword,
  VenetianMask,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import type { Game } from '@/lib/types';

interface CoverStyle {
  icon: LucideIcon;
  from: string;
  via: string;
  to: string;
  accent: string;
}

const COVER_STYLES: Record<string, CoverStyle> = {
  aetherfall: {
    icon: Mountain,
    from: '#0c1b2a',
    via: '#123a4f',
    to: '#0e7490',
    accent: '#67e8f9',
  },
  'battle-harbor': {
    icon: Crosshair,
    from: '#1c0f0a',
    via: '#7c2d12',
    to: '#ea580c',
    accent: '#fdba74',
  },
  'starfield-colony': {
    icon: Rocket,
    from: '#050a18',
    via: '#0c2461',
    to: '#1d4ed8',
    accent: '#93c5fd',
  },
  'grimm-tales': {
    icon: Layers,
    from: '#1c1408',
    via: '#713f12',
    to: '#b45309',
    accent: '#fcd34d',
  },
  'hollow-crown': {
    icon: Crown,
    from: '#140608',
    via: '#701a1a',
    to: '#3f0d0d',
    accent: '#f87171',
  },
  'horizon-zero-frontier': {
    icon: CloudSun,
    from: '#1a1206',
    via: '#854d0e',
    to: '#ca8a04',
    accent: '#fde68a',
  },
  'iron-tide': {
    icon: Shield,
    from: '#10120c',
    via: '#3f4a1f',
    to: '#6b7c2e',
    accent: '#d9f99d',
  },
  'mech-bastion': {
    icon: Bot,
    from: '#0a0d0f',
    via: '#1f3a3d',
    to: '#0f766e',
    accent: '#5eead4',
  },
  'neon-drift-2099': {
    icon: Zap,
    from: '#050d14',
    via: '#0e4f6e',
    to: '#06b6d4',
    accent: '#67e8f9',
  },
  'quantum-break-paradox': {
    icon: Hourglass,
    from: '#071310',
    via: '#065f46',
    to: '#10b981',
    accent: '#6ee7b7',
  },
  'shadow-syndicate': {
    icon: VenetianMask,
    from: '#0d0d0f',
    via: '#292524',
    to: '#57534e',
    accent: '#fbbf24',
  },
  'verdant-hollow': {
    icon: Sprout,
    from: '#0a1408',
    via: '#14532d',
    to: '#4ade80',
    accent: '#bbf7d0',
  },
};

const FALLBACK_STYLES: CoverStyle[] = [
  { icon: Sword, from: '#0f172a', via: '#1e3a5f', to: '#38bdf8', accent: '#7dd3fc' },
  { icon: Shield, from: '#1a1206', via: '#78350f', to: '#d97706', accent: '#fcd34d' },
  { icon: Crosshair, from: '#140608', via: '#7f1d1d', to: '#ef4444', accent: '#fca5a5' },
  { icon: Sprout, from: '#071310', via: '#14532d', to: '#22c55e', accent: '#86efac' },
];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export function getCoverStyle(slug: string): CoverStyle {
  if (COVER_STYLES[slug]) return COVER_STYLES[slug];
  return FALLBACK_STYLES[hashString(slug) % FALLBACK_STYLES.length];
}

interface GameCoverProps {
  game: Game;
  variant?: 'box' | 'hero';
  className?: string;
}

export default function GameCover({
  game,
  variant = 'box',
  className = '',
}: GameCoverProps) {
  const style = getCoverStyle(game.slug);
  const Icon = style.icon;
  const hero = variant === 'hero';

  return (
    <div
      className={`relative flex h-full w-full items-center justify-center overflow-hidden ${className}`}
      style={{
        background: `linear-gradient(135deg, ${style.from} 0%, ${style.via} 55%, ${style.to} 100%)`,
      }}
      role="img"
      aria-label={`${game.title} cover art`}
    >
      {/* Grid pattern */}
      <svg
        className="absolute inset-0 h-full w-full opacity-[0.12]"
        aria-hidden="true"
      >
        <defs>
          <pattern id={`grid-${game.slug}`} width="36" height="36" patternUnits="userSpaceOnUse">
            <path
              d="M 36 0 L 0 0 0 36"
              fill="none"
              stroke="white"
              strokeWidth="0.6"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#grid-${game.slug})`} />
      </svg>

      {/* Radial glow behind icon */}
      <div
        className="absolute rounded-full blur-3xl"
        style={{
          backgroundColor: style.accent,
          opacity: 0.25,
          width: hero ? '55%' : '80%',
          aspectRatio: '1',
        }}
      />

      {/* Icon */}
      <Icon
        className={hero ? 'relative h-28 w-28 sm:h-36 sm:w-36' : 'relative h-16 w-16'}
        strokeWidth={1.2}
        style={{ color: style.accent, filter: `drop-shadow(0 0 18px ${style.accent})` }}
      />

      {/* Bottom gradient + title (hero only; cards draw their own title) */}
      {hero && (
        <>
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <p
            className="absolute bottom-0 right-0 select-none p-6 font-extrabold uppercase leading-none tracking-tight opacity-[0.08] sm:p-10"
            style={{ fontSize: hero ? 'clamp(3rem, 12vw, 9rem)' : undefined }}
          >
            {game.title}
          </p>
        </>
      )}
    </div>
  );
}
