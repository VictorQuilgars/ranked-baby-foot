import { redirect } from 'next/navigation';
import { MatchLobbyClient, type MatchLobby, type PendingGoal } from './MatchLobbyClient';
import { createAdminClient, createSessionClient } from '@/lib/supabase/server';

type MatchRow = Omit<MatchLobby, 'match_players'> & {
  match_players: Array<
    Omit<MatchLobby['match_players'][number], 'players'> & {
      players: Array<NonNullable<MatchLobby['match_players'][number]['players']>> | null;
    }
  >;
};

export default async function MatchLobbyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const admin = createAdminClient();

  const { data: match, error } = await admin
    .from('matches')
    .select(
      'id, code, name, host_id, referee_id, status, score_target, score_team_a, score_team_b, winner_team, created_at, started_at, finished_at, match_players(id, team, position, player_id, goals_scored, is_mvp, sr_change, players(id, username, avatar_url, rank, rank_tier, placement_matches_left))'
    )
    .eq('id', id)
    .single();

  if (error || !match) {
    redirect('/match/join');
  }

  const normalizedMatch: MatchLobby = {
    ...(match as MatchRow),
    match_players: (match as MatchRow).match_players.map((entry) => ({
      ...entry,
      players: (Array.isArray(entry.players) ? entry.players[0] : entry.players) ?? null,
    })),
  };

  // But en attente de vote (uniquement si match en cours)
  let pendingGoal: PendingGoal | null = null;
  if (normalizedMatch.status === 'in_progress') {
    const { data: pendingData } = await admin
      .from('match_events')
      .select('id, team, scorer_id, created_at, goal_votes(player_id, team, vote)')
      .eq('match_id', id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (pendingData) {
      pendingGoal = {
        id: pendingData.id,
        team: pendingData.team as 'A' | 'B',
        scorer_id: pendingData.scorer_id ?? null,
        created_at: pendingData.created_at,
        goal_votes: (pendingData.goal_votes ?? []) as PendingGoal['goal_votes'],
      };
    }
  }

  return <MatchLobbyClient match={normalizedMatch} currentUserId={user.id} pendingGoal={pendingGoal} />;
}
