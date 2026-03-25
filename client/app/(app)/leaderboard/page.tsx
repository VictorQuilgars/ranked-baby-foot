import { LeaderboardClient } from './LeaderboardClient';
import { createAdminClient } from '@/lib/supabase/server';

export default async function LeaderboardPage() {
  const { data } = await createAdminClient()
    .from('players')
    .select(
      'id, username, avatar_url, rank, rank_tier, rank_points, placement_matches_left, total_games, wins, losses, mvp_count'
    )
    .eq('placement_matches_left', 0)
    .order('rank_points', { ascending: false })
    .limit(100);

  return <LeaderboardClient players={data ?? []} />;
}
