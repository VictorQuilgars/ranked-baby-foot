'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { RANK_COLORS, formatRankLabel, type RankName } from '@/types/player';

interface RankBadgeProps {
  rank: RankName;
  tier: number;
  isPlacement?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'hero';
  showLabel?: boolean;
  animated?: boolean;
  className?: string;
}

const SIZE_CONFIG = {
  sm:   { badge: 'w-9 h-9 text-base',    glow: '12px', label: 'text-xs' },
  md:   { badge: 'w-14 h-14 text-xl',    glow: '18px', label: 'text-sm' },
  lg:   { badge: 'w-20 h-20 text-3xl',   glow: '24px', label: 'text-base' },
  xl:   { badge: 'w-28 h-28 text-5xl',   glow: '36px', label: 'text-lg' },
  hero: { badge: 'w-56 h-56 text-8xl',   glow: '60px', label: 'text-xl' },
};

const RANK_EMBLEMS: Record<RankName, string> = {
  Bronze:     '🥉',
  Silver:     '🥈',
  Gold:       '🥇',
  Platinum:   '💠',
  Diamond:    '💎',
  Crimson:    '🔴',
  Iridescent: '✨',
};

// Images générées — null = fallback emoji
const RANK_IMAGES: Partial<Record<RankName, Record<number, string>>> = {
  Bronze: { 1: '/ranks/bronze-1.png', 2: '/ranks/bronze-2.png', 3: '/ranks/bronze-3.png' },
  Silver: { 1: '/ranks/silver-1.png', 2: '/ranks/silver-2.png', 3: '/ranks/silver-3.png' },
  Gold:   { 1: '/ranks/gold-1.png',   2: '/ranks/gold-2.png',   3: '/ranks/gold-3.png'   },
};

export function RankBadge({
  rank,
  tier,
  isPlacement = false,
  size = 'md',
  showLabel = true,
  animated = true,
  className,
}: RankBadgeProps) {
  const color = RANK_COLORS[rank];
  const { badge, glow, label } = SIZE_CONFIG[size];
  const isIridescent = rank === 'Iridescent';
  const imageUrl = !isPlacement ? RANK_IMAGES[rank]?.[tier] : undefined;

  return (
    <div className={cn('flex flex-col items-center gap-1', className)}>
      <motion.div
        className={cn(
          badge,
          'relative flex items-center justify-center font-black select-none overflow-hidden',
          imageUrl ? 'rounded-none bg-transparent' : 'rounded-2xl',
          isIridescent && !imageUrl && 'bg-rank-iridescent bg-[length:300%_300%]',
        )}
        style={
          imageUrl
            ? undefined // Pas de style inline — l'image parle seule
            : isIridescent
              ? { animation: 'rank-shine 3s ease infinite' }
              : {
                  background: `radial-gradient(circle at 35% 30%, ${color}66, ${color}18 70%)`,
                  border: `3px solid ${color}`,
                  boxShadow: `0 0 ${glow} ${color}77, inset 0 1px 0 ${color}99, 0 4px 12px rgba(0,0,0,0.4)`,
                }
        }
        animate={animated && !imageUrl && !isIridescent ? {
          boxShadow: [
            `0 0 ${glow} ${color}55, inset 0 1px 0 ${color}88, 0 4px 12px rgba(0,0,0,0.4)`,
            `0 0 ${glow} ${color}cc, inset 0 1px 0 ${color}aa, 0 4px 12px rgba(0,0,0,0.4)`,
            `0 0 ${glow} ${color}55, inset 0 1px 0 ${color}88, 0 4px 12px rgba(0,0,0,0.4)`,
          ],
        } : undefined}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      >
        {imageUrl ? (
          <>
            <img
              src={imageUrl}
              alt={`${rank} ${tier}`}
              className="absolute inset-0 w-full h-full object-contain"
            />
            {/* Vignette circulaire intérieure */}
            <div
              className="absolute inset-0"
              style={{
                background: 'radial-gradient(circle at center, transparent 42%, rgba(0,0,0,0.88) 100%)',
              }}
            />
          </>
        ) : (
          <>
            <span role="img" aria-label={rank}>
              {isPlacement ? '?' : RANK_EMBLEMS[rank]}
            </span>
            {!isIridescent && (
              <span
                className="absolute top-1 left-1/2 -translate-x-1/2 rounded-full"
                style={{
                  width: '45%',
                  height: '18%',
                  background: `linear-gradient(180deg, ${color}88 0%, transparent 100%)`,
                  filter: 'blur(2px)',
                }}
              />
            )}
          </>
        )}

        {/* Tier badge (I/II/III) */}
        {!isIridescent && !isPlacement && !imageUrl && (
          <span
            className="absolute -bottom-1.5 -right-1.5 text-[10px] font-black px-1.5 py-0.5 rounded-lg leading-none z-10"
            style={{
              background: `linear-gradient(135deg, ${color}, ${color}cc)`,
              color: '#1a1a2e',
              boxShadow: `0 2px 0 ${color}66`,
            }}
          >
            {['I', 'II', 'III'][tier - 1]}
          </span>
        )}
      </motion.div>

      {showLabel && (
        <span
          className={cn(label, 'font-bold tracking-wide')}
          style={isIridescent ? { backgroundImage: 'linear-gradient(135deg, #ff0080, #ff8c00, #7b2fff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' } : { color }}
        >
          {isPlacement ? 'En placement' : formatRankLabel(rank, tier)}
        </span>
      )}
    </div>
  );
}
