import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET() {
  const { data, error } = await createAdminClient()
    .from('players')
    .select('id, username, avatar_url, rank, rank_tier, rank_points, placement_matches_left, total_games, wins, losses, mvp_count')
    .eq('placement_matches_left', 0)
    .order('rank_points', { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: 'Impossible de charger le classement' }, { status: 500 });
  return NextResponse.json({ data });
}
