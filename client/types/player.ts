export type RankName = 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond' | 'Crimson' | 'Iridescent';

export interface Player {
  id: string;
  username: string;
  avatarUrl: string | null;
  rankPoints: number;
  rank: RankName;
  rankTier: number; // 1, 2, 3 (Iridescent = toujours 1)
  placementMatchesLeft: number;
  preferredPosition: 'attacker' | 'goalkeeper' | 'both';
  totalGames: number;
  wins: number;
  losses: number;
  goalsScored: number;
  mvpCount: number;
  rankShield: number;
  createdAt: string;
  updatedAt: string;
}

export interface PublicPlayer
  extends Pick<Player, 'id' | 'username' | 'avatarUrl' | 'rank' | 'rankTier' | 'placementMatchesLeft' | 'totalGames' | 'wins' | 'losses' | 'goalsScored' | 'mvpCount' | 'createdAt'> {}

export const RANK_COLORS: Record<RankName, string> = {
  Bronze: '#cd7f32',
  Silver: '#c0c0c0',
  Gold: '#ffd700',
  Platinum: '#00b4d8',
  Diamond: '#7b2fff',
  Crimson: '#dc143c',
  Iridescent: '#ff00ff',
};

export const RANK_THRESHOLDS: Record<RankName, { min: number; max: number }> = {
  Bronze:     { min: 0,    max: 299 },
  Silver:     { min: 300,  max: 699 },
  Gold:       { min: 700,  max: 1199 },
  Platinum:   { min: 1200, max: 1999 },
  Diamond:    { min: 2000, max: 2999 },
  Crimson:    { min: 3000, max: 4499 },
  Iridescent: { min: 4500, max: Infinity },
};

export function getRankProgress(sr: number, rank: RankName, tier: number): number {
  if (rank === 'Iridescent') return 100;
  const { min, max } = RANK_THRESHOLDS[rank];
  const range = max - min + 1;
  const tierSize = Math.floor(range / 3);
  const tierMin = min + (tier - 1) * tierSize;
  const tierMax = tier === 3 ? max : tierMin + tierSize - 1;
  return Math.round(((sr - tierMin) / (tierMax - tierMin + 1)) * 100);
}

export function formatRankLabel(rank: RankName, tier: number): string {
  if (rank === 'Iridescent') return 'Iridescent';
  const tierLabels = ['I', 'II', 'III'];
  return `${rank} ${tierLabels[tier - 1]}`;
}
