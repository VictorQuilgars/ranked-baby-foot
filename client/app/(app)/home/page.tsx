import { createSessionClient, createAdminClient } from '@/lib/supabase/server';
import { HomeClient } from './HomeClient';
import { redirect } from 'next/navigation';
import type { FeedMatch } from '@/components/match/MatchFeedCard';

export default async function HomePage() {
  const supabase = await createSessionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  let { data: player } = await createAdminClient()
    .from('players')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!player) {
    const username =
      user.user_metadata?.full_name?.replace(/\s+/g, '_').toLowerCase() ??
      `player_${user.id.slice(0, 8)}`;
    const { data: created, error: insertError } = await createAdminClient()
      .from('players')
      .insert({ id: user.id, username, avatar_url: user.user_metadata?.avatar_url ?? null })
      .select()
      .single();
    if (insertError) throw new Error(`Failed to create player: ${insertError.message}`);
    player = created;
  }

  const MATCH_SELECT = `
    id, code, name, status, score_team_a, score_team_b, winner_team,
    score_target, started_at, finished_at, created_at,
    match_players (
      team, position,
      players (id, username, avatar_url, rank, rank_tier, placement_matches_left)
    )
  `;

  const [{ data: activeMatches }, { data: recentMatches }] = await Promise.all([
    createAdminClient()
      .from('matches')
      .select(MATCH_SELECT)
      .in('status', ['lobby', 'in_progress'])
      .order('created_at', { ascending: false })
      .limit(10),
    createAdminClient()
      .from('matches')
      .select(MATCH_SELECT)
      .eq('status', 'finished')
      .order('finished_at', { ascending: false })
      .limit(10),
  ]);

  return (
    <HomeClient
      player={player}
      activeMatches={(activeMatches ?? []) as unknown as FeedMatch[]}
      recentMatches={(recentMatches ?? []) as unknown as FeedMatch[]}
    />
  );
}
