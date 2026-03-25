'use client';

import { motion } from 'framer-motion';
import { RANK_COLORS, RANK_THRESHOLDS, type RankName } from '@/types/player';

interface SRBarProps {
  sr: number;
  rank: RankName;
  tier: number;
  animated?: boolean;
  showNumbers?: boolean;
}

function getTierBounds(sr: number, rank: RankName, tier: number): { min: number; max: number } {
  if (rank === 'Iridescent') return { min: 4500, max: 4500 };
  const { min: rankMin, max: rankMax } = RANK_THRESHOLDS[rank];
  const range = rankMax - rankMin + 1;
  const tierSize = Math.floor(range / 3);
  const min = rankMin + (tier - 1) * tierSize;
  const max = tier === 3 ? rankMax : min + tierSize - 1;
  return { min, max };
}

export function SRBar({ sr, rank, tier, animated = true, showNumbers = true }: SRBarProps) {
  const color = RANK_COLORS[rank];
  const isIridescent = rank === 'Iridescent';

  if (isIridescent) {
    return (
      <div className="flex flex-col gap-1">
        {showNumbers && (
          <div className="flex justify-between text-xs text-muted">
            <span>{sr} SR</span>
            <span>MAX</span>
          </div>
        )}
        <div className="h-2 rounded-full bg-rank-iridescent bg-[length:300%_100%] animate-rank-shine" />
      </div>
    );
  }

  const { min, max } = getTierBounds(sr, rank, tier);
  const progress = Math.min(100, Math.max(0, ((sr - min) / (max - min + 1)) * 100));

  return (
    <div className="flex flex-col gap-1">
      {showNumbers && (
        <div className="flex justify-between text-xs text-muted">
          <span style={{ color }}>{sr} SR</span>
          <span>{max} SR</span>
        </div>
      )}
      <div
        className="h-2 rounded-full overflow-hidden"
        style={{ backgroundColor: `${color}22` }}
      >
        <motion.div
          className="h-full rounded-full"
          style={{
            backgroundColor: color,
            boxShadow: `0 0 8px ${color}99`,
          }}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={animated ? { duration: 0.8, ease: 'easeOut' } : { duration: 0 }}
        />
      </div>
    </div>
  );
}
