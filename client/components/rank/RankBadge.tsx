'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { RANK_COLORS, formatRankLabel, type RankName } from '@/types/player';

interface RankBadgeProps {
  rank: RankName;
  tier: number;
  isPlacement?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showLabel?: boolean;
  animated?: boolean;
  className?: string;
}

const SIZE_CONFIG = {
  sm:  { badge: 'w-8 h-8 text-xs',   glow: '10px', label: 'text-xs' },
  md:  { badge: 'w-12 h-12 text-sm',  glow: '15px', label: 'text-sm' },
  lg:  { badge: 'w-16 h-16 text-base',glow: '20px', label: 'text-base' },
  xl:  { badge: 'w-24 h-24 text-xl',  glow: '30px', label: 'text-lg' },
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

  return (
    <div className={cn('flex flex-col items-center gap-1', className)}>
      <motion.div
        className={cn(
          badge,
          'relative flex items-center justify-center rounded-xl font-black select-none',
          isIridescent && 'bg-rank-iridescent bg-[length:300%_300%]',
        )}
        style={
          isIridescent
            ? { animation: 'rank-shine 3s ease infinite' }
            : {
                backgroundColor: `${color}22`,
                border: `2px solid ${color}`,
                boxShadow: `0 0 ${glow} ${color}66`,
              }
        }
        animate={animated && !isIridescent ? {
          boxShadow: [
            `0 0 ${glow} ${color}44`,
            `0 0 ${glow} ${color}99`,
            `0 0 ${glow} ${color}44`,
          ],
        } : undefined}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <span role="img" aria-label={rank}>
          {isPlacement ? '?' : RANK_EMBLEMS[rank]}
        </span>

        {/* Tier badge (I/II/III) */}
        {!isIridescent && !isPlacement && (
          <span
            className="absolute -bottom-1 -right-1 text-[10px] font-black px-1 rounded-md leading-none"
            style={{ backgroundColor: color, color: '#1a1a2e' }}
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
