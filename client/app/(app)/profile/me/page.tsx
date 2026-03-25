import { redirect } from 'next/navigation';
import { ProfileClient } from './ProfileClient';
import { createAdminClient, createSessionClient } from '@/lib/supabase/server';

type MatchHistoryRow = {
  id: string;
  team: 'A' | 'B';
  position: 'attacker' | 'goalkeeper';
  goals_scored: number;
  is_mvp: boolean;
  sr_change: number | null;
  joined_at: string;
  matches: Array<{
    id: string;
    code: string;
    name: string | null;
    score_team_a: number;
    score_team_b: number;
    winner_team: 'A' | 'B' | 'draw' | null;
    finished_at: string | null;
  }> | null;
};

export default async function MyProfilePage() {
  const supabase = await createSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const admin = createAdminClient();

  const [{ data: player, error: playerError }, { data: history }] = await Promise.all([
    admin.from('players').select('*').eq('id', user.id).single(),
    admin
      .from('match_players')
      .select(
        'id, team, position, goals_scored, is_mvp, sr_change, joined_at, matches (id, code, name, score_team_a, score_team_b, winner_team, finished_at)'
      )
      .eq('player_id', user.id)
      .order('joined_at', { ascending: false })
      .limit(20),
  ]);

  const normalizedHistory = ((history ?? []) as MatchHistoryRow[]).map((entry) => ({
    ...entry,
    matches: entry.matches?.[0] ?? null,
  }));

  if (playerError || !player) {
    redirect('/home');
  }

  return <ProfileClient initialPlayer={player} history={normalizedHistory} />;
}
