import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/supabase/auth';
import { calculateSRChanges, PlayerMatchData, RankName } from '@/lib/services/rankService';

const schema = z.object({
  team: z.enum(['A', 'B']),
  scorerId: z.string().uuid().optional(),
  scorerPosition: z.enum(['attacker', 'goalkeeper']).optional(),
});

async function finalizeSRCalculation(matchId: string, winnerTeam: string) {
  const supabase = createAdminClient();

  const { data: matchPlayers } = await supabase
    .from('match_players')
    .select('player_id, team, position, goals_scored, players (rank_points, rank, rank_tier, hidden_mmr, placement_matches_left, rank_shield, daily_loss_forgiven)')
    .eq('match_id', matchId);

  if (!matchPlayers || matchPlayers.length === 0) return;

  const { data: match } = await supabase.from('matches').select('score_team_a, score_team_b').eq('id', matchId).single();
  if (!match) return;

  const players: PlayerMatchData[] = matchPlayers.map((mp: Record<string, unknown>) => {
    const p = mp.players as Record<string, unknown>;
    return {
      playerId: mp.player_id as string,
      team: mp.team as 'A' | 'B',
      position: mp.position as 'attacker' | 'goalkeeper',
      goalsScored: mp.goals_scored as number,
      currentSR: p.rank_points as number,
      currentRank: p.rank as RankName,
      currentTier: p.rank_tier as number,
      hiddenMmr: p.hidden_mmr as number,
      placementMatchesLeft: p.placement_matches_left as number,
      rankShield: p.rank_shield as number,
      dailyLossForgiven: p.daily_loss_forgiven as boolean,
    };
  });

  const srChanges = calculateSRChanges(players, match.score_team_a, match.score_team_b, winnerTeam as 'A' | 'B' | 'draw');

  await Promise.all(srChanges.map(async (change) => {
    const player = players.find(p => p.playerId === change.playerId)!;
    const won = winnerTeam !== 'draw' && player.team === winnerTeam;
    const newPlacementLeft = Math.max(0, player.placementMatchesLeft - 1);
    const newShield = change.rankUp ? 3 : change.shieldUsed ? Math.max(0, player.rankShield - 1) : player.rankShield;

    await supabase.from('players').update({
      rank_points: change.newSR,
      rank: newPlacementLeft > 0 ? player.currentRank : change.newRank,
      rank_tier: newPlacementLeft > 0 ? player.currentTier : change.newTier,
      hidden_mmr: change.newHiddenMmr,
      placement_matches_left: newPlacementLeft,
      rank_shield: newShield,
      daily_loss_forgiven: change.lossForgivenUsed ? true : player.dailyLossForgiven,
      total_games: supabase.rpc as unknown as number, // will use increment below
      wins: won ? supabase.rpc as unknown as number : undefined,
      losses: !won && winnerTeam !== 'draw' ? supabase.rpc as unknown as number : undefined,
    }).eq('id', change.playerId);

    // Increment counters properly
    await supabase.rpc('increment_player_stats', {
      p_id: change.playerId,
      p_won: won,
      p_draw: winnerTeam === 'draw',
    });

    await supabase.from('match_players').update({ sr_change: change.delta, is_mvp: change.isMvp }).eq('match_id', matchId).eq('player_id', change.playerId);
  }));
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error: authError } = await requireUser(request);
  if (authError) return authError;

  try {
    const { id } = await params;
    const body = await request.json();
    const { team, scorerId, scorerPosition } = schema.parse(body);
    const supabase = createAdminClient();

    const { data: match } = await supabase
      .from('matches')
      .select('id, status, referee_id, score_team_a, score_team_b, score_target')
      .eq('id', id)
      .single();

    if (!match || match.status !== 'in_progress') return NextResponse.json({ error: 'Match non en cours' }, { status: 400 });
    if (match.referee_id && match.referee_id !== user!.id) return NextResponse.json({ error: 'Seul l\'arbitre peut enregistrer un but' }, { status: 403 });

    await supabase.from('match_events').insert({
      match_id: id, event_type: 'goal', team,
      scorer_id: scorerId ?? null, scorer_position: scorerPosition ?? null, created_by: user!.id,
    });

    // Incrémenter goals_scored du buteur
    if (scorerId) {
      const { data: mp } = await supabase.from('match_players').select('goals_scored').eq('match_id', id).eq('player_id', scorerId).single();
      if (mp) {
        await supabase.from('match_players').update({ goals_scored: mp.goals_scored + 1 }).eq('match_id', id).eq('player_id', scorerId);
      }
    }

    const scoreField = team === 'A' ? 'score_team_a' : 'score_team_b';
    const newScore = (team === 'A' ? match.score_team_a : match.score_team_b) + 1;
    const isFinished = newScore >= match.score_target;

    const updates: Record<string, unknown> = { [scoreField]: newScore };
    if (isFinished) {
      updates.status = 'finished';
      updates.winner_team = team;
      updates.finished_at = new Date().toISOString();
    }

    const { data, error } = await supabase.from('matches').update(updates).eq('id', id).select().single();
    if (error) return NextResponse.json({ error: 'Impossible d\'enregistrer le but' }, { status: 500 });

    if (isFinished) {
      await finalizeSRCalculation(id, team);
    }

    return NextResponse.json({ data });
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: 'Données invalides' }, { status: 400 });
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
