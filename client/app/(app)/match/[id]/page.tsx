import { redirect } from 'next/navigation';
import { MatchLobbyClient, type MatchLobby } from './MatchLobbyClient';
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

  const { data: match, error } = await createAdminClient()
    .from('matches')
    .select(
      'id, code, name, host_id, referee_id, status, score_target, score_team_a, score_team_b, created_at, started_at, finished_at, match_players(id, team, position, player_id, goals_scored, is_mvp, sr_change, players(id, username, avatar_url, rank, rank_tier, placement_matches_left))'
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
      players: entry.players?.[0] ?? null,
    })),
  };

  return <MatchLobbyClient match={normalizedMatch} currentUserId={user.id} />;
}
