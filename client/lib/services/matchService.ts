import { createAdminClient } from '@/lib/supabase/server';
import { calculateSRChanges, type PlayerMatchData, type RankName } from './rankService';

/**
 * Calcule et applique les changements de SR après la fin d'un match.
 * À appeler une seule fois par match, après que le status soit 'finished'.
 */
export async function finalizeSRCalculation(matchId: string, winnerTeam: string) {
  const supabase = createAdminClient();

  const { data: matchPlayers } = await supabase
    .from('match_players')
    .select('player_id, team, position, goals_scored, players (rank_points, rank, rank_tier, hidden_mmr, placement_matches_left, rank_shield, daily_loss_forgiven, total_games, wins, losses)')
    .eq('match_id', matchId);

  if (!matchPlayers || matchPlayers.length === 0) return;

  const { data: match } = await supabase
    .from('matches')
    .select('score_team_a, score_team_b')
    .eq('id', matchId)
    .single();

  if (!match) return;

  const players: PlayerMatchData[] = matchPlayers.map((mp: Record<string, unknown>) => {
    const p = mp.players as Record<string, unknown>;
    return {
      playerId:             mp.player_id as string,
      team:                 mp.team as 'A' | 'B',
      position:             mp.position as 'attacker' | 'goalkeeper',
      goalsScored:          mp.goals_scored as number,
      currentSR:            p.rank_points as number,
      currentRank:          p.rank as RankName,
      currentTier:          p.rank_tier as number,
      hiddenMmr:            p.hidden_mmr as number,
      placementMatchesLeft: p.placement_matches_left as number,
      rankShield:           p.rank_shield as number,
      dailyLossForgiven:    p.daily_loss_forgiven as boolean,
    };
  });

  const statsMap = new Map(
    matchPlayers.map((mp: Record<string, unknown>) => {
      const p = mp.players as Record<string, unknown>;
      return [mp.player_id as string, {
        totalGames: (p.total_games as number) ?? 0,
        wins:       (p.wins as number)        ?? 0,
        losses:     (p.losses as number)      ?? 0,
      }];
    })
  );

  const srChanges = calculateSRChanges(
    players,
    match.score_team_a,
    match.score_team_b,
    winnerTeam as 'A' | 'B' | 'draw',
  );

  await Promise.all(srChanges.map(async (change) => {
    const player = players.find((p) => p.playerId === change.playerId)!;
    const stats  = statsMap.get(change.playerId) ?? { totalGames: 0, wins: 0, losses: 0 };
    const won    = winnerTeam !== 'draw' && player.team === winnerTeam;
    const lost   = winnerTeam !== 'draw' && player.team !== winnerTeam;

    const newPlacementLeft = Math.max(0, player.placementMatchesLeft - 1);
    const newShield = change.rankUp
      ? 3
      : change.shieldUsed
        ? Math.max(0, player.rankShield - 1)
        : player.rankShield;

    await supabase.from('players').update({
      rank_points:            change.newSR,
      rank:                   newPlacementLeft > 0 ? player.currentRank : change.newRank,
      rank_tier:              newPlacementLeft > 0 ? player.currentTier : change.newTier,
      hidden_mmr:             change.newHiddenMmr,
      placement_matches_left: newPlacementLeft,
      rank_shield:            newShield,
      daily_loss_forgiven:    change.lossForgivenUsed ? true : player.dailyLossForgiven,
      total_games:            stats.totalGames + 1,
      wins:                   won  ? stats.wins   + 1 : stats.wins,
      losses:                 lost ? stats.losses + 1 : stats.losses,
    }).eq('id', change.playerId);

    await supabase.from('match_players')
      .update({ sr_change: change.delta, is_mvp: change.isMvp })
      .eq('match_id', matchId)
      .eq('player_id', change.playerId);
  }));
}

/**
 * Détermine le vainqueur en fonction du score actuel.
 * Retourne 'A', 'B', ou 'draw'.
 */
export function determineWinner(scoreA: number, scoreB: number): 'A' | 'B' | 'draw' {
  if (scoreA > scoreB) return 'A';
  if (scoreB > scoreA) return 'B';
  return 'draw';
}
