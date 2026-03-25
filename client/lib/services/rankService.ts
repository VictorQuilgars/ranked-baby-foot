export type RankName = 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond' | 'Crimson' | 'Iridescent';

const RANK_ORDER: RankName[] = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Crimson', 'Iridescent'];

const RANK_THRESHOLDS: Record<RankName, { min: number; max: number }> = {
  Bronze:     { min: 0,    max: 299 },
  Silver:     { min: 300,  max: 699 },
  Gold:       { min: 700,  max: 1199 },
  Platinum:   { min: 1200, max: 1999 },
  Diamond:    { min: 2000, max: 2999 },
  Crimson:    { min: 3000, max: 4499 },
  Iridescent: { min: 4500, max: Infinity },
};

export interface PlayerMatchData {
  playerId: string;
  team: 'A' | 'B';
  position: 'attacker' | 'goalkeeper';
  goalsScored: number;
  currentSR: number;
  currentRank: RankName;
  currentTier: number;
  hiddenMmr: number;
  placementMatchesLeft: number;
  rankShield: number;
  dailyLossForgiven: boolean;
}

export interface SRChange {
  playerId: string;
  delta: number;
  newSR: number;
  newRank: RankName;
  newTier: number;
  newHiddenMmr: number;
  isMvp: boolean;
  rankUp: boolean;
  rankDown: boolean;
  shieldUsed: boolean;
  lossForgivenUsed: boolean;
}

export function getRankValue(rank: RankName, tier: number): number {
  const index = RANK_ORDER.indexOf(rank);
  if (rank === 'Iridescent') return 20;
  return index * 3 + (tier - 1);
}

export function getRankFromSR(sr: number): { rank: RankName; tier: number } {
  for (const [name, { min, max }] of Object.entries(RANK_THRESHOLDS) as [RankName, { min: number; max: number }][]) {
    if (sr >= min && sr <= max) {
      if (name === 'Iridescent') return { rank: 'Iridescent', tier: 1 };
      const range = max - min + 1;
      const tierSize = Math.floor(range / 3);
      const offset = sr - min;
      const tier = Math.min(3, Math.floor(offset / tierSize) + 1);
      return { rank: name, tier };
    }
  }
  return { rank: 'Bronze', tier: 1 };
}

function getOpponentModifier(rankDiff: number, won: boolean): number {
  if (won) {
    if (rankDiff >= 6)  return 1.5;
    if (rankDiff >= 3)  return 1.25;
    if (rankDiff >= -2) return 1.0;
    if (rankDiff >= -5) return 0.85;
    return 0.7;
  } else {
    if (rankDiff >= 6)  return 0.5;
    if (rankDiff >= 3)  return 0.75;
    if (rankDiff >= -2) return 1.0;
    if (rankDiff >= -5) return 1.1;
    return 1.25;
  }
}

function getGoalDiffModifier(goalDiff: number, won: boolean): number {
  if (won) {
    if (goalDiff <= 2) return 1.1;
    if (goalDiff <= 4) return 1.0;
    if (goalDiff <= 6) return 0.95;
    return 0.85;
  } else {
    if (goalDiff <= 2) return 0.9;
    if (goalDiff <= 4) return 1.0;
    if (goalDiff <= 6) return 1.05;
    return 1.15;
  }
}

function getHprModifier(hiddenMmr: number, currentSR: number, isPlacement: boolean): number {
  if (isPlacement) return 2.5;
  const gap = hiddenMmr - currentSR;
  if (gap > 400) return 2.0;
  if (gap > 200) return 1.5;
  if (gap > 50)  return 1.2;
  if (gap > -50) return 1.0;
  return 0.8;
}

function updateHiddenMmr(currentMmr: number, won: boolean, isDraw: boolean, opponentAvgRankValue: number): number {
  const base = isDraw ? 10 : won ? 40 : -30;
  const opponentFactor = Math.min(2.0, Math.max(0.5, opponentAvgRankValue / 10));
  const delta = Math.round(base * opponentFactor);
  return Math.max(0, currentMmr + delta);
}

export function calculateSRChanges(
  players: PlayerMatchData[],
  scoreA: number,
  scoreB: number,
  winnerTeam: 'A' | 'B' | 'draw'
): SRChange[] {
  const goalDiff = Math.abs(scoreA - scoreB);
  const teamAPlayers = players.filter(p => p.team === 'A');
  const teamBPlayers = players.filter(p => p.team === 'B');

  const avgRankValue = (team: PlayerMatchData[]) =>
    team.reduce((sum, p) => sum + getRankValue(p.currentRank, p.currentTier), 0) / team.length;

  const avgA = avgRankValue(teamAPlayers);
  const avgB = avgRankValue(teamBPlayers);

  let mvpPlayerId: string | null = null;
  if (winnerTeam !== 'draw') {
    const winners = players.filter(p => p.team === winnerTeam);
    const mvpScores = winners.map(p => ({
      playerId: p.playerId,
      score: p.goalsScored * (p.position === 'goalkeeper' ? 2 : 1),
    }));
    mvpScores.sort((a, b) => b.score - a.score);
    if (mvpScores.length > 0 && mvpScores[0].score > 0) {
      mvpPlayerId = mvpScores[0].playerId;
    }
  }

  return players.map(player => {
    const won = winnerTeam !== 'draw' && player.team === winnerTeam;
    const isDraw = winnerTeam === 'draw';
    const isMvp = player.playerId === mvpPlayerId;
    const isPlacement = player.placementMatchesLeft > 0;

    const srBase = isDraw ? 5 : won ? 25 : -20;
    const opponentAvgRank = player.team === 'A' ? avgB : avgA;
    const myTeamAvgRank = player.team === 'A' ? avgA : avgB;
    const rankDiff = opponentAvgRank - myTeamAvgRank;

    const modOpponent = getOpponentModifier(rankDiff, won);
    const modGoalDiff = isDraw ? 1.0 : getGoalDiffModifier(goalDiff, won);
    const modMvp = isMvp ? 1.3 : 1.0;
    const modHpr = getHprModifier(player.hiddenMmr, player.currentSR, isPlacement);

    let delta = Math.round(srBase * modHpr * modOpponent * modMvp * modGoalDiff);
    delta = Math.max(-35, Math.min(50, delta));

    let lossForgivenUsed = false;
    if (delta < 0 && !player.dailyLossForgiven) {
      delta = 0;
      lossForgivenUsed = true;
    }

    let shieldUsed = false;
    if (delta < 0 && player.rankShield > 0) {
      delta = 0;
      shieldUsed = true;
    }

    const newSR = Math.max(0, player.currentSR + delta);
    const { rank: newRank, tier: newTier } = getRankFromSR(newSR);
    const newHiddenMmr = updateHiddenMmr(player.hiddenMmr, won, isDraw, opponentAvgRank);

    const rankUp = RANK_ORDER.indexOf(newRank) > RANK_ORDER.indexOf(player.currentRank);
    const rankDown = RANK_ORDER.indexOf(newRank) < RANK_ORDER.indexOf(player.currentRank);

    return { playerId: player.playerId, delta, newSR, newRank, newTier, newHiddenMmr, isMvp, rankUp, rankDown, shieldUsed, lossForgivenUsed };
  });
}
