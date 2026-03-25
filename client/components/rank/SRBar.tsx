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
      <div className="flex flex-col gap-1.5">
        {showNumbers && (
          <div className="flex justify-between text-xs font-bold">
            <span style={{ background: 'linear-gradient(135deg, #ff0080, #ff8c00)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {sr} SR
            </span>
            <span className="text-muted">MAX</span>
          </div>
        )}
        <div
          className="h-3 rounded-full bg-rank-iridescent bg-[length:300%_100%] animate-rank-shine relative overflow-hidden"
          style={{ boxShadow: '0 0 10px rgba(255,0,255,0.5), inset 0 2px 4px rgba(0,0,0,0.3)' }}
        >
          <div className="shimmer-overlay" />
        </div>
      </div>
    );
  }

  const { min, max } = getTierBounds(sr, rank, tier);
  const progress = Math.min(100, Math.max(0, ((sr - min) / (max - min + 1)) * 100));

  return (
    <div className="flex flex-col gap-1.5">
      {showNumbers && (
        <div className="flex justify-between text-xs font-bold">
          <span style={{ color }}>{sr} SR</span>
          <span className="text-muted">{max} SR</span>
        </div>
      )}
      <div
        className="h-3 rounded-full overflow-hidden"
        style={{
          backgroundColor: `${color}20`,
          boxShadow: 'inset 0 2px 5px rgba(0,0,0,0.5)',
        }}
      >
        <motion.div
          className="h-full rounded-full relative overflow-hidden"
          style={{
            background: `linear-gradient(90deg, ${color}bb, ${color}, ${color}dd)`,
            boxShadow: `0 0 10px ${color}bb`,
          }}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={animated ? { duration: 0.8, ease: 'easeOut' } : { duration: 0 }}
        >
          <div className="shimmer-overlay" />
        </motion.div>
      </div>
    </div>
  );
}
